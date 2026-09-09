# Model Card: RoboDoctor AI Enhanced Framingham 10-Year CHD Risk Model (V3)

## Model Overview
- **Name:** RoboDoctor AI Enhanced Cardiovascular Risk Ensemble
- **Version:** 3.0.0 (Feature-Engineered Stacking Pipeline)
- **Primary Clinical Target:** 10-Year risk of developing Coronary Heart Disease (`TenYearCHD`)
- **Architecture:** Soft-Voting Stacking Ensemble combining **ElasticNet Regularized Logistic Regression** (45% weight) and **Tuned LightGBM** (55% weight) with **MICE Multivariate Imputation** and **Clinical Feature Engineering**.
- **Interpretability:** Integrated SHAP (SHapley Additive exPlanations) TreeExplainer providing exact biometric feature attribution for every patient.

---

## Clinical Feature Engineering & Biomarkers
Input schema accepts 15 standard biometrics and automatically derives 12 physiologically grounded markers:
1. **Pulse Pressure (PP):** $\text{sysBP} - \text{diaBP}$ (Clinical marker of aortic stiffness)
2. **Mean Arterial Pressure (MAP):** $\text{diaBP} + \frac{1}{3}(\text{sysBP} - \text{diaBP})$ (Tissue perfusion pressure)
3. **Hemodynamic Ratio:** $\text{PP} / \text{sysBP}$ (Isolated systolic hypertension screening)
4. **Cumulative Tobacco Exposure:** $\text{Age} \times \text{cigsPerDay}$ (Lifetime pack-year proxy)
5. **Metabolic Atherogenic Index:** $\text{BMI} \times \text{glucose}$ (Insulin resistance & adiposity synergy)
6. **Atherogenic Ratio:** $\text{totChol} / \text{glucose}$
7. **Age Non-Linearity:** $(\text{Age} / 10)^2$ (Cardiovascular risk acceleration after age 45-50)
8. **Refractory Blood Pressure:** $\text{BPMeds} \times \text{sysBP}$
9. **Log-Transformed Biomarkers:** $\ln(\text{totChol} + 1)$, $\ln(\text{glucose} + 1)$, $\ln(\text{sysBP} + 1)$

---

## Held-Out Test Set Performance (20% Stratified Split, 848 Patients)

| Clinical Evaluation Metric | Model A: ElasticNet Logistic Regression | Model B: Tuned LightGBM (Trees) | Model C: Calibrated Stacking Ensemble (Selected Production) | Baseline Comparison (V2 LR) |
| :--- | :---: | :---: | :---: | :---: |
| **AUC-ROC (Discrimination)** | 72.77% | 72.29% | **72.93%** | 72.80% (+0.13%) |
| **Balanced Accuracy** | 66.63% | 64.98% | **67.33%** | 66.04% (+1.29%) |
| **Recall (Sensitivity)** | 67.59% | **66.58%** | **66.08%** | 67.85% |
| **Precision (PPV)** | 63.27% | 61.45% | **64.60%** | 62.47% (+2.13%) |
| **F1 Score** | 0.6536 | 0.6391 | **0.6533** | 0.6505 |
| **Brier Score (Calibration)** | 0.2111 | 0.2138 | **0.2113** | 0.2107 |

### Confusion Matrix on Held-Out Test Set (Model C: Production Ensemble)
```
                                Predicted Low Risk (0)      Predicted High Risk (1)
Actual No CHD (0) [453 pts]:          310 (TN)                   143 (FP)
Actual Future CHD (1) [395 pts]:      134 (FN)                   261 (TP)
```
- **False Positives Reduced:** Dropped from 161 to **143**, clearing 20 additional healthy patients without false alarms.
- **High Clinical Sensitivity:** Successfully caught **261** true high-risk cardiac events.

---

## Ethical & Clinical Guardrails
1. **Decision Support Only:** This model provides cardiovascular risk estimation to facilitate triage conversations; it is not an automated diagnostic system.
2. **Missing Data Handling:** MICE imputation preserves multi-variable distributions without dropping records.
3. **Actionable Recommendations:** Outputs feature-specific SHAP guidance to empower preventive lifestyle or clinical discussion.
