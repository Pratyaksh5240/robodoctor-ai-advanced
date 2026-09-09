# RoboDoctor Vital Check & Framingham Cardiovascular Intelligence (V4)

Production machine learning pipeline, Jupyter notebook audit suite, and FastAPI inference service for RoboDoctor's Vital Risk Check & 10-Year Cardiovascular Risk Assessment.

## Directory Layout

```text
ml/
├── api/
│   ├── main.py                     # FastAPI service (V4 inference, SHAP, safety flags, offline fallback)
│   └── __init__.py
├── data/
│   ├── framingham.csv              # Genuine Framingham dataset (4,240 rows, 15 features)
│   └── robodoctor_vital_risk_synthetic_dataset.csv
├── figures/                        # Publication-quality clinical diagnostic figures
│   ├── 01_missing_values.png       # Missingness patterns across 15 features
│   ├── 01_target_distribution.png  # TenYearCHD distribution and prevalence
│   ├── 02_feature_correlations.png # Clinical biomarker correlation matrix
│   ├── 03_threshold_optimization.png # Sensitivity vs precision threshold curve
│   ├── 04_calibration_curve.png    # Probability calibration reliability curve
│   ├── 05_test_evaluation_curves.png # ROC and PR curves on held-out test set
│   └── 06_shap_summary.png         # SHAP feature attribution summary plot
├── models/
│   ├── robodoctor_framingham_cvd_model_v4.joblib # Production V4 model artifact
│   ├── robodoctor_framingham_chd_model.joblib    # Rollback V3 model artifact
│   └── robodoctor_vital_risk_model.joblib        # Legacy V1 synthetic model
├── notebooks/                      # 5-Phase End-to-End Jupyter Research Suite
│   ├── 01_framingham_dataset_audit.ipynb
│   ├── 02_framingham_data_cleaning.ipynb
│   ├── 03_framingham_feature_engineering.ipynb
│   ├── 04_framingham_validation_strategy.ipynb
│   └── 05_framingham_error_analysis.ipynb
├── pipeline.py                     # ClinicalPipelineTransformer and feature engineering
├── MODEL_CARD.md                   # Full clinical model card & 3-way evaluation
├── requirements.txt                # Python dependencies
└── README.md
tests/
└── test_framingham_pipeline.py     # Automated pytest test suite (9 integration tests)
```

## Key Clinical Achievements (V4 vs Baseline)

| Metric | Old Baseline (V2) | Production V4 Ensemble | Clinical Impact |
| :--- | :---: | :---: | :--- |
| **Recall / Sensitivity** | 67.85% | **85.82%** | **+17.97% gain** (339 / 395 true cases caught) |
| **Missed Cases (FN)** | 127 | **56** | **55.9% reduction** in life-threatening false negatives |
| **Precision (PPV)** | 62.47% | **55.85%** | Controlled above 55.0% clinical floor |
| **ROC-AUC** | 72.80% | **72.88%** | Robust global discrimination |
| **Brier Score** | 0.2107 | **0.2116** | Well-calibrated continuous probabilities |
| **Operating Cutoff** | $T=0.50$ | **$T=0.37$** | Validation-locked screening threshold |

## Running the Automated Test Suite

Execute the 9 integration tests covering normal vitals, hypertensive crisis, diabetes, missing values, BP inversion, symptom isolation, and offline fallbacks:

```bash
python -m pytest tests/test_framingham_pipeline.py -v
```

## Starting the FastAPI Inference Server

Launch the high-performance inference service on `http://127.0.0.1:8000`:

```bash
python -m uvicorn ml.api.main:app --host 127.0.0.1 --port 8000 --reload
```

## API Endpoints

- `GET /health` — Service health status, model version (`4.0.0`), threshold (`0.37`), and test metrics.
- `POST /predict` — Complete vital risk screening, SHAP feature attributions, safety flags, and recommendations.
- `POST /predict-chd` — Dedicated Framingham 10-year CVD screening endpoint.
- `POST /skin-predict` — HAM10000 7-class dermatological lesion classifier.

### Sample `/predict` Request

```json
{
  "age": 55,
  "heightCm": 172,
  "weightKg": 82,
  "bloodPressure": "145/92",
  "bloodSugar": 110,
  "heartRate": 78,
  "symptoms": "mild fatigue",
  "sex": "male",
  "currentSmoker": true,
  "cigsPerDay": 15,
  "bpMeds": false
}
```

### Sample `/predict` Response

```json
{
  "status": "ok",
  "model_version": "4.0.0",
  "risk": "High",
  "probability": 68.4,
  "threshold": 0.37,
  "screening_result": "positive",
  "safety_flags": [
    "WARNING: Stage 2 Hypertension range detected. Chronic elevated arterial wall stress.",
    "BEHAVIORAL: Active tobacco smoking accelerates endothelial oxidative injury and thrombosis liability."
  ],
  "bmi": 27.72,
  "model": "Framingham Heart Study 10-Year CVD Screening Ensemble (v4.0)",
  "urgent": false
}
```

## Architectural Invariants & Safety

1. **Strict Symptom Isolation:** Free-text symptoms (`fever`, `cough`, `cancer`) are strictly isolated to recommendation and triage modules and **NEVER** enter the Framingham cardiovascular ML vector.
2. **Offline Fallback Guarantee:** When the ML service is offline, the API returns explicit `status: "model_unavailable"` with HTTP 503 instead of fabricating synthetic predictions.
3. **Rollback Safe:** Both V4 (`robodoctor_framingham_cvd_model_v4.joblib`) and previous V3 (`robodoctor_framingham_chd_model.joblib`) artifacts are retained for instant rollback capability.
