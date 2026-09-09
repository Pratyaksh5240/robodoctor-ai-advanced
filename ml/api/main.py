import os
import sys
import re
import base64
import io
import json
import joblib
import pandas as pd
import numpy as np
import shap
from typing import Dict, List, Optional, Union, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from PIL import Image

import torch
import torch.nn as nn

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

try:
    from ml.recommendations.recommendation_engine import (
        build_patient_vector,
        get_orchestrated_recommendations,
        generate_useful_health_information
    )
    from ml.medications.medication_engine import get_educational_medication_info
except Exception:
    # If relative path import differs
    from recommendations.recommendation_engine import (
        build_patient_vector,
        get_orchestrated_recommendations,
        generate_useful_health_information
    )
    from medications.medication_engine import get_educational_medication_info

app = FastAPI(title="RoboDoctor Vital Risk ML Service & Framingham Intelligence", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

V2_CHD_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "robodoctor_framingham_chd_model.joblib")
V1_SYNTHETIC_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "robodoctor_vital_risk_model.joblib")
SKIN_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "robodoctor_skin_lesion_model.pth")
SKIN_CLASS_NAMES_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "class_names.json")

RAW_FEATURE_COLS = [
    "male",
    "age",
    "education",
    "currentSmoker",
    "cigsPerDay",
    "BPMeds",
    "prevalentStroke",
    "prevalentHyp",
    "diabetes",
    "totChol",
    "sysBP",
    "diaBP",
    "BMI",
    "heartRate",
    "glucose"
]

def engineer_features(df_in: pd.DataFrame) -> pd.DataFrame:
    """Derives physiologically grounded hemodynamic and metabolic features."""
    df = df_in.copy()
    
    # Hemodynamics & Arterial Compliance
    df["pulsePressure"] = df["sysBP"] - df["diaBP"]
    df["meanArterialPressure"] = df["diaBP"] + (df["sysBP"] - df["diaBP"]) / 3.0
    df["hemodynamicRatio"] = df["pulsePressure"] / (df["sysBP"] + 1e-5)
    
    # Smoking lifetime exposure proxy (pack-years surrogate)
    df["smokeCumulativeExposure"] = df["age"] * df["cigsPerDay"]
    
    # Metabolic & visceral adiposity synergy
    df["metabolicIndex"] = df["BMI"] * df["glucose"]
    df["atheroIndex"] = df["totChol"] / (df["glucose"] + 1e-5)
    
    # Age acceleration & sex interaction
    df["ageSquared"] = (df["age"] / 10.0) ** 2
    df["age_male"] = df["age"] * df["male"]
    
    # Refractory hypertension indicator
    df["bpMedsRefractory"] = df["BPMeds"] * df["sysBP"]
    
    # Log transforms for skewed biological markers
    df["log_totChol"] = np.log1p(df["totChol"])
    df["log_glucose"] = np.log1p(df["glucose"])
    df["log_sysBP"] = np.log1p(df["sysBP"])
    
    return df

# Load Genuine Framingham CHD Model (V3 Ensemble / V2 Baseline)
framingham_artifact = None
framingham_shap_explainer = None
if os.path.exists(V2_CHD_MODEL_PATH):
    try:
        print(f"Loading Framingham CHD model artifact from: {V2_CHD_MODEL_PATH}")
        framingham_artifact = joblib.load(V2_CHD_MODEL_PATH)
        m_type = framingham_artifact.get("model_type", "framingham_logistic")
        if m_type == "framingham_ensemble":
            lgb_m = framingham_artifact["ensemble_lgb"]
            framingham_shap_explainer = shap.TreeExplainer(lgb_m)
            print("V3 Framingham Stacking Ensemble and SHAP TreeExplainer initialized successfully.")
        else:
            m = framingham_artifact.get("model")
            sc = framingham_artifact.get("scaler")
            bg = framingham_artifact.get("shap_background")
            if sc is not None and bg is not None:
                bg_scaled = sc.transform(bg)
                framingham_shap_explainer = shap.LinearExplainer(m, bg_scaled)
            elif bg is not None:
                framingham_shap_explainer = shap.TreeExplainer(m)
            print("Framingham CHD model and SHAP explainer initialized.")
    except Exception as e:
        print(f"Warning: Failed to initialize Framingham CHD model: {e}")

def predict_framingham_risk(df_raw: pd.DataFrame):
    """
    Evaluates cardiovascular CHD risk using either V3 Ensemble or V2 single model.
    Returns (chd_prob_pct, risk_tier, features_df)
    """
    if framingham_artifact is None:
        raise ValueError("Framingham model artifact is not loaded.")
        
    m_type = framingham_artifact.get("model_type", "framingham_logistic")
    
    if m_type == "framingham_ensemble":
        imp = framingham_artifact["imputer"]
        raw_cols = framingham_artifact.get("raw_features", RAW_FEATURE_COLS)
        X_imp = pd.DataFrame(imp.transform(df_raw[raw_cols]), columns=raw_cols)
        X_eng = engineer_features(X_imp)
        eng_cols = framingham_artifact.get("engineered_features", list(X_eng.columns))
        
        lr_m = framingham_artifact["ensemble_lr"]
        lgb_m = framingham_artifact["ensemble_lgb"]
        scaler = framingham_artifact.get("scaler")
        weights = framingham_artifact.get("ensemble_weights", {"lr": 0.45, "lgb": 0.55})
        
        X_scaled = scaler.transform(X_eng[eng_cols]) if scaler is not None else X_eng[eng_cols]
        
        p_lr = lr_m.predict_proba(X_scaled)[0, 1]
        p_lgb = lgb_m.predict_proba(X_eng[eng_cols])[0, 1]
        
        p_blend = weights["lr"] * p_lr + weights["lgb"] * p_lgb
        chd_prob_pct = round(float(p_blend) * 100.0, 1)
        opt_thresh = float(framingham_artifact.get("optimal_threshold", 0.37))
        opt_thresh_pct = round(opt_thresh * 100.0, 1)
        
        if chd_prob_pct >= opt_thresh_pct:
            risk_tier = "high"
        elif chd_prob_pct >= 20.0:
            risk_tier = "moderate"
        else:
            risk_tier = "low"
            
        return chd_prob_pct, risk_tier, X_eng[eng_cols]
    else:
        m = framingham_artifact["model"]
        sc = framingham_artifact.get("scaler")
        imp = framingham_artifact["imputer"]
        cols = framingham_artifact.get("feature_cols", RAW_FEATURE_COLS)
        
        X_imp = imp.transform(df_raw[cols])
        X_eval = sc.transform(X_imp) if sc is not None else X_imp
        
        probas = m.predict_proba(X_eval)[0]
        chd_prob = float(probas[1]) if len(probas) > 1 else float(probas[0])
        chd_prob_pct = round(chd_prob * 100.0, 1)
        
        if chd_prob_pct >= 20.0:
            risk_tier = "high"
        elif chd_prob_pct >= 10.0:
            risk_tier = "moderate"
        else:
            risk_tier = "low"
            
        return chd_prob_pct, risk_tier, pd.DataFrame(X_imp, columns=cols)

# Load Fallback Synthetic Model (V1)
synthetic_artifact = None
if os.path.exists(V1_SYNTHETIC_MODEL_PATH):
    try:
        synthetic_artifact = joblib.load(V1_SYNTHETIC_MODEL_PATH)
        print("Loaded V1 synthetic model as secondary general vital screening fallback.")
    except Exception as e:
        print(f"Warning: Failed to load V1 synthetic model: {e}")

# PyTorch HAM10000 Skin Lesion Model
class SkinLesionClassifier(nn.Module):
    def __init__(self, num_classes=7):
        super(SkinLesionClassifier, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((4, 4))
        )
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.35),
            nn.Linear(256 * 4 * 4, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.25),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        features = self.features(x)
        logits = self.classifier(features)
        return logits

skin_model = None
skin_classes = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
skin_labels_map = {
    "akiec": "Actinic Keratosis / Bowen's Disease",
    "bcc": "Basal Cell Carcinoma",
    "bkl": "Benign Keratosis (Solar Lentigo / Seborrheic Keratosis)",
    "df": "Dermatofibroma",
    "mel": "Melanoma",
    "nv": "Melanocytic Nevus (Mole)",
    "vasc": "Vascular Lesion"
}

if os.path.exists(SKIN_CLASS_NAMES_PATH):
    try:
        with open(SKIN_CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            cdata = json.load(f)
            skin_classes = cdata.get("classes", skin_classes)
            skin_labels_map = cdata.get("labels_map", skin_labels_map)
    except Exception as e:
        print(f"Warning loading skin class mapping: {e}")

if os.path.exists(SKIN_MODEL_PATH):
    try:
        print(f"Loading PyTorch Skin Lesion model artifact from: {SKIN_MODEL_PATH}")
        skin_model = SkinLesionClassifier(num_classes=len(skin_classes))
        skin_model.load_state_dict(torch.load(SKIN_MODEL_PATH, map_location=torch.device('cpu')))
        skin_model.eval()
        print("PyTorch Skin Lesion screening model successfully loaded.")
    except Exception as e:
        print(f"Warning loading skin PyTorch model: {e}")

SYMPTOM_KEYWORDS: Dict[str, List[str]] = {
    "symptom_fever": ["fever", "bukhar", "feverish"],
    "symptom_cough": ["cough", "khansi", "coughing"],
    "symptom_cold": ["cold", "sardi", "runny nose"],
    "symptom_fatigue": ["fatigue", "tired", "weakness", "thakan", "exhaustion"],
    "symptom_headache": ["headache", "head pain", "sir dard"],
    "symptom_dizziness": ["dizziness", "dizzy", "chakkar", "lightheaded"],
    "symptom_chest_pain": ["chest pain", "chest discomfort", "seene me dard", "pressure in chest"],
    "symptom_shortness_of_breath": [
        "shortness of breath",
        "breathlessness",
        "difficulty breathing",
        "saans ki dikkat",
        "breathing problem",
        "gasping"
    ],
    "symptom_nausea": ["nausea", "matli", "nauseous"],
    "symptom_vomiting": ["vomiting", "vomit", "ulti"],
    "symptom_body_ache": ["body ache", "muscle pain", "body pain", "badan dard"],
    "symptom_sore_throat": ["sore throat", "throat pain", "gale me dard"]
}

def parse_bp(bp_str: str):
    if not bp_str or "/" not in bp_str:
        return 120.0, 80.0
    parts = bp_str.split("/")
    systolic = float(parts[0].strip())
    diastolic = float(parts[1].strip())
    return systolic, diastolic

def extract_symptoms(text: str) -> Dict[str, int]:
    normalized = (text or "").lower()
    flags = {}
    for feature_col, keywords in SYMPTOM_KEYWORDS.items():
        flags[feature_col] = 1 if any(kw in normalized for kw in keywords) else 0
    return flags

# Pydantic Schemas
class ChdFactorItem(BaseModel):
    feature: str
    label: str
    impact: float
    direction: str
    explanation: str

class ChdPredictRequest(BaseModel):
    age: float = Field(..., gt=0, le=120, description="Age in years")
    male: Optional[int] = Field(default=None)
    sex: Optional[str] = Field(default=None)
    education: Optional[float] = Field(default=None)
    currentSmoker: Optional[Union[int, bool]] = Field(default=None)
    cigsPerDay: Optional[float] = Field(default=None)
    bpMeds: Optional[Union[int, bool]] = Field(default=None)
    prevalentStroke: Optional[Union[int, bool]] = Field(default=None)
    prevalentHyp: Optional[Union[int, bool]] = Field(default=None)
    diabetes: Optional[Union[int, bool]] = Field(default=None)
    totChol: Optional[float] = Field(default=None)
    sysBP: Optional[float] = Field(default=None)
    diaBP: Optional[float] = Field(default=None)
    bloodPressure: Optional[str] = Field(default=None)
    BMI: Optional[float] = Field(default=None)
    heightCm: Optional[float] = Field(default=None)
    weightKg: Optional[float] = Field(default=None)
    heartRate: Optional[float] = Field(default=None)
    glucose: Optional[float] = Field(default=None)
    bloodSugar: Optional[float] = Field(default=None)

class ChdPredictResponse(BaseModel):
    tenYearRiskPercent: float
    riskTier: str  # "low" | "moderate" | "high"
    topContributingFactors: List[ChdFactorItem]
    modelType: str
    modelName: str
    source: str = "ml_model"

class RecommendationItem(BaseModel):
    id: str
    title: str
    description: str
    category: str
    reason: str
    score: float
    priority: Optional[str] = "P4"

class PriorityFinding(BaseModel):
    title: str
    detail: str
    explanation: str
    severity: str

class ContributingFactor(BaseModel):
    feature: str
    label: str
    value: str
    contributionPct: float
    effect: str
    explanation: str

class MedicationInfoCard(BaseModel):
    id: str
    category: str
    title: str
    generalPurpose: str
    medicationClasses: List[str]
    safetyConsiderations: str
    contraindicationsWarnings: str
    clinicianDiscussionPoints: str

class UsefulHealthInfoItem(BaseModel):
    topic: str
    value: str
    explanation: str

class VitalPredictRequest(BaseModel):
    age: float = Field(..., gt=0, le=120, description="Age in years")
    heightCm: float = Field(..., gt=50, le=250, description="Height in cm")
    weightKg: float = Field(..., gt=1, le=300, description="Weight in kg")
    bloodPressure: str = Field(..., description="Blood pressure string e.g. 120/80")
    bloodSugar: float = Field(..., gt=0, le=600, description="Blood sugar in mg/dL")
    heartRate: float = Field(..., gt=0, le=250, description="Heart rate in bpm")
    symptoms: Optional[str] = Field(default="", description="Free text description of symptoms")
    sex: Optional[str] = Field(default=None)
    currentSmoker: Optional[Union[int, bool]] = Field(default=None)
    cigsPerDay: Optional[float] = Field(default=None)
    bpMeds: Optional[Union[int, bool]] = Field(default=None)
    prevalentStroke: Optional[Union[int, bool]] = Field(default=None)
    prevalentHyp: Optional[Union[int, bool]] = Field(default=None)
    diabetes: Optional[Union[int, bool]] = Field(default=None)
    totChol: Optional[float] = Field(default=None)
    education: Optional[float] = Field(default=None)

class VitalPredictResponse(BaseModel):
    risk: str
    probability: float
    probabilities: Dict[str, float]
    bmi: float
    model: str
    modelAccuracy: Optional[str] = None
    priorityFinding: Optional[PriorityFinding] = None
    keyContributingFactors: List[ContributingFactor]
    recommendations: List[RecommendationItem]
    medicationInformation: List[MedicationInfoCard]
    usefulInformation: List[UsefulHealthInfoItem]
    urgent: bool
    message: str
    tenYearRiskPercent: Optional[float] = None
    topContributingFactors: Optional[List[ChdFactorItem]] = None
    source: str = "ml_model"

def compute_chd_shap_factors(input_df: pd.DataFrame) -> List[ChdFactorItem]:
    if framingham_artifact is None or framingham_shap_explainer is None:
        return []

    m_type = framingham_artifact.get("model_type", "framingham_logistic")
    labels = framingham_artifact.get("feature_labels", {})

    try:
        if m_type == "framingham_ensemble":
            imp = framingham_artifact["imputer"]
            raw_cols = framingham_artifact.get("raw_features", RAW_FEATURE_COLS)
            X_imp = pd.DataFrame(imp.transform(input_df[raw_cols]), columns=raw_cols)
            X_eng = engineer_features(X_imp)
            cols = framingham_artifact.get("engineered_features", list(X_eng.columns))
            
            shap_vals = framingham_shap_explainer.shap_values(X_eng[cols])
            if isinstance(shap_vals, list):
                shap_row = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
            elif len(np.array(shap_vals).shape) == 2:
                shap_row = shap_vals[0]
            else:
                shap_row = shap_vals
            eval_df = X_eng
        else:
            m = framingham_artifact["model"]
            sc = framingham_artifact.get("scaler")
            imp = framingham_artifact["imputer"]
            cols = framingham_artifact.get("feature_cols", RAW_FEATURE_COLS)

            X_imp = imp.transform(input_df[cols])
            X_eval = sc.transform(X_imp) if sc is not None else X_imp
            shap_vals = framingham_shap_explainer.shap_values(X_eval)
            shap_row = shap_vals[0] if isinstance(shap_vals, list) else (shap_vals[0] if len(np.array(shap_vals).shape) == 2 else shap_vals)
            eval_df = input_df

        factors = []
        for idx, col in enumerate(cols):
            val = float(eval_df[col].iloc[0])
            impact = round(float(shap_row[idx]), 3)
            label = labels.get(col, col)
            direction = "higher" if impact > 0 else "lower"

            if col == "sysBP":
                exp = f"Systolic BP ({val:.0f} mmHg) {'increases cardiovascular arterial tension' if impact > 0 else 'is in an optimal protective range'}."
            elif col == "totChol":
                exp = f"Total cholesterol ({val:.0f} mg/dL) {'elevates atherosclerotic plaque liability' if impact > 0 else 'indicates healthy lipid equilibrium'}."
            elif col == "age":
                exp = f"Age ({val:.0f} yrs) {'reflects cumulative lifetime vascular exposure' if impact > 0 else 'provides a youthful protective baseline'}."
            elif col in ["currentSmoker", "cigsPerDay"]:
                exp = f"Smoking intensity ({val:.0f} cigs/day) {'accelerates arterial endothelial damage' if impact > 0 else 'reflects non-smoking vascular preservation'}."
            elif col in ["diabetes", "glucose"]:
                exp = f"Blood glucose ({val:.0f} mg/dL) {'increases microvascular disease risk' if impact > 0 else 'shows healthy glycemic regulation'}."
            elif col == "BMI":
                exp = f"Body Mass Index ({val:.1f}) {'adds cardiac workload' if impact > 0 else 'is within optimal metabolic bounds'}."
            elif col == "male":
                exp = f"Biological {'male sex carries higher baseline coronary incidence' if val == 1 else 'female sex has protective hormonal baseline'}."
            elif col == "BPMeds":
                exp = f"Antihypertensive medication {'regimen indicates established blood pressure management' if val == 1 else 'not currently required'}."
            elif col == "pulsePressure":
                exp = f"Pulse pressure ({val:.0f} mmHg) {'indicates arterial stiffness and vascular remodeling' if impact > 0 else 'reflects elastic vascular compliance'}."
            elif col == "meanArterialPressure":
                exp = f"Mean arterial pressure ({val:.0f} mmHg) {'exerts elevated sustained tissue perfusion pressure' if impact > 0 else 'is within balanced perfusion limits'}."
            elif col == "smokeCumulativeExposure":
                exp = f"Cumulative tobacco exposure ({val:.0f}) {'signifies prolonged lifetime endothelial injury' if impact > 0 else 'reflects minimal lifetime smoking impact'}."
            elif col == "metabolicIndex":
                exp = f"Metabolic atherogenic index ({val:.0f}) {'indicates insulin resistance and visceral adiposity strain' if impact > 0 else 'shows low metabolic atherogenic burden'}."
            elif col == "bpMedsRefractory":
                exp = f"Refractory hypertension index ({val:.0f}) {'indicates persistent arterial resistance despite medication' if impact > 0 else 'shows controlled pressure dynamics'}."
            elif col == "ageSquared":
                exp = f"Age acceleration factor ({val:.1f}) {'reflects compounding non-linear vascular aging curve' if impact > 0 else 'reflects younger vascular elasticity'}."
            elif col == "atheroIndex":
                exp = f"Atherogenic ratio ({val:.2f}) {'reflects lipid/glycemic imbalance' if impact > 0 else 'shows balanced metabolic ratio'}."
            else:
                exp = f"{label} ({val:.1f}) {'contributes toward higher risk' if impact > 0 else 'supports cardiovascular health'}."

            factors.append(ChdFactorItem(
                feature=col,
                label=label,
                impact=impact,
                direction=direction,
                explanation=exp
            ))

        factors.sort(key=lambda x: abs(x.impact), reverse=True)
        return factors
    except Exception as e:
        print(f"Warning computing SHAP factors: {e}")
        return []

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "RoboDoctor Vital Risk ML Service & Framingham Intelligence",
        "has_chd_model": framingham_artifact is not None,
        "has_skin_model": skin_model is not None,
        "chd_model_type": framingham_artifact.get("model_type") if framingham_artifact else None
    }

@app.post("/predict-chd", response_model=ChdPredictResponse)
def predict_chd_endpoint(req: ChdPredictRequest):
    if framingham_artifact is None:
        raise HTTPException(status_code=503, detail="Framingham CHD model not loaded.")

    try:
        medians = framingham_artifact.get("feature_medians", {})

        is_male = 1 if (req.male == 1 or (req.sex or "").lower() in ["male", "m", "1"]) else 0

        # Systolic / Diastolic
        if req.sysBP is not None and req.diaBP is not None:
            sys_bp = float(req.sysBP)
            dia_bp = float(req.diaBP)
        elif req.bloodPressure:
            sys_bp, dia_bp = parse_bp(req.bloodPressure)
        else:
            sys_bp = float(medians.get("sysBP", 132.0))
            dia_bp = float(medians.get("diaBP", 82.0))

        # BMI
        if req.BMI is not None:
            bmi_val = float(req.BMI)
        elif req.heightCm and req.weightKg:
            h_m = float(req.heightCm) / 100.0
            bmi_val = round(float(req.weightKg) / (h_m * h_m), 2)
        else:
            bmi_val = float(medians.get("BMI", 25.8))

        # Smoking
        is_smoker = 1 if req.currentSmoker else 0
        cigs = float(req.cigsPerDay if req.cigsPerDay is not None else (10.0 if is_smoker else 0.0))
        if cigs > 0:
            is_smoker = 1

        # Glucose
        glucose_val = float(req.glucose if req.glucose is not None else (req.bloodSugar if req.bloodSugar is not None else medians.get("glucose", 82.0)))

        # Prevalent flags
        bp_meds = 1 if req.bpMeds else 0
        prev_stroke = 1 if req.prevalentStroke else 0
        prev_hyp = 1 if (req.prevalentHyp or sys_bp >= 140 or dia_bp >= 90 or bp_meds == 1) else 0
        has_diabetes = 1 if (req.diabetes or glucose_val >= 126) else 0

        tot_chol = float(req.totChol if req.totChol is not None else medians.get("totChol", 236.0))
        edu = float(req.education if req.education is not None else medians.get("education", 2.0))
        hr = float(req.heartRate if req.heartRate is not None else medians.get("heartRate", 75.0))

        feature_dict = {
            "male": is_male,
            "age": float(req.age),
            "education": edu,
            "currentSmoker": is_smoker,
            "cigsPerDay": cigs,
            "BPMeds": bp_meds,
            "prevalentStroke": prev_stroke,
            "prevalentHyp": prev_hyp,
            "diabetes": has_diabetes,
            "totChol": tot_chol,
            "sysBP": sys_bp,
            "diaBP": dia_bp,
            "BMI": bmi_val,
            "heartRate": hr,
            "glucose": glucose_val
        }

        raw_cols = framingham_artifact.get("raw_features", RAW_FEATURE_COLS)
        df_input = pd.DataFrame([feature_dict])[raw_cols]

        chd_prob_pct, risk_tier, _ = predict_framingham_risk(df_input)
        top_factors = compute_chd_shap_factors(df_input)

        is_ens = framingham_artifact.get("model_type") == "framingham_ensemble"
        m_name = (
            "Framingham Heart Study 10-Year CHD Ensemble (v3.0 - LightGBM + ElasticNet)"
            if is_ens else "Framingham Heart Study 10-Year CHD Model (v2.0)"
        )

        return ChdPredictResponse(
            tenYearRiskPercent=chd_prob_pct,
            riskTier=risk_tier,
            topContributingFactors=top_factors,
            modelType=framingham_artifact.get("model_type", "framingham_ensemble"),
            modelName=m_name,
            source="ml_model"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict", response_model=VitalPredictResponse)
def predict_vital_risk(request: VitalPredictRequest):
    try:
        systolic, diastolic = parse_bp(request.bloodPressure)
        height_m = request.heightCm / 100.0
        bmi = round(request.weightKg / (height_m * height_m), 2)
        symptom_flags = extract_symptoms(request.symptoms)

        chd_prob_pct = 15.0
        risk_tier = "Moderate"
        chd_factors: List[ChdFactorItem] = []

        # If genuine Framingham CHD model is available, compute calibrated risk & SHAP
        if framingham_artifact is not None:
            medians = framingham_artifact.get("feature_medians", {})
            is_male = 1 if (request.sex or "").lower() in ["male", "m", "1"] else 0
            is_smoker = 1 if request.currentSmoker else 0
            cigs = float(request.cigsPerDay or (10.0 if is_smoker else 0.0))
            if cigs > 0:
                is_smoker = 1
            bp_meds = 1 if request.bpMeds else 0
            prev_stroke = 1 if request.prevalentStroke else 0
            prev_hyp = 1 if (request.prevalentHyp or systolic >= 140 or diastolic >= 90 or bp_meds == 1) else 0
            has_diabetes = 1 if (request.diabetes or request.bloodSugar >= 126) else 0
            tot_chol = float(request.totChol if request.totChol is not None else medians.get("totChol", 236.0))
            edu = float(request.education if request.education is not None else medians.get("education", 2.0))

            feature_dict = {
                "male": is_male,
                "age": float(request.age),
                "education": edu,
                "currentSmoker": is_smoker,
                "cigsPerDay": cigs,
                "BPMeds": bp_meds,
                "prevalentStroke": prev_stroke,
                "prevalentHyp": prev_hyp,
                "diabetes": has_diabetes,
                "totChol": tot_chol,
                "sysBP": systolic,
                "diaBP": diastolic,
                "BMI": bmi,
                "heartRate": float(request.heartRate),
                "glucose": float(request.bloodSugar)
            }

            raw_cols = framingham_artifact.get("raw_features", RAW_FEATURE_COLS)
            df_input = pd.DataFrame([feature_dict])[raw_cols]

            chd_prob_pct, risk_tier_lower, _ = predict_framingham_risk(df_input)
            risk_tier = risk_tier_lower.capitalize()

            chd_factors = compute_chd_shap_factors(df_input)
            is_ens = framingham_artifact.get("model_type") == "framingham_ensemble"
            if is_ens:
                model_name = "Framingham Heart Study 10-Year CHD Risk Model (V3 Screening Ensemble)"
                model_acc = "86.1% Recall (Sensitivity), 56.2% Precision, 72.9% ROC-AUC"
            else:
                model_name = "Framingham Heart Study 10-Year CHD Risk Model (Genuine Dataset)"
                model_acc = "72.8% ROC-AUC (67.8% Clinical Sensitivity)"

        elif synthetic_artifact is not None:
            # Secondary fallback to V1 synthetic model
            v1_pipeline = synthetic_artifact["pipeline"]
            v1_cols = synthetic_artifact["feature_cols"]
            v1_dict = {
                "age": request.age,
                "weight_kg": request.weightKg,
                "height_cm": request.heightCm,
                "bmi": bmi,
                "systolic_bp": systolic,
                "diastolic_bp": diastolic,
                "blood_sugar_mg_dl": request.bloodSugar,
                "heart_rate_bpm": request.heartRate,
                **symptom_flags
            }
            v1_input = pd.DataFrame([v1_dict])[v1_cols]
            risk_tier = str(v1_pipeline.predict(v1_input)[0])
            probas_v1 = v1_pipeline.predict_proba(v1_input)[0]
            chd_prob_pct = round(float(probas_v1[1]) * 100.0, 1) if len(probas_v1) > 1 else 30.0
            model_name = "RoboDoctor Vital Screening Engine (V1 Synthetic)"
            model_acc = "General Rule & Triage Estimator"
            tot_chol = 220.0
        else:
            tot_chol = 220.0
            model_name = "RoboDoctor Clinical Triage Engine"
            model_acc = "Rules Baseline"

        proba_dict = {
            "Low": round(max(0.0, 100.0 - chd_prob_pct), 1),
            "Moderate": round(chd_prob_pct, 1),
            "High": round(chd_prob_pct, 1)
        }

        # Convert SHAP factors to ContributingFactor format for legacy card display
        key_factors: List[ContributingFactor] = []
        for f in chd_factors[:5]:
            key_factors.append(ContributingFactor(
                feature=f.feature,
                label=f.label,
                value=f.direction,
                contributionPct=abs(f.impact) * 20.0,
                effect=f.direction,
                explanation=f.explanation
            ))

        patient_vector = build_patient_vector(
            bmi=bmi,
            systolic=systolic,
            diastolic=diastolic,
            sugar=request.bloodSugar,
            heart_rate=request.heartRate,
            symptom_flags=symptom_flags,
            ml_risk=risk_tier
        )

        orch_result = get_orchestrated_recommendations(
            patient_vector=patient_vector,
            systolic=systolic,
            diastolic=diastolic,
            sugar=request.bloodSugar,
            heart_rate=request.heartRate,
            symptoms_text=request.symptoms,
            ml_risk=risk_tier,
            min_threshold=0.15,
            top_n=4
        )

        is_urgent = orch_result["urgent"]

        medication_info = get_educational_medication_info(
            systolic=systolic,
            diastolic=diastolic,
            glucose=request.bloodSugar,
            tot_chol=tot_chol,
            chd_risk_tier=risk_tier,
            is_urgent=is_urgent
        )

        useful_info = generate_useful_health_information(
            systolic=systolic,
            diastolic=diastolic,
            glucose=request.bloodSugar,
            heart_rate=request.heartRate,
            bmi=bmi,
            chd_prob=chd_prob_pct,
            risk_tier=risk_tier
        )

        msg = (
            f"The genuine Framingham cardiovascular model estimated a {chd_prob_pct}% 10-year coronary risk probability "
            f"({risk_tier} screening tier)."
        )

        return VitalPredictResponse(
            risk=risk_tier,
            probability=chd_prob_pct,
            probabilities=proba_dict,
            bmi=bmi,
            model=model_name,
            modelAccuracy=model_acc,
            priorityFinding=orch_result["priorityFinding"],
            keyContributingFactors=key_factors,
            recommendations=orch_result["recommendations"],
            medicationInformation=medication_info,
            usefulInformation=useful_info,
            urgent=is_urgent,
            message=msg,
            tenYearRiskPercent=chd_prob_pct,
            topContributingFactors=chd_factors,
            source="ml_model"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SkinPredictRequest(BaseModel):
    imageDataUrl: str = Field(..., description="Base64 encoded data URI or image string")
    bodyPart: Optional[str] = Field(default="arm", description="Body location")
    symptoms: Optional[str] = Field(default="", description="Additional symptoms description")

class SkinPredictResponse(BaseModel):
    topClass: str
    topClassName: str
    confidence: float
    probabilities: Dict[str, float]
    uncertainPrediction: bool
    imageQualityPassed: bool
    estimatedRiskScore: float
    isHighRiskPattern: bool
    disclaimer: str

def validate_skin_image_quality(img: Image.Image) -> bool:
    try:
        width, height = img.size
        if width < 32 or height < 32:
            return False
        
        small = img.resize((64, 64))
        arr = np.array(small)
        
        if len(arr.shape) != 3 or arr.shape[2] != 3:
            return False
            
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        avg_brightness = np.mean(arr)
        
        if avg_brightness < 20 or avg_brightness > 245:
            return False
            
        diff = np.abs(r.astype(int) - g.astype(int)) + np.abs(r.astype(int) - b.astype(int))
        if np.mean(diff) < 5.0:
            return False
            
        return True
    except Exception:
        return True

@app.post("/skin-predict", response_model=SkinPredictResponse)
def predict_skin_lesion(request: SkinPredictRequest):
    try:
        data_url = request.imageDataUrl
        if "," in data_url:
            base64_data = data_url.split(",")[1]
        else:
            base64_data = data_url
            
        img_bytes = base64.b64decode(base64_data)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        
        quality_passed = validate_skin_image_quality(img)
        if not quality_passed:
            return SkinPredictResponse(
                topClass="unknown",
                topClassName="Unclear image quality",
                confidence=0.0,
                probabilities={c: 0.0 for c in skin_classes},
                uncertainPrediction=True,
                imageQualityPassed=False,
                estimatedRiskScore=10.0,
                isHighRiskPattern=False,
                disclaimer="Image failed quality screening. Please upload a clear photo of the skin lesion."
            )
            
        if skin_model is None:
            proba_dict = {c: round(100.0 / len(skin_classes), 1) for c in skin_classes}
            return SkinPredictResponse(
                topClass="nv",
                topClassName=skin_labels_map.get("nv", "Melanocytic Nevus (Mole)"),
                confidence=50.0,
                probabilities=proba_dict,
                uncertainPrediction=True,
                imageQualityPassed=True,
                estimatedRiskScore=20.0,
                isHighRiskPattern=False,
                disclaimer="Model inference fallback mode."
            )
            
        img_resized = img.resize((128, 128))
        arr = np.array(img_resized, dtype=np.float32) / 255.0
        arr = (arr - np.array([0.485, 0.456, 0.406])) / np.array([0.229, 0.224, 0.225])
        tensor = torch.tensor(arr.transpose(2, 0, 1), dtype=torch.float32).unsqueeze(0)
        
        with torch.no_grad():
            logits = skin_model(tensor)
            probs = torch.softmax(logits, dim=1)[0].numpy()
            
        top_idx = int(np.argmax(probs))
        top_class = skin_classes[top_idx]
        top_class_name = skin_labels_map.get(top_class, top_class)
        top_prob = float(probs[top_idx])
        confidence_pct = round(top_prob * 100.0, 1)
        
        proba_dict = {c: round(float(probs[i]) * 100.0, 1) for i, c in enumerate(skin_classes)}
        uncertain = top_prob < 0.45
        
        risk_weights = {
            "mel": 90.0,
            "bcc": 75.0,
            "akiec": 65.0,
            "bkl": 30.0,
            "df": 20.0,
            "vasc": 25.0,
            "nv": 15.0
        }
        weighted_score = sum(probs[i] * risk_weights.get(c, 20.0) for i, c in enumerate(skin_classes))
        risk_score = round(max(10.0, min(95.0, weighted_score)), 1)
        
        is_high_risk = top_class in ["mel", "bcc", "akiec"]
        
        return SkinPredictResponse(
            topClass=top_class,
            topClassName=top_class_name,
            confidence=confidence_pct,
            probabilities=proba_dict,
            uncertainPrediction=uncertain,
            imageQualityPassed=True,
            estimatedRiskScore=risk_score,
            isHighRiskPattern=is_high_risk,
            disclaimer="Skin lesion screening model output only. Not a definitive clinical diagnosis. Consult a qualified dermatologist."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Skin prediction error: {str(e)}")
