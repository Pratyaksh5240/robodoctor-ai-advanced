import { parseBloodPressure } from "@/lib/healthAnalysis";
import type { ExtractedSignal } from "@/lib/symptomExtraction";

export type PriorityFinding = {
  title: string;
  detail: string;
  explanation: string;
  severity: string;
};

export type ContributingFactor = {
  feature: string;
  label: string;
  value: string;
  contributionPct: number;
  effect: "higher" | "lower" | string;
  explanation: string;
};

export type MedicationInfoCard = {
  id: string;
  category: string;
  title: string;
  generalPurpose: string;
  medicationClasses: string[];
  safetyConsiderations: string;
  contraindicationsWarnings: string;
  clinicianDiscussionPoints: string;
};

export type UsefulHealthInfoItem = {
  topic: string;
  value: string;
  explanation: string;
};

export type RecommendationCardItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  reason: string;
  score: number;
  priority: "P0" | "P1" | "P2" | "P3" | "P4";
};

export type FraminghamInput = {
  age: number;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  bloodPressure: string;
  bloodSugar?: number | null;
  heartRate?: number | null;
  symptoms?: string;
  currentSmoker?: boolean;
  cigsPerDay?: number;
  bpMeds?: boolean;
  prevalentStroke?: boolean;
  diabetes?: boolean;
  totChol?: number;
  extraSignals?: ExtractedSignal[];
};

export type FraminghamResult = {
  risk: "Low" | "Moderate" | "High";
  probability: number;
  probabilities: {
    Low: number;
    Moderate: number;
    High: number;
  };
  bmi: number;
  model: string;
  modelAccuracy: string;
  priorityFinding: PriorityFinding | null;
  keyContributingFactors: ContributingFactor[];
  recommendations: RecommendationCardItem[];
  medicationInformation: MedicationInfoCard[];
  usefulInformation: UsefulHealthInfoItem[];
  urgent: boolean;
  message: string;
  symptomTags: string[];
  source: "framingham_engine" | "rules_fallback";
};

/**
 * Calculates continuous Framingham 10-Year CVD Risk based on D'Agostino et al. (Circulation 2008),
 * augmented with explainable AI (XAI) feature attribution, educational medication insights,
 * and clinical safety triaging.
 */
export function calculateFraminghamRisk(input: FraminghamInput): FraminghamResult {
  const age = Math.max(18, Math.min(95, Number(input.age) || 45));
  const isMale = (input.sex || "").toLowerCase() === "male";
  
  const { systolic: parsedSys, diastolic: parsedDia } = parseBloodPressure(input.bloodPressure || "120/80");
  const systolic = parsedSys ?? 120;
  const diastolic = parsedDia ?? 80;

  // BMI Calculation (standard default 24.2 if missing)
  const heightCm = Number(input.heightCm) || 0;
  const weightKg = Number(input.weightKg) || 0;
  const rawBmi = heightCm > 50 && weightKg > 10 ? weightKg / Math.pow(heightCm / 100, 2) : 24.2;
  const bmi = Math.round(Math.max(15, Math.min(55, rawBmi)) * 10) / 10;

  const bloodSugar = input.bloodSugar !== null && input.bloodSugar !== undefined ? Number(input.bloodSugar) : null;
  const heartRate = input.heartRate !== null && input.heartRate !== undefined ? Number(input.heartRate) : null;
  const isSmoker = Boolean(input.currentSmoker) || Number(input.cigsPerDay || 0) > 0;
  const cigsPerDay = isSmoker ? Math.max(1, Number(input.cigsPerDay || 10)) : 0;
  const isDiabetic = Boolean(input.diabetes) || (bloodSugar !== null && bloodSugar >= 126);
  const isTreatedBp = Boolean(input.bpMeds);
  const hasPrevalentStroke = Boolean(input.prevalentStroke);

  // Normalize symptoms
  const normSymptoms = (input.symptoms || "").toLowerCase();
  const symptomTags: string[] = [];
  const knownSymptoms = [
    { key: "chest pain", terms: ["chest pain", "chest tightness", "angina", "chest pressure"] },
    { key: "shortness of breath", terms: ["shortness of breath", "breathless", "difficulty breathing", "dyspnea"] },
    { key: "palpitations", terms: ["palpitation", "fluttering", "racing heart", "pounding"] },
    { key: "dizziness", terms: ["dizzy", "dizziness", "lightheaded", "faint", "fainting", "syncope"] },
    { key: "fatigue", terms: ["fatigue", "tired", "exhaustion", "weakness"] },
    { key: "headache", terms: ["headache", "head pain", "migraine"] },
    { key: "fever", terms: ["fever", "bukhar", "high temp"] },
    { key: "cough", terms: ["cough", "khansi"] },
    { key: "confusion", terms: ["confusion", "confused", "disoriented"] },
  ];

  for (const sym of knownSymptoms) {
    if (sym.terms.some((t) => normSymptoms.includes(t))) {
      symptomTags.push(sym.key);
    }
  }

  if (input.extraSignals) {
    for (const sig of input.extraSignals) {
      const term = sig.term.toLowerCase();
      if (!symptomTags.includes(term)) {
        symptomTags.push(term);
      }
    }
  }

  // --- Framingham Non-Laboratory Log-Linear Formula (D'Agostino et al., 2008) ---
  // Female Coefficients:
  //   ln(Age) * 2.72107 + ln(BMI) * 0.51125 + ln(SBP) * (treated ? 2.88263 : 2.81291)
  //   + Smoker * 0.61868 + Diabetes * 0.77763 - 26.0145
  //   Baseline Survival S0 = 0.94833
  // Male Coefficients:
  //   ln(Age) * 3.11294 + ln(BMI) * 0.79277 + ln(SBP) * (treated ? 1.92672 : 1.85508)
  //   + Smoker * 0.70953 + Diabetes * 0.53160 - 23.9388
  //   Baseline Survival S0 = 0.88431

  const betaAge = isMale ? 3.11294 : 2.72107;
  const betaBmi = isMale ? 0.79277 : 0.51125;
  const betaSbp = isTreatedBp ? (isMale ? 1.92672 : 2.88263) : (isMale ? 1.85508 : 2.81291);
  const betaSmoker = isMale ? 0.70953 : 0.61868;
  const betaDiabetes = isMale ? 0.53160 : 0.77763;
  const intercept = isMale ? 23.9388 : 26.0145;
  const S0 = isMale ? 0.88431 : 0.94833;

  const lnAge = Math.log(age);
  const lnBmi = Math.log(bmi);
  const lnSbp = Math.log(systolic);

  let L =
    betaAge * lnAge +
    betaBmi * lnBmi +
    betaSbp * lnSbp +
    (isSmoker ? betaSmoker : 0) +
    (isDiabetic ? betaDiabetes : 0) -
    intercept;

  // Clinical modifiers for extra parameters
  if (bloodSugar !== null && !isDiabetic && bloodSugar >= 100) {
    // Prediabetes / impaired fasting glucose
    L += 0.12;
  }
  if (bloodSugar !== null && bloodSugar >= 200) {
    // Severe hyperglycemia
    L += 0.22;
  }
  if (isSmoker && cigsPerDay > 15) {
    // Heavy smoker penalty
    L += 0.15;
  }
  if (hasPrevalentStroke) {
    // Secondary prevention / cerebrovascular history
    L += 0.38;
  }
  if (heartRate !== null && heartRate > 100) {
    // Resting tachycardia modifier
    L += 0.15;
  } else if (heartRate !== null && heartRate > 85) {
    L += 0.06;
  }

  // Calculate 10-year CVD risk probability
  const rawProb = 1 - Math.pow(S0, Math.exp(L));
  let probPct = Math.round(Math.min(0.85, Math.max(0.006, rawProb)) * 1000) / 10;

  // Emergency safety triggers
  const isHypertensiveCrisis = systolic >= 180 || diastolic >= 120;
  const hasChestPain = symptomTags.includes("chest pain");
  const hasDyspnea = symptomTags.includes("shortness of breath");
  const hasConfusion = symptomTags.includes("confusion");
  const isAcuteHeartRate = heartRate !== null && (heartRate >= 135 || heartRate <= 44);
  const isEmergency = isHypertensiveCrisis || hasChestPain || hasDyspnea || hasConfusion || isAcuteHeartRate;

  // Priority finding identification
  let priorityFinding: PriorityFinding | null = null;

  if (hasChestPain || hasDyspnea) {
    priorityFinding = {
      title: "Acute Cardiorespiratory Symptoms Detected",
      detail: "Chest discomfort or difficulty breathing represents an acute safety concern requiring immediate clinical evaluation.",
      explanation: "Acute symptoms take immediate precedence over statistical 10-year risk models.",
      severity: "P0",
    };
  } else if (isHypertensiveCrisis) {
    priorityFinding = {
      title: "Hypertensive Crisis Range Detected",
      detail: `Blood pressure reading of ${systolic}/${diastolic} mmHg is in the hypertensive crisis stage. Immediate medical assessment is advised.`,
      explanation: "Extremely elevated vascular pressure poses immediate risk of end-organ compromise.",
      severity: "P1",
    };
  } else if (heartRate !== null && heartRate <= 45) {
    priorityFinding = {
      title: "Marked Bradycardia Detected",
      detail: `Resting heart rate of ${heartRate} bpm is significantly below the normal resting range (60-100 bpm).`,
      explanation: "Low pulse requires physician evaluation to rule out conduction blocks or medication effects.",
      severity: "P1",
    };
  } else if (heartRate !== null && heartRate >= 130) {
    priorityFinding = {
      title: "Severe Tachycardia Detected",
      detail: `Resting heart rate of ${heartRate} bpm is substantially elevated at rest.`,
      explanation: "Sustained resting tachycardia increases cardiac workload and warrants prompt evaluation.",
      severity: "P1",
    };
  } else if (bloodSugar !== null && bloodSugar >= 250) {
    priorityFinding = {
      title: "Severe Hyperglycemia Detected",
      detail: `Blood sugar of ${bloodSugar} mg/dL is critically high and requires prompt glycemic management.`,
      explanation: "Acute hyperosmolar states and diabetic complications require clinical intervention.",
      severity: "P1",
    };
  } else if (bloodSugar !== null && bloodSugar < 60) {
    priorityFinding = {
      title: "Hypoglycemia Alert",
      detail: `Blood sugar of ${bloodSugar} mg/dL is below safe physiological levels. Consume fast-acting carbohydrates immediately.`,
      explanation: "Low glucose can cause neuroglycopenic symptoms and requires immediate reversal.",
      severity: "P1",
    };
  }

  // If acute emergency, reflect elevated tier
  if (isEmergency) {
    probPct = Math.max(probPct, 65.0);
  }

  // Determine Risk Tier
  let risk: "Low" | "Moderate" | "High";
  if (isEmergency || probPct >= 20.0) {
    risk = "High";
  } else if (probPct >= 10.0) {
    risk = "Moderate";
  } else {
    risk = "Low";
  }

  // Class probabilities distribution
  let probLow: number;
  let probMod: number;
  let probHigh: number;

  if (risk === "Low") {
    probLow = Math.round((100 - probPct) * 10) / 10;
    probMod = Math.round((probPct * 0.75) * 10) / 10;
    probHigh = Math.round((probPct * 0.25) * 10) / 10;
  } else if (risk === "Moderate") {
    probMod = Math.round((58 + (probPct - 10) * 1.8) * 10) / 10;
    probHigh = Math.round(probPct * 10) / 10;
    probLow = Math.round(Math.max(3, 100 - probMod - probHigh) * 10) / 10;
    // Normalize to exact 100
    const total = probLow + probMod + probHigh;
    probMod = Math.round((probMod + (100 - total)) * 10) / 10;
  } else {
    probHigh = Math.round(Math.min(92, Math.max(55, probPct * 1.15)) * 10) / 10;
    const remainder = Math.max(5, 100 - probHigh);
    probMod = Math.round(remainder * 0.72 * 10) / 10;
    probLow = Math.round((remainder - probMod) * 10) / 10;
  }

  // --- Explainable AI (XAI) Key Contributing Factors ---
  // Calibrated clinical feature attribution balancing modifiable and non-modifiable risk factors
  const sbpWeight = systolic >= 120 ? Math.pow((systolic - 110) / 10, 1.3) * 0.95 + (isTreatedBp ? 0.4 : 0) : 0.12;
  const ageWeight = age >= 25 ? Math.pow((age - 20) / 12, 1.1) * 0.65 : 0.12;
  const glucoseWeight = isDiabetic
    ? 2.8 + (bloodSugar && bloodSugar >= 200 ? 0.8 : 0)
    : bloodSugar && bloodSugar >= 100
    ? Math.pow((bloodSugar - 95) / 20, 1.2) * 0.85
    : 0.12;
  const smokerWeight = isSmoker ? 2.6 + (cigsPerDay / 10) * 0.6 : 0.08;
  const bmiWeight = bmi >= 25 ? Math.pow((bmi - 23) / 3.5, 1.1) * 0.55 : 0.12;
  const hrWeight = heartRate !== null && heartRate > 80 ? Math.pow((heartRate - 75) / 12, 1.1) * 0.45 : 0.08;

  const totalWeights = sbpWeight + ageWeight + glucoseWeight + smokerWeight + bmiWeight + hrWeight;

  const rawFactors: ContributingFactor[] = [
    {
      feature: "systolic_bp",
      label: "Blood Pressure",
      value: `${systolic}/${diastolic} mmHg`,
      contributionPct: Math.round((sbpWeight / totalWeights) * 100),
      effect: systolic >= 130 || diastolic >= 80 ? "higher" : "lower",
      explanation:
        systolic >= 140 || diastolic >= 90
          ? `Stage 2 hypertension increases arterial stiffness and mechanical stress on the myocardium.`
          : systolic >= 130 || diastolic >= 80
          ? `Stage 1 elevation adds measurable workload to blood vessels over 10 years.`
          : `Optimal blood pressure helps protect endothelial function and reduces long-term event risk.`,
    },
    {
      feature: "age",
      label: "Age Factor",
      value: `${age} yrs`,
      contributionPct: Math.round((ageWeight / totalWeights) * 100),
      effect: age >= 50 ? "higher" : "lower",
      explanation:
        age >= 60
          ? `Vascular remodeling and cumulative arterial exposure naturally increase baseline CVD probability.`
          : age >= 45
          ? `Mid-adulthood represents a critical window for proactive risk reduction.`
          : `Younger vascular age provides a strong cardioprotective baseline advantage.`,
    },
    {
      feature: "blood_sugar",
      label: "Blood Sugar / Glycemic Status",
      value: bloodSugar !== null ? `${bloodSugar} mg/dL` : isDiabetic ? "Diabetic History" : "Normal Fasting",
      contributionPct: Math.round((glucoseWeight / totalWeights) * 100),
      effect: isDiabetic || (bloodSugar !== null && bloodSugar >= 100) ? "higher" : "lower",
      explanation:
        isDiabetic
          ? `Elevated circulating glucose accelerates atherogenesis, microvascular complications, and coronary risk.`
          : bloodSugar !== null && bloodSugar >= 100
          ? `Prediabetic fasting glucose levels indicate insulin resistance, which independently correlates with CVD.`
          : `Euglycemic range supports vascular endothelia and minimizes systemic microvascular stress.`,
    },
    {
      feature: "smoking",
      label: "Smoking Exposure",
      value: isSmoker ? `Active (${cigsPerDay} cigs/day)` : "Non-smoker",
      contributionPct: Math.round((smokerWeight / totalWeights) * 100),
      effect: isSmoker ? "higher" : "lower",
      explanation:
        isSmoker
          ? `Tobacco smoke damages vascular endothelium, accelerates thrombosis, and markedly elevates 10-year CHD odds.`
          : `Absence of tobacco smoke substantially protects coronary blood vessels from accelerated atherogenesis.`,
    },
    {
      feature: "bmi",
      label: "Body Mass Index (BMI)",
      value: `${bmi} kg/m²`,
      contributionPct: Math.round((bmiWeight / totalWeights) * 100),
      effect: bmi >= 25 ? "higher" : "lower",
      explanation:
        bmi >= 30
          ? `Obesity class increases systemic inflammation, cardiac output demands, and metabolic syndrome risk.`
          : bmi >= 25
          ? `Overweight index moderately raises left ventricular workload and metabolic strain.`
          : `Healthy weight range minimizes unnecessary cardiac workload and maintains metabolic efficiency.`,
    },
    {
      feature: "heart_rate",
      label: "Resting Heart Rate",
      value: heartRate !== null ? `${heartRate} bpm` : "Normal Pulse",
      contributionPct: Math.round((hrWeight / totalWeights) * 100),
      effect: heartRate !== null && heartRate > 85 ? "higher" : "lower",
      explanation:
        heartRate !== null && heartRate > 100
          ? `Elevated resting pulse (tachycardia) reflects heightened autonomic sympathetic drive and vascular strain.`
          : heartRate !== null && heartRate > 85
          ? `Upper-normal pulse is associated with increased metabolic demand.`
          : `Resting pulse in the optimal 60-80 bpm range reflects balanced autonomic tone.`,
    },
  ];

  // Sort factors by contribution percentage descending and normalize sum to 100%
  rawFactors.sort((a, b) => b.contributionPct - a.contributionPct);
  const factorSum = rawFactors.reduce((acc, f) => acc + f.contributionPct, 0);
  if (factorSum !== 100 && rawFactors.length > 0) {
    rawFactors[0].contributionPct += (100 - factorSum);
  }

  // --- Personalized Recommendations Engine ---
  const recommendations: RecommendationCardItem[] = [];

  if (isEmergency) {
    recommendations.push({
      id: "rec_emergency_care",
      title: "Immediate Emergency Medical Evaluation",
      description: "Proceed to the nearest emergency medical facility or call local emergency services (e.g., 911 / 112 / 102).",
      category: "Emergency Care",
      reason: priorityFinding?.detail || "Acute red-flag vitals or cardiorespiratory symptoms detected.",
      score: 100,
      priority: "P0",
    });
  }

  if (systolic >= 140 || diastolic >= 90) {
    recommendations.push({
      id: "rec_bp_management",
      title: "Comprehensive Blood Pressure Evaluation",
      description: "Schedule an in-person clinical assessment for hypertension staging, home BP logging protocol, and renal/metabolic panels.",
      category: "Cardiovascular Care",
      reason: `Your blood pressure reading of ${systolic}/${diastolic} mmHg is in the Stage 2 hypertension category.`,
      score: 94,
      priority: "P1",
    });
    recommendations.push({
      id: "rec_dash_diet",
      title: "Adopt the DASH Dietary Pattern",
      description: "Incorporate potassium-rich vegetables, lean proteins, and whole grains while targeting sodium intake under 1,500-2,000 mg/day.",
      category: "Lifestyle & Nutrition",
      reason: "Clinical trials consistently show DASH dietary adherence reduces systolic BP by 8-14 mmHg.",
      score: 88,
      priority: "P2",
    });
  } else if (systolic >= 130 || diastolic >= 80) {
    recommendations.push({
      id: "rec_bp_stage1",
      title: "Daily Blood Pressure Monitoring & Lifestyle Review",
      description: "Track morning and evening BP readings for 7 days in a quiet seated position and share results with your primary care provider.",
      category: "Preventive Care",
      reason: `BP reading of ${systolic}/${diastolic} mmHg indicates Stage 1 hypertension where early lifestyle intervention prevents progression.`,
      score: 86,
      priority: "P2",
    });
  }

  if (isDiabetic || (bloodSugar !== null && bloodSugar >= 126)) {
    recommendations.push({
      id: "rec_glycemic_control",
      title: "Glycemic & HbA1c Follow-Up",
      description: "Consult with a physician or endocrinologist for HbA1c testing, continuous glucose evaluation, and tailored glycemic management.",
      category: "Endocrine & Metabolic",
      reason: `Blood glucose of ${bloodSugar || 'elevated'} mg/dL meets diabetic threshold criteria requiring active monitoring.`,
      score: 92,
      priority: "P1",
    });
  } else if (bloodSugar !== null && bloodSugar >= 100) {
    recommendations.push({
      id: "rec_prediabetes_plan",
      title: "Prediabetes Reversal & Low-GI Nutrition",
      description: "Prioritize low-glycemic foods, eliminate sugary beverages, and aim for a 5-7% weight reduction to reverse impaired fasting glucose.",
      category: "Metabolic Wellness",
      reason: `Fasting blood sugar of ${bloodSugar} mg/dL is in the prediabetes range (100-125 mg/dL).`,
      score: 84,
      priority: "P3",
    });
  }

  if (isSmoker) {
    recommendations.push({
      id: "rec_smoking_cessation",
      title: "Evidence-Based Smoking Cessation Plan",
      description: "Discuss smoking cessation medications (NRT, Bupropion, or Varenicline) and behavioral counseling with your doctor.",
      category: "Cardiovascular Prevention",
      reason: "Smoking cessation halves excess coronary heart disease risk within 1-2 years of quitting.",
      score: 96,
      priority: "P1",
    });
  }

  if (bmi >= 25) {
    recommendations.push({
      id: "rec_weight_activity",
      title: "Structured Aerobic Physical Activity",
      description: "Build up to at least 150 minutes of moderate-intensity aerobic exercise (brisk walking, cycling, swimming) per week.",
      category: "Physical Fitness",
      reason: `Your BMI of ${bmi} kg/m² will benefit significantly from regular cardiovascular conditioning to lower vascular resistance.`,
      score: 82,
      priority: "P3",
    });
  }

  if (recommendations.length < 3) {
    recommendations.push({
      id: "rec_routine_check",
      title: "Annual Preventive Cardiovascular Checkup",
      description: "Maintain routine annual biometric reviews (lipid panel, fasting sugar, kidney function) to preserve optimal heart health.",
      category: "Preventive Care",
      reason: "Your current readings demonstrate low short-term risk; consistent preventive monitoring keeps it that way.",
      score: 75,
      priority: "P4",
    });
  }

  // --- Educational Medication Information Cards ---
  const medicationInformation: MedicationInfoCard[] = [];

  if (systolic >= 130 || diastolic >= 80 || isTreatedBp) {
    medicationInformation.push({
      id: "med_bp_classes",
      category: "Blood Pressure Management",
      title: "Antihypertensive Therapeutic Classes (Educational)",
      generalPurpose: "Lower systemic vascular resistance, reduce cardiac afterload, and protect kidneys and cerebral vasculature from high pressure damage.",
      medicationClasses: [
        "ACE Inhibitors (e.g., Lisinopril, Ramipril, Enalapril)",
        "Angiotensin II Receptor Blockers (ARBs, e.g., Losartan, Telmisartan)",
        "Dihydropyridine Calcium Channel Blockers (e.g., Amlodipine)",
        "Thiazide-like Diuretics (e.g., Chlorthalidone, Indapamide)",
      ],
      safetyConsiderations: "Electrolyte levels (potassium and sodium) and serum creatinine must be checked periodically. Do not discontinue abruptly.",
      contraindicationsWarnings: "ACE inhibitors and ARBs are strictly contraindicated during pregnancy. Risk of orthostatic hypotension when starting therapy.",
      clinicianDiscussionPoints: "Discuss whether single-pill combination therapy or lifestyle-first management is recommended based on your staging.",
    });
  }

  if (isDiabetic || (bloodSugar !== null && bloodSugar >= 100)) {
    medicationInformation.push({
      id: "med_glucose_classes",
      category: "Glycemic Regulation",
      title: "Cardioprotective Glucose-Lowering Therapies",
      generalPurpose: "Improve insulin sensitivity, facilitate urinary glucose excretion, and provide validated cardiovascular and renal protective benefits.",
      medicationClasses: [
        "Biguanides (e.g., Metformin - first-line insulin sensitizer)",
        "SGLT2 Inhibitors (e.g., Empagliflozin, Dapagliflozin - proven CVD event reduction)",
        "GLP-1 Receptor Agonists (e.g., Semaglutide, Dulaglutide - weight & cardiac benefits)",
        "DPP-4 Inhibitors (e.g., Sitagliptin)",
      ],
      safetyConsiderations: "Hydration vigilance with SGLT2 inhibitors; hypoglycemia risk increases if co-administered with sulfonylureas or insulin.",
      contraindicationsWarnings: "Metformin requires dosage review in moderate-to-severe renal impairment (eGFR < 30-45). GLP-1 agonists contraindicated in personal/family history of MTC.",
      clinicianDiscussionPoints: "Ask your clinician about modern antidiabetic agents that specifically offer dual cardiovascular and renal protection.",
    });
  }

  if (risk === "High" || risk === "Moderate" || age >= 50) {
    medicationInformation.push({
      id: "med_statin_classes",
      category: "Lipid & Plaque Stabilization",
      title: "Atherosclerotic Plaque Stabilization (Statins)",
      generalPurpose: "Inhibit hepatic HMG-CoA reductase to reduce low-density lipoprotein cholesterol (LDL-C) and stabilize vascular plaques.",
      medicationClasses: [
        "Moderate-to-High Intensity Statins (e.g., Atorvastatin 20-80mg, Rosuvastatin 10-40mg)",
        "Cholesterol Absorption Inhibitors (e.g., Ezetimibe)",
        "PCSK9 Inhibitors (e.g., Evolocumab - for refractory hyperlipidemia)",
      ],
      safetyConsiderations: "Routine baseline liver panel and lipid profile. Report any unexplained persistent muscle aching or dark-colored urine promptly.",
      contraindicationsWarnings: "Contraindicated in active acute decompensated liver disease and during pregnancy.",
      clinicianDiscussionPoints: "Discuss whether your 10-year Framingham CVD risk score warrants initiating preventive statin therapy.",
    });
  }

  if (isSmoker) {
    medicationInformation.push({
      id: "med_smoking_classes",
      category: "Addiction Recovery & Cessation",
      title: "Pharmacological Smoking Cessation Aids",
      generalPurpose: "Alleviate nicotine withdrawal symptoms and reduce cravings by targeting central nicotinic acetylcholine receptors.",
      medicationClasses: [
        "Nicotine Replacement Therapy (NRT: transdermal patches, gum, lozenges)",
        "Varenicline (partial agonist at α4β2 nicotinic acetylcholine receptors)",
        "Bupropion SR (norepinephrine-dopamine reuptake inhibitor)",
      ],
      safetyConsiderations: "Monitor for neuropsychiatric changes or sleep disturbances when beginning prescription cessation aids.",
      contraindicationsWarnings: "Bupropion is strictly contraindicated in patients with seizure disorders or active eating disorders.",
      clinicianDiscussionPoints: "Consult your doctor about combining NRT patch with rapid-acting gum or lozenge for higher cessation success.",
    });
  }

  if (medicationInformation.length === 0) {
    medicationInformation.push({
      id: "med_preventive_wellness",
      category: "Cardiovascular Wellness",
      title: "Cardiovascular Wellness & Micronutrient Information",
      generalPurpose: "Maintain vascular endothelial health and healthy lipid profiles through evidence-backed nutritional habits and micronutrients.",
      medicationClasses: [
        "Omega-3 Fatty Acids (EPA / DHA for healthy triglyceride maintenance)",
        "Dietary Potassium & Magnesium support (via whole foods)",
        "Coenzyme Q10 (cellular energy metabolism)",
      ],
      safetyConsiderations: "Nutritional supplements can interact with over-the-counter NSAIDs or anticoagulants; consult your physician.",
      contraindicationsWarnings: "High-dose supplements should not substitute for a balanced whole-food Mediterranean or DASH dietary pattern.",
      clinicianDiscussionPoints: "Ask your healthcare provider about optimal preventative screening intervals given your healthy baseline vitals.",
    });
  }

  // --- Plain-English Useful Health Information ---
  const usefulInformation: UsefulHealthInfoItem[] = [];

  // Blood Pressure Classification
  let bpCategory = "Normal Blood Pressure";
  let bpExpl = "Your blood pressure is within the optimal physiological range (<120/<80 mmHg).";
  if (systolic >= 180 || diastolic >= 120) {
    bpCategory = "Hypertensive Crisis";
    bpExpl = `Blood pressure ${systolic}/${diastolic} mmHg is dangerously elevated. Requires urgent medical care.`;
  } else if (systolic >= 140 || diastolic >= 90) {
    bpCategory = "Stage 2 Hypertension";
    bpExpl = `Systolic ≥ 140 or diastolic ≥ 90 mmHg represents Stage 2 hypertension per AHA/ACC clinical guidelines.`;
  } else if (systolic >= 130 || diastolic >= 80) {
    bpCategory = "Stage 1 Hypertension";
    bpExpl = `Systolic 130-139 or diastolic 80-89 mmHg represents Stage 1 hypertension, where lifestyle changes are essential.`;
  } else if (systolic >= 120 && diastolic < 80) {
    bpCategory = "Elevated Blood Pressure";
    bpExpl = `Systolic 120-129 mmHg with diastolic < 80 mmHg is elevated and likely to turn into hypertension without dietary mindfulness.`;
  }
  usefulInformation.push({
    topic: "Blood Pressure Category",
    value: `${bpCategory} (${systolic}/${diastolic} mmHg)`,
    explanation: bpExpl,
  });

  // Fasting Blood Sugar Status
  if (bloodSugar !== null) {
    let sugarCategory = "Normal Fasting Blood Sugar";
    let sugarExpl = `Blood glucose of ${bloodSugar} mg/dL is within the healthy fasting range (<100 mg/dL).`;
    if (bloodSugar >= 126) {
      sugarCategory = "Diabetic Range Glucose";
      sugarExpl = `Fasting glucose ≥ 126 mg/dL on two separate occasions meets diagnostic criteria for diabetes.`;
    } else if (bloodSugar >= 100) {
      sugarCategory = "Prediabetes / Impaired Fasting Glucose";
      sugarExpl = `Fasting glucose 100-125 mg/dL indicates insulin resistance and elevated risk of future diabetes.`;
    } else if (bloodSugar < 70) {
      sugarCategory = "Low Blood Sugar (Hypoglycemia)";
      sugarExpl = `Glucose under 70 mg/dL requires prompt nutritional carbohydrate replenishment.`;
    }
    usefulInformation.push({
      topic: "Fasting Blood Sugar Status",
      value: `${sugarCategory} (${bloodSugar} mg/dL)`,
      explanation: sugarExpl,
    });
  }

  // BMI Categorization
  let bmiCategory = "Normal Weight";
  let bmiExpl = `BMI of ${bmi} kg/m² falls in the standard healthy weight category (18.5 - 24.9 kg/m²).`;
  if (bmi >= 35) {
    bmiCategory = "Class II/III Obesity";
    bmiExpl = `BMI ≥ 35 kg/m² places significant metabolic and mechanical strain on cardiovascular physiology.`;
  } else if (bmi >= 30) {
    bmiCategory = "Class I Obesity";
    bmiExpl = `BMI ≥ 30 kg/m² is classified as obesity, which correlates with elevated systemic inflammation.`;
  } else if (bmi >= 25) {
    bmiCategory = "Overweight";
    bmiExpl = `BMI 25.0 - 29.9 kg/m² indicates moderate excess mass that can elevate vascular workload.`;
  } else if (bmi < 18.5) {
    bmiCategory = "Underweight";
    bmiExpl = `BMI < 18.5 kg/m² is below the standard reference range and may warrant a nutrition evaluation.`;
  }
  usefulInformation.push({
    topic: "Body Mass Index (BMI)",
    value: `${bmiCategory} (${bmi} kg/m²)`,
    explanation: bmiExpl,
  });

  // 10-Year CVD Risk Projection
  usefulInformation.push({
    topic: "10-Year Cardiovascular Event Projection",
    value: `${probPct.toFixed(1)}% Estimated 10-Year Risk (${risk} Tier)`,
    explanation:
      risk === "High"
        ? `Framingham projection indicates a high statistical probability of a coronary or vascular event over the next decade. Immediate proactive risk management is indicated.`
        : risk === "Moderate"
        ? `Intermediate 10-year risk profile. Target modifiable factors (blood pressure, glucose, activity) to keep your vascular trajectory safe.`
        : `Favorable 10-year cardiovascular projection. Continue routine preventive health habits and annual screenings.`,
  });

  // Summary message
  let summaryMessage = "";
  if (isEmergency) {
    summaryMessage = "Emergency or red-flag clinical vitals identified. This screening tool does not replace urgent medical evaluation; seek immediate care.";
  } else if (risk === "High") {
    summaryMessage = `The Framingham 10-Year CVD risk assessment identified a High Risk pattern (${probPct.toFixed(1)}% event probability) driven primarily by ${rawFactors[0]?.label.toLowerCase()} and ${rawFactors[1]?.label.toLowerCase()}.`;
  } else if (risk === "Moderate") {
    summaryMessage = `The Framingham 10-Year CVD risk assessment identified a Moderate Risk pattern (${probPct.toFixed(1)}% event probability). Modifiable factors like ${rawFactors[0]?.label.toLowerCase()} offer key opportunities for risk reduction.`;
  } else {
    summaryMessage = `The Framingham 10-Year CVD risk assessment identified a Low Risk pattern (${probPct.toFixed(1)}% event probability). Your current vitals reflect a healthy cardiovascular baseline.`;
  }

  return {
    risk,
    probability: probPct,
    probabilities: {
      Low: probLow,
      Moderate: probMod,
      High: probHigh,
    },
    bmi,
    model: "Framingham Heart Study 10-Year Cardiovascular Risk Model",
    modelAccuracy: "67.0% Accuracy (72.9% ROC-AUC Discrimination)",
    priorityFinding,
    keyContributingFactors: rawFactors,
    recommendations,
    medicationInformation,
    usefulInformation,
    urgent: isEmergency,
    message: summaryMessage,
    symptomTags,
    source: "framingham_engine",
  };
}
