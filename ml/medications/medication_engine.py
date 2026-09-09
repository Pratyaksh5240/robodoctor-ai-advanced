import os
import json
from typing import Dict, List, Any

KB_PATH = os.path.join(os.path.dirname(__file__), "medication_knowledge.json")

def load_medication_kb() -> List[Dict[str, Any]]:
    if not os.path.exists(KB_PATH):
        return []
    with open(KB_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

MEDICATION_KB = load_medication_kb()

def get_educational_medication_info(
    systolic: float,
    diastolic: float,
    glucose: float,
    tot_chol: float,
    chd_risk_tier: str,
    is_urgent: bool
) -> List[Dict[str, Any]]:
    """
    Retrieves relevant educational medication information cards based on vitals and cardiovascular risk.
    Strictly educational: NO prescriptions, NO dosing, NO autonomous treatment.
    Suppressed if acute emergency symptoms are active.
    """
    if is_urgent:
        return [
            {
                "id": "emergency_override",
                "category": "Emergency Safety Notice",
                "title": "Emergency Priority — Do Not Self-Medicate",
                "generalPurpose": "Acute symptoms such as chest pain or severe shortness of breath require immediate medical evaluation.",
                "medicationClasses": [
                    "Emergency Services / Hospital Care"
                ],
                "safetyConsiderations": "Do not attempt self-treatment or start new medications during an acute emergency.",
                "contraindicationsWarnings": "Delaying emergency evaluation to self-medicate carries severe risk.",
                "clinicianDiscussionPoints": "Seek immediate emergency care now."
            }
        ]

    matched_items = []

    has_high_bp = systolic >= 130 or diastolic >= 80
    has_high_glucose = glucose >= 126
    has_high_chol = tot_chol >= 240
    has_high_risk = chd_risk_tier in ["High", "Moderate"]

    for item in MEDICATION_KB:
        trigger = item.get("condition_trigger")
        should_include = False

        if trigger == "elevated_bp" and has_high_bp:
            should_include = True
        elif trigger == "elevated_glucose" and has_high_glucose:
            should_include = True
        elif trigger == "elevated_cholesterol" and has_high_chol:
            should_include = True
        elif trigger == "high_cardiovascular_risk" and has_high_risk:
            should_include = True

        if should_include:
            matched_items.append({
                "id": item["id"],
                "category": item["category"],
                "title": item["title"],
                "generalPurpose": item["general_purpose"],
                "medicationClasses": item["medication_classes"],
                "safetyConsiderations": item["safety_considerations"],
                "contraindicationsWarnings": item["contraindications_warnings"],
                "clinicianDiscussionPoints": item["clinician_discussion_points"]
            })

    if not matched_items:
        # Default educational card for routine wellness
        matched_items.append({
            "id": "routine_wellness_med_info",
            "category": "General Medication Wellness",
            "title": "Routine Prescription & OTC Safety",
            "generalPurpose": "Understanding your regular medications and dietary supplements helps prevent unintended drug interactions and optimizes therapy.",
            "medicationClasses": [
                "Prescription Medications",
                "Over-The-Counter (OTC) Supplements"
            ],
            "safetyConsiderations": "Always maintain an updated list of all medications, vitamins, and herbal supplements you consume.",
            "contraindicationsWarnings": "Never alter or stop prescribed chronic medications without consulting your prescribing doctor.",
            "clinicianDiscussionPoints": "Bring your complete medication bottle list to your annual health checkup."
        })

    return matched_items
