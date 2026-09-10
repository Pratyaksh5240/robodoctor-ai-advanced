import type {
  HealthReportRecord,
  SkinReportRecord,
  UserProfileRecord,
  PatientConditionRecord,
  FamilyHistoryRecord,
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
  // Chronic Conditions & Longitudinal History (Feature A)
  chronicConditions?: Array<{
    name: string;
    diagnosedDate: string;
    status: string;
    changeCount: number;
    currentMedicine?: string;
    historySummary: string;
  }>;
  // Family Health History & Generational Patterns (Feature C)
  familyHistory?: Array<{
    relation: string;
    condition: string;
    ageOfOnset?: number | null;
    notes?: string;
  }>;
  familyHistoryPatterns?: string[];
  // Medication Adherence Summary (Feature: Adherence Tracking)
  medicationAdherenceSummary?: {
    totalDoses: number;
    takenDoses: number;
    adherenceRate: number;
    currentStreak: number;
    dateRange: string;
    records?: Array<{
      medication: string;
      scheduledTime: string;
      status: string;
      date: string;
      reason?: string;
    }>;
    selfReportedDisclaimer: string;
  };
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
    currentMedicines: ["Metformin (500mg twice daily)", "Amlodipine (5mg once daily)", "Multivitamins"],
    chronicConditions: [
      {
        name: "Type 2 Diabetes",
        diagnosedDate: "2023-04-10",
        status: "active",
        changeCount: 2,
        currentMedicine: "Metformin 500mg twice daily",
        historySummary: "Metformin 500mg [2023-04-10 - Present]: Initiated at diagnosis",
      },
      {
        name: "Stage 1 Essential Hypertension",
        diagnosedDate: "2024-01-15",
        status: "managed",
        changeCount: 1,
        currentMedicine: "Amlodipine 5mg",
        historySummary: "Amlodipine 5mg [2024-01-15 - Present]: Initiated for BP control",
      },
    ],
    familyHistory: [
      {
        relation: "Father",
        condition: "Type 2 Diabetes",
        ageOfOnset: 52,
        notes: "Oral medication managed",
      },
      {
        relation: "Paternal Grandfather",
        condition: "Coronary Artery Disease",
        ageOfOnset: 64,
        notes: "History of MI",
      },
    ],
    familyHistoryPatterns: [
      "Type 2 Diabetes in Father and Paternal Grandfather",
    ],
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
    medicationAdherenceSummary: {
      totalDoses: 28,
      takenDoses: 26,
      adherenceRate: 93,
      currentStreak: 6,
      dateRange: "Past 30 Days",
      records: [
        { medication: "Amlodipine 5mg", scheduledTime: "08:00", status: "taken", date: "Today" },
        { medication: "Metformin 500mg", scheduledTime: "09:00", status: "taken", date: "Today" },
        { medication: "Atorvastatin 20mg", scheduledTime: "21:00", status: "pending", date: "Today" },
      ],
      selfReportedDisclaimer:
        "Patient self-reported medication adherence logs. May reflect self-reporting inaccuracies. Clinical verification recommended.",
    },
  };
}

export type SbarExportMode =
  | "vitals_only"
  | "skin_only"
  | "combined"
  | "history_only"
  | "family_only"
  | "comprehensive";

export function mapRecordsToSbar(
  healthReport?: HealthReportRecord | null,
  skinReport?: SkinReportRecord | null,
  profile?: UserProfileRecord | null,
  fallbackName?: string,
  mode: SbarExportMode = "vitals_only",
  conditions?: PatientConditionRecord[] | null,
  familyHistory?: FamilyHistoryRecord[] | null,
  adherenceSummary?: SbarReportData["medicationAdherenceSummary"] | null
): SbarReportData {
  const result: SbarReportData = (() => {
    // If literally no records exist across all 4 modules, return sample template
    const hasAnyRecord =

    Boolean(healthReport) ||
    Boolean(skinReport) ||
    (Boolean(conditions) && (conditions?.length ?? 0) > 0) ||
    (Boolean(familyHistory) && (familyHistory?.length ?? 0) > 0);

  if (!hasAnyRecord) {
    const sample = generateSampleSbarData();
    if (profile?.patientName || fallbackName) {
      sample.patientName = profile?.patientName || fallbackName || sample.patientName;
    }
    if (profile?.age) sample.age = profile.age;
    if (profile?.gender) sample.gender = profile.gender;
    return sample;
  }

  // Determine active mode if requested mode cannot be satisfied
  let activeMode: SbarExportMode = mode;
  if (activeMode === "vitals_only" && !healthReport) {
    if (conditions && conditions.length > 0) activeMode = "history_only";
    else if (familyHistory && familyHistory.length > 0) activeMode = "family_only";
    else if (skinReport) activeMode = "skin_only";
  } else if (activeMode === "skin_only" && !skinReport) {
    if (healthReport) activeMode = "vitals_only";
    else if (conditions && conditions.length > 0) activeMode = "history_only";
    else if (familyHistory && familyHistory.length > 0) activeMode = "family_only";
  }

  const primaryRecordDate =
    activeMode === "skin_only" && skinReport
      ? new Date(skinReport.createdAt)
      : healthReport
      ? new Date(healthReport.createdAt)
      : new Date();

  const dateStr = primaryRecordDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = primaryRecordDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const reportId = `RBD-${primaryRecordDate.getFullYear()}${(primaryRecordDate.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${primaryRecordDate.getDate().toString().padStart(2, "0")}-${randomDigits}`;

  const patientName = profile?.patientName || fallbackName || "Patient Summary Record";
  const resolvedAge =
    healthReport?.age ||
    skinReport?.age ||
    profile?.age ||
    45;
  const resolvedGender =
    healthReport?.gender ||
    skinReport?.gender ||
    profile?.gender ||
    "Not Specified";

  // Synthesize chronic conditions from module
  const chronicConditionsList = (conditions || []).map((c) => {
    const activeMed = (c.medicationHistory || []).find(
      (m) => !m.endDate || m.endDate.toLowerCase() === "present"
    );
    const histSumm = (c.medicationHistory || [])
      .map(
        (m) =>
          `${m.medicineName} (${m.dosage}) [${m.startDate} - ${
            m.endDate || "Present"
          }]: ${m.reasonForChange}`
      )
      .join("; ");
    return {
      name: c.name,
      diagnosedDate: c.diagnosedDate,
      status: c.status,
      changeCount: (c.medicationHistory || []).length,
      currentMedicine: activeMed
        ? `${activeMed.medicineName} ${activeMed.dosage}`
        : undefined,
      historySummary: histSumm || "No medication changes recorded",
    };
  });

  // Extract active medications from patient conditions
  const activeMedicationsList: string[] = [];
  (conditions || []).forEach((c) => {
    (c.medicationHistory || []).forEach((m) => {
      if (!m.endDate || m.endDate.toLowerCase() === "present") {
        activeMedicationsList.push(`${m.medicineName} (${m.dosage})`);
      }
    });
  });

  // Synthesize family history & multi-relative patterns
  const familyHistoryList = (familyHistory || []).map((f) => ({
    relation: f.relation,
    condition: f.condition,
    ageOfOnset: f.ageOfOnset,
    notes: f.notes,
  }));

  const famPatterns: string[] = [];
  const famCounts: Record<string, string[]> = {};
  (familyHistory || []).forEach((f) => {
    const k = (f.condition || "").toLowerCase().trim();
    if (!k) return;
    if (!famCounts[k]) famCounts[k] = [];
    if (!famCounts[k].includes(f.relation)) famCounts[k].push(f.relation);
  });
  Object.entries(famCounts).forEach(([cond, rels]) => {
    if (rels.length >= 2) {
      famPatterns.push(`${cond.charAt(0).toUpperCase() + cond.slice(1)} across ${rels.join(", ")}`);
    }
  });

  // --- 1. VITALS ONLY MODE ---
  if (activeMode === "vitals_only" && healthReport) {
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

    const symptomsList: string[] = [];
    if (healthReport.symptoms) {
      const splitSyms = healthReport.symptoms.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
      symptomsList.push(...splitSyms);
    } else if (healthReport.symptomTags && healthReport.symptomTags.length > 0) {
      symptomsList.push(...healthReport.symptomTags);
    }
    symptomsList.push("Cardiovascular vital risk screening completed");

    const redFlags: Array<{ title: string; detail: string; severity: string }> = [];
    if (healthReport.summary) {
      redFlags.push({
        title: "Vital Risk Triage Assessment",
        detail: healthReport.summary,
        severity: overallRiskLevel,
      });
    }

    const precautions = [
      "Schedule a clinical consultation with your physician to evaluate your cardiovascular vitals.",
      "Monitor blood pressure and blood sugar regularly (morning and evening) before meals.",
      "Maintain heart-healthy dietary habits (e.g., DASH / low-sodium guidelines) and adequate hydration.",
    ];

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
      patientName,
      age: resolvedAge,
      gender: resolvedGender,
      primaryChiefComplaint: healthReport.summary || "Routine vital health screening",
      symptomsList,
      symptomDuration: "Recent screening",
      affectedBodyPart: "General Vitals & Cardiovascular System",
      vitals: {
        bloodPressure: bpVal,
        bloodSugar: sugarVal,
        heartRate: hrVal,
        weightKg: healthReport.weightKg || 70,
        heightCm: healthReport.heightCm || 170,
        bmi:
          healthReport.bmi ||
          (healthReport.heightCm && healthReport.weightKg
            ? Number((healthReport.weightKg / Math.pow(healthReport.heightCm / 100, 2)).toFixed(1))
            : 24.2),
      },
      skinScreening: undefined,
      labValues: {
        fastingSugar: sugarVal,
      },
      currentMedicines: activeMedicationsList,
      chronicConditions: chronicConditionsList,
      familyHistory: familyHistoryList,
      familyHistoryPatterns: famPatterns,
      overallRiskLevel,
      riskScore: healthReport.riskScore,
      redFlags,
      detectedDrugInteractions: [],
      precautions,
      recommendedFollowUp,
    };
  }

  // --- 2. SKIN ONLY MODE ---
  if (activeMode === "skin_only" && skinReport) {
    const rawSeverity = (skinReport.severity || "").toLowerCase();
    let overallRiskLevel: "low" | "moderate" | "high" | "urgent" = "low";
    if (rawSeverity.includes("urgent") || rawSeverity.includes("emergency")) {
      overallRiskLevel = "urgent";
    } else if (rawSeverity.includes("high")) {
      overallRiskLevel = "high";
    } else if (rawSeverity.includes("moderate")) {
      overallRiskLevel = "moderate";
    }

    const symptomsList = [
      `Dermatological examination of ${skinReport.bodyPart} region`,
      `Reported pattern: ${skinReport.summary}`,
      ...(skinReport.symptoms ? [skinReport.symptoms] : []),
    ];

    const redFlags: Array<{ title: string; detail: string; severity: string }> = [
      {
        title: `Dermatological Lesion Alert (${skinReport.bodyPart})`,
        detail: `${skinReport.summary} (Assessed Severity: ${skinReport.severity})`,
        severity: overallRiskLevel,
      },
    ];

    const precautions = [
      `Protect the examined ${skinReport.bodyPart} area from excessive direct sun exposure using broad-spectrum SPF 50+.`,
      "Avoid scratching, rubbing, or applying unverified OTC corticosteroid creams to the lesion.",
      "Monitor the lesion for changes in asymmetry, border regularity, color variation, or diameter (>6mm).",
    ];

    let recommendedFollowUp = "Arrange an outpatient dermatology consultation within 2 to 4 weeks.";
    if (overallRiskLevel === "urgent" || overallRiskLevel === "high") {
      recommendedFollowUp =
        "Seek prompt in-person dermatologist evaluation within 48 to 72 hours for dermoscopic exam or biopsy.";
    } else if (overallRiskLevel === "moderate") {
      recommendedFollowUp = "Arrange a clinical dermatologist consultation within 1 to 2 weeks.";
    }

    return {
      reportId,
      generatedAt: `${dateStr} at ${timeStr}`,
      patientName,
      age: resolvedAge,
      gender: resolvedGender,
      primaryChiefComplaint: `Dermatological evaluation for skin lesion or rash on ${skinReport.bodyPart}: ${skinReport.summary}`,
      symptomsList,
      symptomDuration: "Recent dermatology screening",
      affectedBodyPart: `${skinReport.bodyPart.toUpperCase()} Region`,
      vitals: {
        bloodPressure: "N/A (Skin Assessment Only)",
        bloodSugar: 0,
        heartRate: 0,
        weightKg: 0,
        heightCm: 0,
        bmi: 0,
      },
      skinScreening: {
        topPattern: skinReport.summary,
        confidence: Math.round(skinReport.score * 0.95),
        highRiskFlag: skinReport.severity === "High" || skinReport.severity === "Urgent",
        uncertainFlag: false,
      },
      currentMedicines: activeMedicationsList,
      chronicConditions: chronicConditionsList,
      familyHistory: familyHistoryList,
      familyHistoryPatterns: famPatterns,
      overallRiskLevel,
      riskScore: skinReport.score,
      redFlags,
      detectedDrugInteractions: [],
      precautions,
      recommendedFollowUp,
    };
  }

  // --- 4. HISTORY ONLY MODE (Patient Chronic Conditions & Medications) ---
  if (activeMode === "history_only") {
    const totalConditions = chronicConditionsList.length;
    let totalChanges = 0;
    const frequentChangeConditions: string[] = [];

    (conditions || []).forEach((c) => {
      const hist = c.medicationHistory || [];
      totalChanges += hist.length;
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const changesLast12M = hist.filter((m) => {
        const d = new Date(m.startDate);
        return !isNaN(d.getTime()) && d >= oneYearAgo;
      });
      if (changesLast12M.length >= 3 || hist.length >= 3) {
        frequentChangeConditions.push(c.name);
      }
    });

    const isFrequentTitration = frequentChangeConditions.length > 0;
    const overallRiskLevel: "low" | "moderate" | "high" | "urgent" = isFrequentTitration ? "high" : "low";

    const symptomsList = (conditions || []).map(
      (c) => `${c.name} (${c.status.toUpperCase()}) — Diagnosed ${c.diagnosedDate}`
    );
    if (symptomsList.length === 0) {
      symptomsList.push("No chronic medical conditions currently documented");
    }

    const redFlags: Array<{ title: string; detail: string; severity: string }> = [];
    if (isFrequentTitration) {
      redFlags.push({
        title: "Frequent Medication Titration Alert",
        detail: `Frequent prescription adjustments (≥3 changes) noted for: ${frequentChangeConditions.join(
          ", "
        )}. Clinical review is recommended to evaluate medication tolerance, titration stability, and potential adverse effects.`,
        severity: "high",
      });
    }

    const precautions = [
      "Ensure all daily medications are taken consistently as directed by the prescribing physician.",
      "Never adjust dosages or discontinue chronic therapy without physician authorization.",
      "Bring this medication change timeline and all active prescription containers to your next clinical review.",
    ];

    const recommendedFollowUp = isFrequentTitration
      ? "Arrange a structured pharmacotherapy review with your attending specialist within 1 to 2 weeks."
      : "Routine chronic disease management consultation every 3 to 6 months.";

    return {
      reportId: `RBD-HIST-${primaryRecordDate.getFullYear()}${(primaryRecordDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}${primaryRecordDate.getDate().toString().padStart(2, "0")}-${randomDigits}`,
      generatedAt: `${dateStr} at ${timeStr}`,
      patientName,
      age: resolvedAge,
      gender: resolvedGender,
      primaryChiefComplaint: `Longitudinal Chronic Condition & Medication History Audit: ${totalConditions} tracked condition(s), ${activeMedicationsList.length} active prescription(s), ${totalChanges} total medication change(s).`,
      symptomsList,
      symptomDuration: "Longitudinal chronic care timeline",
      affectedBodyPart: "Systemic Chronic Disease & Pharmacotherapy Management",
      vitals: {
        bloodPressure: healthReport?.bp || "Recorded in Clinical Chart",
        bloodSugar: parseFloat(healthReport?.sugar || "0") || 0,
        heartRate: parseFloat(healthReport?.heartRate || "0") || 0,
        weightKg: healthReport?.weightKg || 0,
        heightCm: healthReport?.heightCm || 0,
        bmi: healthReport?.bmi || 0,
      },
      skinScreening: undefined,
      labValues: healthReport ? { fastingSugar: parseFloat(healthReport.sugar) || 0 } : undefined,
      currentMedicines: activeMedicationsList,
      chronicConditions: chronicConditionsList,
      familyHistory: familyHistoryList,
      familyHistoryPatterns: famPatterns,
      overallRiskLevel,
      riskScore: isFrequentTitration ? 70 : 25,
      redFlags,
      detectedDrugInteractions: [],
      precautions,
      recommendedFollowUp,
    };
  }

  // --- 5. FAMILY ONLY MODE (Pedigree Tree & Generational Genetic Risk) ---
  if (activeMode === "family_only") {
    const totalEntries = familyHistoryList.length;
    const hasPatterns = famPatterns.length > 0;
    const overallRiskLevel: "low" | "moderate" | "high" | "urgent" = hasPatterns ? "moderate" : "low";

    const symptomsList = (familyHistory || []).map(
      (f) => `${f.relation.toUpperCase()}: ${f.condition}${f.ageOfOnset ? ` (Onset: age ${f.ageOfOnset})` : ""}`
    );
    if (symptomsList.length === 0) {
      symptomsList.push("No family pedigree entries currently documented");
    }

    const redFlags: Array<{ title: string; detail: string; severity: string }> = [];
    if (hasPatterns) {
      famPatterns.forEach((pat) => {
        redFlags.push({
          title: "Generational Recurrence Pattern Detected",
          detail: `${pat}. Multi-relative familial occurrence suggests potential hereditary predisposition or shared environmental risk. Non-diagnostic advisory for physician discussion.`,
          severity: "moderate",
        });
      });
    }

    const precautions = [
      "This family health tree screening is an informational pedigree audit, not a diagnostic genetic test.",
      "Discuss family disease history with your primary physician to evaluate individualized preventive screening schedules.",
      "Inquire whether earlier diagnostic screenings (e.g., lipid profile, cardiac evaluation, fasting glucose, colonoscopy) are indicated based on family history.",
    ];

    const recommendedFollowUp = hasPatterns
      ? "Discuss generational disease clustering with your doctor or clinical geneticist during your next scheduled appointment."
      : "Maintain standard age-appropriate preventive health screenings according to clinical guidelines.";

    return {
      reportId: `RBD-FAM-${primaryRecordDate.getFullYear()}${(primaryRecordDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}${primaryRecordDate.getDate().toString().padStart(2, "0")}-${randomDigits}`,
      generatedAt: `${dateStr} at ${timeStr}`,
      patientName,
      age: resolvedAge,
      gender: resolvedGender,
      primaryChiefComplaint: `Family Pedigree Lineage & Hereditary Screening: ${totalEntries} documented relative health record(s) across generations.`,
      symptomsList,
      symptomDuration: "Multi-generational family health timeline",
      affectedBodyPart: "Familial Genetics & Hereditary Pedigree Lineage",
      vitals: {
        bloodPressure: healthReport?.bp || "Recorded in Clinical Chart",
        bloodSugar: parseFloat(healthReport?.sugar || "0") || 0,
        heartRate: parseFloat(healthReport?.heartRate || "0") || 0,
        weightKg: healthReport?.weightKg || 0,
        heightCm: healthReport?.heightCm || 0,
        bmi: healthReport?.bmi || 0,
      },
      skinScreening: undefined,
      labValues: undefined,
      currentMedicines: activeMedicationsList,
      chronicConditions: chronicConditionsList,
      familyHistory: familyHistoryList,
      familyHistoryPatterns: famPatterns,
      overallRiskLevel,
      riskScore: hasPatterns ? 50 : 20,
      redFlags,
      detectedDrugInteractions: [],
      precautions,
      recommendedFollowUp,
    };
  }

  // --- 3. COMBINED / COMPREHENSIVE MODE ---
  const bpVal = healthReport?.bp
    ? healthReport.bp.includes("mmHg")
      ? healthReport.bp
      : `${healthReport.bp} mmHg`
    : "120/80 mmHg";
  const sugarVal = parseFloat(healthReport?.sugar || "100") || 100;
  const hrVal = parseFloat(healthReport?.heartRate || "72") || 72;

  const rawHealthRisk = (healthReport?.riskLevel || "").toLowerCase();
  const rawSkinRisk = (skinReport?.severity || "").toLowerCase();

  let overallRiskLevel: "low" | "moderate" | "high" | "urgent" = "low";
  if (
    rawHealthRisk.includes("emergency") ||
    rawHealthRisk.includes("urgent") ||
    rawSkinRisk.includes("urgent") ||
    rawSkinRisk.includes("emergency")
  ) {
    overallRiskLevel = "urgent";
  } else if (rawHealthRisk.includes("high") || rawSkinRisk.includes("high")) {
    overallRiskLevel = "high";
  } else if (rawHealthRisk.includes("moderate") || rawSkinRisk.includes("moderate")) {
    overallRiskLevel = "moderate";
  }

  const symptomsList: string[] = [];
  if (healthReport?.symptoms) {
    const splitSyms = healthReport.symptoms.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    symptomsList.push(...splitSyms);
  } else if (healthReport?.symptomTags && healthReport.symptomTags.length > 0) {
    symptomsList.push(...healthReport.symptomTags);
  }
  symptomsList.push("Vital signs assessment completed");
  if (skinReport) {
    symptomsList.push(`Skin screening (${skinReport.bodyPart}): ${skinReport.summary}`);
  }

  const redFlags: Array<{ title: string; detail: string; severity: string }> = [];
  if (healthReport?.summary) {
    redFlags.push({
      title: "Vital Signs Risk Flag",
      detail: healthReport.summary,
      severity: rawHealthRisk.includes("high") ? "high" : "moderate",
    });
  }
  if (skinReport?.summary) {
    redFlags.push({
      title: `Dermoscopic Pattern (${skinReport.bodyPart})`,
      detail: `${skinReport.summary} (Assessed: ${skinReport.severity})`,
      severity: rawSkinRisk.includes("high") ? "high" : "moderate",
    });
  }

  const precautions = [
    "Schedule a comprehensive physician appointment covering both vital signs and dermatological screening.",
    "Do not alter or cease any current medication without explicit consultation with your prescribing doctor.",
    "Monitor vital signs and lesion characteristics consistently, noting any changes in frequency or appearance.",
  ];

  let recommendedFollowUp = "Arrange a clinical consultation with your primary physician within 1 to 2 weeks.";
  if (overallRiskLevel === "urgent" || overallRiskLevel === "high") {
    recommendedFollowUp =
      "Urgent medical attention recommended within 24 to 48 hours for clinical evaluation.";
  }

  return {
    reportId,
    generatedAt: `${dateStr} at ${timeStr}`,
    patientName,
    age: resolvedAge,
    gender: resolvedGender,
    primaryChiefComplaint:
      healthReport?.summary ||
      (skinReport
        ? `Dermatological screening for ${skinReport.bodyPart}`
        : chronicConditionsList.length > 0 || familyHistoryList.length > 0
        ? "Comprehensive Clinical Summary: Chronic History, Medication Management & Family Pedigree Screening"
        : "Comprehensive Health Screening"),
    symptomsList,
    symptomDuration: "Recent combined screening",
    affectedBodyPart: skinReport ? `Cardiovascular System & ${skinReport.bodyPart.toUpperCase()} Skin` : "General Vitals",
    vitals: {
      bloodPressure: bpVal,
      bloodSugar: sugarVal,
      heartRate: hrVal,
      weightKg: healthReport?.weightKg || 70,
      heightCm: healthReport?.heightCm || 170,
      bmi:
        healthReport?.bmi ||
        (healthReport?.heightCm && healthReport?.weightKg
          ? Number((healthReport.weightKg / Math.pow(healthReport.heightCm / 100, 2)).toFixed(1))
          : 24.2),
    },
    skinScreening: skinReport
      ? {
          topPattern: skinReport.summary,
          confidence: Math.round(skinReport.score * 0.95),
          highRiskFlag: skinReport.severity === "High" || skinReport.severity === "Urgent",
          uncertainFlag: false,
        }
      : undefined,
    labValues: {
      fastingSugar: sugarVal,
    },
    currentMedicines: activeMedicationsList,
    chronicConditions: chronicConditionsList,
    familyHistory: familyHistoryList,
    familyHistoryPatterns: famPatterns,
    overallRiskLevel,
    riskScore: Math.round(((healthReport?.riskScore || 50) + (skinReport?.score || 50)) / 2),
    redFlags,
    detectedDrugInteractions: [],
    precautions,
    recommendedFollowUp,
  };
  })();

  if (adherenceSummary) {
    result.medicationAdherenceSummary = adherenceSummary;
  }

  return result;
}

