"""
Clinical Pipeline Transformer and Feature Engineering Module for RoboDoctor AI
Framingham Cardiovascular Risk Screening System (V4)
"""

import sys
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

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

ENGINEERED_FEATURE_COLS = [
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
    "glucose",
    "pulsePressure",
    "meanArterialPressure",
    "smokeCumulativeExposure",
    "metabolicIndex",
    "ageSquared",
    "age_sysBP",
    "age_male",
    "age_diabetes"
]

class ClinicalPipelineTransformer(BaseEstimator, TransformerMixin):
    """
    Scikit-learn compliant transformer that performs:
    1. Hemodynamic inversion correction (sysBP >= diaBP)
    2. Smoking-stratified imputation (cigsPerDay: 0 if non-smoker, median if smoker)
    3. Median/mode imputation for clinical markers
    4. Physiologically-grounded hemodynamic and metabolic feature engineering
    """
    def __init__(self):
        self.smoker_med_ = 15.0
        self.num_meds_ = {
            "totChol": 236.0,
            "sysBP": 132.0,
            "diaBP": 82.0,
            "BMI": 25.8,
            "heartRate": 75.0,
            "glucose": 82.0
        }
        self.cat_modes_ = {
            "BPMeds": 0.0,
            "education": 2.0
        }

    def fit(self, X, y=None):
        X_df = X.copy()
        if "currentSmoker" in X_df.columns and "cigsPerDay" in X_df.columns:
            smokers = X_df[X_df["currentSmoker"] == 1]["cigsPerDay"].dropna()
            if len(smokers) > 0:
                self.smoker_med_ = float(smokers.median())
        for c in ["totChol", "sysBP", "diaBP", "BMI", "heartRate", "glucose"]:
            if c in X_df.columns and not X_df[c].dropna().empty:
                self.num_meds_[c] = float(X_df[c].median())
        for c in ["BPMeds", "education"]:
            if c in X_df.columns and not X_df[c].dropna().empty:
                self.cat_modes_[c] = float(X_df[c].mode().iloc[0])
        return self

    def transform(self, X):
        X_df = X.copy()
        
        # 1. Physiologic blood pressure validation & correction (82 inverted BP entries)
        sys_c = np.maximum(X_df["sysBP"], X_df["diaBP"])
        dia_c = np.minimum(X_df["sysBP"], X_df["diaBP"])
        X_df["sysBP"] = sys_c
        X_df["diaBP"] = dia_c
        
        # 2. Smoking-stratified imputation
        if "currentSmoker" in X_df.columns and "cigsPerDay" in X_df.columns:
            X_df.loc[(X_df["currentSmoker"] == 0) & (X_df["cigsPerDay"].isna()), "cigsPerDay"] = 0.0
            X_df.loc[(X_df["currentSmoker"] == 1) & (X_df["cigsPerDay"].isna()), "cigsPerDay"] = self.smoker_med_
            
        # 3. Median & mode imputations
        for c, m in self.cat_modes_.items():
            if c in X_df.columns:
                X_df[c] = X_df[c].fillna(m)
        for c, m in self.num_meds_.items():
            if c in X_df.columns:
                X_df[c] = X_df[c].fillna(m)
                
        # 4. Clinical engineered biomarkers
        X_df["pulsePressure"] = sys_c - dia_c
        X_df["meanArterialPressure"] = (sys_c + 2.0 * dia_c) / 3.0
        X_df["smokeCumulativeExposure"] = X_df["age"] * X_df["cigsPerDay"]
        X_df["metabolicIndex"] = X_df["BMI"] * X_df["glucose"]
        X_df["ageSquared"] = (X_df["age"] / 10.0) ** 2
        X_df["age_sysBP"] = (X_df["age"] * sys_c) / 100.0
        X_df["age_male"] = X_df["age"] * X_df["male"]
        X_df["age_diabetes"] = X_df["age"] * X_df["diabetes"]
        
        return X_df

# Bind into __main__ so unpickling works across all entrypoints
if "__main__" in sys.modules:
    setattr(sys.modules["__main__"], "ClinicalPipelineTransformer", ClinicalPipelineTransformer)
