export type HealthInputs = {
  age: number;
  heightCm: number;
  weightKg: number;
  systolic: number | null;
  diastolic: number | null;
  sugar: number | null;
  heartRate: number | null;
  symptoms: string;
};

export type Severity = "info" | "watch" | "urgent" | "emergency";

export type AnalysisItem = {
  label: string;
  detail: string;
  severity: Severity;
};

export type Recommendation = {
  text: string;
  severity: Severity;
};

export type SuggestedModule = {
  module: "diet-planner" | "medicine-reminder" | "emergency-guide" | "nearby-care";
  title: string;
  reason: string;
  presetParams?: Record<string, string>;
};

export type HealthAnalysis = {
  riskLevel: "Low" | "Moderate" | "High" | "Emergency";
  riskScore: number;
  riskColor: string;
  summary: string;
  measurements: AnalysisItem[];
  possibleConcerns: AnalysisItem[];
  urgentFlags: AnalysisItem[];
  recommendations: Recommendation[];
  suggestedModules?: SuggestedModule[];
  emergencyAdvice: string | null;
  bmi: number | null;
  symptomTags: string[];
};

function addUrgentFlag(
  urgentFlags: AnalysisItem[],
  label: string,
  detail: string,
  severity: Severity
) {
  urgentFlags.push({ label, detail, severity });
}

const symptomLibrary = [
  { key: "chest pain", matches: ["chest pain", "chest tightness"], severity: "emergency" as Severity, concern: "Possible cardiac emergency" },
  { key: "shortness of breath", matches: ["shortness of breath", "breathlessness", "difficulty breathing"], severity: "emergency" as Severity, concern: "Breathing difficulty needs urgent medical review" },
  { key: "dizziness", matches: ["dizziness", "faint", "fainting", "lightheaded"], severity: "urgent" as Severity, concern: "Dizziness or fainting can signal unstable vitals" },
  { key: "palpitations", matches: ["palpitations", "racing heart", "heart pounding"], severity: "urgent" as Severity, concern: "Palpitations can reflect an abnormal heart rhythm or stress response" },
  { key: "confusion", matches: ["confusion", "confused", "disoriented"], severity: "emergency" as Severity, concern: "Confusion with abnormal vitals can signal a dangerous medical problem" },
  { key: "swelling", matches: ["leg swelling", "ankle swelling", "swelling"], severity: "watch" as Severity, concern: "Swelling can be linked to heart, kidney, vein, or infection issues" },
  { key: "fatigue", matches: ["fatigue", "extreme tiredness", "very tired", "weakness"], severity: "watch" as Severity, concern: "Marked fatigue can appear with infection, anemia, thyroid, or metabolic issues" },
  { key: "wheeze", matches: ["wheeze", "wheezing"], severity: "urgent" as Severity, concern: "Wheezing can point to an airway problem that needs medical review" },
  { key: "fever", matches: ["fever", "temperature"], severity: "watch" as Severity, concern: "Possible infection or viral illness" },
  { key: "cough", matches: ["cough"], severity: "watch" as Severity, concern: "Respiratory irritation or infection" },
  { key: "cold", matches: ["cold", "runny nose", "sneezing"], severity: "info" as Severity, concern: "Upper respiratory symptoms" },
  { key: "sore throat", matches: ["sore throat", "throat pain"], severity: "watch" as Severity, concern: "Throat infection or irritation" },
  { key: "headache", matches: ["headache"], severity: "watch" as Severity, concern: "Headache may worsen with high BP or infection" },
  { key: "vomiting", matches: ["vomiting", "throwing up"], severity: "urgent" as Severity, concern: "Vomiting increases dehydration risk" },
  { key: "diarrhea", matches: ["diarrhea", "loose motion"], severity: "urgent" as Severity, concern: "Diarrhea can cause dehydration" },
  { key: "stomach pain", matches: ["stomach pain", "abdominal pain", "belly pain"], severity: "watch" as Severity, concern: "Digestive or abdominal issue" },
];

const severityRank: Record<Severity, number> = {
  info: 0,
  watch: 1,
  urgent: 2,
  emergency: 3,
};

function uniqueItems(items: AnalysisItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}-${item.detail}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueRecommendations(items: Recommendation[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.text)) {
      return false;
    }
    seen.add(item.text);
    return true;
  });
}

function getHighestSeverity(items: AnalysisItem[]) {
  return items.reduce<Severity>(
    (highest, item) =>
      severityRank[item.severity] > severityRank[highest] ? item.severity : highest,
    "info"
  );
}

function hasTag(symptomTags: string[], key: string) {
  return symptomTags.includes(key);
}

export function parseBloodPressure(bp: string) {
  const match = bp.trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
  if (!match) {
    return { systolic: null, diastolic: null };
  }

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

export function analyzeHealth(input: HealthInputs): HealthAnalysis {
  const measurements: AnalysisItem[] = [];
  const possibleConcerns: AnalysisItem[] = [];
  const urgentFlags: AnalysisItem[] = [];
  const recommendations: Recommendation[] = [];
  const symptomTags: string[] = [];

  const bmi =
    input.heightCm > 0 ? input.weightKg / Math.pow(input.heightCm / 100, 2) : null;

  if (bmi !== null) {
    if (bmi < 18.5) {
      measurements.push({
        label: "BMI",
        detail: `BMI ${bmi.toFixed(1)} is below the usual healthy range.`,
        severity: "watch",
      });
      recommendations.push({
        text: "Consider a nutrition review if low weight is unintentional or you feel weak.",
        severity: "watch",
      });
    } else if (bmi >= 30) {
      measurements.push({
        label: "BMI",
        detail: `BMI ${bmi.toFixed(1)} is in the obesity range.`,
        severity: "watch",
      });
      possibleConcerns.push({
        label: "Weight-related risk",
        detail: "Higher BMI can increase blood pressure, diabetes, and heart disease risk.",
        severity: "watch",
      });
      recommendations.push({
        text: "Aim for regular walking, balanced meals, and a clinician-guided weight plan.",
        severity: "watch",
      });
    } else if (bmi >= 25) {
      measurements.push({
        label: "BMI",
        detail: `BMI ${bmi.toFixed(1)} is above the healthy range.`,
        severity: "watch",
      });
      recommendations.push({
        text: "Moderate weight reduction may improve BP and sugar readings over time.",
        severity: "watch",
      });
    } else {
      measurements.push({
        label: "BMI",
        detail: `BMI ${bmi.toFixed(1)} is in the usual healthy range.`,
        severity: "info",
      });
    }
  }

  if (input.sugar !== null) {
    if (input.sugar < 70) {
      addUrgentFlag(
        urgentFlags,
        "Low blood sugar",
        `Sugar level ${input.sugar} mg/dL may be dangerously low.`,
        "urgent"
      );
      recommendations.push({
        text: "If you feel shaky, sweaty, confused, or weak, take fast-acting sugar and seek urgent medical help.",
        severity: "urgent",
      });
    } else if (input.sugar >= 200) {
      addUrgentFlag(
        urgentFlags,
        "Very high blood sugar",
        `Sugar level ${input.sugar} mg/dL is very high.`,
        "urgent"
      );
      possibleConcerns.push({
        label: "Possible uncontrolled diabetes",
        detail: "Very high sugar can increase dehydration and infection risk.",
        severity: "urgent",
      });
      recommendations.push({
        text: "Arrange prompt medical review, especially if thirst, vomiting, or confusion are present.",
        severity: "urgent",
      });
    } else if (input.sugar >= 126) {
      measurements.push({
        label: "Blood sugar",
        detail: `Sugar level ${input.sugar} mg/dL is in a diabetic range.`,
        severity: "watch",
      });
      possibleConcerns.push({
        label: "Diabetes risk",
        detail: "This reading suggests diabetes risk and needs confirmation by a clinician.",
        severity: "watch",
      });
      recommendations.push({
        text: "Cut sugary drinks, walk daily if able, and book a diabetes evaluation.",
        severity: "watch",
      });
    } else if (input.sugar >= 100) {
      measurements.push({
        label: "Blood sugar",
        detail: `Sugar level ${input.sugar} mg/dL is above the normal fasting range.`,
        severity: "watch",
      });
      possibleConcerns.push({
        label: "Prediabetes risk",
        detail: "Borderline sugar can progress if not monitored early.",
        severity: "watch",
      });
      recommendations.push({
        text: "Reduce refined sugar and repeat testing with your doctor if this was a fasting value.",
        severity: "watch",
      });
    } else {
      measurements.push({
        label: "Blood sugar",
        detail: `Sugar level ${input.sugar} mg/dL is not elevated.`,
        severity: "info",
      });
    }
  }

  if (input.systolic !== null && input.diastolic !== null) {
    if (input.systolic < 80 || input.diastolic < 50) {
      addUrgentFlag(
        urgentFlags,
        "Very low blood pressure",
        `BP ${input.systolic}/${input.diastolic} may reflect shock, dehydration, or other instability.`,
        "urgent"
      );
      recommendations.push({
        text: "Get urgent care if very low BP comes with fainting, confusion, cold skin, or weakness.",
        severity: "urgent",
      });
    } else if (input.systolic < 90 || input.diastolic < 60) {
      measurements.push({
        label: "Blood pressure",
        detail: `BP ${input.systolic}/${input.diastolic} is lower than usual.`,
        severity: "watch",
      });
      recommendations.push({
        text: "If low BP comes with dizziness, fainting, weakness, or dehydration, get medical review soon.",
        severity: "watch",
      });
    } else
    if (input.systolic >= 180 || input.diastolic >= 120) {
      addUrgentFlag(
        urgentFlags,
        "Blood pressure crisis",
        `BP ${input.systolic}/${input.diastolic} needs emergency evaluation.`,
        "emergency"
      );
      recommendations.push({
        text: "Seek emergency care now, especially if headache, chest pain, weakness, or breathlessness are present.",
        severity: "emergency",
      });
    } else if (input.systolic >= 140 || input.diastolic >= 90) {
      measurements.push({
        label: "Blood pressure",
        detail: `BP ${input.systolic}/${input.diastolic} is in stage 2 hypertension range.`,
        severity: "watch",
      });
      possibleConcerns.push({
        label: "Hypertension",
        detail: "Persistent stage 2 BP raises stroke, kidney, and heart risk.",
        severity: "watch",
      });
      recommendations.push({
        text: "Reduce salt, avoid smoking, monitor BP again, and book a doctor visit soon.",
        severity: "watch",
      });
    } else if (input.systolic >= 130 || input.diastolic >= 80) {
      measurements.push({
        label: "Blood pressure",
        detail: `BP ${input.systolic}/${input.diastolic} should be interpreted in context.`,
        severity: "watch",
      });
      recommendations.push({
        text: "Track BP at home for several days and review lifestyle measures like sleep, exercise, and salt intake.",
        severity: "watch",
      });
    } else if (input.systolic >= 120 && input.diastolic < 80) {
      measurements.push({
        label: "Blood pressure",
        detail: `BP ${input.systolic}/${input.diastolic} is elevated.`,
        severity: "watch",
      });
    } else {
      measurements.push({
        label: "Blood pressure",
        detail: `BP ${input.systolic}/${input.diastolic} is in a normal range.`,
        severity: "info",
      });
    }
  }

  if (input.heartRate !== null) {
    if (input.heartRate < 45) {
      addUrgentFlag(
        urgentFlags,
        "Low heart rate",
        `Heart rate ${input.heartRate} bpm is very low.`,
        "urgent"
      );
      recommendations.push({
        text: "Get medical advice soon if low pulse comes with dizziness, fainting, weakness, or chest discomfort.",
        severity: "urgent",
      });
    } else if (input.heartRate < 60) {
      measurements.push({
        label: "Heart rate",
        detail: `Heart rate ${input.heartRate} bpm is slightly below the usual resting range.`,
        severity: "watch",
      });
    } else if (input.heartRate > 140) {
      addUrgentFlag(
        urgentFlags,
        "Severely fast heart rate",
        `Heart rate ${input.heartRate} bpm is in a very high range.`,
        "emergency"
      );
      recommendations.push({
        text: "Seek urgent care now if the pulse is this fast, especially with chest pain, dizziness, or breathlessness.",
        severity: "emergency",
      });
    } else if (input.heartRate > 120) {
      addUrgentFlag(
        urgentFlags,
        "Very fast heart rate",
        `Heart rate ${input.heartRate} bpm is unusually high.`,
        "urgent"
      );
      recommendations.push({
        text: "Rest, hydrate, avoid stimulants, and seek urgent care if the fast pulse continues or symptoms worsen.",
        severity: "urgent",
      });
    } else if (input.heartRate > 100) {
      measurements.push({
        label: "Heart rate",
        detail: `Heart rate ${input.heartRate} bpm is above the normal resting range.`,
        severity: "watch",
      });
    } else {
      measurements.push({
        label: "Heart rate",
        detail: `Heart rate ${input.heartRate} bpm is within the common resting range.`,
        severity: "info",
      });
    }
  }

  if (input.age >= 75) {
    possibleConcerns.push({
      label: "Advanced age factor",
      detail: "At older age, abnormal readings and new symptoms usually deserve earlier in-person medical review.",
      severity: "watch",
    });
  } else if (input.age >= 60) {
    possibleConcerns.push({
      label: "Age factor",
      detail: "Older adults usually need earlier review when symptoms and abnormal vitals appear together.",
      severity: "watch",
    });
  }

  const normalizedSymptoms = input.symptoms.toLowerCase();

  symptomLibrary.forEach((entry) => {
    if (entry.matches.some((term) => normalizedSymptoms.includes(term))) {
      symptomTags.push(entry.key);
      possibleConcerns.push({
        label: entry.key,
        detail: entry.concern,
        severity: entry.severity,
      });
    }
  });

  const hasFever = symptomTags.includes("fever");
  const hasCough = symptomTags.includes("cough");
  const hasCold = symptomTags.includes("cold");
  const hasVomiting = symptomTags.includes("vomiting");
  const hasDiarrhea = symptomTags.includes("diarrhea");
  const hasChestPain = hasTag(symptomTags, "chest pain");
  const hasBreathlessness = hasTag(symptomTags, "shortness of breath");
  const hasHeadache = hasTag(symptomTags, "headache");
  const hasConfusion = hasTag(symptomTags, "confusion");
  const hasPalpitations = hasTag(symptomTags, "palpitations");
  const hasWheeze = hasTag(symptomTags, "wheeze");
  const hasDizziness = hasTag(symptomTags, "dizziness");

  if (hasFever && hasCough && hasCold) {
    possibleConcerns.push({
      label: "Possible viral infection",
      detail: "Fever, cough, and cold symptoms often fit a viral illness pattern.",
      severity: "watch",
    });
    recommendations.push({
      text: "Rest, drink fluids, and get reviewed if breathing trouble, dehydration, or symptoms beyond 3 to 5 days occur.",
      severity: "watch",
    });
  }

  if (hasVomiting || hasDiarrhea) {
    recommendations.push({
      text: "Use oral fluids or ORS and seek care early if urine output drops, weakness increases, or blood appears.",
      severity: "watch",
    });
  }

  if (hasFever && hasCough && (hasBreathlessness || hasWheeze)) {
    addUrgentFlag(
      urgentFlags,
      "Breathing illness pattern",
      "Fever, cough, and breathing trouble together may indicate a more serious chest infection or airway problem.",
      "urgent"
    );
    recommendations.push({
      text: "Seek urgent medical review if breathing is difficult, noisy, or getting worse.",
      severity: "urgent",
    });
  }

  if ((hasVomiting || hasDiarrhea) && ((input.heartRate !== null && input.heartRate > 100) || (input.systolic !== null && input.systolic < 90))) {
    addUrgentFlag(
      urgentFlags,
      "Possible dehydration",
      "Fast pulse or low BP together with vomiting or diarrhea can indicate dehydration.",
      "urgent"
    );
    recommendations.push({
      text: "Use ORS early and get urgent care if dizziness, low urine, or worsening weakness develops.",
      severity: "urgent",
    });
  }

  if (hasConfusion && ((input.sugar !== null && (input.sugar < 70 || input.sugar >= 250)) || (input.systolic !== null && input.systolic >= 180))) {
    addUrgentFlag(
      urgentFlags,
      "Confusion with unstable readings",
      "Confusion together with extreme sugar or blood pressure readings may be a medical emergency.",
      "emergency"
    );
    recommendations.push({
      text: "Do not delay emergency medical care when confusion appears with very abnormal readings.",
      severity: "emergency",
    });
  }

  if (hasHeadache && input.systolic !== null && input.systolic >= 180) {
    addUrgentFlag(
      urgentFlags,
      "Severe headache with very high BP",
      "A severe headache with crisis-level blood pressure needs emergency assessment.",
      "emergency"
    );
  }

  if (hasChestPain && ((input.heartRate !== null && input.heartRate > 120) || (input.systolic !== null && input.systolic >= 180))) {
    addUrgentFlag(
      urgentFlags,
      "Chest pain with unstable vitals",
      "Chest pain together with very high BP or a very fast pulse needs urgent evaluation.",
      "emergency"
    );
  }

  if (hasPalpitations && hasDizziness) {
    possibleConcerns.push({
      label: "Rhythm-related concern",
      detail: "Palpitations together with dizziness can suggest an unstable heart rhythm and need prompt review.",
      severity: "urgent",
    });
  }

  const highestSeverity = getHighestSeverity([
    ...measurements,
    ...possibleConcerns,
    ...urgentFlags,
  ]);

  const riskScore = Math.min(
    100,
    measurements.reduce(
      (sum, item) => sum + (item.severity === "urgent" ? 15 : item.severity === "watch" ? 8 : 0),
      0
    ) +
      possibleConcerns.reduce(
        (sum, item) => sum + (item.severity === "emergency" ? 25 : item.severity === "urgent" ? 15 : item.severity === "watch" ? 8 : 0),
        0
      ) +
      urgentFlags.reduce(
        (sum, item) => sum + (item.severity === "emergency" ? 35 : 20),
        0
      )
  );

  let riskLevel: HealthAnalysis["riskLevel"] = "Low";
  let riskColor = "#22c55e";
  let summary = "Current inputs suggest low immediate risk, but continue routine monitoring.";
  let emergencyAdvice: string | null = null;

  if (highestSeverity === "emergency") {
    riskLevel = "Emergency";
    riskColor = "#dc2626";
    summary = "One or more inputs suggest a possible emergency. This app should not replace urgent medical care.";
    emergencyAdvice = "Seek emergency medical help now if symptoms are active or getting worse.";
  } else if (highestSeverity === "urgent") {
    riskLevel = "High";
    riskColor = "#f97316";
    summary = "Your inputs include concerning findings that should be reviewed by a doctor soon.";
  } else if (highestSeverity === "watch") {
    riskLevel = "Moderate";
    riskColor = "#eab308";
    summary = "There are mild to moderate concerns worth watching and following up on.";
  }

  if (
    possibleConcerns.some((item) => item.label === "chest pain") &&
    possibleConcerns.some((item) => item.label === "shortness of breath")
  ) {
    riskLevel = "Emergency";
    riskColor = "#dc2626";
    summary = "Chest pain together with breathing difficulty can be an emergency.";
    emergencyAdvice = "Seek urgent medical help immediately.";
  }

  const finalRecommendations = uniqueRecommendations([
    ...recommendations,
    {
      text: "This tool is for educational screening only and cannot diagnose disease or replace a doctor.",
      severity: "info",
    },
  ]);

  const suggestedModules: SuggestedModule[] = [];
  const hasBpConcern = (input.systolic && input.systolic >= 130) || (input.diastolic && input.diastolic >= 85) || urgentFlags.some(f => f.label.toLowerCase().includes("blood pressure"));
  const hasSugarConcern = (input.sugar && input.sugar >= 140) || urgentFlags.some(f => f.label.toLowerCase().includes("sugar"));
  const isEmergency = riskLevel === "Emergency" || riskLevel === "High" || urgentFlags.some(f => f.severity === "emergency");

  if (hasBpConcern) {
    suggestedModules.push({
      module: "diet-planner",
      title: "Diet Planner — DASH BP Plan",
      reason: "Elevated blood pressure detected. Explore blood-pressure friendly meal plans.",
      presetParams: { track: "bp" },
    });
    suggestedModules.push({
      module: "medicine-reminder",
      title: "Smart Reminder — Daily BP Check",
      reason: "Set a daily blood pressure monitoring reminder.",
      presetParams: { preset: "bp-check" },
    });
  }

  if (hasSugarConcern) {
    suggestedModules.push({
      module: "diet-planner",
      title: "Diet Planner — Sugar Support Plan",
      reason: "Elevated blood sugar reading. Browse low-glycemic dietary outlines.",
      presetParams: { track: "sugar" },
    });
    suggestedModules.push({
      module: "medicine-reminder",
      title: "Smart Reminder — Fasting Sugar Check",
      reason: "Set a morning fasting blood sugar check planner.",
      presetParams: { preset: "sugar-check" },
    });
  }

  if (isEmergency) {
    suggestedModules.push({
      module: "emergency-guide",
      title: "Emergency Protocol Guide",
      reason: "High risk symptoms detected. Review urgent medical warning signs.",
    });
    suggestedModules.push({
      module: "nearby-care",
      title: "Find Nearby Care & Emergency Rooms",
      reason: "Locate nearby hospitals and emergency medical facilities.",
    });
  }

  return {
    riskLevel,
    riskScore,
    riskColor,
    summary,
    measurements: uniqueItems(measurements),
    possibleConcerns: uniqueItems(possibleConcerns),
    urgentFlags: uniqueItems(urgentFlags),
    recommendations: finalRecommendations,
    suggestedModules,
    emergencyAdvice,
    bmi,
    symptomTags,
  };
}
