import os
import numpy as np
import pandas as pd

def generate_synthetic_dataset(num_samples=2000, seed=42):
    np.random.seed(seed)
    
    ages = np.random.randint(18, 85, size=num_samples)
    heights = np.random.normal(168, 10, size=num_samples).clip(145, 200)
    weights = np.random.normal(72, 16, size=num_samples).clip(40, 140)
    
    bmis = weights / ((heights / 100) ** 2)
    
    # Base blood pressure, blood sugar, heart rate correlated with age & BMI
    systolic_bp = 100 + (ages * 0.3) + ((bmis - 22) * 1.2) + np.random.normal(0, 8, size=num_samples)
    diastolic_bp = 65 + (ages * 0.15) + ((bmis - 22) * 0.8) + np.random.normal(0, 5, size=num_samples)
    blood_sugar = 80 + (ages * 0.3) + ((bmis - 22) * 1.5) + np.random.normal(0, 15, size=num_samples)
    heart_rate = 65 + ((bmis - 22) * 0.4) + np.random.normal(0, 8, size=num_samples)

    # Symptoms list
    symptom_cols = [
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
    
    symptoms_data = {}
    for col in symptom_cols:
        # Chest pain / shortness of breath slightly more likely with high BP/age
        if col in ["symptom_chest_pain", "symptom_shortness_of_breath", "symptom_dizziness"]:
            prob = 0.05 + (ages / 300)
        elif col in ["symptom_fatigue", "symptom_headache"]:
            prob = 0.15
        else:
            prob = 0.08
        symptoms_data[col] = (np.random.rand(num_samples) < prob).astype(int)

    # Build symptoms_text column
    symptom_name_map = {
        "symptom_fever": "fever",
        "symptom_cough": "cough",
        "symptom_cold": "cold",
        "symptom_fatigue": "fatigue",
        "symptom_headache": "headache",
        "symptom_dizziness": "dizziness",
        "symptom_chest_pain": "chest pain",
        "symptom_shortness_of_breath": "shortness of breath",
        "symptom_nausea": "nausea",
        "symptom_vomiting": "vomiting",
        "symptom_body_ache": "body ache",
        "symptom_sore_throat": "sore throat"
    }

    symptoms_text_list = []
    for i in range(num_samples):
        active = [symptom_name_map[col] for col in symptom_cols if symptoms_data[col][i] == 1]
        symptoms_text_list.append(", ".join(active) if active else "none")

    # Risk Category calculation rule for high quality ground truth synthetic labels
    risk_categories = []
    for i in range(num_samples):
        score = 0
        sbp = systolic_bp[i]
        dbp = diastolic_bp[i]
        glu = blood_sugar[i]
        hr = heart_rate[i]
        b = bmis[i]
        ag = ages[i]
        cp = symptoms_data["symptom_chest_pain"][i]
        sob = symptoms_data["symptom_shortness_of_breath"][i]
        diz = symptoms_data["symptom_dizziness"][i]
        fat = symptoms_data["symptom_fatigue"][i]

        if sbp >= 140 or dbp >= 90: score += 3
        elif sbp >= 130 or dbp >= 85: score += 1.5

        if glu >= 180: score += 3
        elif glu >= 140: score += 2
        elif glu >= 110: score += 1

        if b >= 35: score += 2.5
        elif b >= 30: score += 1.5

        if hr >= 100 or hr <= 50: score += 1.5

        if ag >= 65: score += 1.5
        elif ag >= 50: score += 1

        if cp: score += 4
        if sob: score += 3
        if diz: score += 1.5
        if fat: score += 1

        if score >= 5.5:
            risk_categories.append("High")
        elif score >= 2.5:
            risk_categories.append("Moderate")
        else:
            risk_categories.append("Low")

    df = pd.DataFrame({
        "age": ages.astype(int),
        "weight_kg": np.round(weights, 1),
        "height_cm": np.round(heights, 1),
        "bmi": np.round(bmis, 2),
        "systolic_bp": np.round(systolic_bp, 1),
        "diastolic_bp": np.round(diastolic_bp, 1),
        "blood_sugar_mg_dl": np.round(blood_sugar, 1),
        "heart_rate_bpm": np.round(heart_rate, 1),
        "symptoms_text": symptoms_text_list,
        **symptoms_data,
        "risk_category": risk_categories
    })

    out_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "robodoctor_vital_risk_synthetic_dataset.csv")
    df.to_csv(out_file, index=False)
    print(f"Generated dataset with {len(df)} samples at: {out_file}")
    print("Class distribution:")
    print(df["risk_category"].value_counts())

if __name__ == "__main__":
    generate_synthetic_dataset()
