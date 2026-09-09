# 🩺 Model Card: RoboDoctor Framingham 10-Year CHD Risk Model

## 1. Model Details
- **Developer:** RoboDoctor AI Clinical Engineering Team
- **Model Date:** September 2026
- **Model Version:** v2.0 (Trained on genuine Framingham Heart Study data)
- **Model Types Evaluated:**
  1. Regularized Logistic Regression (L2 penalty, `class_weight='balanced'`, C=0.5)
  2. Gradient-Boosted Decision Trees (XGBoost with `scale_pos_weight`)
- **Selected Production Model:** `Regularized Logistic Regression (Balanced)`
- **Feature Attribution Framework:** SHAP (SHapley Additive exPlanations)

---

## 2. Intended Use & Clinical Scope
- **Intended Use:** 10-year prospective cardiovascular risk screening for adult patients based on clinical biometrics (blood pressure, cholesterol, glucose, smoking, BMI, diabetes, family stroke/hypertension).
- **Clinical Setting:** Patient self-triage, pre-consultation risk stratification, and physician SBAR report handover.
- **What It Should NOT Be Used For:**
  - ❌ Acute emergency triage: Does NOT evaluate active myocardial infarction (heart attack) or unstable angina. Active chest pain requires immediate emergency services.
  - ❌ Definitive diagnostic prescription: Does not replace physician diagnosis or coronary angiography.
  - ❌ Pediatric patients: Framingham cohorts are validated for adults (age 30–75).

---

## 3. Training Dataset
- **Source:** Framingham Heart Study (genuine longitudinal cohort dataset, 4,240 records).
- **Target Variable:** `TenYearCHD` (1 = Patient developed coronary heart disease within 10 years, 0 = No CHD).
- **Class Balance:**
  - Class 0 (Negative): 2,266 records (53.4%)
  - Class 1 (Positive): 1,974 records (46.6%)
- **Input Features (15 biometrics):**
  `male, age, education, currentSmoker, cigsPerDay, BPMeds, prevalentStroke, prevalentHyp, diabetes, totChol, sysBP, diaBP, BMI, heartRate, glucose`.
- **Missing Value Strategy:** Median imputation across all clinical features (`SimpleImputer(strategy='median')`), ensuring zero patient records were dropped.

---

## 4. Rigorous Clinical Evaluation Metrics (Held-Out 20% Stratified Test Set: 848 Patients)

Headline plain accuracy is deliberately not used as the decision criterion due to clinical safety priorities. We evaluate **AUC-ROC (Risk Discrimination)**, **Recall / Sensitivity (Minimizing missed high-risk patients)**, **Precision (Positive Predictive Value)**, and **Brier Score (Probability Calibration)**.

| Metric | Logistic Regression (Balanced) | XGBoost (Balanced) | Clinical Meaning |
| :--- | :---: | :---: | :--- |
| **AUC-ROC** | **72.80%** (0.7280) | **71.35%** (0.7135) | Ability to rank higher-risk patients above lower-risk patients across all thresholds. |
| **Positive Recall (Sensitivity)** | **67.85%** (0.6785) | **64.81%** (0.6481) | **Crucial clinical metric**: Percentage of actual future CHD patients successfully flagged. |
| **Precision (PPV)** | **62.47%** (0.6247) | **61.39%** (0.6139) | Reliability of a positive risk alert. |
| **F1 Score** | **0.6505** | **0.6305** | Harmonic mean of sensitivity and precision. |
| **Brier Score (Calibration)** | **0.2107** | **0.2155** | Measures probability calibration (lower is better; 0 = perfect probability match). |
| **Overall Accuracy** | **66.04%** | **64.62%** | Overall classification rate. |

### Confusion Matrices on Held-Out Test Set (848 Patients)

#### Logistic Regression:
```
                Predicted Negative (0)    Predicted Positive (1)
Actual Neg (0):         292 (TN)                   161 (FP)
Actual Pos (1):         127 (FN)                   268 (TP)
```

#### XGBoost:
```
                Predicted Negative (0)    Predicted Positive (1)
Actual Neg (0):         292 (TN)                   161 (FP)
Actual Pos (1):         139 (FN)                   256 (TP)
```

---

## 5. Explainable AI (XAI) Attribution with SHAP
Every prediction is decomposed into individual biometric contributions using SHAP values:
$$\text{Risk Score} = \text{Base Expected Risk} + \sum_{i=1}^{15} \text{SHAP}_i$$
- **Top Risk Drivers:** e.g., Elevated Systolic Blood Pressure, Total Cholesterol > 240 mg/dL, Active Cigarette Smoking, Advanced Age.
- **Top Protective Factors:** e.g., Optimal Systolic BP (< 120 mmHg), Fasting Glucose < 100 mg/dL, Youthful Age, Non-Smoker status.

---

## 6. Known Limitations & Caveats
1. **Missing Data Imputation:** In clinical practice, incomplete lipid panels or fasting glucose are imputed to population medians until laboratory confirmation is obtained.
2. **Homogeneity of Original Framingham Cohort:** The original Framingham study cohort was primarily white Caucasian. Model predictions should be reviewed in conjunction with ethnically calibrated multi-ethnic ASCVD guidelines when available.
3. **General Symptom Fallback:** Non-cardiovascular acute symptoms (such as fever, acute cough, rash) bypass this model and are evaluated via the RoboDoctor Clinical Rules & Symptom Engine (`lib/healthAnalysis.ts`).
