import os
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report

FEATURE_COLS = [
    "age",
    "weight_kg",
    "height_cm",
    "bmi",
    "systolic_bp",
    "diastolic_bp",
    "blood_sugar_mg_dl",
    "heart_rate_bpm",
    "symptom_fever",
    "symptom_cough",
    "symptom_cold",
    "symptom_fatigue",
    "symptom_headache",
    "symptom_dizziness",
    "symptom_chest_pain",
    "symptom_shortness_of_breath",
    "symptom_nausea",
    "symptom_vomiting",
    "symptom_body_ache",
    "symptom_sore_throat"
]

TARGET_COL = "risk_category"

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, "data", "robodoctor_vital_risk_synthetic_dataset.csv")

    if not os.path.exists(dataset_path):
        print(f"Dataset not found at {dataset_path}, generating synthetic dataset...")
        from generate_dataset import generate_synthetic_dataset
        generate_synthetic_dataset()

    df = pd.read_csv(dataset_path)
    print(f"Loaded dataset from {dataset_path}. Total rows: {len(df)}")

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    models = {
        "Logistic Regression": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42))
        ]),
        "Random Forest": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", RandomForestClassifier(n_estimators=100, random_state=42))
        ]),
        "Gradient Boosting": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", GradientBoostingClassifier(n_estimators=100, random_state=42))
        ])
    }

    best_model_name = None
    best_model = None
    best_f1 = -1.0
    results = {}

    print("\n--- Model Evaluation ---")
    for name, model_pipeline in models.items():
        model_pipeline.fit(X_train, y_train)
        y_pred = model_pipeline.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="weighted")
        cm = confusion_matrix(y_test, y_pred, labels=["Low", "Moderate", "High"])
        
        results[name] = {
            "accuracy": acc,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "confusion_matrix": cm,
            "pipeline": model_pipeline
        }

        print(f"\nModel: {name}")
        print(f"  Accuracy:  {acc:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall:    {recall:.4f}")
        print(f"  F1 Score:  {f1:.4f}")
        print(f"  Confusion Matrix (Low, Moderate, High):\n{cm}")

        if f1 > best_f1:
            best_f1 = f1
            best_model_name = name
            best_model = model_pipeline

    print(f"\n==========================================")
    print(f"Best Model Selected: {best_model_name} (F1 Score: {best_f1:.4f})")
    print(f"==========================================\n")

    # Save best model
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    model_output_path = os.path.join(models_dir, "robodoctor_vital_risk_model.joblib")
    
    # Save model pipeline along with feature names and classes order
    artifact = {
        "pipeline": best_model,
        "feature_cols": FEATURE_COLS,
        "classes": list(best_model.classes_),
        "best_model_name": best_model_name,
        "metrics": {
            "accuracy": results[best_model_name]["accuracy"],
            "f1_score": results[best_model_name]["f1_score"]
        }
    }
    
    joblib.dump(artifact, model_output_path)
    print(f"Saved trained model artifact to: {model_output_path}")

if __name__ == "__main__":
    main()
