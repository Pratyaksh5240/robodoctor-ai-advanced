import os
import re
import joblib
import pandas as pd
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

app = FastAPI(title="RoboDoctor Vital Risk ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model artifact
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "robodoctor_vital_risk_model.joblib")

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Trained model file not found at: {MODEL_PATH}. Please run train_model.py first.")

artifact = joblib.load(MODEL_PATH)
model_pipeline = artifact["pipeline"]
FEATURE_COLS = artifact["feature_cols"]
CLASSES = artifact["classes"]

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

class VitalPredictRequest(BaseModel):
    age: float = Field(..., gt=0, le=120, description="Age in years")
    heightCm: float = Field(..., gt=50, le=250, description="Height in cm")
    weightKg: float = Field(..., gt=1, le=300, description="Weight in kg")
    bloodPressure: str = Field(..., description="Blood pressure string e.g. 120/80")
    bloodSugar: float = Field(..., gt=0, le=600, description="Blood sugar in mg/dL")
    heartRate: float = Field(..., gt=0, le=250, description="Heart rate in bpm")
    symptoms: Optional[str] = Field(default="", description="Free text description of symptoms")

    @field_validator("bloodPressure")
    def validate_bp(cls, v: str) -> str:
        if not re.match(r"^\s*\d{2,3}\s*/\s*\d{2,3}\s*$", v):
            raise ValueError("Blood pressure must be in format '120/80'")
        return v

class VitalPredictResponse(BaseModel):
    risk: str
    probabilities: Dict[str, float]
    bmi: float
    recommendations: List[str]
    urgent: bool
    message: str

def parse_bp(bp_str: str):
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

def generate_recommendations_and_safety(
    risk: str,
    systolic: float,
    diastolic: float,
    sugar: float,
    heart_rate: float,
    bmi: float,
    symptoms_text: str
):
    recommendations = []
    norm_symptoms = (symptoms_text or "").lower()

    urgent_triggers = ["chest pain", "shortness of breath", "breathlessness", "difficulty breathing", "saans ki dikkat"]
    urgent = any(trigger in norm_symptoms for trigger in urgent_triggers)

    if risk == "High":
        recommendations.append("Arrange medical evaluation promptly.")
    elif risk == "Moderate":
        recommendations.append("Consider discussing these readings with a healthcare professional.")
    else:
        recommendations.append("Continue routine health monitoring and maintain healthy habits.")

    if systolic >= 140 or diastolic >= 90:
        recommendations.append("Blood pressure reading is elevated and should be reviewed.")
    elif systolic < 90 or diastolic < 60:
        recommendations.append("Blood pressure reading is low; ensure adequate hydration.")

    if sugar >= 140:
        recommendations.append("Blood glucose may require further evaluation by a physician.")

    if heart_rate > 100 or heart_rate < 60:
        recommendations.append("Heart rate is outside standard resting range; consider context.")

    if bmi >= 30:
        recommendations.append("Elevated BMI indicated; consider discussing weight and nutrition with a care provider.")

    if urgent:
        recommendations.append("Urgent symptoms detected. Do not rely on ML screening result for an emergency; seek immediate care.")

    return recommendations, urgent

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "RoboDoctor Vital Risk ML Inference"}

@app.post("/predict", response_model=VitalPredictResponse)
def predict_vital_risk(request: VitalPredictRequest):
    try:
        systolic, diastolic = parse_bp(request.bloodPressure)
        height_m = request.heightCm / 100.0
        bmi = round(request.weightKg / (height_m * height_m), 2)
        symptom_flags = extract_symptoms(request.symptoms)

        feature_dict = {
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

        X_input = pd.DataFrame([feature_dict])[FEATURE_COLS]

        predicted_risk = model_pipeline.predict(X_input)[0]
        probabilities_raw = model_pipeline.predict_proba(X_input)[0]

        proba_dict = {}
        for idx, cls_name in enumerate(CLASSES):
            proba_dict[cls_name] = round(float(probabilities_raw[idx]) * 100.0, 1)

        # Ensure Low, Moderate, High are all present in output
        for cls_name in ["Low", "Moderate", "High"]:
            if cls_name not in proba_dict:
                proba_dict[cls_name] = 0.0

        recommendations, urgent = generate_recommendations_and_safety(
            predicted_risk, systolic, diastolic, request.bloodSugar, request.heartRate, bmi, request.symptoms
        )

        if predicted_risk == "High":
            msg = "The screening model identified a higher-risk pattern in the supplied inputs."
        elif predicted_risk == "Moderate":
            msg = "The screening model identified a moderate-risk pattern in the supplied inputs."
        else:
            msg = "The screening model identified a lower-risk pattern in the supplied inputs."

        return VitalPredictResponse(
            risk=predicted_risk,
            probabilities=proba_dict,
            bmi=bmi,
            recommendations=recommendations,
            urgent=urgent,
            message=msg
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
