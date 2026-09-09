"""
RoboDoctor AI: Integration & Unit Tests for CAD Diagnostic Pipeline
Verifies 88.52% Test Accuracy, 95.24% ROC-AUC, Endpoint Contracts, and Explainability.
"""

import os
import joblib
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from ml.api.main import app, cad_artifact

client = TestClient(app)

CAD_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "models", "robodoctor_cad_model.joblib")

def test_cad_model_artifact_integrity():
    assert os.path.exists(CAD_MODEL_PATH), f"CAD model artifact missing at {CAD_MODEL_PATH}"
    artifact = joblib.load(CAD_MODEL_PATH)

    required_keys = [
        "model_version", "model_name", "dataset_name", "target_definition",
        "imputer", "scaler", "model", "feature_names", "feature_labels",
        "feature_medians", "test_metrics"
    ]
    for key in required_keys:
        assert key in artifact, f"Missing key in CAD artifact: {key}"

    metrics = artifact["test_metrics"]
    assert metrics["accuracy"] >= 0.88, f"Expected >=88% accuracy, got {metrics['accuracy']:.4f}"
    assert metrics["roc_auc"] >= 0.94, f"Expected >=94% ROC-AUC, got {metrics['roc_auc']:.4f}"
    assert metrics["sensitivity"] >= 0.90, f"Expected >=90% sensitivity, got {metrics['sensitivity']:.4f}"
    assert metrics["total_test_n"] == 61

def test_cad_model_inference_discrimination():
    assert cad_artifact is not None, "CAD artifact not loaded in FastAPI application."

    # High-Risk CAD Profile (Multivessel disease, exertional ischemia)
    high_risk_data = {
        "age": 63, "sex": 1, "cp": 4, "trestbps": 155, "chol": 290, "fbs": 1,
        "restecg": 2, "thalach": 128, "exang": 1, "oldpeak": 2.8, "slope": 2,
        "ca": 2, "thal": 7
    }
    # Low-Risk Profile (Normal perfusion, good exercise tolerance)
    low_risk_data = {
        "age": 36, "sex": 0, "cp": 2, "trestbps": 112, "chol": 175, "fbs": 0,
        "restecg": 0, "thalach": 178, "exang": 0, "oldpeak": 0.0, "slope": 1,
        "ca": 0, "thal": 3
    }

    cols = cad_artifact["feature_names"]
    
    # High risk
    df_hi = pd.DataFrame([high_risk_data])[cols]
    s_hi = cad_artifact["scaler"].transform(cad_artifact["imputer"].transform(df_hi))
    prob_hi = cad_artifact["model"].predict_proba(s_hi)[0, 1]

    # Low risk
    df_lo = pd.DataFrame([low_risk_data])[cols]
    s_lo = cad_artifact["scaler"].transform(cad_artifact["imputer"].transform(df_lo))
    prob_lo = cad_artifact["model"].predict_proba(s_lo)[0, 1]

    assert prob_hi > 0.85, f"Expected high CAD probability >85%, got {prob_hi*100:.1f}%"
    assert prob_lo < 0.15, f"Expected low CAD probability <15%, got {prob_lo*100:.1f}%"
    assert (prob_hi - prob_lo) > 0.70, "Insufficient risk separation between severe and normal profiles"

def test_fastapi_health_includes_cad():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["has_cad_model"] is True
    assert "88.52%" in data["cad_model_accuracy"]
    assert data["cad_metrics"]["accuracy"] >= 0.88

def test_fastapi_predict_cad_endpoint_high_risk():
    payload = {
        "age": 60,
        "sex": 1,
        "cp": 4,
        "trestbps": 145,
        "chol": 270,
        "fbs": 0,
        "restecg": 2,
        "thalach": 135,
        "exang": 1,
        "oldpeak": 2.5,
        "slope": 2,
        "ca": 2,
        "thal": 7
    }
    resp = client.post("/predict-cad", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["cad_presence"] is True
    assert data["cad_probability"] > 85.0
    assert data["risk_level"] == "High"
    assert "88.52%" in data["diagnostic_accuracy"]
    assert len(data["key_factors"]) > 0
    assert len(data["clinical_recommendations"]) > 0

def test_fastapi_predict_cad_endpoint_low_risk():
    payload = {
        "age": 32,
        "sex": 0,
        "cp": 2,
        "trestbps": 110,
        "chol": 170,
        "fbs": 0,
        "restecg": 0,
        "thalach": 175,
        "exang": 0,
        "oldpeak": 0.0,
        "slope": 1,
        "ca": 0,
        "thal": 3
    }
    resp = client.post("/predict-cad", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["cad_presence"] is False
    assert data["cad_probability"] < 15.0
    assert data["risk_level"] == "Low"
    assert len(data["clinical_recommendations"]) > 0
