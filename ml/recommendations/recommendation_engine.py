import os
import json
import numpy as np
from typing import Dict, List, Any, Optional

FEATURE_SCHEMA = [
    "low_bmi",
    "high_bmi",
    "obese_bmi",
    "elevated_bp",
    "high_bp",
    "low_bp",
    "high_glucose",
    "very_high_glucose",
    "high_heart_rate",
    "low_heart_rate",
    "fever",
    "cough",
    "cold",
    "fatigue",
    "headache",
    "dizziness",
    "chest_pain",
    "shortness_of_breath",
    "nausea",
    "vomiting",
    "body_ache",
    "sore_throat",
    "low_risk",
    "moderate_risk",
    "high_risk"
]

SYMPTOM_NAME_MAP = {
    "symptom_fever": "fever",
    "symptom_cough": "cough",
    "symptom_cold": "cold",
    "symptom_fatigue": "fatigue",
    "symptom_headache": "headache",
    "symptom_dizziness": "dizziness",
    "symptom_chest_pain": "chest_pain",
    "symptom_shortness_of_breath": "shortness_of_breath",
    "symptom_nausea": "nausea",
    "symptom_vomiting": "vomiting",
    "symptom_body_ache": "body_ache",
    "symptom_sore_throat": "sore_throat"
}

# Priority Level Weights (lower number = higher priority order)
PRIORITY_ORDER = {
    "P0": 0,  # Emergency / Immediate Safety
    "P1": 1,  # Significant Abnormal Vital
    "P2": 2,  # High-Risk ML Pattern
    "P3": 3,  # Moderate-Risk ML Pattern
    "P4": 4   # Routine Monitoring / Wellness
}

# Load recommendations database
KB_PATH = os.path.join(os.path.dirname(__file__), "recommendations.json")

def load_knowledge_base() -> List[Dict[str, Any]]:
    if not os.path.exists(KB_PATH):
        raise FileNotFoundError(f"Recommendation knowledge base not found at: {KB_PATH}")
    with open(KB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

KNOWLEDGE_BASE = load_knowledge_base()

def build_patient_vector(
    bmi: float,
    systolic: float,
    diastolic: float,
    sugar: float,
    heart_rate: float,
    symptom_flags: Dict[str, int],
    ml_risk: str
) -> np.ndarray:
    vector_dict = {feat: 0.0 for feat in FEATURE_SCHEMA}

    # BMI features
    if bmi < 18.5:
        vector_dict["low_bmi"] = 1.0
    elif bmi >= 30.0:
        vector_dict["obese_bmi"] = 1.0
        vector_dict["high_bmi"] = 1.0
    elif bmi >= 25.0:
        vector_dict["high_bmi"] = 1.0

    # BP features
    if systolic >= 140 or diastolic >= 90:
        vector_dict["high_bp"] = 1.0
        vector_dict["elevated_bp"] = 1.0
    elif systolic >= 130 or diastolic >= 80:
        vector_dict["elevated_bp"] = 1.0
    elif systolic < 90 or diastolic < 60:
        vector_dict["low_bp"] = 1.0

    # Sugar features
    if sugar >= 180:
        vector_dict["very_high_glucose"] = 1.0
        vector_dict["high_glucose"] = 1.0
    elif sugar >= 140:
        vector_dict["high_glucose"] = 1.0

    # Heart Rate features
    if heart_rate > 100:
        vector_dict["high_heart_rate"] = 1.0
    elif heart_rate < 60:
        vector_dict["low_heart_rate"] = 1.0

    # Symptom features
    for sym_col, sym_name in SYMPTOM_NAME_MAP.items():
        if symptom_flags.get(sym_col, 0) == 1:
            vector_dict[sym_name] = 1.0

    # ML Risk features
    if ml_risk == "High":
        vector_dict["high_risk"] = 1.0
    elif ml_risk == "Moderate":
        vector_dict["moderate_risk"] = 1.0
    else:
        vector_dict["low_risk"] = 1.0

    return np.array([vector_dict[feat] for feat in FEATURE_SCHEMA], dtype=float)

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def evaluate_safety_and_priorities(
    systolic: float,
    diastolic: float,
    sugar: float,
    heart_rate: float,
    symptoms_text: str,
    ml_risk: str
) -> Dict[str, Any]:
    """
    Isolated Safety Evaluator that checks critical vitals and acute symptoms.
    Surfaces P0 (Emergency) or P1 (Significant Abnormal Vital) priority findings.
    """
    norm_symptoms = (symptoms_text or "").lower()
    urgent_triggers = ["chest pain", "shortness of breath", "breathlessness", "difficulty breathing", "saans ki dikkat"]
    is_emergency_symptom = any(trigger in norm_symptoms for trigger in urgent_triggers)

    priority_finding = None

    # P0: Emergency Symptoms
    if is_emergency_symptom:
        priority_finding = {
            "title": "Emergency Symptom Pattern Detected",
            "detail": "Acute symptoms (such as chest discomfort or difficulty breathing) require immediate clinical attention.",
            "explanation": "Acute symptoms take immediate precedence over all screening models and routine monitoring.",
            "severity": "P0"
        }
        return {"priorityFinding": priority_finding, "urgent": True}

    # P1: Critical Abnormal Vitals
    # 1. Very Low Heart Rate (<= 45 bpm)
    if heart_rate <= 45:
        detail_msg = f"Heart rate entered as {int(heart_rate)} bpm. Please confirm the reading and seek prompt medical evaluation, especially if dizziness, fainting, weakness, confusion, or chest discomfort is present."
        explanation_msg = f"Very low heart rate ({int(heart_rate)} bpm) requires priority attention despite the model's {ml_risk.lower()} overall risk classification." if ml_risk != "High" else f"Very low heart rate ({int(heart_rate)} bpm) is a critical vital finding."
        priority_finding = {
            "title": "Very Low Heart Rate Detected",
            "detail": detail_msg,
            "explanation": explanation_msg,
            "severity": "P1"
        }
    # 2. Severely High Heart Rate (>= 130 bpm)
    elif heart_rate >= 130:
        priority_finding = {
            "title": "Severely High Heart Rate Detected",
            "detail": f"Heart rate entered as {int(heart_rate)} bpm at rest. Seek prompt medical evaluation if high pulse persists.",
            "explanation": f"Severely elevated heart rate ({int(heart_rate)} bpm) requires priority review despite the model's {ml_risk.lower()} overall classification.",
            "severity": "P1"
        }
    # 3. Blood Pressure Crisis (Systolic >= 180 or Diastolic >= 120)
    elif systolic >= 180 or diastolic >= 120:
        priority_finding = {
            "title": "Blood Pressure Crisis Level Detected",
            "detail": f"Blood pressure entered as {int(systolic)}/{int(diastolic)} mmHg. Seek prompt medical evaluation.",
            "explanation": f"Crisis-level blood pressure requires priority clinical review despite the model's {ml_risk.lower()} overall classification.",
            "severity": "P1"
        }
    # 4. Critically Low Blood Sugar (< 50 mg/dL)
    elif sugar < 50:
        priority_finding = {
            "title": "Critically Low Blood Sugar Detected",
            "detail": f"Blood sugar entered as {int(sugar)} mg/dL. Take fast-acting glucose and seek medical assistance if symptoms occur.",
            "explanation": f"Critically low sugar requires immediate attention despite the model's {ml_risk.lower()} overall classification.",
            "severity": "P1"
        }

    return {"priorityFinding": priority_finding, "urgent": False}

def assign_item_priority(
    item_id: str,
    patient_vector: np.ndarray,
    systolic: float,
    diastolic: float,
    sugar: float,
    heart_rate: float,
    ml_risk: str,
    is_urgent: bool
) -> str:
    """
    Assigns P0-P4 priority tier to each recommendation item based on patient profile.
    """
    if item_id == "urgent_medical_evaluation" and is_urgent:
        return "P0"

    if item_id == "heart_rate_rhythm_tracking" and (heart_rate <= 45 or heart_rate >= 130):
        return "P1"

    if item_id in ["blood_pressure_evaluation", "repeat_bp_monitoring"] and (systolic >= 140 or diastolic >= 90 or systolic >= 180 or diastolic >= 120):
        return "P1"

    if item_id in ["blood_glucose_evaluation", "fasting_sugar_followup", "endocrinology_consultation"] and (sugar >= 180 or sugar < 50):
        return "P1"

    if ml_risk == "High":
        return "P2"
    elif ml_risk == "Moderate":
        return "P3"
    
    return "P4"

def get_orchestrated_recommendations(
    patient_vector: np.ndarray,
    systolic: float,
    diastolic: float,
    sugar: float,
    heart_rate: float,
    symptoms_text: str,
    ml_risk: str,
    min_threshold: float = 0.15,
    top_n: int = 4
) -> Dict[str, Any]:
    
    # 1. Run Safety Engine & Priority Evaluator
    safety_eval = evaluate_safety_and_priorities(
        systolic=systolic,
        diastolic=diastolic,
        sugar=sugar,
        heart_rate=heart_rate,
        symptoms_text=symptoms_text,
        ml_risk=ml_risk
    )
    
    is_urgent = safety_eval["urgent"]
    priority_finding = safety_eval["priorityFinding"]

    scored_items = []

    # 2. Compute Cosine Similarity for Knowledge Base Items
    for item in KNOWLEDGE_BASE:
        if item["id"] == "urgent_medical_evaluation" and not is_urgent:
            continue

        item_vec = np.array([item["feature_profile"].get(feat, 0.0) for feat in FEATURE_SCHEMA], dtype=float)
        sim = cosine_similarity(patient_vector, item_vec)

        # Force similarity score = 1.0 (100%) for Urgent Medical Evaluation when emergency triggered
        if item["id"] == "urgent_medical_evaluation" and is_urgent:
            sim = 1.0
            score_pct = 100.0
        else:
            score_pct = round(sim * 100.0, 1)

        priority_tier = assign_item_priority(
            item_id=item["id"],
            patient_vector=patient_vector,
            systolic=systolic,
            diastolic=diastolic,
            sugar=sugar,
            heart_rate=heart_rate,
            ml_risk=ml_risk,
            is_urgent=is_urgent
        )

        if sim >= min_threshold or is_urgent:
            scored_items.append({
                "id": item["id"],
                "title": item["title"],
                "description": item["description"],
                "category": item["category"],
                "reason": item["reason"],
                "score": score_pct,
                "priority": priority_tier,
                "priority_weight": PRIORITY_ORDER[priority_tier],
                "raw_sim": sim
            })

    # 3. Priority Orchestration Sorting: Priority Group First (P0 -> P1 -> P2 -> P3 -> P4), Cosine Similarity Second
    scored_items.sort(key=lambda x: (x["priority_weight"], -x["raw_sim"]))

    # Fallback if no items met threshold
    if not scored_items:
        for item in KNOWLEDGE_BASE:
            if item["id"] == "routine_vital_monitoring":
                scored_items.append({
                    "id": item["id"],
                    "title": item["title"],
                    "description": item["description"],
                    "category": item["category"],
                    "reason": item["reason"],
                    "score": 75.0,
                    "priority": "P4",
                    "priority_weight": 4,
                    "raw_sim": 0.75
                })

    top_items = scored_items[:top_n]

    # Clean output dictionary list
    final_recommendations = []
    for item in top_items:
        clean_rec = {
            "id": item["id"],
            "title": item["title"],
            "description": item["description"],
            "category": item["category"],
            "reason": item["reason"],
            "score": item["score"],
            "priority": item["priority"]
        }
        final_recommendations.append(clean_rec)

    return {
        "priorityFinding": priority_finding,
        "recommendations": final_recommendations,
        "urgent": is_urgent
    }
