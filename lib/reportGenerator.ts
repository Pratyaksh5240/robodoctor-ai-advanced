export interface SbarReportData {
  reportId: string;
  generatedAt: string;
  patientName: string;
  age: number;
  gender: string;
  // Subjective
  primaryChiefComplaint: string;
  symptomsList: string[];
  symptomDuration: string;
  affectedBodyPart: string;
  // Objective
  vitals: {
    bloodPressure: string;
    bloodSugar: number;
    heartRate: number;
    weightKg: number;
    heightCm: number;
    bmi: number;
  };
  skinScreening?: {
    topPattern: string;
    confidence: number;
    highRiskFlag: boolean;
    uncertainFlag: boolean;
  };
  labValues?: {
    hbA1c?: number;
    fastingSugar?: number;
    hemoglobin?: number;
    tsh?: number;
    totalCholesterol?: number;
  };
  currentMedicines: string[];
  // Assessment
  overallRiskLevel: "low" | "moderate" | "high" | "urgent";
  riskScore: number;
  redFlags: Array<{ title: string; detail: string; severity: string }>;
  detectedDrugInteractions: Array<{ title: string; severity: string }>;
  // Plan
  precautions: string[];
  recommendedFollowUp: string;
}

export function generateSampleSbarData(): SbarReportData {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const randomDigits = Math.floor(1000 + Math.random() * 9000);

  return {
    reportId: `RBD-${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}-${randomDigits}`,
    generatedAt: `${dateStr} at ${timeStr}`,
    patientName: "Patient Summary Record",
    age: 48,
    gender: "Not Specified",
    primaryChiefComplaint:
      "Patient reports intermittent fatigue, elevated blood pressure readings, and a changing dark spot on left forearm for 3 weeks.",
    symptomsList: ["Fatigue", "Mild headache", "Itchy pigmented skin spot", "Occasional breathlessness"],
    symptomDuration: "2 to 4 weeks",
    affectedBodyPart: "Left Forearm / General Vitals",
    vitals: {
      bloodPressure: "138/88 mmHg",
      bloodSugar: 142,
      heartRate: 82,
      weightKg: 78,
      heightCm: 172,
      bmi: 26.37,
    },
    skinScreening: {
      topPattern: "Melanocytic Nevus / Pigmented Spot",
      confidence: 78.4,
      highRiskFlag: false,
      uncertainFlag: false,
    },
    labValues: {
      fastingSugar: 135,
      hbA1c: 6.8,
      hemoglobin: 13.8,
      tsh: 2.4,
      totalCholesterol: 215,
    },
    currentMedicines: ["Metformin 500mg", "Amlodipine 5mg", "Multivitamins"],
    overallRiskLevel: "moderate",
    riskScore: 62,
    redFlags: [
      {
        title: "Stage 1 Hypertension Trend",
        detail: "Systolic BP 138 mmHg exceeds optimal threshold (<120 mmHg).",
        severity: "moderate",
      },
      {
        title: "Elevated Fasting Blood Glucose",
        detail: "Fasting sugar 142 mg/dL with HbA1c 6.8% indicates diabetic range.",
        severity: "high",
      },
      {
        title: "Pigmented Lesion Duration > 2 Weeks",
        detail: "Skin spot lasting > 2 weeks warrants dermatologist review.",
        severity: "moderate",
      },
    ],
    detectedDrugInteractions: [
      {
        title: "Metformin + Alcohol Warning: Risk of Lactic Acidosis",
        severity: "major",
      },
    ],
    precautions: [
      "Schedule a routine follow-up with your primary physician or endocrinologist for blood sugar management.",
      "Protect skin spot from direct sunlight with broad-spectrum SPF 50+ sunscreen.",
      "Monitor blood pressure daily in the morning and evening.",
      "Avoid heavy alcohol consumption while taking Metformin.",
    ],
    recommendedFollowUp:
      "Arrange a primary doctor or dermatologist appointment within 1 to 2 weeks for comprehensive physical exam.",
  };
}
