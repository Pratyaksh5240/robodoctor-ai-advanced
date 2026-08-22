# RoboDoctor Vital Check ML Service

Isolated machine learning pipeline and FastAPI inference service for RoboDoctor's Vital Risk Check feature.

## Directory Layout

```text
ml/
├── data/
│   └── robodoctor_vital_risk_synthetic_dataset.csv
├── models/
│   └── robodoctor_vital_risk_model.joblib
├── generate_dataset.py
├── train_model.py
├── api/
│   └── main.py
├── requirements.txt
└── README.md
```

## Running Model Training

To generate the synthetic dataset (if not present) and train/evaluate the Logistic Regression, Random Forest, and Gradient Boosting models:

```bash
python ml/train_model.py
```

The script evaluates model accuracy, precision, recall, F1 score, and confusion matrices, then exports the best performing model pipeline to `ml/models/robodoctor_vital_risk_model.joblib`.

## Starting the FastAPI ML Inference Service

Start the inference server on `http://127.0.0.1:8000`:

```bash
python -m uvicorn ml.api.main:app --host 127.0.0.1 --port 8000 --reload
```

## Endpoints

* `GET /health` — Service health check.
* `POST /predict` — Runs ML vital risk prediction for supplied health inputs.

### Sample `/predict` Payload

```json
{
  "age": 50,
  "heightCm": 170,
  "weightKg": 90,
  "bloodPressure": "155/96",
  "bloodSugar": 168,
  "heartRate": 94,
  "symptoms": "fatigue"
}
```
