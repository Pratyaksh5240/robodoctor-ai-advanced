export type LabGender = "male" | "female";

export type LabFormValues = {
  fastingSugar: string;
  hba1c: string;
  hemoglobin: string;
  tsh: string;
  cholesterol: string;
  creatinine: string;
  platelets: string;
  wbc: string;
};

export type LabSeverity = "normal" | "borderline" | "abnormal" | "critical" | "typo";
export type LabTone = "low" | "medium" | "high" | "critical" | "typo";

export type LabMetricEvaluation = {
  key: keyof LabFormValues;
  nameEn: string;
  nameHi: string;
  unit: string;
  value: number;
  formattedValue: string;
  referenceRangeText: string;
  referenceMin: number;
  referenceMax: number;
  status: LabSeverity;
  badgeLabelEn: string;
  badgeLabelHi: string;
  titleEn: string;
  titleHi: string;
  detailEn: string;
  detailHi: string;
  actionEn: string;
  actionHi: string;
  tone: LabTone;
  gaugePercent: number;
  gaugeZones: { label: string; minPercent: number; maxPercent: number; color: string }[];
  isTypo: boolean;
  isNormal: boolean;
  isCritical: boolean;
};

export type LabDietTip = {
  titleEn: string;
  titleHi: string;
  tipsEn: string[];
  tipsHi: string[];
};

export type LabAnalysisResult = {
  evaluations: LabMetricEvaluation[];
  typos: LabMetricEvaluation[];
  criticals: LabMetricEvaluation[];
  abnormals: LabMetricEvaluation[];
  normals: LabMetricEvaluation[];
  overallStatus: "normal" | "borderline" | "abnormal" | "critical" | "review_needed";
  summaryEn: string;
  summaryHi: string;
  dietRecommendations: LabDietTip[];
  suggestedSpecialists: string[];
};

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

function calculateGaugePercent(val: number, displayMin: number, displayMax: number): number {
  if (val <= displayMin) return 4;
  if (val >= displayMax) return 96;
  const pct = ((val - displayMin) / (displayMax - displayMin)) * 100;
  return Math.round(clamp(pct, 6, 94));
}

// 1. Evaluate Hemoglobin (g/dL)
function evaluateHemoglobin(val: number, gender: LabGender): LabMetricEvaluation {
  const isMale = gender === "male";
  const refMin = isMale ? 13.8 : 12.0;
  const refMax = isMale ? 17.5 : 15.5;
  const refText = isMale ? "13.8 – 17.5 g/dL (Adult Male)" : "12.0 – 15.5 g/dL (Adult Female)";

  const displayMin = 3.0;
  const displayMax = 25.0;
  const gaugePercent = calculateGaugePercent(val, displayMin, displayMax);

  const gaugeZones = [
    { label: "Crit Low", minPercent: 0, maxPercent: 18, color: "bg-rose-600" },
    { label: "Low", minPercent: 18, maxPercent: 40, color: "bg-amber-500" },
    { label: "Normal", minPercent: 40, maxPercent: 68, color: "bg-emerald-500" },
    { label: "Elevated", minPercent: 68, maxPercent: 82, color: "bg-amber-500" },
    { label: "Crit High", minPercent: 82, maxPercent: 100, color: "bg-purple-600" },
  ];

  // Physiological / Typo Bounds Check:
  if (val < 3.0 || val > 25.0) {
    return {
      key: "hemoglobin",
      nameEn: "Hemoglobin",
      nameHi: "हीमोग्लोबिन",
      unit: "g/dL",
      value: val,
      formattedValue: `${val} g/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "typo",
      badgeLabelEn: "TYPO DETECTED",
      badgeLabelHi: "टाइपो त्रुटि",
      titleEn: "Hemoglobin value is out of physiological limits",
      titleHi: "हीमोग्लोबिन मान शारीरिक सीमा से बाहर है",
      detailEn: `Entered value of ${val} g/dL is physiologically improbable for living humans (typical biological survival range is 3.0 – 25.0 g/dL). You likely typed an extra digit (e.g. 199 instead of 11.9, 14.9, or 19.9) or omitted a decimal point. Please verify your printed lab slip.`,
      detailHi: `दर्ज किया गया मान ${val} g/dL शारीरिक रूप से संभव नहीं है (मानव जीवन सीमा 3.0 से 25.0 g/dL होती है)। संभवतः टाइपिंग में कोई अतिरिक्त अंक लग गया है (जैसे 11.9, 14.9 की जगह 199) या दशमलव बिंदु छूट गया है। कृपया लैब रिपोर्ट पर्ची दोबारा जांचें।`,
      actionEn: "Recheck the lab slip and re-enter the correct decimal number.",
      actionHi: "लैब रिपोर्ट से सही दशमलव संख्या दोबारा दर्ज करें।",
      tone: "typo",
      gaugePercent,
      gaugeZones,
      isTypo: true,
      isNormal: false,
      isCritical: true,
    };
  }

  // Critical Low Severe Anemia (< 7.0 g/dL)
  if (val < 7.0) {
    return {
      key: "hemoglobin",
      nameEn: "Hemoglobin",
      nameHi: "हीमोग्लोबिन",
      unit: "g/dL",
      value: val,
      formattedValue: `${val} g/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "critical",
      badgeLabelEn: "CRITICAL LOW (SEVERE ANEMIA)",
      badgeLabelHi: "अति गंभीर कमी (गंभीर एनीमिया)",
      titleEn: "Critically low hemoglobin — Severe Anemia",
      titleHi: "हीमोग्लोबिन अत्यंत कम — गंभीर एनीमिया",
      detailEn: `A hemoglobin level of ${val} g/dL indicates severe anemia. At this level, oxygen delivery to the heart and brain is significantly compromised. Symptoms may include rapid heartbeat, breathlessness on minimal exertion, dizziness, and extreme fatigue.`,
      detailHi: `${val} g/dL हीमोग्लोबिन गंभीर एनीमिया दर्शाता है। इस स्तर पर हृदय और मस्तिष्क तक ऑक्सीजन पहुंचना बाधित होता है। दिल की धड़कन तेज होना, चक्कर और अत्यधिक कमजोरी हो सकती है।`,
      actionEn: "Immediate emergency or physician evaluation required. Blood transfusion or IV iron therapy may be necessary.",
      actionHi: "तत्काल आपातकालीन या डॉक्टर से संपर्क करें। ब्लड ट्रांसफ्यूजन या IV आयरन की जरूरत हो सकती है।",
      tone: "critical",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: true,
    };
  }

  // Moderate Anemia (7.0 - 9.9 g/dL)
  if (val < 10.0) {
    return {
      key: "hemoglobin",
      nameEn: "Hemoglobin",
      nameHi: "हीमोग्लोबिन",
      unit: "g/dL",
      value: val,
      formattedValue: `${val} g/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "MODERATE ANEMIA",
      badgeLabelHi: "मध्यम एनीमिया",
      titleEn: "Moderate Anemia detected",
      titleHi: "मध्यम एनीमिया की स्थिति",
      detailEn: `Hemoglobin of ${val} g/dL is substantially below normal (${refText}). Common causes include iron deficiency, chronic blood loss, vitamin B12 deficiency, or chronic illness.`,
      detailHi: `हीमोग्लोबिन ${val} g/dL सामान्य सीमा (${refText}) से काफी कम है। मुख्य कारणों में आयरन की कमी, विटामिन B12 कमी या आंतरिक रक्तस्राव हो सकता है।`,
      actionEn: "Schedule a doctor consultation for complete iron profile (ferritin, TIBC) and tailored supplementation.",
      actionHi: "आयरन प्रोफाइल (फेरिटिन) जांच और डॉक्टर द्वारा निर्धारित सप्लीमेंट्स के लिए परामर्श लें।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  // Mild Anemia (< refMin)
  if (val < refMin) {
    return {
      key: "hemoglobin",
      nameEn: "Hemoglobin",
      nameHi: "हीमोग्लोबिन",
      unit: "g/dL",
      value: val,
      formattedValue: `${val} g/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "borderline",
      badgeLabelEn: "MILD ANEMIA / LOW",
      badgeLabelHi: "हल्का एनीमिया / कम",
      titleEn: "Mildly low hemoglobin",
      titleHi: "हीमोग्लोबिन हल्का कम",
      detailEn: `Hemoglobin of ${val} g/dL is slightly below the healthy reference range for an adult ${gender} (${refText}). You might experience mild fatigue, weakness, or pale complexion.`,
      detailHi: `हीमोग्लोबिन ${val} g/dL वयस्क ${isMale ? "पुरुष" : "महिला"} की सामान्य सीमा (${refText}) से थोड़ा कम है। हल्की थकान, कमजोरी या त्वचा में पीलापन महसूस हो सकता है।`,
      actionEn: "Increase iron-rich foods (green leafy vegetables, lentils, beets, pomegranate) paired with Vitamin C to improve absorption.",
      actionHi: "आयरन युक्त आहार (हरी पत्तेदार सब्जियां, दालें, चुकंदर, अनार) लें और विटामिन C के साथ खाएं।",
      tone: "medium",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  // Optimal / Normal Range
  if (val <= refMax) {
    return {
      key: "hemoglobin",
      nameEn: "Hemoglobin",
      nameHi: "हीमोग्लोबिन",
      unit: "g/dL",
      value: val,
      formattedValue: `${val} g/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "OPTIMAL / NORMAL",
      badgeLabelHi: "सामान्य / उत्तम",
      titleEn: "Hemoglobin is in healthy normal range",
      titleHi: "हीमोग्लोबिन स्वस्थ सामान्य सीमा में है",
      detailEn: `Hemoglobin level of ${val} g/dL reflects healthy red blood cell count and adequate oxygen carrying capacity (${refText}).`,
      detailHi: `हीमोग्लोबिन स्तर ${val} g/dL सामान्य स्वस्थ सीमा (${refText}) में है। यह पर्याप्त ऑक्सीजन परिवहन क्षमता दर्शाता है।`,
      actionEn: "Maintain a balanced nutrient-dense diet and stay well hydrated.",
      actionHi: "संतुलित पौष्टिक आहार बनाए रखें और पर्याप्त पानी पिएं।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  // High / Polycythemia (above refMax but <= 20.0)
  const isSeverePolycythemia = val > 20.0;
  if (!isSeverePolycythemia) {
    return {
      key: "hemoglobin",
      nameEn: "Hemoglobin",
      nameHi: "हीमोग्लोबिन",
      unit: "g/dL",
      value: val,
      formattedValue: `${val} g/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "ELEVATED (POLYCYTHEMIA)",
      badgeLabelHi: "बढ़ा हुआ (पॉलीसाइथेमिया)",
      titleEn: "Elevated hemoglobin (Secondary or primary polycythemia)",
      titleHi: "हीमोग्लोबिन बढ़ा हुआ (पॉलीसाइथेमिया का संकेत)",
      detailEn: `Hemoglobin of ${val} g/dL is above the upper normal limit (${refText}). Elevated hemoglobin thickens the blood (higher hematocrit). Common causes include chronic dehydration, cigarette smoking, living at high altitude, obstructive sleep apnea, or chronic lung conditions.`,
      detailHi: `हीमोग्लोबिन ${val} g/dL ऊपरी सामान्य सीमा (${refText}) से अधिक है। बढ़ा हुआ हीमोग्लोबिन खून को गाढ़ा कर सकता है। डिहाइड्रेशन, धूम्रपान, ऊंचाई पर रहना, या स्लीप एपनिया इसके सामान्य कारण हो सकते हैं।`,
      actionEn: "Ensure adequate hydration, review smoking habits, and consult a physician to test hematocrit and rule out polycythemia vera.",
      actionHi: "खूब पानी पिएं, धूम्रपान से बचें और हेमेटोक्रिट जांच व डॉक्टर परामर्श लें।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  // Critical High / Hyperviscosity crisis risk (> 20.0 g/dL)
  return {
    key: "hemoglobin",
    nameEn: "Hemoglobin",
    nameHi: "हीमोग्लोबिन",
    unit: "g/dL",
    value: val,
    formattedValue: `${val} g/dL`,
    referenceRangeText: refText,
    referenceMin: refMin,
    referenceMax: refMax,
    status: "critical",
    badgeLabelEn: "CRITICAL HIGH (HYPERVISCOSITY RISK)",
    badgeLabelHi: "अति उच्च जोखिम (हाइपरविस्कोसिटी)",
    titleEn: "Critically high hemoglobin — Hyperviscosity danger",
    titleHi: "हीमोग्लोबिन अत्यंत अधिक — रक्त गाढ़ा होने का गंभीर जोखिम",
    detailEn: `Hemoglobin level of ${val} g/dL is critically elevated. Blood with this high red cell concentration becomes dangerously viscous (thick), increasing the risk of thrombotic events (blood clots, stroke, deep vein thrombosis) and microvascular sluggishness.`,
    detailHi: `हीमोग्लोबिन ${val} g/dL अत्यंत खतरनाक स्तर पर है। इतना अधिक गाढ़ा रक्त क्लॉटिंग, स्ट्रोक या नसें अवरुद्ध होने का गंभीर जोखिम पैदा करता है।`,
    actionEn: "Urgent hematology and emergency evaluation advised. Therapeutic phlebotomy (blood removal) may be indicated.",
    actionHi: "तत्काल हेमाटोलॉजिस्ट / अस्पताल में आपातकालीन जांच कराएं।",
    tone: "critical",
    gaugePercent,
    gaugeZones,
    isTypo: false,
    isNormal: false,
    isCritical: true,
  };
}

// 2. Evaluate Fasting Blood Sugar (mg/dL)
function evaluateFastingSugar(val: number): LabMetricEvaluation {
  const refMin = 70;
  const refMax = 99;
  const refText = "70 – 99 mg/dL (Normal Fasting)";
  const displayMin = 20;
  const displayMax = 500;
  const gaugePercent = calculateGaugePercent(val, displayMin, displayMax);

  const gaugeZones = [
    { label: "Hypoglycemia", minPercent: 0, maxPercent: 20, color: "bg-rose-600" },
    { label: "Normal", minPercent: 20, maxPercent: 40, color: "bg-emerald-500" },
    { label: "Prediabetes", minPercent: 40, maxPercent: 55, color: "bg-amber-500" },
    { label: "Diabetes", minPercent: 55, maxPercent: 75, color: "bg-rose-500" },
    { label: "Severe", minPercent: 75, maxPercent: 100, color: "bg-purple-600" },
  ];

  if (val < 20 || val > 750) {
    return {
      key: "fastingSugar",
      nameEn: "Fasting Blood Glucose",
      nameHi: "फास्टिंग ब्लड ग्लूकोज",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "typo",
      badgeLabelEn: "TYPO DETECTED",
      badgeLabelHi: "टाइपो त्रुटि",
      titleEn: "Fasting sugar value is out of physiological limits",
      titleHi: "फास्टिंग शुगर मान शारीरिक सीमा से बाहर है",
      detailEn: `Entered fasting sugar of ${val} mg/dL is outside typical human clinical measurement ranges (20 – 750 mg/dL). If you typed values from an international report in mmol/L (e.g. 5.5 mmol/L), multiply by 18 to get mg/dL (~99 mg/dL). Otherwise, check for extra zeros.`,
      detailHi: `दर्ज की गई शुगर ${val} mg/dL शारीरिक सीमा (20 - 750 mg/dL) से बाहर है। यदि रिपोर्ट mmol/L में है तो 18 से गुणा करें। अन्यथा सही संख्या दोबारा दर्ज करें।`,
      actionEn: "Check if the lab unit is mmol/L or check for typing errors.",
      actionHi: "यूनिट जांचें (mg/dL या mmol/L) और सही संख्या भरें।",
      tone: "typo",
      gaugePercent,
      gaugeZones,
      isTypo: true,
      isNormal: false,
      isCritical: true,
    };
  }

  if (val < 55) {
    return {
      key: "fastingSugar",
      nameEn: "Fasting Blood Glucose",
      nameHi: "फास्टिंग ब्लड ग्लूकोज",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "critical",
      badgeLabelEn: "CRITICAL HYPOGLYCEMIA",
      badgeLabelHi: "अति गंभीर लो शुगर",
      titleEn: "Critical Hypoglycemia (Dangerously Low Sugar)",
      titleHi: "गंभीर हाइपोग्लाइसीमिया (शुगर बहुत कम)",
      detailEn: `Fasting blood glucose of ${val} mg/dL is dangerously low. Neuroglycopenic symptoms include sweating, confusion, tremor, lightheadedness, or loss of consciousness.`,
      detailHi: `फास्टिंग ब्लड शुगर ${val} mg/dL अत्यंत कम है। पसीना आना, कंपकंपी, चक्कर आना या बेहोशी का खतरा हो सकता है।`,
      actionEn: "Consume 15-20g of fast-acting carbohydrate (fruit juice, glucose tablets, honey) immediately. Recheck in 15 minutes.",
      actionHi: "तुरंत मीठा जूस, ग्लूकोज या शहद लें। 15 मिनट बाद दोबारा जांचें।",
      tone: "critical",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: true,
    };
  }

  if (val < 70) {
    return {
      key: "fastingSugar",
      nameEn: "Fasting Blood Glucose",
      nameHi: "फास्टिंग ब्लड ग्लूकोज",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "borderline",
      badgeLabelEn: "BORDERLINE LOW SUGAR",
      badgeLabelHi: "सीमा से कम शुगर",
      titleEn: "Mild Low Blood Sugar",
      titleHi: "हल्की कम ब्लड शुगर",
      detailEn: `Fasting sugar of ${val} mg/dL is slightly below the 70 mg/dL threshold. Can happen with prolonged fasting or high physical activity.`,
      detailHi: `फास्टिंग शुगर ${val} mg/dL सामान्य 70 mg/dL से थोड़ी कम है। लंबे उपवास या अधिक शारीरिक श्रम से हो सकता है।`,
      actionEn: "Have a balanced meal or healthy snack containing complex carbohydrates.",
      actionHi: "संतुलित भोजन या हल्का नाश्ता लें।",
      tone: "medium",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  if (val <= 99) {
    return {
      key: "fastingSugar",
      nameEn: "Fasting Blood Glucose",
      nameHi: "फास्टिंग ब्लड ग्लूकोज",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "NORMAL EUGLYCEMIA",
      badgeLabelHi: "सामान्य स्वस्थ स्तर",
      titleEn: "Fasting sugar is in optimal healthy range",
      titleHi: "फास्टिंग शुगर स्वस्थ सामान्य सीमा में है",
      detailEn: `Fasting glucose of ${val} mg/dL is within the ideal American Diabetes Association (ADA) healthy fasting range (70–99 mg/dL).`,
      detailHi: `फास्टिंग ग्लूकोज ${val} mg/dL आदर्श स्वस्थ सीमा (70-99 mg/dL) में है।`,
      actionEn: "Continue balanced nutrition and active lifestyle.",
      actionHi: "नियमित व्यायाम और संतुलित आहार बनाए रखें।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  if (val <= 125) {
    return {
      key: "fastingSugar",
      nameEn: "Fasting Blood Glucose",
      nameHi: "फास्टिंग ब्लड ग्लूकोज",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "borderline",
      badgeLabelEn: "PREDIABETES RANGE",
      badgeLabelHi: "प्रीडायबिटीज स्तर",
      titleEn: "Impaired Fasting Glucose (Prediabetes indicator)",
      titleHi: "फास्टिंग शुगर बॉर्डरलाइन (प्रीडायबिटीज)",
      detailEn: `Fasting glucose of ${val} mg/dL suggests impaired fasting glucose (100–125 mg/dL). At this stage, insulin sensitivity is declining, but it is highly reversible with dietary and lifestyle modifications.`,
      detailHi: `फास्टिंग ग्लूकोज ${val} mg/dL प्रीडायबिटीज रेंज में है। इस स्तर पर डाइट और व्यायाम से इसे पूरी तरह सामान्य किया जा सकता है।`,
      actionEn: "Adopt a low-glycemic Mediterranean or DASH diet, reduce refined sugars, and walk 30 minutes daily.",
      actionHi: "मीठी चीजें व रिफाइंड कार्ब्स कम करें, रोज 30 मिनट टहलें और HbA1c जांच कराएं।",
      tone: "medium",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  if (val <= 199) {
    return {
      key: "fastingSugar",
      nameEn: "Fasting Blood Glucose",
      nameHi: "फास्टिंग ब्लड ग्लूकोज",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "DIABETES CRITERIA MET",
      badgeLabelHi: "डायबिटीज सीमा में",
      titleEn: "Elevated Fasting Glucose — Diabetes threshold",
      titleHi: "फास्टिंग शुगर अधिक — डायबिटीज का स्तर",
      detailEn: `Fasting blood glucose of ${val} mg/dL exceeds the diagnostic threshold of 126 mg/dL. Two independent readings in this zone warrant confirmation of diabetes mellitus.`,
      detailHi: `फास्टिंग ग्लूकोज ${val} mg/dL डायबिटीज की मानक सीमा (126 mg/dL) से अधिक है। इसे डॉक्टर से दिखाकर पुष्टि करानी चाहिए।`,
      actionEn: "Consult an endocrinologist or physician for HbA1c confirmation and personalized glycemic control plan.",
      actionHi: "डॉक्टर से परामर्श लें, HbA1c की पुष्टि करें और सही उपचार योजना शुरू करें।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  // Severe Marked Hyperglycemia (>= 200 mg/dL)
  return {
    key: "fastingSugar",
    nameEn: "Fasting Blood Glucose",
    nameHi: "फास्टिंग ब्लड ग्लूकोज",
    unit: "mg/dL",
    value: val,
    formattedValue: `${val} mg/dL`,
    referenceRangeText: refText,
    referenceMin: refMin,
    referenceMax: refMax,
    status: "critical",
    badgeLabelEn: "MARKED HYPERGLYCEMIA",
    badgeLabelHi: "अत्यधिक उच्च शुगर",
    titleEn: "Markedly high fasting sugar — Hyperglycemia crisis risk",
    titleHi: "फास्टिंग शुगर बहुत ज्यादा — हाइपरग्लाइसीमिया खतरा",
    detailEn: `Fasting blood glucose of ${val} mg/dL is substantially elevated. Watch for symptoms of diabetic ketoacidosis (DKA) or hyperosmolar state: extreme thirst, frequent urination, nausea, vomiting, or confusion.`,
    detailHi: `फास्टिंग शुगर ${val} mg/dL बहुत अधिक है। अत्यधिक प्यास, बार-बार पेशाब, उल्टी या सुस्ती महसूस होने पर तुरंत सतर्क रहें।`,
    actionEn: "Urgent medical evaluation required. Check for urine ketones if Type 1 diabetes is suspected.",
    actionHi: "तत्काल डॉक्टर से मिलें और यूरिन कीटोन जांचें।",
    tone: "critical",
    gaugePercent,
    gaugeZones,
    isTypo: false,
    isNormal: false,
    isCritical: true,
  };
}

// 3. Evaluate HbA1c (%)
function evaluateHbA1c(val: number): LabMetricEvaluation {
  const refMin = 4.0;
  const refMax = 5.6;
  const refText = "< 5.7% (Normal Non-Diabetic)";
  const displayMin = 3.0;
  const displayMax = 16.0;
  const gaugePercent = calculateGaugePercent(val, displayMin, displayMax);

  const gaugeZones = [
    { label: "Normal", minPercent: 0, maxPercent: 35, color: "bg-emerald-500" },
    { label: "Prediabetes", minPercent: 35, maxPercent: 55, color: "bg-amber-500" },
    { label: "Controlled", minPercent: 55, maxPercent: 70, color: "bg-rose-400" },
    { label: "High", minPercent: 70, maxPercent: 85, color: "bg-rose-600" },
    { label: "Severe", minPercent: 85, maxPercent: 100, color: "bg-purple-600" },
  ];

  if (val < 3.0 || val > 22.0) {
    return {
      key: "hba1c",
      nameEn: "HbA1c (Glycated Hemoglobin)",
      nameHi: "HbA1c (ग्लाइकेटेड हीमोग्लोबिन)",
      unit: "%",
      value: val,
      formattedValue: `${val}%`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "typo",
      badgeLabelEn: "TYPO DETECTED",
      badgeLabelHi: "टाइपो त्रुटि",
      titleEn: "HbA1c value out of biological limits",
      titleHi: "HbA1c मान शारीरिक सीमा से बाहर है",
      detailEn: `Entered HbA1c of ${val}% is physiologically improbable (typical human clinical range is 3.5% – 20%). Recheck if you entered fasting sugar value into the HbA1c field.`,
      detailHi: `HbA1c ${val}% संभव सीमा (3.5% - 20%) से बाहर है। जांचें कि कहीं फास्टिंग शुगर की संख्या यहां तो नहीं भर दी।`,
      actionEn: "Recheck your lab slip and enter the correct percentage (e.g. 5.6 or 7.2).",
      actionHi: "लैब रिपोर्ट देखकर सही प्रतिशत दर्ज करें।",
      tone: "typo",
      gaugePercent,
      gaugeZones,
      isTypo: true,
      isNormal: false,
      isCritical: true,
    };
  }

  if (val < 5.7) {
    return {
      key: "hba1c",
      nameEn: "HbA1c (Glycated Hemoglobin)",
      nameHi: "HbA1c (ग्लाइकेटेड हीमोग्लोबिन)",
      unit: "%",
      value: val,
      formattedValue: `${val}%`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "NORMAL (< 5.7%)",
      badgeLabelHi: "सामान्य (< 5.7%)",
      titleEn: "HbA1c is in excellent healthy range",
      titleHi: "HbA1c उत्कृष्ट सामान्य सीमा में है",
      detailEn: `HbA1c of ${val}% demonstrates excellent 3-month glycemic control without signs of diabetes.`,
      detailHi: `HbA1c ${val}% पिछले 3 महीनों का बेहतरीन ब्लड शुगर नियंत्रण दर्शाता है।`,
      actionEn: "Keep up your regular exercise and healthy dietary pattern.",
      actionHi: "नियमित व्यायाम और संतुलित दिनचर्या जारी रखें।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  if (val <= 6.4) {
    return {
      key: "hba1c",
      nameEn: "HbA1c (Glycated Hemoglobin)",
      nameHi: "HbA1c (ग्लाइकेटेड हीमोग्लोबिन)",
      unit: "%",
      value: val,
      formattedValue: `${val}%`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "borderline",
      badgeLabelEn: "PREDIABETES (5.7 - 6.4%)",
      badgeLabelHi: "प्रीडायबिटीज (5.7 - 6.4%)",
      titleEn: "Prediabetes detected on 3-month average",
      titleHi: "3 महीने के औसत में प्रीडायबिटीज का संकेत",
      detailEn: `HbA1c of ${val}% falls in the prediabetes window (5.7% – 6.4%). Insulin resistance has started, but progression to full diabetes can often be prevented.`,
      detailHi: `HbA1c ${val}% प्रीडायबिटीज सीमा में है। खान-पान में सुधार और रोजाना कसरत से डायबिटीज से बचा जा सकता है।`,
      actionEn: "Target 5-7% body weight reduction if overweight, avoid sweetened beverages, and exercise 150 min/week.",
      actionHi: "वजन नियंत्रित रखें, मीठे पेय बंद करें और हफ्ते में 150 मिनट व्यायाम करें।",
      tone: "medium",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  if (val <= 7.5) {
    return {
      key: "hba1c",
      nameEn: "HbA1c (Glycated Hemoglobin)",
      nameHi: "HbA1c (ग्लाइकेटेड हीमोग्लोबिन)",
      unit: "%",
      value: val,
      formattedValue: `${val}%`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "DIABETES (MILD / MODERATE)",
      badgeLabelHi: "डायबिटीज (हल्का / मध्यम)",
      titleEn: "HbA1c indicates diabetes mellitus",
      titleHi: "HbA1c डायबिटीज की पुष्टि करता है",
      detailEn: `HbA1c of ${val}% satisfies diagnostic criteria for diabetes (>= 6.5%). For diagnosed patients, this is near the common target (< 7.0%), but requires monitoring.`,
      detailHi: `HbA1c ${val}% डायबिटीज की पुष्टि करता है (>= 6.5%)। इसे नियमित दवा और खानपान से 7% के नीचे रखने का लक्ष्य होना चाहिए।`,
      actionEn: "Review with doctor for medication initiation or adjustment, and monitor fasting/post-meal glucose.",
      actionHi: "डॉक्टर से मिलकर दवा और शुगर मॉनिटरिंग की योजना बनाएं।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  return {
    key: "hba1c",
    nameEn: "HbA1c (Glycated Hemoglobin)",
    nameHi: "HbA1c (ग्लाइकेटेड हीमोग्लोबिन)",
    unit: "%",
    value: val,
    formattedValue: `${val}%`,
    referenceRangeText: refText,
    referenceMin: refMin,
    referenceMax: refMax,
    status: val > 9.0 ? "critical" : "abnormal",
    badgeLabelEn: val > 9.0 ? "CRITICALLY UNCONTROLLED" : "UNCONTROLLED DIABETES",
    badgeLabelHi: val > 9.0 ? "अत्यधिक अनियंत्रित" : "अनियंत्रित डायबिटीज",
    titleEn: `Uncontrolled blood sugar average (HbA1c ${val}%)`,
    titleHi: `अनियंत्रित ब्लड शुगर औसत (HbA1c ${val}%)`,
    detailEn: `HbA1c of ${val}% shows sustained chronic hyperglycemia over the past 90 days. High levels over 8.0% significantly elevate risk of diabetic retinopathy, neuropathy, and kidney damage.`,
    detailHi: `HbA1c ${val}% पिछले 90 दिनों में लगातार शुगर अधिक रहने को दिखाता है। यह आंखों, नसों और गुर्दों पर बुरा असर डाल सकता है।`,
    actionEn: "Immediate consultation with physician or diabetologist for therapy escalation.",
    actionHi: "तुरंत फिजिशियन या डायबेटोलॉजिस्ट से मिलकर इलाज अपग्रेड कराएं।",
    tone: val > 9.0 ? "critical" : "high",
    gaugePercent,
    gaugeZones,
    isTypo: false,
    isNormal: false,
    isCritical: val > 9.0,
  };
}

// 4. Evaluate TSH (mIU/L)
function evaluateTSH(val: number): LabMetricEvaluation {
  const refMin = 0.4;
  const refMax = 4.5;
  const refText = "0.4 – 4.5 mIU/L (Euthyroid)";
  const displayMin = 0.01;
  const displayMax = 30.0;
  const gaugePercent = calculateGaugePercent(val, displayMin, displayMax);

  const gaugeZones = [
    { label: "Hyperthyroid", minPercent: 0, maxPercent: 20, color: "bg-rose-500" },
    { label: "Normal", minPercent: 20, maxPercent: 50, color: "bg-emerald-500" },
    { label: "Subclinical", minPercent: 50, maxPercent: 75, color: "bg-amber-500" },
    { label: "Hypothyroid", minPercent: 75, maxPercent: 100, color: "bg-rose-600" },
  ];

  if (val < 0.005 || val > 150) {
    return {
      key: "tsh",
      nameEn: "TSH (Thyroid Stimulating Hormone)",
      nameHi: "TSH (थायरॉयड स्टिम्युलेटिंग हार्मोन)",
      unit: "mIU/L",
      value: val,
      formattedValue: `${val} mIU/L`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "typo",
      badgeLabelEn: "TYPO DETECTED",
      badgeLabelHi: "टाइपो त्रुटि",
      titleEn: "TSH value out of biological limits",
      titleHi: "TSH मान सीमा से बाहर है",
      detailEn: `Entered TSH value of ${val} mIU/L is outside plausible clinical parameters (0.01 – 150 mIU/L). Please double check the decimal point on your thyroid lab report.`,
      detailHi: `दर्ज TSH ${val} mIU/L सामान्य सीमा से बाहर है। कृपया लैब रिपोर्ट में दशमलव बिंदु जांचें।`,
      actionEn: "Recheck the thyroid panel slip and re-enter.",
      actionHi: "थायरॉयड पर्ची दोबारा जांचकर सही मान भरें।",
      tone: "typo",
      gaugePercent,
      gaugeZones,
      isTypo: true,
      isNormal: false,
      isCritical: true,
    };
  }

  if (val < 0.1) {
    return {
      key: "tsh",
      nameEn: "TSH (Thyroid Stimulating Hormone)",
      nameHi: "TSH (थायरॉयड स्टिम्युलेटिंग हार्मोन)",
      unit: "mIU/L",
      value: val,
      formattedValue: `${val} mIU/L`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "SUPPRESSED TSH (HYPERTHYROID)",
      badgeLabelHi: "अति सक्रिय थायरॉयड (हाइपरथायरॉयड)",
      titleEn: "Suppressed TSH — Possible Hyperthyroidism",
      titleHi: "दबा हुआ TSH — हाइपरथायरॉयडिज्म का संकेत",
      detailEn: `A TSH of ${val} mIU/L is markedly low. When thyroid hormones (Free T3/T4) are excessively high, the pituitary gland shuts down TSH production. Symptoms include rapid pulse, unexplained weight loss, heat intolerance, and hand tremors.`,
      detailHi: `TSH ${val} mIU/L अत्यधिक कम है। यह ओवरएक्टिव थायरॉयड की ओर इशारा करता है। दिल की धड़कन तेज होना, वजन घटना और गर्मी न झेल पाना इसके लक्षण हैं।`,
      actionEn: "Consult an endocrinologist to order Free T3 and Free T4 tests and evaluate for hyperthyroid conditions.",
      actionHi: "एंडोक्रिनोलॉजिस्ट से मिलकर Free T3 और Free T4 जांच कराएं।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  if (val < 0.4) {
    return {
      key: "tsh",
      nameEn: "TSH (Thyroid Stimulating Hormone)",
      nameHi: "TSH (थायरॉयड स्टिम्युलेटिंग हार्मोन)",
      unit: "mIU/L",
      value: val,
      formattedValue: `${val} mIU/L`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "borderline",
      badgeLabelEn: "SUBCLINICAL LOW TSH",
      badgeLabelHi: "हल्का कम TSH",
      titleEn: "Mildly low TSH — Borderline hyperthyroid pattern",
      titleHi: "हल्का कम TSH — बॉर्डरलाइन हाइपरथायरॉयड",
      detailEn: `TSH of ${val} mIU/L is slightly below the normal lower limit (0.4 mIU/L). May reflect early thyroid hyperactivity, recent illness recovery, or medication effect.`,
      detailHi: `TSH ${val} mIU/L निचली सीमा से थोड़ा कम है। यह थायरॉयड की हल्की अधिक सक्रियता दर्शा सकता है।`,
      actionEn: "Repeat thyroid panel in 6-8 weeks with symptom correlation.",
      actionHi: "6-8 हफ्तों में दोबारा थायरॉयड जांच कराएं।",
      tone: "medium",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  if (val <= 4.5) {
    return {
      key: "tsh",
      nameEn: "TSH (Thyroid Stimulating Hormone)",
      nameHi: "TSH (थायरॉयड स्टिम्युलेटिंग हार्मोन)",
      unit: "mIU/L",
      value: val,
      formattedValue: `${val} mIU/L`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "EUTHYROID (NORMAL)",
      badgeLabelHi: "सामान्य थायरॉयड",
      titleEn: "TSH is in optimal normal range",
      titleHi: "TSH सामान्य स्वस्थ सीमा में है",
      detailEn: `TSH level of ${val} mIU/L indicates normal pituitary-thyroid feedback regulation (0.4–4.5 mIU/L).`,
      detailHi: `TSH स्तर ${val} mIU/L सामान्य स्वस्थ संतुलन (0.4-4.5 mIU/L) में है।`,
      actionEn: "Maintain general wellness; routine yearly monitoring is adequate.",
      actionHi: "सामान्य दिनचर्या बनाए रखें; साल में एक बार रूटीन जांच पर्याप्त है।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  if (val <= 10.0) {
    return {
      key: "tsh",
      nameEn: "TSH (Thyroid Stimulating Hormone)",
      nameHi: "TSH (थायरॉयड स्टिम्युलेटिंग हार्मोन)",
      unit: "mIU/L",
      value: val,
      formattedValue: `${val} mIU/L`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "borderline",
      badgeLabelEn: "SUBCLINICAL HYPOTHYROID",
      badgeLabelHi: "हल्का बढ़ा हुआ TSH (हाइपोथायरॉयड)",
      titleEn: "Mildly elevated TSH (Early sluggish thyroid)",
      titleHi: "हल्का बढ़ा हुआ TSH — सुस्त थायरॉयड का शुरुआती संकेत",
      detailEn: `TSH of ${val} mIU/L is elevated above normal. The pituitary is working harder to stimulate a sluggish thyroid gland. Mild fatigue, weight gain tendency, or feeling cold are common.`,
      detailHi: `TSH ${val} mIU/L बढ़ा हुआ है। यह थायरॉयड ग्रंथि के धीमे काम करने का संकेत है। हल्की सुस्ती, वजन बढ़ना और ठंड लगना महसूस हो सकता है।`,
      actionEn: "Check Anti-TPO antibodies and Free T4 with your physician to decide whether thyroid replacement is required.",
      actionHi: "डॉक्टर से मिलकर Free T4 और एंटीबॉडीज जांच कराएं।",
      tone: "medium",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  // Overt Hypothyroid (> 10.0 mIU/L)
  return {
    key: "tsh",
    nameEn: "TSH (Thyroid Stimulating Hormone)",
    nameHi: "TSH (थायरॉयड स्टिम्युलेटिंग हार्मोन)",
    unit: "mIU/L",
    value: val,
    formattedValue: `${val} mIU/L`,
    referenceRangeText: refText,
    referenceMin: refMin,
    referenceMax: refMax,
    status: "abnormal",
    badgeLabelEn: "OVERT HYPOTHYROIDISM",
    badgeLabelHi: "हाइपोथायरॉयडिज्म (थायरॉयड की कमी)",
    titleEn: "Significantly elevated TSH — Hypothyroidism",
    titleHi: "TSH काफी बढ़ा हुआ — हाइपोथायरॉयडिज्म",
    detailEn: `TSH of ${val} mIU/L indicates overt thyroid gland underactivity. Symptoms can include persistent exhaustion, dry skin, severe cold intolerance, constipation, and slow metabolism.`,
    detailHi: `TSH ${val} mIU/L स्पष्ट हाइपोथायरॉयडिज्म दर्शाता है। अत्यधिक थकान, त्वचा का सूखापन, कब्ज और सुस्ती हो सकती है।`,
    actionEn: "Doctor consultation recommended for levothyroxine thyroid hormone replacement therapy.",
    actionHi: "डॉक्टर से परामर्श लें ताकि थायरॉयड सप्लीमेंट (लेवोथायरोक्सिन) शुरू किया जा सके।",
    tone: "high",
    gaugePercent,
    gaugeZones,
    isTypo: false,
    isNormal: false,
    isCritical: false,
  };
}

// 5. Evaluate Total Cholesterol (mg/dL)
function evaluateCholesterol(val: number): LabMetricEvaluation {
  const refMin = 100;
  const refMax = 199;
  const refText = "< 200 mg/dL (Desirable)";
  const displayMin = 50;
  const displayMax = 500;
  const gaugePercent = calculateGaugePercent(val, displayMin, displayMax);

  const gaugeZones = [
    { label: "Optimal", minPercent: 0, maxPercent: 45, color: "bg-emerald-500" },
    { label: "Borderline", minPercent: 45, maxPercent: 65, color: "bg-amber-500" },
    { label: "High", minPercent: 65, maxPercent: 85, color: "bg-rose-500" },
    { label: "Very High", minPercent: 85, maxPercent: 100, color: "bg-purple-600" },
  ];

  if (val < 50 || val > 650) {
    return {
      key: "cholesterol",
      nameEn: "Total Cholesterol",
      nameHi: "कुल कोलेस्ट्रॉल",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "typo",
      badgeLabelEn: "TYPO DETECTED",
      badgeLabelHi: "टाइपो त्रुटि",
      titleEn: "Cholesterol value out of clinical limits",
      titleHi: "कोलेस्ट्रॉल मान सीमा से बाहर है",
      detailEn: `Entered total cholesterol of ${val} mg/dL is outside typical human parameters (50 – 650 mg/dL). Please verify the printed lipid profile.`,
      detailHi: `दर्ज कोलेस्ट्रॉल ${val} mg/dL संभव सीमा से बाहर है। कृपया लिपिड प्रोफाइल पर्ची जांचें।`,
      actionEn: "Verify and re-enter the correct total cholesterol value.",
      actionHi: "जांचकर सही कोलेस्ट्रॉल मान भरें।",
      tone: "typo",
      gaugePercent,
      gaugeZones,
      isTypo: true,
      isNormal: false,
      isCritical: true,
    };
  }

  if (val < 200) {
    return {
      key: "cholesterol",
      nameEn: "Total Cholesterol",
      nameHi: "कुल कोलेस्ट्रॉल",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "DESIRABLE (< 200)",
      badgeLabelHi: "उत्तम (< 200)",
      titleEn: "Total cholesterol is in desirable range",
      titleHi: "कुल कोलेस्ट्रॉल सामान्य सुरक्षित सीमा में है",
      detailEn: `Total cholesterol of ${val} mg/dL is within the desirable threshold (< 200 mg/dL), supporting good cardiovascular health.`,
      detailHi: `कुल कोलेस्ट्रॉल ${val} mg/dL सुरक्षित सीमा में है, जो हृदय स्वास्थ्य के लिए अनुकूल है।`,
      actionEn: "Maintain heart-healthy diet with dietary fiber and healthy unsaturated fats.",
      actionHi: "स्वस्थ फाइबर और संतुलित आहार जारी रखें।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  if (val <= 239) {
    return {
      key: "cholesterol",
      nameEn: "Total Cholesterol",
      nameHi: "कुल कोलेस्ट्रॉल",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "borderline",
      badgeLabelEn: "BORDERLINE HIGH (200 - 239)",
      badgeLabelHi: "सीमा रेखा पर (200 - 239)",
      titleEn: "Borderline elevated cholesterol",
      titleHi: "कोलेस्ट्रॉल सीमा रेखा पर बढ़ा हुआ",
      detailEn: `Total cholesterol of ${val} mg/dL is borderline elevated. It raises the risk of arterial plaque buildup over time if LDL (bad cholesterol) is also high.`,
      detailHi: `कुल कोलेस्ट्रॉल ${val} mg/dL सीमा रेखा पर है। समय के साथ यह धमनियों में रुकावट का जोखिम बढ़ा सकता है।`,
      actionEn: "Reduce trans-fats and fried foods. Incorporate oats, almonds, chia seeds, and 30 minutes of aerobic exercise.",
      actionHi: "तला-भुना कम करें, ओट्स, बादाम, फल और 30 मिनट एरोबिक व्यायाम शामिल करें।",
      tone: "medium",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  if (val <= 299) {
    return {
      key: "cholesterol",
      nameEn: "Total Cholesterol",
      nameHi: "कुल कोलेस्ट्रॉल",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "HIGH CHOLESTEROL",
      badgeLabelHi: "उच्च कोलेस्ट्रॉल",
      titleEn: "High Total Cholesterol",
      titleHi: "उच्च कुल कोलेस्ट्रॉल",
      detailEn: `Total cholesterol of ${val} mg/dL is substantially high. A full fasting lipid panel (LDL, HDL, Triglycerides) is recommended to evaluate cardiovascular atherosclerotic risk.`,
      detailHi: `कुल कोलेस्ट्रॉल ${val} mg/dL काफी अधिक है। हृदय रोग जोखिम के मूल्यांकन के लिए पूरा लिपिड प्रोफाइल (LDL, HDL, Triglycerides) कराएं।`,
      actionEn: "Consult a doctor for cardiovascular risk assessment. Statin therapy may be considered alongside diet.",
      actionHi: "डॉक्टर से सलाह लें। डाइट के साथ स्टेटिन दवा की जरूरत पर विचार हो सकता है।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  return {
    key: "cholesterol",
    nameEn: "Total Cholesterol",
    nameHi: "कुल कोलेस्ट्रॉल",
    unit: "mg/dL",
    value: val,
    formattedValue: `${val} mg/dL`,
    referenceRangeText: refText,
    referenceMin: refMin,
    referenceMax: refMax,
    status: "critical",
    badgeLabelEn: "VERY HIGH / SEVERE RISK",
    badgeLabelHi: "अत्यधिक उच्च / गंभीर जोखिम",
    titleEn: "Markedly Elevated Total Cholesterol — High Cardiac Risk",
    titleHi: "अत्यधिक उच्च कोलेस्ट्रॉल — उच्च हृदय जोखिम",
    detailEn: `Total cholesterol of ${val} mg/dL is severely elevated. May indicate familial hypercholesterolemia or advanced dyslipidemia requiring prompt medical management.`,
    detailHi: `कुल कोलेस्ट्रॉल ${val} mg/dL गंभीर स्तर पर है। यह आनुवंशिक या गंभीर डिस्लिपिडेमिया का संकेत हो सकता है।`,
    actionEn: "Prompt physician review and lifestyle overhaul required.",
    actionHi: "तुरंत डॉक्टर से परामर्श लें और जीवनशैली में सुधार करें।",
    tone: "critical",
    gaugePercent,
    gaugeZones,
    isTypo: false,
    isNormal: false,
    isCritical: true,
  };
}

// 6. Evaluate Serum Creatinine (mg/dL)
function evaluateCreatinine(val: number, gender: LabGender): LabMetricEvaluation {
  const isMale = gender === "male";
  const refMin = isMale ? 0.7 : 0.5;
  const refMax = isMale ? 1.3 : 1.1;
  const refText = isMale ? "0.7 – 1.3 mg/dL (Male)" : "0.5 – 1.1 mg/dL (Female)";
  const displayMin = 0.2;
  const displayMax = 10.0;
  const gaugePercent = calculateGaugePercent(val, displayMin, displayMax);

  const gaugeZones = [
    { label: "Low", minPercent: 0, maxPercent: 15, color: "bg-sky-500" },
    { label: "Normal", minPercent: 15, maxPercent: 40, color: "bg-emerald-500" },
    { label: "Elevated", minPercent: 40, maxPercent: 65, color: "bg-amber-500" },
    { label: "High", minPercent: 65, maxPercent: 85, color: "bg-rose-500" },
    { label: "Crit Renal", minPercent: 85, maxPercent: 100, color: "bg-purple-600" },
  ];

  if (val < 0.2 || val > 20.0) {
    return {
      key: "creatinine",
      nameEn: "Serum Creatinine",
      nameHi: "सीरम क्रिएटिनिन",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "typo",
      badgeLabelEn: "TYPO DETECTED",
      badgeLabelHi: "टाइपो त्रुटि",
      titleEn: "Creatinine value out of physiological limits",
      titleHi: "क्रिएटिनिन मान सीमा से बाहर है",
      detailEn: `Entered creatinine of ${val} mg/dL is outside credible clinical ranges (0.2 – 20 mg/dL). Recheck if decimal point was omitted (e.g. 12 instead of 1.2).`,
      detailHi: `क्रिएटिनिन ${val} mg/dL सीमा से बाहर है। जांचें कि कहीं 1.2 की जगह 12 तो नहीं लिख दिया गया।`,
      actionEn: "Verify the decimal point on your renal profile.",
      actionHi: "किडनी रिपोर्ट में दशमलव बिंदु जांचें।",
      tone: "typo",
      gaugePercent,
      gaugeZones,
      isTypo: true,
      isNormal: false,
      isCritical: true,
    };
  }

  if (val < refMin) {
    return {
      key: "creatinine",
      nameEn: "Serum Creatinine",
      nameHi: "सीरम क्रिएटिनिन",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "LOW (USUALLY BENIGN)",
      badgeLabelHi: "कम (सामान्यतः सुरक्षित)",
      titleEn: "Low Serum Creatinine",
      titleHi: "कम सीरम क्रिएटिनिन",
      detailEn: `Creatinine of ${val} mg/dL is low. Typically correlates with low muscle mass, strict vegetarian diet, or pregnancy, and is rarely a cause for medical concern.`,
      detailHi: `क्रिएटिनिन ${val} mg/dL कम है। यह आमतौर पर कम मांसपेशियों या शाकाहारी भोजन से जुड़ा होता है और नुकसानदेह नहीं होता।`,
      actionEn: "Ensure adequate dietary protein intake.",
      actionHi: "पर्याप्त प्रोटीन युक्त आहार लें।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  if (val <= refMax) {
    return {
      key: "creatinine",
      nameEn: "Serum Creatinine",
      nameHi: "सीरम क्रिएटिनिन",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "NORMAL KIDNEY FUNCTION",
      badgeLabelHi: "सामान्य किडनी कार्य",
      titleEn: "Creatinine is in healthy normal range",
      titleHi: "क्रिएटिनिन सामान्य स्वस्थ सीमा में है",
      detailEn: `Creatinine of ${val} mg/dL suggests normal glomerular filtration rate and healthy kidney excretion (${refText}).`,
      detailHi: `क्रिएटिनिन ${val} mg/dL किडनी की सामान्य और स्वस्थ कार्यप्रणाली को दर्शाता है।`,
      actionEn: "Stay hydrated and avoid unnecessary heavy painkiller (NSAID) use.",
      actionHi: "पर्याप्त पानी पिएं और बिना डॉक्टर के दर्द निवारक दवाओं से बचें।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  if (val <= 2.0) {
    return {
      key: "creatinine",
      nameEn: "Serum Creatinine",
      nameHi: "सीरम क्रिएटिनिन",
      unit: "mg/dL",
      value: val,
      formattedValue: `${val} mg/dL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "ELEVATED (RENAL STRESS)",
      badgeLabelHi: "बढ़ा हुआ (किडनी तनाव)",
      titleEn: "Elevated Creatinine — Impaired Kidney Filtration",
      titleHi: "क्रिएटिनिन बढ़ा हुआ — किडनी कार्य में रुकावट",
      detailEn: `Creatinine of ${val} mg/dL is above normal (${refText}). Can be caused by acute dehydration, high blood pressure, diabetes, urinary blockage, or nephrotoxic medications.`,
      detailHi: `क्रिएटिनिन ${val} mg/dL सामान्य से अधिक है। डिहाइड्रेशन, हाई बीपी, डायबिटीज या दर्द निवारक दवाएं इसका कारण हो सकती हैं।`,
      actionEn: "Hydrate well, stop taking NSAID painkillers (e.g. ibuprofen, diclofenac), and consult a physician for eGFR check.",
      actionHi: "पानी पिएं, पेनकिलर तुरंत बंद करें और डॉक्टर से मिलकर eGFR जांच कराएं।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  return {
    key: "creatinine",
    nameEn: "Serum Creatinine",
    nameHi: "सीरम क्रिएटिनिन",
    unit: "mg/dL",
    value: val,
    formattedValue: `${val} mg/dL`,
    referenceRangeText: refText,
    referenceMin: refMin,
    referenceMax: refMax,
    status: "critical",
    badgeLabelEn: "CRITICAL HIGH (RENAL INJURY)",
    badgeLabelHi: "अति उच्च (किडनी क्षति जोखिम)",
    titleEn: "Critically elevated creatinine — Significant kidney injury",
    titleHi: "क्रिएटिनिन बहुत अधिक — गंभीर किडनी विकार",
    detailEn: `Creatinine level of ${val} mg/dL indicates severe renal impairment. Waste filtration is critically reduced.`,
    detailHi: `क्रिएटिनिन ${val} mg/dL गंभीर किडनी विकार दर्शाता है। शरीर से विषाक्त पदार्थ छनना कम हो रहा है।`,
    actionEn: "Urgent nephrology or emergency evaluation required.",
    actionHi: "तत्काल नेफ्रोलॉजिस्ट (किडनी विशेषज्ञ) से संपर्क करें।",
    tone: "critical",
    gaugePercent,
    gaugeZones,
    isTypo: false,
    isNormal: false,
    isCritical: true,
  };
}

// 7. Evaluate Platelet Count (x10^3/uL or k/uL)
function evaluatePlatelets(val: number): LabMetricEvaluation {
  const normalizedVal = val > 2000 ? Math.round(val / 1000) : val;
  const refMin = 150;
  const refMax = 450;
  const refText = "150 – 450 × 10³/µL (Normal Count)";
  const displayMin = 10;
  const displayMax = 800;
  const gaugePercent = calculateGaugePercent(normalizedVal, displayMin, displayMax);

  const gaugeZones = [
    { label: "Crit Low", minPercent: 0, maxPercent: 20, color: "bg-rose-600" },
    { label: "Low", minPercent: 20, maxPercent: 35, color: "bg-amber-500" },
    { label: "Normal", minPercent: 35, maxPercent: 70, color: "bg-emerald-500" },
    { label: "Elevated", minPercent: 70, maxPercent: 85, color: "bg-amber-500" },
    { label: "High", minPercent: 85, maxPercent: 100, color: "bg-purple-600" },
  ];

  if (normalizedVal < 5 || normalizedVal > 1500) {
    return {
      key: "platelets",
      nameEn: "Platelet Count",
      nameHi: "प्लेटलेट काउंट",
      unit: "× 10³/µL",
      value: val,
      formattedValue: `${val} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "typo",
      badgeLabelEn: "TYPO DETECTED",
      badgeLabelHi: "टाइपो त्रुटि",
      titleEn: "Platelet count value out of biological limits",
      titleHi: "प्लेटलेट मान सीमा से बाहर है",
      detailEn: `Entered platelet count of ${val} is outside clinical measurement range (5 – 1500 × 10³/µL). Please check if extra zeroes were entered.`,
      detailHi: `दर्ज प्लेटलेट काउंट ${val} संभव सीमा से बाहर है। कृपया अतिरिक्त शून्य की जांच करें।`,
      actionEn: "Enter platelet count as thousands (e.g. 250 for 250,000 cells/µL).",
      actionHi: "हजारों में मान दर्ज करें (उदा. 2,50,000 के लिए 250)।",
      tone: "typo",
      gaugePercent,
      gaugeZones,
      isTypo: true,
      isNormal: false,
      isCritical: true,
    };
  }

  if (normalizedVal < 50) {
    return {
      key: "platelets",
      nameEn: "Platelet Count",
      nameHi: "प्लेटलेट काउंट",
      unit: "× 10³/µL",
      value: normalizedVal,
      formattedValue: `${normalizedVal} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "critical",
      badgeLabelEn: "CRITICAL THROMBOCYTOPENIA",
      badgeLabelHi: "अति गंभीर कम प्लेटलेट",
      titleEn: "Critically low platelets — Spontaneous bleeding hazard",
      titleHi: "प्लेटलेट अत्यधिक कम — स्वतः रक्तस्राव का गंभीर खतरा",
      detailEn: `Platelet count of ${normalizedVal}k/µL is dangerously low. High risk of spontaneous mucosal bleeding, petechiae, bruising, or internal hemorrhage (often seen in acute Dengue, ITP, or marrow suppression).`,
      detailHi: `प्लेटलेट ${normalizedVal}k/µL अत्यंत कम हैं। मसूड़ों, त्वचा या अंदरूनी रक्तस्राव (डेंगू, ITP) का गंभीर जोखिम है।`,
      actionEn: "Immediate hospitalization or urgent hematology consultation required. Avoid any trauma or blood thinners.",
      actionHi: "तुरंत अस्पताल में भर्ती हों या आपातकालीन डॉक्टर से मिलें। चोट से बचें।",
      tone: "critical",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: true,
    };
  }

  if (normalizedVal < 150) {
    return {
      key: "platelets",
      nameEn: "Platelet Count",
      nameHi: "प्लेटलेट काउंट",
      unit: "× 10³/µL",
      value: normalizedVal,
      formattedValue: `${normalizedVal} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "LOW PLATELETS (THROMBOCYTOPENIA)",
      badgeLabelHi: "कम प्लेटलेट (थ्रोम्बोसाइटोपेनिया)",
      titleEn: "Low Platelet Count",
      titleHi: "कम प्लेटलेट काउंट",
      detailEn: `Platelet count of ${normalizedVal}k/µL is below the normal lower limit (150k/µL). Commonly triggered by viral infections, dengue fever, medications, or enlarged spleen.`,
      detailHi: `प्लेटलेट ${normalizedVal}k/µL सामान्य से कम हैं। वायरल इन्फेक्शन, डेंगू या दवाओं से ऐसा हो सकता है।`,
      actionEn: "Consult a doctor for follow-up CBC to monitor platelet trajectory and watch for easy bruising or red skin dots.",
      actionHi: "डॉक्टर से मिलें, सीबीसी दोहराएं और त्वचा पर लाल चकत्तों पर नजर रखें।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  if (normalizedVal <= 450) {
    return {
      key: "platelets",
      nameEn: "Platelet Count",
      nameHi: "प्लेटलेट काउंट",
      unit: "× 10³/µL",
      value: normalizedVal,
      formattedValue: `${normalizedVal} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "NORMAL PLATELETS",
      badgeLabelHi: "सामान्य प्लेटलेट",
      titleEn: "Platelet count is in healthy normal range",
      titleHi: "प्लेटलेट काउंट सामान्य स्वस्थ सीमा में है",
      detailEn: `Platelet count of ${normalizedVal}k/µL reflects healthy clotting function and normal bone marrow platelet production.`,
      detailHi: `प्लेटलेट ${normalizedVal}k/µL सामान्य स्वस्थ सीमा में हैं जो खून के सामान्य थक्के जमने की क्षमता दर्शाते हैं।`,
      actionEn: "No intervention needed; maintain standard healthy routines.",
      actionHi: "किसी इलाज की आवश्यकता नहीं; सामान्य दिनचर्या जारी रखें।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  return {
    key: "platelets",
    nameEn: "Platelet Count",
    nameHi: "प्लेटलेट काउंट",
    unit: "× 10³/µL",
    value: normalizedVal,
    formattedValue: `${normalizedVal} × 10³/µL`,
    referenceRangeText: refText,
    referenceMin: refMin,
    referenceMax: refMax,
    status: normalizedVal > 700 ? "critical" : "borderline",
    badgeLabelEn: normalizedVal > 700 ? "MARKED THROMBOCYTOSIS" : "ELEVATED (THROMBOCYTOSIS)",
    badgeLabelHi: normalizedVal > 700 ? "अत्यधिक प्लेटलेट" : "बढ़ी हुई प्लेटलेट",
    titleEn: `Elevated Platelet Count (${normalizedVal}k/µL)`,
    titleHi: `प्लेटलेट काउंट बढ़ा हुआ (${normalizedVal}k/µL)`,
    detailEn: `Platelet count of ${normalizedVal}k/µL is above normal. Often reactive to acute infection, systemic inflammation, recent surgery, or iron deficiency anemia.`,
    detailHi: `प्लेटलेट काउंट ${normalizedVal}k/µL अधिक है। यह शरीर में किसी सूजन, इन्फेक्शन या आयरन की कमी की प्रतिक्रिया हो सकती है।`,
    actionEn: "Doctor review recommended to identify underlying cause and rule out myeloproliferative disorders.",
    actionHi: "कारण जानने के लिए डॉक्टर से परामर्श लें।",
    tone: normalizedVal > 700 ? "critical" : "medium",
    gaugePercent,
    gaugeZones,
    isTypo: false,
    isNormal: false,
    isCritical: normalizedVal > 700,
  };
}

// 8. Evaluate WBC Count (x10^3/uL or k/uL)
function evaluateWBC(val: number): LabMetricEvaluation {
  const normalizedVal = val > 150 ? Number((val / 1000).toFixed(1)) : val;
  const refMin = 4.0;
  const refMax = 11.0;
  const refText = "4.0 – 11.0 × 10³/µL (4,000–11,000 /µL)";
  const displayMin = 0.5;
  const displayMax = 30.0;
  const gaugePercent = calculateGaugePercent(normalizedVal, displayMin, displayMax);

  const gaugeZones = [
    { label: "Crit Low", minPercent: 0, maxPercent: 20, color: "bg-rose-600" },
    { label: "Low", minPercent: 20, maxPercent: 35, color: "bg-amber-500" },
    { label: "Normal", minPercent: 35, maxPercent: 65, color: "bg-emerald-500" },
    { label: "Elevated", minPercent: 65, maxPercent: 85, color: "bg-amber-500" },
    { label: "High", minPercent: 85, maxPercent: 100, color: "bg-rose-600" },
  ];

  if (normalizedVal < 0.5 || normalizedVal > 100.0) {
    return {
      key: "wbc",
      nameEn: "White Blood Cell Count (WBC)",
      nameHi: "श्वेत रक्त कोशिकाएं (WBC)",
      unit: "× 10³/µL",
      value: val,
      formattedValue: `${val} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "typo",
      badgeLabelEn: "TYPO DETECTED",
      badgeLabelHi: "टाइपो त्रुटि",
      titleEn: "WBC count out of clinical measurement limits",
      titleHi: "WBC काउंट सीमा से बाहर है",
      detailEn: `Entered WBC count of ${val} is outside plausible human parameters (0.5 – 100 × 10³/µL). Please verify the decimal point or zeroes.`,
      detailHi: `दर्ज WBC काउंट ${val} सीमा से बाहर है। कृपया दशमलव या शून्य दोबारा जांचें।`,
      actionEn: "Enter WBC as thousands (e.g. 7.5 or 7500).",
      actionHi: "WBC का सही मान दर्ज करें (उदा. 7.5 या 7500)।",
      tone: "typo",
      gaugePercent,
      gaugeZones,
      isTypo: true,
      isNormal: false,
      isCritical: true,
    };
  }

  if (normalizedVal < 2.0) {
    return {
      key: "wbc",
      nameEn: "White Blood Cell Count (WBC)",
      nameHi: "श्वेत रक्त कोशिकाएं (WBC)",
      unit: "× 10³/µL",
      value: normalizedVal,
      formattedValue: `${normalizedVal} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "critical",
      badgeLabelEn: "CRITICAL LEUKOPENIA",
      badgeLabelHi: "अति गंभीर कमी (ल्यूकोपेनिया)",
      titleEn: "Critically low WBC — Severe Infection Vulnerability",
      titleHi: "WBC अत्यंत कम — गंभीर संक्रमण का खतरा",
      detailEn: `WBC count of ${normalizedVal}k/µL indicates severe immunosuppression or bone marrow suppression. Body defense against infections is compromised.`,
      detailHi: `WBC काउंट ${normalizedVal}k/µL बहुत कम है। यह प्रतिरक्षा तंत्र की गंभीर कमजोरी दर्शाता है।`,
      actionEn: "Immediate medical review required. Avoid exposure to sick individuals.",
      actionHi: "तत्काल डॉक्टर से परामर्श लें और बीमार लोगों के संपर्क से बचें।",
      tone: "critical",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: true,
    };
  }

  if (normalizedVal < 4.0) {
    return {
      key: "wbc",
      nameEn: "White Blood Cell Count (WBC)",
      nameHi: "श्वेत रक्त कोशिकाएं (WBC)",
      unit: "× 10³/µL",
      value: normalizedVal,
      formattedValue: `${normalizedVal} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "borderline",
      badgeLabelEn: "MILD LEUKOPENIA (LOW WBC)",
      badgeLabelHi: "हल्का कम WBC",
      titleEn: "Mildly low White Blood Cell count",
      titleHi: "WBC काउंट हल्का कम",
      detailEn: `WBC count of ${normalizedVal}k/µL is below the standard baseline (4.0k/µL). Can occur with recent viral infections (influenza, dengue), autoimmune factors, or medication side effects.`,
      detailHi: `WBC काउंट ${normalizedVal}k/µL सामान्य से कम है। हालिया वायरल बुखार या दवाओं के प्रभाव से हो सकता है।`,
      actionEn: "Consult a doctor for differential leukocyte count (DLC) and repeat CBC.",
      actionHi: "डॉक्टर से मिलकर DLC और दोबारा CBC कराएं।",
      tone: "medium",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  if (normalizedVal <= 11.0) {
    return {
      key: "wbc",
      nameEn: "White Blood Cell Count (WBC)",
      nameHi: "श्वेत रक्त कोशिकाएं (WBC)",
      unit: "× 10³/µL",
      value: normalizedVal,
      formattedValue: `${normalizedVal} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "normal",
      badgeLabelEn: "NORMAL IMMUNE DEFENSE",
      badgeLabelHi: "सामान्य प्रतिरक्षा स्तर",
      titleEn: "WBC count is in healthy normal range",
      titleHi: "WBC काउंट सामान्य स्वस्थ सीमा में है",
      detailEn: `WBC of ${normalizedVal}k/µL indicates healthy circulating white blood cell defenses against pathogens.`,
      detailHi: `WBC ${normalizedVal}k/µL सामान्य स्वस्थ सीमा में है, जो मजबूत प्रतिरक्षा का संकेत है।`,
      actionEn: "Maintain general balanced lifestyle.",
      actionHi: "सामान्य स्वस्थ जीवनशैली जारी रखें।",
      tone: "low",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: true,
      isCritical: false,
    };
  }

  if (normalizedVal <= 20.0) {
    return {
      key: "wbc",
      nameEn: "White Blood Cell Count (WBC)",
      nameHi: "श्वेत रक्त कोशिकाएं (WBC)",
      unit: "× 10³/µL",
      value: normalizedVal,
      formattedValue: `${normalizedVal} × 10³/µL`,
      referenceRangeText: refText,
      referenceMin: refMin,
      referenceMax: refMax,
      status: "abnormal",
      badgeLabelEn: "ELEVATED (LEUKOCYTOSIS)",
      badgeLabelHi: "बढ़ा हुआ (ल्यूकोसाइटोसिस)",
      titleEn: "Elevated White Blood Cell Count — Active Immune Response",
      titleHi: "WBC काउंट बढ़ा हुआ — सक्रिय संक्रमण या सूजन",
      detailEn: `WBC of ${normalizedVal}k/µL is above normal. Typically signifies an active bacterial or viral infection, tissue injury, acute inflammation, or physical stress.`,
      detailHi: `WBC ${normalizedVal}k/µL बढ़ा हुआ है। यह शरीर में किसी इन्फेक्शन, सूजन या तनाव से लड़ने की सक्रिय प्रतिक्रिया दर्शाता है।`,
      actionEn: "Consult a doctor to correlate with symptoms (fever, cough, pain) and check CRP or bacterial markers.",
      actionHi: "लक्षणों (बुखार, खांसी) के साथ डॉक्टर को दिखाएं और इन्फेक्शन मार्कर जांचें।",
      tone: "high",
      gaugePercent,
      gaugeZones,
      isTypo: false,
      isNormal: false,
      isCritical: false,
    };
  }

  return {
    key: "wbc",
    nameEn: "White Blood Cell Count (WBC)",
    nameHi: "श्वेत रक्त कोशिकाएं (WBC)",
    unit: "× 10³/µL",
    value: normalizedVal,
    formattedValue: `${normalizedVal} × 10³/µL`,
    referenceRangeText: refText,
    referenceMin: refMin,
    referenceMax: refMax,
    status: "critical",
    badgeLabelEn: "MARKED LEUKOCYTOSIS",
    badgeLabelHi: "अत्यधिक उच्च WBC",
    titleEn: "Markedly high WBC count — Leukemoid / Severe infection",
    titleHi: "WBC बहुत अधिक — गंभीर संक्रमण का संकेत",
    detailEn: `WBC of ${normalizedVal}k/µL is critically high. Requires comprehensive differential and peripheral blood smear to rule out severe sepsis or hematological conditions.`,
    detailHi: `WBC ${normalizedVal}k/µL अत्यंत अधिक है। गंभीर सेप्सिस या रक्त विकार की जांच के लिए तुरंत डॉक्टर को दिखाएं।`,
    actionEn: "Urgent medical review and peripheral blood smear required.",
    actionHi: "तत्काल डॉक्टर से परामर्श और ब्लड स्मीयर जांच कराएं।",
    tone: "critical",
    gaugePercent,
    gaugeZones,
    isTypo: false,
    isNormal: false,
    isCritical: true,
  };
}

// Master Evaluation Function
export function evaluateLabForm(form: LabFormValues, gender: LabGender = "male"): LabAnalysisResult {
  const evaluations: LabMetricEvaluation[] = [];

  const sugarNum = Number(form.fastingSugar);
  if (!Number.isNaN(sugarNum) && form.fastingSugar.trim() !== "") {
    evaluations.push(evaluateFastingSugar(sugarNum));
  }

  const hba1cNum = Number(form.hba1c);
  if (!Number.isNaN(hba1cNum) && form.hba1c.trim() !== "") {
    evaluations.push(evaluateHbA1c(hba1cNum));
  }

  const hbNum = Number(form.hemoglobin);
  if (!Number.isNaN(hbNum) && form.hemoglobin.trim() !== "") {
    evaluations.push(evaluateHemoglobin(hbNum, gender));
  }

  const tshNum = Number(form.tsh);
  if (!Number.isNaN(tshNum) && form.tsh.trim() !== "") {
    evaluations.push(evaluateTSHSafe(tshNum));
  }

  const cholNum = Number(form.cholesterol);
  if (!Number.isNaN(cholNum) && form.cholesterol.trim() !== "") {
    evaluations.push(evaluateCholesterol(cholNum));
  }

  const creatNum = Number(form.creatinine);
  if (!Number.isNaN(creatNum) && form.creatinine.trim() !== "") {
    evaluations.push(evaluateCreatinine(creatNum, gender));
  }

  const platNum = Number(form.platelets);
  if (!Number.isNaN(platNum) && form.platelets.trim() !== "") {
    evaluations.push(evaluatePlatelets(platNum));
  }

  const wbcNum = Number(form.wbc);
  if (!Number.isNaN(wbcNum) && form.wbc.trim() !== "") {
    evaluations.push(evaluateWBC(wbcNum));
  }

  const typos = evaluations.filter((e) => e.isTypo);
  const criticals = evaluations.filter((e) => e.isCritical && !e.isTypo);
  const abnormals = evaluations.filter((e) => e.status === "abnormal" || e.status === "borderline");
  const normals = evaluations.filter((e) => e.isNormal);

  let overallStatus: "normal" | "borderline" | "abnormal" | "critical" | "review_needed" = "normal";
  if (typos.length > 0) {
    overallStatus = "review_needed";
  } else if (criticals.length > 0) {
    overallStatus = "critical";
  } else if (evaluations.some((e) => e.status === "abnormal")) {
    overallStatus = "abnormal";
  } else if (evaluations.some((e) => e.status === "borderline")) {
    overallStatus = "borderline";
  }

  let summaryEn = "";
  let summaryHi = "";

  if (evaluations.length === 0) {
    summaryEn = "Enter one or more lab values to receive a multi-stage clinical assessment and range visualization.";
    summaryHi = "एक या अधिक लैब वैल्यू दर्ज करें और सटीक चरणबद्ध विश्लेषण और विजुअल रेंज प्राप्त करें।";
  } else if (typos.length > 0) {
    summaryEn = `⚠️ Attention: ${typos.length} entered value(s) exceed human physiological limits (possible typing or decimal error). Please verify before clinical review.`;
    summaryHi = `⚠️ ध्यान दें: ${typos.length} दर्ज मान मानव शारीरिक सीमाओं से बाहर हैं (टाइपिंग या दशमलव त्रुटि संभव)। कृपया सही करें।`;
  } else if (criticals.length > 0) {
    summaryEn = `🚨 Urgent: ${criticals.length} parameter(s) are in the critical emergency alert range requiring immediate medical attention.`;
    summaryHi = `🚨 गंभीर चेतावनी: ${criticals.length} मान आपातकालीन सीमा में हैं, जिनपर तुरंत डॉक्टर से परामर्श आवश्यक है।`;
  } else if (abnormals.length > 0) {
    summaryEn = `${abnormals.length} out-of-range parameter(s) found. Review the findings below and discuss lifestyle adjustments and repeat testing with your doctor.`;
    summaryHi = `${abnormals.length} मान असामान्य या सीमा रेखा पर हैं। नीचे दिए गए विवरण देखें और डॉक्टर से सलाह लें।`;
  } else {
    summaryEn = "All entered blood parameters are currently within healthy clinical reference ranges.";
    summaryHi = "दर्ज किए गए सभी रक्त पैरामीटर वर्तमान में सामान्य स्वस्थ सीमा में हैं।";
  }

  const dietRecommendations: LabDietTip[] = [];
  const suggestedSpecialists: string[] = [];

  const hbEval = evaluations.find((e) => e.key === "hemoglobin");
  if (hbEval && !hbEval.isTypo) {
    if (hbEval.value < (gender === "male" ? 13.8 : 12.0)) {
      dietRecommendations.push({
        titleEn: "Iron & Red Blood Cell Replenishment Diet",
        titleHi: "आयरन और हीमोग्लोबिन बढ़ाने वाला आहार",
        tipsEn: [
          "Consume iron-rich foods: spinach, lentils, beetroot, pomegranate, black raisins, and dates.",
          "Pair iron foods with Vitamin C (lemon juice, amla, oranges) to boost absorption by up to 300%.",
          "Avoid drinking tea, coffee, or milk within 1 hour of meals, as tannins and calcium inhibit iron uptake.",
        ],
        tipsHi: [
          "आयरन युक्त खाद्य पदार्थ लें: पालक, दालें, चुकंदर, अनार, मुनक्का और खजूर।",
          "आयरन वाले भोजन के साथ नींबू पानी या आंवला (विटामिन C) लें जिससे अवशोषण 3 गुना बढ़ जाता है।",
          "खाने के 1 घंटे पहले या बाद चाय/कॉफी न पिएं, यह आयरन सोखने में बाधा डालते हैं।",
        ],
      });
      suggestedSpecialists.push("Hematologist / General Physician");
    } else if (hbEval.value > (gender === "male" ? 17.5 : 15.5)) {
      dietRecommendations.push({
        titleEn: "Hydration & Blood Viscosity Management",
        titleHi: "हाइड्रेशन और गाढ़े खून का प्रबंधन",
        tipsEn: [
          "Maintain liberal oral fluid intake (2.5–3.5 liters/day) to prevent hemoconcentration.",
          "Avoid unprescribed iron supplements or high-dose Vitamin C.",
          "Cessation of cigarette smoking and screening for sleep apnea or high altitude adaptation.",
        ],
        tipsHi: [
          "दिन में 2.5 से 3.5 लीटर पानी पिएं ताकि खून गाढ़ा न हो।",
          "बिना डॉक्टर सलाह के आयरन सप्लीमेंट्स बिल्कुल न लें।",
          "धूम्रपान से बचें और खर्राटों / स्लीप एपनिया की जांच कराएं।",
        ],
      });
      suggestedSpecialists.push("Hematologist / Pulmonologist");
    }
  }

  const sugarEval = evaluations.find((e) => e.key === "fastingSugar");
  const a1cEval = evaluations.find((e) => e.key === "hba1c");
  if ((sugarEval && sugarEval.value >= 100 && !sugarEval.isTypo) || (a1cEval && a1cEval.value >= 5.7 && !a1cEval.isTypo)) {
    dietRecommendations.push({
      titleEn: "Low-Glycemic Blood Sugar Stabilization",
      titleHi: "ब्लड शुगर नियंत्रण आहार",
      tipsEn: [
        "Replace refined carbs (white bread, white rice, sugar) with high-fiber whole grains (barley, quinoa, oats, brown rice).",
        "Adopt the Plate Method: 50% non-starchy vegetables, 25% lean protein, 25% complex carbohydrates.",
        "A brisk 15-minute walk right after meals helps lower postprandial glucose spikes.",
      ],
      tipsHi: [
        "सफेद चावल, चीनी और मैदे की जगह फाइबर युक्त अनाज (जौ, ओट्स, ब्राउन राइस) लें।",
        "थाली में 50% हरी सब्जियां, 25% प्रोटीन और 25% जटिल कार्बोहाइड्रेट रखें।",
        "खाने के तुरंत बाद 15 मिनट टहलने से शुगर स्पाइक नियंत्रित रहता है।",
      ],
    });
    suggestedSpecialists.push("Diabetologist / Endocrinologist");
  }

  const cholEval = evaluations.find((e) => e.key === "cholesterol");
  if (cholEval && cholEval.value >= 200 && !cholEval.isTypo) {
    dietRecommendations.push({
      titleEn: "Cardio-Protective Lipid Lowering Plan",
      titleHi: "हृदय-सुरक्षा और कोलेस्ट्रॉल कम करने का आहार",
      tipsEn: [
        "Add 5-10g of soluble fiber daily (psyllium husk, chia seeds, flaxseeds, legumes) which binds digestive cholesterol.",
        "Swap saturated fats (palm oil, butter, trans fats) for cold-pressed olive oil, mustard oil, or avocado.",
        "Aim for at least 150 minutes of moderate aerobic activity (cycling, swimming, walking) weekly.",
      ],
      tipsHi: [
        "घुलनशील फाइबर (ईसबगोल, चिया सीड्स, अलसी, फलियां) लें जो कोलेस्ट्रॉल को बाहर निकालता है।",
        "मक्खन, डालडा और रिफाइंड तेल की जगह सरसों या जैतून का तेल इस्तेमाल करें।",
        "सप्ताह में कम से कम 150 मिनट एरोबिक व्यायाम या तेज चलना सुनिश्चित करें।",
      ],
    });
    suggestedSpecialists.push("Cardiologist / Preventive Medicine");
  }

  const creatEval = evaluations.find((e) => e.key === "creatinine");
  if (creatEval && creatEval.value > (gender === "male" ? 1.3 : 1.1) && !creatEval.isTypo) {
    dietRecommendations.push({
      titleEn: "Kidney-Friendly Renal Protection Guidelines",
      titleHi: "किडनी सुरक्षा और स्वास्थ्य दिशा-निर्देश",
      tipsEn: [
        "Stay consistently hydrated with plain water, avoiding energy drinks or high-sodium broths.",
        "Do NOT take over-the-counter NSAID painkillers (ibuprofen, diclofenac) which stress renal blood flow.",
        "Moderate dietary animal protein and strictly control blood pressure.",
      ],
      tipsHi: [
        "नियमित रूप से पर्याप्त सादा पानी पिएं।",
        "बिना डॉक्टर के दर्द निवारक दवाएं (आईबुप्रोफेन, डाइक्लोफेनाक) कतई न लें।",
        "नमक की मात्रा कम रखें और ब्लड प्रेशर को 120/80 के करीब नियंत्रित रखें।",
      ],
    });
    suggestedSpecialists.push("Nephrologist");
  }

  const tshEval = evaluations.find((e) => e.key === "tsh");
  if (tshEval && (tshEval.value > 4.5 || tshEval.value < 0.4) && !tshEval.isTypo) {
    suggestedSpecialists.push("Endocrinologist");
  }

  return {
    evaluations,
    typos,
    criticals,
    abnormals,
    normals,
    overallStatus,
    summaryEn,
    summaryHi,
    dietRecommendations,
    suggestedSpecialists: Array.from(new Set(suggestedSpecialists)),
  };
}

function evaluateTSHSafe(val: number) {
  return evaluateTSH(val);
}
