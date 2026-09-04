import type {
  HealthReportRecord,
  SkinReportRecord,
  UserProfileRecord,
} from "@/lib/reportHistory";

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

export function mapRecordsToSbar(
  healthReport?: HealthReportRecord | null,
  skinReport?: SkinReportRecord | null,
  profile?: UserProfileRecord | null,
  fallbackName?: string
): SbarReportData {
  if (!healthReport) {
    const sample = generateSampleSbarData();
    if (profile?.patientName || fallbackName) {
      sample.patientName = profile?.patientName || fallbackName || sample.patientName;
    }
    if (profile?.age) sample.age = profile.age;
    if (profile?.gender) sample.gender = profile.gender;
    return sample;
  }

  const dateObj = new Date(healthReport.createdAt);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const reportId = `RBD-${dateObj.getFullYear()}${(dateObj.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${dateObj.getDate().toString().padStart(2, "0")}-${randomDigits}`;

  const bpVal = healthReport.bp
    ? healthReport.bp.includes("mmHg")
      ? healthReport.bp
      : `${healthReport.bp} mmHg`
    : "120/80 mmHg";
  const sugarVal = parseFloat(healthReport.sugar) || 100;
  const hrVal = parseFloat(healthReport.heartRate) || 72;

  const rawRisk = (healthReport.riskLevel || "").toLowerCase();
  let overallRiskLevel: "low" | "moderate" | "high" | "urgent" = "low";
  if (rawRisk.includes("emergency") || rawRisk.includes("urgent")) {
    overallRiskLevel = "urgent";
  } else if (rawRisk.includes("high")) {
    overallRiskLevel = "high";
  } else if (rawRisk.includes("moderate")) {
    overallRiskLevel = "moderate";
  }

  const redFlags: Array<{ title: string; detail: string; severity: string }> = [];
  if (healthReport.summary) {
    redFlags.push({
      title: "Vital Risk Assessment",
      detail: healthReport.summary,
      severity: overallRiskLevel,
    });
  }
  if (skinReport) {
    redFlags.push({
      title: `Skin Lesion (${skinReport.bodyPart})`,
      detail: `${skinReport.summary} (Severity: ${skinReport.severity})`,
      severity: skinReport.severity.toLowerCase(),
    });
  }

  const precautions = [
    "Schedule a follow-up with your physician to discuss your recent vital readings.",
    "Monitor blood pressure and blood sugar regularly as recommended by your physician.",
    "Maintain healthy dietary habits, adequate hydration, and moderate activity.",
  ];
  if (skinReport) {
    precautions.push(
      `Protect the examined ${skinReport.bodyPart} area from excessive sun exposure using broad-spectrum SPF 50+.`
    );
  }

  let recommendedFollowUp = "Arrange a primary care routine consultation within 2 to 4 weeks.";
  if (overallRiskLevel === "urgent" || overallRiskLevel === "high") {
    recommendedFollowUp =
      "Seek immediate clinical consultation or emergency care within 24 to 48 hours.";
  } else if (overallRiskLevel === "moderate") {
    recommendedFollowUp = "Arrange a primary physician consultation within 1 to 2 weeks.";
  }

  return {
    reportId,
    generatedAt: `${dateStr} at ${timeStr}`,
    patientName: profile?.patientName || fallbackName || "Patient Summary Record",
    age: profile?.age || 45,
    gender: profile?.gender || "Not Specified",
    primaryChiefComplaint: healthReport.summary || "Routine vital health screening",
    symptomsList: [
      "Vital risk check completed",
      ...(skinReport ? [`Skin screening (${skinReport.bodyPart})`] : []),
    ],
    symptomDuration: "Recent screening",
    affectedBodyPart: skinReport ? `${skinReport.bodyPart} / General Vitals` : "General Vitals",
    vitals: {
      bloodPressure: bpVal,
      bloodSugar: sugarVal,
      heartRate: hrVal,
      weightKg: 70,
      heightCm: 170,
      bmi: 24.2,
    },
    skinScreening: skinReport
      ? {
          topPattern: skinReport.summary,
          confidence: Math.round(skinReport.score * 0.95),
          highRiskFlag: skinReport.severity === "High" || skinReport.severity === "Urgent",
          uncertainFlag: false,
        }
      : undefined,
    // TODO: Connect labValues to Firestore user lab reports collection in future release
    labValues: {
      fastingSugar: sugarVal,
    },
    // TODO: Connect currentMedicines to user reminder schedule or medicine checker history
    currentMedicines: [],
    overallRiskLevel,
    riskScore: healthReport.riskScore,
    redFlags,
    // TODO: Connect detectedDrugInteractions to medicine checker saved history
    detectedDrugInteractions: [],
    precautions,
    recommendedFollowUp,
  };
}

