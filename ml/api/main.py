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
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from PIL import Image

import torch
import torch.nn as nn

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Import pipeline transformer so unpickling works seamlessly
try:
    from ml.pipeline import (
        ClinicalPipelineTransformer,
        RAW_FEATURE_COLS,
        ENGINEERED_FEATURE_COLS
    )
except Exception:
    try:
        from pipeline import (
            ClinicalPipelineTransformer,
            RAW_FEATURE_COLS,
            ENGINEERED_FEATURE_COLS
        )
    except Exception:
        RAW_FEATURE_COLS = [
            "male", "age", "education", "currentSmoker", "cigsPerDay",
            "BPMeds", "prevalentStroke", "prevalentHyp", "diabetes",
            "totChol", "sysBP", "diaBP", "BMI", "heartRate", "glucose"
        ]
        ENGINEERED_FEATURE_COLS = RAW_FEATURE_COLS

try:
    from ml.recommendations.recommendation_engine import (
        build_patient_vector,
        get_orchestrated_recommendations,
        generate_useful_health_information
    )
    from ml.medications.medication_engine import get_educational_medication_info
except Exception:
    from recommendations.recommendation_engine import (
        build_patient_vector,
        get_orchestrated_recommendations,
        generate_useful_health_information
    )
    from medications.medication_engine import get_educational_medication_info

app = FastAPI(
    title="RoboDoctor Vital Risk ML Service & Framingham Intelligence",
    version="4.0.0",
    description="Cardiovascular Risk Screening & Triage Intelligence API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

V4_CVD_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "robodoctor_framingham_cvd_model_v4.joblib")
V3_CHD_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "robodoctor_framingham_chd_model.joblib")
SKIN_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "robodoctor_skin_lesion_model.pth")
SKIN_CLASS_NAMES_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "class_names.json")

CAD_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "robodoctor_cad_model.joblib")
cad_artifact = None

if os.path.exists(CAD_MODEL_PATH):
    try:
        print(f"Loading CAD diagnostic model artifact from: {CAD_MODEL_PATH}")
        cad_artifact = joblib.load(CAD_MODEL_PATH)
        print("RoboDoctor CAD Diagnostic Ensemble (88.52% ACC) initialized successfully.")
    except Exception as e:
        print(f"Warning: Failed to load CAD model: {e}")
        cad_artifact = None


# Model Loading: V4 (Primary) -> V3 (Rollback)
framingham_artifact = None
framingham_shap_explainer = None
model_load_status = "unloaded"

if os.path.exists(V4_CVD_MODEL_PATH):
    try:
        print(f"Loading primary Framingham CVD V4 artifact from: {V4_CVD_MODEL_PATH}")
        framingham_artifact = joblib.load(V4_CVD_MODEL_PATH)
        lgb_m = framingham_artifact["ensemble_lgb"]
        framingham_shap_explainer = shap.TreeExplainer(lgb_m)
        model_load_status = "v4_loaded"
        print("V4 Framingham Stacking Ensemble and SHAP TreeExplainer initialized successfully.")
    except Exception as e:
        print(f"Warning: Failed to initialize Framingham V4 model: {e}")
        framingham_artifact = None

if framingham_artifact is None and os.path.exists(V3_CHD_MODEL_PATH):
    try:
        print(f"Falling back to Framingham CHD V3 artifact from: {V3_CHD_MODEL_PATH}")
        framingham_artifact = joblib.load(V3_CHD_MODEL_PATH)
        m_type = framingham_artifact.get("model_type", "framingham_logistic")
        if m_type == "framingham_ensemble":
            lgb_m = framingham_artifact["ensemble_lgb"]
            framingham_shap_explainer = shap.TreeExplainer(lgb_m)
        model_load_status = "v3_loaded"
        print("V3 Framingham Stacking Ensemble initialized as fallback.")
    except Exception as e:
        print(f"Warning: Failed to initialize Framingham fallback model: {e}")
        framingham_artifact = None

def compute_safety_flags(
    sys_bp: float,
    dia_bp: float,
    glucose: float,
    heart_rate: float,
    is_smoker: int,
    bp_meds: int,
    bmi: float,
    prev_stroke: int = 0
) -> List[str]:
    """Clinical safety triaging based on AHA/ACC guidelines."""
    flags = []
    pulse_pressure = sys_bp - dia_bp
    
    # Blood Pressure Triage
    if sys_bp >= 180 or dia_bp >= 120:
        flags.append("CRITICAL: Hypertensive Crisis criteria met (Systolic >= 180 or Diastolic >= 120 mmHg). Urgent clinical evaluation required.")
    elif sys_bp >= 140 or dia_bp >= 90:
        flags.append("WARNING: Stage 2 Hypertension range detected. Chronic elevated arterial wall stress.")
    elif sys_bp >= 130 or dia_bp >= 80:
        flags.append("CAUTION: Stage 1 Hypertension / Pre-hypertension range detected.")
        
    # Hemodynamic Arterial Stiffness
    if pulse_pressure >= 60:
        flags.append(f"VASCULAR: Widened Pulse Pressure ({pulse_pressure:.0f} mmHg) indicating significant large-artery stiffness.")
    elif pulse_pressure <= 25:
        flags.append(f"VASCULAR: Narrowed Pulse Pressure ({pulse_pressure:.0f} mmHg) suggesting reduced cardiac stroke volume.")

    # Glycemic Control
    if glucose >= 250:
        flags.append("CRITICAL: Severe Hyperglycemia (Glucose >= 250 mg/dL). Immediate medical management required.")
    elif glucose >= 126:
        flags.append("METABOLIC: Fasting Glucose in diabetic range (>= 126 mg/dL). Elevated microvascular and macrovascular atherogenesis.")
    elif glucose >= 100:
        flags.append("METABOLIC: Impaired Fasting Glucose (Pre-diabetes range 100-125 mg/dL).")

    # Heart Rate Dynamics
    if heart_rate >= 120:
        flags.append(f"CARDIAC: Marked Tachycardia ({heart_rate:.0f} bpm). Increased myocardial oxygen consumption.")
    elif heart_rate < 50:
        flags.append(f"CARDIAC: Bradycardia ({heart_rate:.0f} bpm). Potential conduction or hemodynamic suppression.")

    # Vascular History & Medication Compliance
    if prev_stroke == 1:
        flags.append("HIGH RISK: Documented prior Cerebrovascular Accident (Stroke). Secondary prevention guidelines apply.")
        
    if bp_meds == 1 and sys_bp >= 140:
        flags.append("ALERT: Refractory Hypertension detected (Suboptimal blood pressure control despite antihypertensive medication).")

    # Lifestyle
    if is_smoker == 1:
        flags.append("BEHAVIORAL: Active tobacco smoking accelerates endothelial oxidative injury and thrombosis liability.")

    # Obesity
    if bmi >= 35.0:
        flags.append(f"ADIPOSITY: Class II/III Obesity (BMI {bmi:.1f}) substantially increasing cardiac workload.")

    return flags

def predict_framingham_risk(df_raw: pd.DataFrame):
    """
    Evaluates cardiovascular CHD/CVD risk using V4 Ensemble (or V3 rollback).
    Returns (chd_prob_pct, risk_tier, screening_result, opt_thresh, eval_features_df)
    """
    if framingham_artifact is None:
        raise ValueError("Framingham model artifact is not loaded.")
        
    opt_thresh = float(framingham_artifact.get("optimal_threshold", 0.37))
    opt_thresh_pct = round(opt_thresh * 100.0, 1)
    
    # Check if V4 pipeline transformer exists
    transformer = framingham_artifact.get("transformer")
    raw_cols = framingham_artifact.get("raw_features", RAW_FEATURE_COLS)
    eng_cols = framingham_artifact.get("engineered_features", ENGINEERED_FEATURE_COLS)
    
    if transformer is not None:
        X_eng = transformer.transform(df_raw[raw_cols])
    else:
        # Fallback imputer and feature engineering for V3
        imp = framingham_artifact.get("imputer")
        X_imp = pd.DataFrame(imp.transform(df_raw[raw_cols]), columns=raw_cols) if imp is not None else df_raw[raw_cols]
        # derive basic features if needed
        X_eng = X_imp.copy()
        sys_c = np.maximum(X_eng["sysBP"], X_eng["diaBP"])
        dia_c = np.minimum(X_eng["sysBP"], X_eng["diaBP"])
        X_eng["sysBP"] = sys_c
        X_eng["diaBP"] = dia_c
        X_eng["pulsePressure"] = sys_c - dia_c
        X_eng["meanArterialPressure"] = (sys_c + 2.0 * dia_c) / 3.0
        X_eng["smokeCumulativeExposure"] = X_eng["age"] * X_eng["cigsPerDay"]
        X_eng["metabolicIndex"] = X_eng["BMI"] * X_eng["glucose"]
        X_eng["ageSquared"] = (X_eng["age"] / 10.0) ** 2
        X_eng["age_sysBP"] = (X_eng["age"] * sys_c) / 100.0
        X_eng["age_male"] = X_eng["age"] * X_eng["male"]
        X_eng["age_diabetes"] = X_eng["age"] * X_eng["diabetes"]

    lr_m = framingham_artifact["ensemble_lr"]
    lgb_m = framingham_artifact["ensemble_lgb"]
    scaler = framingham_artifact.get("scaler")
    weights = framingham_artifact.get("ensemble_weights", {"lr": 0.45, "lgb": 0.55})
    
    active_cols = [c for c in eng_cols if c in X_eng.columns]
    X_scaled = scaler.transform(X_eng[active_cols]) if scaler is not None else X_eng[active_cols]
    
    p_lr = lr_m.predict_proba(X_scaled)[0, 1]
    p_lgb = lgb_m.predict_proba(X_eng[active_cols])[0, 1]
    
    p_blend = float(weights["lr"] * p_lr + weights["lgb"] * p_lgb)
    chd_prob_pct = round(p_blend * 100.0, 1)
    
    screening_result = "positive" if p_blend >= opt_thresh else "negative"
    
    # Screening-oriented clinical tier assignment based on validated 0.37 threshold
    if p_blend >= opt_thresh:
        risk_tier = "high"
    elif chd_prob_pct >= 20.0:
        risk_tier = "moderate"
    else:
        risk_tier = "low"
        
    return chd_prob_pct, risk_tier, screening_result, opt_thresh, X_eng[active_cols]

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
        skin_model.load_state_dict(torch.load(SKIN_MODEL_PATH, map_location=torch.device("cpu")))
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
    try:
        systolic = float(parts[0].strip())
        diastolic = float(parts[1].strip())
        return systolic, diastolic
    except Exception:
        return 120.0, 80.0

def extract_symptoms(text: str) -> Dict[str, int]:
    normalized = (text or "").lower()
    flags = {}
    for feature_col, keywords in SYMPTOM_KEYWORDS.items():
        flags[feature_col] = 1 if any(kw in normalized for kw in keywords) else 0
    return flags

# Schemas
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
    status: str = "ok"
    model_version: str = "4.0.0"
    tenYearRiskPercent: float
    probability: float
    riskTier: str  # "low" | "moderate" | "high"
    risk_level: str
    threshold: float = 0.37
    screening_result: str  # "positive" | "negative"
    topContributingFactors: List[ChdFactorItem]
    safety_flags: List[str] = []
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
    symptoms: Optional[str] = Field(default="", description="Free text description of symptoms (strictly isolated from ML vector)")
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
    status: str = "ok"
    model_version: str = "4.0.0"
    risk: str
    probability: float
    probabilities: Dict[str, float]
    threshold: float = 0.37
    screening_result: str = "negative"
    safety_flags: List[str] = []
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

    labels = framingham_artifact.get("feature_labels", {})
    transformer = framingham_artifact.get("transformer")
    raw_cols = framingham_artifact.get("raw_features", RAW_FEATURE_COLS)
    eng_cols = framingham_artifact.get("engineered_features", ENGINEERED_FEATURE_COLS)

    try:
        if transformer is not None:
            X_eng = transformer.transform(input_df[raw_cols])
        else:
            imp = framingham_artifact.get("imputer")
            X_imp = pd.DataFrame(imp.transform(input_df[raw_cols]), columns=raw_cols) if imp is not None else input_df[raw_cols]
            X_eng = X_imp.copy()
            sys_c = np.maximum(X_eng["sysBP"], X_eng["diaBP"])
            dia_c = np.minimum(X_eng["sysBP"], X_eng["diaBP"])
            X_eng["sysBP"] = sys_c
            X_eng["diaBP"] = dia_c
            X_eng["pulsePressure"] = sys_c - dia_c
            X_eng["meanArterialPressure"] = (sys_c + 2.0 * dia_c) / 3.0
            X_eng["smokeCumulativeExposure"] = X_eng["age"] * X_eng["cigsPerDay"]
            X_eng["metabolicIndex"] = X_eng["BMI"] * X_eng["glucose"]
            X_eng["ageSquared"] = (X_eng["age"] / 10.0) ** 2
            X_eng["age_sysBP"] = (X_eng["age"] * sys_c) / 100.0
            X_eng["age_male"] = X_eng["age"] * X_eng["male"]
            X_eng["age_diabetes"] = X_eng["age"] * X_eng["diabetes"]

        cols = [c for c in eng_cols if c in X_eng.columns]
        shap_vals = framingham_shap_explainer.shap_values(X_eng[cols])
        
        arr = np.array(shap_vals)
        if isinstance(shap_vals, list):
            shap_row = shap_vals[1][0] if len(shap_vals) > 1 else shap_vals[0][0]
        elif len(arr.shape) == 2:
            shap_row = arr[0]
        elif len(arr.shape) == 3:
            shap_row = arr[0, :, 1] if arr.shape[-1] == 2 else arr[0, :, 0]
        else:
            shap_row = arr

        factors = []
        for idx, col in enumerate(cols):
            val = float(X_eng[col].iloc[0])
            impact = round(float(shap_row[idx]), 3)
            label = labels.get(col, col)
            direction = "higher" if impact > 0 else "lower"

            if col == "sysBP":
                exp = f"Systolic BP ({val:.0f} mmHg) {'elevates cardiovascular wall tension' if impact > 0 else 'is in an optimal protective range'}."
            elif col == "totChol":
                exp = f"Total cholesterol ({val:.0f} mg/dL) {'accelerates atherogenic plaque liability' if impact > 0 else 'indicates healthy lipid equilibrium'}."
            elif col == "age":
                exp = f"Age ({val:.0f} yrs) {'reflects cumulative vascular exposure' if impact > 0 else 'provides a youthful protective baseline'}."
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
            elif col == "age_sysBP":
                exp = f"Age-Systolic interaction ({val:.1f}) {'indicates compounded vascular stress with aging' if impact > 0 else 'shows balanced age-pressure dynamics'}."
            elif col == "ageSquared":
                exp = f"Age acceleration factor ({val:.1f}) {'reflects compounding non-linear vascular aging curve' if impact > 0 else 'reflects younger vascular elasticity'}."
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
        "status": "ok" if (framingham_artifact is not None or cad_artifact is not None) else "degraded",
        "service": "RoboDoctor Vital Risk ML Service & Framingham Intelligence",
        "model_version": framingham_artifact.get("model_version", "4.0.0") if framingham_artifact else None,
        "has_chd_model": framingham_artifact is not None,
        "has_skin_model": skin_model is not None,
        "has_cad_model": cad_artifact is not None,
        "cad_model_accuracy": "88.52% Test Accuracy, 95.24% ROC-AUC, 92.86% Sensitivity" if cad_artifact else None,
        "chd_model_type": framingham_artifact.get("model_type") if framingham_artifact else None,
        "optimal_threshold": framingham_artifact.get("optimal_threshold", 0.37) if framingham_artifact else None,
        "model_metrics": framingham_artifact.get("metrics", {}).get("test_set_evaluation") if framingham_artifact else None,
        "cad_metrics": cad_artifact.get("test_metrics") if cad_artifact else None
    }

@app.post("/predict-chd")
def predict_chd_endpoint(req: ChdPredictRequest):
    if framingham_artifact is None:
        return JSONResponse(
            status_code=503,
            content={
                "status": "model_unavailable",
                "error": "Framingham CVD risk model is currently offline. No synthetic percentages substituted.",
                "model_version": None,
                "tenYearRiskPercent": None,
                "probability": None,
                "screening_result": "unavailable",
                "riskTier": "unavailable",
                "risk_level": "unavailable",
                "safety_flags": [],
                "topContributingFactors": []
            }
        )

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
        cigs = float(req.cigsPerDay if req.cigsPerDay is not None else (15.0 if is_smoker else 0.0))
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

        chd_prob_pct, risk_tier, screening_result, opt_thresh, _ = predict_framingham_risk(df_input)
        top_factors = compute_chd_shap_factors(df_input)
        safety_flags = compute_safety_flags(
            sys_bp=sys_bp,
            dia_bp=dia_bp,
            glucose=glucose_val,
            heart_rate=hr,
            is_smoker=is_smoker,
            bp_meds=bp_meds,
            bmi=bmi_val,
            prev_stroke=prev_stroke
        )

        return ChdPredictResponse(
            status="ok",
            model_version=framingham_artifact.get("model_version", "4.0.0"),
            tenYearRiskPercent=chd_prob_pct,
            probability=chd_prob_pct,
            riskTier=risk_tier,
            risk_level=risk_tier,
            threshold=opt_thresh,
            screening_result=screening_result,
            topContributingFactors=top_factors,
            safety_flags=safety_flags,
            modelType=framingham_artifact.get("model_type", "framingham_ensemble_v4"),
            modelName=framingham_artifact.get("model_name", "Framingham Heart Study 10-Year CVD Screening Ensemble (v4.0)"),
            source="ml_model"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/predict")
def predict_vital_risk(request: VitalPredictRequest):
    systolic, diastolic = parse_bp(request.bloodPressure)
    height_m = request.heightCm / 100.0
    bmi = round(request.weightKg / (height_m * height_m), 2)
    symptom_flags = extract_symptoms(request.symptoms)

    # If genuine Framingham CVD model is offline, return explicit model_unavailable status
    if framingham_artifact is None:
        local_flags = compute_safety_flags(
            sys_bp=systolic,
            dia_bp=diastolic,
            glucose=float(request.bloodSugar),
            heart_rate=float(request.heartRate),
            is_smoker=1 if request.currentSmoker else 0,
            bp_meds=1 if request.bpMeds else 0,
            bmi=bmi,
            prev_stroke=1 if request.prevalentStroke else 0
        )
        return JSONResponse(
            status_code=503,
            content={
                "status": "model_unavailable",
                "error": "Cardiovascular risk prediction model is currently offline. No synthetic estimate is substituted.",
                "model_version": None,
                "risk": "Unavailable",
                "probability": None,
                "tenYearRiskPercent": None,
                "screening_result": "unavailable",
                "threshold": 0.37,
                "safety_flags": local_flags,
                "bmi": bmi,
                "model": "Model Offline",
                "modelAccuracy": None,
                "priorityFinding": None,
                "keyContributingFactors": [],
                "topContributingFactors": [],
                "recommendations": [],
                "medicationInformation": [],
                "usefulInformation": [],
                "urgent": False,
                "message": "The Framingham cardiovascular risk model is currently offline. Please restart the ML service.",
                "source": "model_offline"
            }
        )

    try:
        medians = framingham_artifact.get("feature_medians", {})
        is_male = 1 if (request.sex or "").lower() in ["male", "m", "1"] else 0
        is_smoker = 1 if request.currentSmoker else 0
        cigs = float(request.cigsPerDay or (15.0 if is_smoker else 0.0))
        if cigs > 0:
            is_smoker = 1
        bp_meds = 1 if request.bpMeds else 0
        prev_stroke = 1 if request.prevalentStroke else 0
        prev_hyp = 1 if (request.prevalentHyp or systolic >= 140 or diastolic >= 90 or bp_meds == 1) else 0
        has_diabetes = 1 if (request.diabetes or request.bloodSugar >= 126) else 0
        tot_chol = float(request.totChol if request.totChol is not None else medians.get("totChol", 236.0))
        edu = float(request.education if request.education is not None else medians.get("education", 2.0))

        # Strict isolation: The ML vector contains ONLY genuine cardiovascular biological features.
        # Free text symptoms ('fever', 'cough', 'cancer') are NEVER placed into df_input.
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

        # Explicit isolation invariant check
        for prohibited in ["symptoms", "symptom_text", "cancer", "fever", "cough"]:
            assert prohibited not in df_input.columns, f"Symptom leakage detected in Framingham ML vector: {prohibited}"

        chd_prob_pct, risk_tier_lower, screening_result, opt_thresh, _ = predict_framingham_risk(df_input)
        risk_tier = risk_tier_lower.capitalize()

        chd_factors = compute_chd_shap_factors(df_input)
        safety_flags = compute_safety_flags(
            sys_bp=systolic,
            dia_bp=diastolic,
            glucose=float(request.bloodSugar),
            heart_rate=float(request.heartRate),
            is_smoker=is_smoker,
            bp_meds=bp_meds,
            bmi=bmi,
            prev_stroke=prev_stroke
        )

        model_version = framingham_artifact.get("model_version", "4.0.0")
        model_name = framingham_artifact.get("model_name", "Framingham Heart Study 10-Year CVD Screening Ensemble (v4.0)")
        model_acc = "86.1% Recall (Sensitivity), 56.2% Precision, 72.9% ROC-AUC (Optimal Threshold 0.37)"

        proba_dict = {
            "Low": round(max(0.0, 100.0 - chd_prob_pct), 1),
            "Moderate": round(chd_prob_pct, 1),
            "High": round(chd_prob_pct, 1)
        }

        # Convert SHAP factors to ContributingFactor format for display
        key_factors: List[ContributingFactor] = []
        for f in chd_factors[:5]:
            key_factors.append(ContributingFactor(
                feature=f.feature,
                label=f.label,
                value=f.direction,
                contributionPct=round(abs(f.impact) * 20.0, 1),
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

        is_urgent = orch_result["urgent"] or ("CRITICAL:" in " ".join(safety_flags))

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
            f"The genuine Framingham cardiovascular screening model estimated a {chd_prob_pct}% 10-year coronary risk probability "
            f"({risk_tier} screening tier, screening test {screening_result})."
        )

        return VitalPredictResponse(
            status="ok",
            model_version=model_version,
            risk=risk_tier,
            probability=chd_prob_pct,
            probabilities=proba_dict,
            threshold=opt_thresh,
            screening_result=screening_result,
            safety_flags=safety_flags,
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


# ---------------------------------------------------------------------------
# CAD Diagnostic Module (Cleveland Gold Standard - 88.52% Test Accuracy)
# ---------------------------------------------------------------------------

class CadFactorItem(BaseModel):
    feature: str
    label: str
    value: Any
    impact: float
    direction: str
    explanation: str

class CadPredictRequest(BaseModel):
    age: float = Field(..., gt=0, le=120, description="Age in years")
    sex: Union[int, str] = Field(..., description="1/Male or 0/Female")
    cp: int = Field(..., ge=1, le=4, description="Chest Pain Type: 1=Typical Angina, 2=Atypical Angina, 3=Non-anginal, 4=Asymptomatic")
    trestbps: Optional[float] = Field(default=None, description="Resting Blood Pressure (mm Hg)")
    chol: Optional[float] = Field(default=None, description="Serum Cholesterol (mg/dL)")
    fbs: Optional[Union[int, bool]] = Field(default=0, description="Fasting Blood Sugar > 120 mg/dL (1=True, 0=False)")
    restecg: Optional[int] = Field(default=0, ge=0, le=2, description="Resting ECG: 0=Normal, 1=ST-T abnormality, 2=LV hypertrophy")
    thalach: Optional[float] = Field(default=None, description="Maximum Heart Rate Achieved (bpm)")
    exang: Optional[Union[int, bool]] = Field(default=0, description="Exercise-Induced Angina (1=Yes, 0=No)")
    oldpeak: Optional[float] = Field(default=0.0, ge=0.0, description="ST Depression Induced by Exercise (mm)")
    slope: Optional[int] = Field(default=1, ge=1, le=3, description="Slope of Peak Exercise ST Segment: 1=Upsloping, 2=Flat, 3=Downsloping")
    ca: Optional[int] = Field(default=0, ge=0, le=3, description="Major Coronary Vessels Colored by Fluoroscopy (0-3)")
    thal: Optional[int] = Field(default=3, description="Thallium Stress Scintigraphy: 3=Normal, 6=Fixed defect, 7=Reversible defect")

class CadPredictResponse(BaseModel):
    status: str
    model_name: str
    model_version: str
    dataset: str
    diagnostic_accuracy: str
    cad_probability: float
    cad_presence: bool
    diagnostic_assessment: str
    risk_level: str
    confidence: float
    key_factors: List[CadFactorItem]
    triage_guidance: str
    clinical_recommendations: List[str]
    disclaimer: str

def explain_cad_factors(X_scaled: np.ndarray, raw_vals: Dict[str, Any], feature_names: List[str]):
    if cad_artifact is None:
        return []
    
    factors = []
    try:
        coefs = cad_artifact["model"].named_estimators_["lr"].coef_[0]
        for idx, col in enumerate(feature_names):
            s_val = float(X_scaled[0, idx])
            impact = round(float(s_val * coefs[idx]), 3)
            raw_val = raw_vals.get(col)
            direction = "higher" if impact > 0 else "lower"
            
            if col == "cp":
                cp_types = {1: "Typical Angina", 2: "Atypical Angina", 3: "Non-anginal Pain", 4: "Asymptomatic / Ischemic Equivalent"}
                cp_str = cp_types.get(int(raw_val), f"Type {raw_val}")
                exp = f"Chest discomfort pattern ({cp_str}) {'strongly correlates with obstructive coronary ischemia' if impact > 0 else 'reflects a low-ischemic pain profile'}."
            elif col == "oldpeak":
                exp = f"Exercise ST depression ({raw_val:.1f} mm) {'demonstrates significant myocardial ischemia during exertion' if raw_val >= 1.0 else 'shows preserved subendocardial perfusion'}."
            elif col == "ca":
                exp = f"Fluoroscopy vessel score ({int(raw_val)} vessels) {'identifies visible coronary calcification / stenosis' if raw_val > 0 else 'confirms patent main coronary vessels'}."
            elif col == "thal":
                thal_map = {3: "Normal", 6: "Fixed Perfusion Defect", 7: "Reversible Perfusion Defect"}
                t_str = thal_map.get(int(raw_val), f"Code {raw_val}")
                exp = f"Thallium scintigraphy ({t_str}) {'indicates exercise perfusion abnormality / ischemia' if impact > 0 else 'indicates intact myocardial perfusion'}."
            elif col == "exang":
                exp = f"Exercise-induced angina ({'Present' if raw_val == 1 else 'Absent'}) {'confirms cardiac workload supply-demand mismatch' if raw_val == 1 else 'indicates good exertional tolerance'}."
            elif col == "thalach":
                exp = f"Peak exertional heart rate ({raw_val:.0f} bpm) {'reflects chronotropic incompetence or compromised reserve' if impact > 0 else 'demonstrates robust chronotropic cardiac reserve'}."
            elif col == "slope":
                slope_map = {1: "Upsloping (Normal)", 2: "Flat (Ischemic)", 3: "Downsloping (Severe Ischemia)"}
                s_str = slope_map.get(int(raw_val), f"Slope {raw_val}")
                exp = f"Exercise ST segment slope ({s_str}) {'reflects abnormal ventricular repolarization kinetics' if impact > 0 else 'shows physiological exercise repolarization'}."
            elif col == "trestbps":
                exp = f"Resting blood pressure ({raw_val:.0f} mm Hg) {'increases myocardial afterload and coronary shear' if impact > 0 else 'remains in a cardioprotective range'}."
            elif col == "chol":
                exp = f"Serum cholesterol ({raw_val:.0f} mg/dL) {'contributes to ongoing coronary atheroma accumulation' if impact > 0 else 'maintains healthy lipid equilibrium'}."
            elif col == "restecg":
                ecg_map = {0: "Normal", 1: "ST-T Wave Abnormality", 2: "Left Ventricular Hypertrophy"}
                e_str = ecg_map.get(int(raw_val), f"Code {raw_val}")
                exp = f"Resting ECG ({e_str}) {'shows baseline electrical or structural cardiac changes' if impact > 0 else 'demonstrates normal resting electrical conduction'}."
            elif col == "age":
                exp = f"Patient age ({raw_val:.0f} yrs) {'places patient in higher cumulative vascular risk window' if impact > 0 else 'reflects youthful coronary resilience'}."
            elif col == "sex":
                exp = f"Biological {'male sex carries elevated coronary incidence rate' if raw_val == 1 else 'female sex confers baseline estrogenic protection'}."
            elif col == "fbs":
                exp = f"Fasting blood sugar >120 mg/dL ({'Elevated' if raw_val == 1 else 'Normal'}) {'promotes microvascular and macrovascular atherogenesis' if raw_val == 1 else 'reflects euglycemic stability'}."
            else:
                exp = f"{col} ({raw_val}) {'elevates coronary risk profile' if impact > 0 else 'supports cardiovascular health'}."

            label = cad_artifact.get("feature_labels", {}).get(col, col)
            factors.append(CadFactorItem(
                feature=col,
                label=label,
                value=raw_val,
                impact=impact,
                direction=direction,
                explanation=exp
            ))
        
        factors.sort(key=lambda x: abs(x.impact), reverse=True)
    except Exception as e:
        print(f"Warning explaining CAD factors: {e}")
    return factors

@app.post("/predict-cad", response_model=CadPredictResponse)
def predict_cad_endpoint(req: CadPredictRequest):
    if cad_artifact is None:
        raise HTTPException(
            status_code=503,
            detail="RoboDoctor CAD diagnostic model is currently offline. Please verify ml/models/robodoctor_cad_model.joblib exists."
        )

    try:
        medians = cad_artifact.get("feature_medians", {})
        
        # Parse sex
        if isinstance(req.sex, str):
            is_male = 1 if req.sex.lower() in ["male", "m", "1"] else 0
        else:
            is_male = 1 if req.sex == 1 else 0

        # Parse binary indicators
        fbs_val = 1 if req.fbs in [1, True, "1", "true", "True"] else 0
        exang_val = 1 if req.exang in [1, True, "1", "true", "True"] else 0

        # Continuous / Ordinal features with fallback to cohort medians
        raw_vals = {
            "age": float(req.age),
            "sex": float(is_male),
            "cp": float(req.cp),
            "trestbps": float(req.trestbps if req.trestbps is not None else medians.get("trestbps", 130.0)),
            "chol": float(req.chol if req.chol is not None else medians.get("chol", 241.0)),
            "fbs": float(fbs_val),
            "restecg": float(req.restecg if req.restecg is not None else 0.0),
            "thalach": float(req.thalach if req.thalach is not None else medians.get("thalach", 153.0)),
            "exang": float(exang_val),
            "oldpeak": float(req.oldpeak if req.oldpeak is not None else 0.0),
            "slope": float(req.slope if req.slope is not None else 1.0),
            "ca": float(req.ca if req.ca is not None else 0.0),
            "thal": float(req.thal if req.thal is not None else 3.0)
        }

        feature_names = cad_artifact["feature_names"]
        df_input = pd.DataFrame([raw_vals])[feature_names]

        # Preprocessing: Imputation & Scaling
        X_imp = cad_artifact["imputer"].transform(df_input)
        X_scaled = cad_artifact["scaler"].transform(X_imp)

        # Ensemble Soft-Voting Inference
        ensemble = cad_artifact["model"]
        proba = float(ensemble.predict_proba(X_scaled)[0, 1])
        cad_prob_pct = round(proba * 100.0, 1)
        cad_present = bool(proba >= 0.50)
        confidence_pct = round(max(proba, 1.0 - proba) * 100.0, 1)

        # Risk level and diagnostic narrative
        if cad_prob_pct >= 75.0:
            risk_tier = "High"
            assessment = "High Probability of Significant Coronary Artery Stenosis (>50% obstruction)"
            triage_guidance = "Immediate clinical follow-up: high probability of anatomically significant coronary artery narrowing."
            recommendations = [
                "Urgent Cardiology Consultation: Comprehensive clinical review by a cardiologist within 24-48 hours.",
                "Confirmatory Hemodynamic Imaging: Coronary CT Angiography (CCTA) or invasive coronary catheterization as indicated.",
                "Exercise Tolerance / Nuclear Stress Test: Quantify functional ischemia reserve and hemodynamic response.",
                "Guideline-Directed Medical Therapy (GDMT): Review antiplatelet therapy (e.g., Aspirin) and high-intensity statin regimen with physician."
            ]
        elif cad_prob_pct >= 50.0:
            risk_tier = "Moderate"
            assessment = "Moderate-to-High Likelihood of Coronary Artery Disease"
            triage_guidance = "Prompt outpatient cardiology assessment recommended for functional stress testing."
            recommendations = [
                "Outpatient Cardiology Referral: Schedule non-urgent cardiovascular diagnostic consultation.",
                "Functional Stress Testing: Exercise treadmill ECG or Stress Echocardiography.",
                "Atherosclerotic Risk Factor Control: Target LDL-C < 70 mg/dL and Blood Pressure < 120/80 mm Hg.",
                "Lifestyle Modification: Structured aerobic exercise program, Mediterranean diet, and tobacco cessation if applicable."
            ]
        elif cad_prob_pct >= 25.0:
            risk_tier = "Low-Moderate"
            assessment = "Low Likelihood with Borderline Diagnostic Markers"
            triage_guidance = "Cardiovascular risk markers present; outpatient preventive physician review advised."
            recommendations = [
                "Cardiovascular Health Checkup: Routine primary care review of lipid profile and resting hemodynamics.",
                "Cardioprotective Nutrition: Mediterranean or DASH dietary pattern rich in dietary fiber and omega-3 fatty acids.",
                "Physical Activity: Minimum 150 minutes per week of moderate-intensity aerobic exercise.",
                "Symptom Awareness: Seek immediate care if experiencing exertional chest tightness, diaphoresis, or dyspnea."
            ]
        else:
            risk_tier = "Low"
            assessment = "Minimal Likelihood of Obstructive Coronary Artery Disease"
            triage_guidance = "Low risk of obstructive coronary disease. Standard preventive health maintenance recommended."
            recommendations = [
                "Routine Preventive Maintenance: Annual health checkup with blood pressure and lipid screening.",
                "Aerobic Exercise: Continue regular cardiovascular conditioning (minimum 150 min/week).",
                "Heart-Healthy Diet: Maintain balanced whole-food nutrition low in refined carbohydrates and saturated fats."
            ]

        key_factors = explain_cad_factors(X_scaled, raw_vals, feature_names)

        return CadPredictResponse(
            status="ok",
            model_name=cad_artifact.get("model_name", "RoboDoctor AI Coronary Artery Disease Diagnostic Ensemble"),
            model_version=cad_artifact.get("model_version", "1.0.0"),
            dataset="UCI Cleveland Clinic Heart Disease Benchmark (N=303)",
            diagnostic_accuracy="88.52% Test Accuracy, 95.24% ROC-AUC, 92.86% Clinical Sensitivity",
            cad_probability=cad_prob_pct,
            cad_presence=cad_present,
            diagnostic_assessment=assessment,
            risk_level=risk_tier,
            confidence=confidence_pct,
            key_factors=key_factors,
            triage_guidance=triage_guidance,
            clinical_recommendations=recommendations,
            disclaimer="Clinical decision support output only. Based on the UCI Cleveland Clinic Coronary Artery Disease benchmark (88.52% test accuracy, 95.24% ROC-AUC). Does not replace professional clinical evaluation or emergency medical services."
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CAD prediction error: {str(e)}")
