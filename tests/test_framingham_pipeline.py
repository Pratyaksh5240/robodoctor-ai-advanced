import os
import sys
import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ml.pipeline import ClinicalPipelineTransformer, RAW_FEATURE_COLS, ENGINEERED_FEATURE_COLS
from ml.api.main import app
import ml.api.main as api_module

client = TestClient(app)

def test_pipeline_transformer_bp_inversion():
    """Test that inverted blood pressures (sysBP <= diaBP) are corrected physiologically."""
    transformer = ClinicalPipelineTransformer()
    df_raw = pd.DataFrame([{
        "male": 1, "age": 50.0, "education": 2.0, "currentSmoker": 0, "cigsPerDay": 0.0,
        "BPMeds": 0.0, "prevalentStroke": 0.0, "prevalentHyp": 0.0, "diabetes": 0.0,
        "totChol": 210.0, "sysBP": 80.0, "diaBP": 130.0,  # Inverted BP!
        "BMI": 25.0, "heartRate": 70.0, "glucose": 85.0
    }])
    transformer.fit(df_raw)
    transformed = transformer.transform(df_raw)
    
    # sysBP must be max, diaBP min
    assert transformed["sysBP"].iloc[0] == 130.0
    assert transformed["diaBP"].iloc[0] == 80.0
    assert transformed["pulsePressure"].iloc[0] == 50.0
    assert transformed["meanArterialPressure"].iloc[0] == pytest.approx((130.0 + 160.0) / 3.0)

def test_pipeline_transformer_smoking_stratification():
    """Test that smoking-stratified imputation correctly fills 0 for non-smokers and median for smokers."""
    transformer = ClinicalPipelineTransformer()
    df_train = pd.DataFrame([
        {"male": 1, "age": 50, "education": 2, "currentSmoker": 1, "cigsPerDay": 20.0, "BPMeds": 0, "prevalentStroke": 0, "prevalentHyp": 0, "diabetes": 0, "totChol": 200, "sysBP": 120, "diaBP": 80, "BMI": 25, "heartRate": 70, "glucose": 80},
        {"male": 0, "age": 45, "education": 2, "currentSmoker": 1, "cigsPerDay": 10.0, "BPMeds": 0, "prevalentStroke": 0, "prevalentHyp": 0, "diabetes": 0, "totChol": 200, "sysBP": 120, "diaBP": 80, "BMI": 25, "heartRate": 70, "glucose": 80},
    ])
    transformer.fit(df_train)
    
    df_test = pd.DataFrame([
        {"male": 1, "age": 50, "education": 2, "currentSmoker": 0, "cigsPerDay": np.nan, "BPMeds": 0, "prevalentStroke": 0, "prevalentHyp": 0, "diabetes": 0, "totChol": 200, "sysBP": 120, "diaBP": 80, "BMI": 25, "heartRate": 70, "glucose": 80},
        {"male": 1, "age": 50, "education": 2, "currentSmoker": 1, "cigsPerDay": np.nan, "BPMeds": 0, "prevalentStroke": 0, "prevalentHyp": 0, "diabetes": 0, "totChol": 200, "sysBP": 120, "diaBP": 80, "BMI": 25, "heartRate": 70, "glucose": 80},
    ])
    transformed = transformer.transform(df_test)
    assert transformed["cigsPerDay"].iloc[0] == 0.0
    assert transformed["cigsPerDay"].iloc[1] == 15.0  # median smoker

def test_pipeline_transformer_biomarkers():
    """Verify all engineered features are generated properly."""
    transformer = ClinicalPipelineTransformer()
    sample = pd.DataFrame([{
        "male": 1, "age": 60.0, "education": 3.0, "currentSmoker": 1, "cigsPerDay": 20.0,
        "BPMeds": 1.0, "prevalentStroke": 0.0, "prevalentHyp": 1.0, "diabetes": 1.0,
        "totChol": 240.0, "sysBP": 150.0, "diaBP": 90.0, "BMI": 30.0, "heartRate": 80.0, "glucose": 140.0
    }])
    transformed = transformer.transform(sample)
    for col in ENGINEERED_FEATURE_COLS:
        assert col in transformed.columns
    assert transformed["pulsePressure"].iloc[0] == 60.0
    assert transformed["metabolicIndex"].iloc[0] == 30.0 * 140.0
    assert transformed["smokeCumulativeExposure"].iloc[0] == 60.0 * 20.0

def test_api_health_endpoint():
    """Verify health endpoint returns status ok and model version 4.0.0."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["has_chd_model"] is True
    assert data["model_version"] == "4.0.0"
    assert data["optimal_threshold"] == 0.37

def test_api_normal_vitals():
    """Verify normal vital readings produce a negative screening result and reasonable risk."""
    payload = {
        "age": 32, "heightCm": 172, "weightKg": 68,
        "bloodPressure": "115/75", "bloodSugar": 88, "heartRate": 68,
        "symptoms": "Feeling great, normal routine checkup",
        "sex": "female", "currentSmoker": False, "cigsPerDay": 0, "bpMeds": False
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_version"] == "4.0.0"
    assert data["screening_result"] == "negative"
    assert data["threshold"] == 0.37
    assert data["probability"] < 37.0
    assert isinstance(data["topContributingFactors"], list)
    assert len(data["topContributingFactors"]) > 0

def test_api_hypertensive_crisis_and_diabetes():
    """Verify high-risk inputs trigger positive screening result and critical safety flags."""
    payload = {
        "age": 68, "heightCm": 165, "weightKg": 95,
        "bloodPressure": "188/112", "bloodSugar": 275, "heartRate": 128,
        "symptoms": "dizziness, severe headache",
        "sex": "male", "currentSmoker": True, "cigsPerDay": 25, "bpMeds": True
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["screening_result"] == "positive"
    assert data["risk"] == "High"
    assert data["probability"] >= 37.0
    
    # Verify safety flags
    flags = " ".join(data["safety_flags"])
    assert "CRITICAL: Hypertensive Crisis" in flags
    assert "CRITICAL: Severe Hyperglycemia" in flags
    assert "VASCULAR: Widened Pulse Pressure" in flags

def test_symptom_isolation():
    """
    CRITICAL HEALTHCARE AI INVARIANT:
    Free-text symptoms (e.g. 'cancer', 'fever', 'cough') must NEVER contaminate the
    Framingham cardiovascular ML feature vector or alter the computed 10-year CVD risk.
    """
    base_vitals = {
        "age": 52, "heightCm": 175, "weightKg": 78,
        "bloodPressure": "135/85", "bloodSugar": 105, "heartRate": 76,
        "sex": "male", "currentSmoker": False, "cigsPerDay": 0, "bpMeds": False
    }
    
    payload_clean = {**base_vitals, "symptoms": "routine checkup"}
    payload_unrelated_symptoms = {**base_vitals, "symptoms": "cancer, high fever, severe persistent cough, vomiting"}
    
    resp_clean = client.post("/predict", json=payload_clean)
    resp_symptoms = client.post("/predict", json=payload_unrelated_symptoms)
    
    assert resp_clean.status_code == 200
    assert resp_symptoms.status_code == 200
    
    d_clean = resp_clean.json()
    d_symptoms = resp_symptoms.json()
    
    # ML probability and screening result must be identical
    assert d_clean["probability"] == d_symptoms["probability"]
    assert d_clean["risk"] == d_symptoms["risk"]
    assert d_clean["screening_result"] == d_symptoms["screening_result"]
    assert d_clean["threshold"] == d_symptoms["threshold"]
    
    # SHAP feature contributions must match exactly
    factors_clean = {f["feature"]: f["impact"] for f in d_clean["topContributingFactors"]}
    factors_symptoms = {f["feature"]: f["impact"] for f in d_symptoms["topContributingFactors"]}
    assert factors_clean == factors_symptoms

def test_malformed_payload_validation():
    """Verify that invalid inputs are rejected cleanly with validation errors."""
    bad_payload = {
        "age": -5,  # Invalid age
        "heightCm": 170,
        "weightKg": 70,
        "bloodPressure": "120/80",
        "bloodSugar": 90,
        "heartRate": 70
    }
    response = client.post("/predict", json=bad_payload)
    assert response.status_code == 422  # Pydantic validation error

def test_model_offline_fallback():
    """
    Verify that when the Framingham model artifact is unavailable,
    the API returns explicit status: 'model_unavailable' with HTTP 503
    and NEVER returns a fabricated or synthetic percentage.
    """
    saved_artifact = api_module.framingham_artifact
    try:
        api_module.framingham_artifact = None  # Simulate offline model
        
        payload = {
            "age": 45, "heightCm": 170, "weightKg": 70,
            "bloodPressure": "120/80", "bloodSugar": 90, "heartRate": 70
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "model_unavailable"
        assert data["probability"] is None
        assert data["tenYearRiskPercent"] is None
        assert data["screening_result"] == "unavailable"
        assert "offline" in data["error"].lower()
    finally:
        api_module.framingham_artifact = saved_artifact  # Restore
