import { Language } from "@/app/context/LanguageContext";
import { AnalysisItem, HealthAnalysis } from "@/lib/healthAnalysis";
import { translateUi } from "@/lib/uiI18n";

type DashboardCopy = {
  title: string;
  subtitle: string;
  riskSummary: string;
  inputSnapshot: string;
  measurements: string;
  concerns: string;
  urgentFlags: string;
  recommendations: string;
  interpretation: string;
  reports: string;
  backHome: string;
  saveReport: string;
  reportSaved: string;
  saveLocal: string;
  riskScore: string;
  emergencyAction: string;
  noSymptoms: string;
  noConcerns: string;
  noUrgent: string;
  noReports: string;
  currentMetrics: string;
  riskTrend: string;
  age: string;
  weight: string;
  height: string;
  bp: string;
  sugar: string;
  heartRate: string;
  symptoms: string;
  noneProvided: string;
  lowRisk: string;
  moderateRisk: string;
  highRisk: string;
  emergencyRisk: string;
};

const dashboardCopy: Partial<Record<Language, DashboardCopy>> = {
  en: {
    title: "Health Analysis Dashboard",
    subtitle:
      "This screen gives educational risk guidance from the values entered. It does not diagnose disease.",
    riskSummary: "Risk Summary",
    inputSnapshot: "Input Snapshot",
    measurements: "Measurements",
    concerns: "Possible Concerns",
    urgentFlags: "Urgent Flags",
    recommendations: "Recommended Next Steps",
    interpretation: "Symptom Interpretation",
    reports: "Recent Health Reports",
    backHome: "Back Home",
    saveReport: "Save Report",
    reportSaved: "Report Saved",
    saveLocal: "Saved locally for this browser.",
    riskScore: "Risk score",
    emergencyAction: "Emergency action",
    noSymptoms: "Add more symptoms if you want richer symptom-based analysis.",
    noConcerns: "No major concern patterns were detected from the current inputs.",
    noUrgent: "No emergency red flags were triggered by these inputs.",
    noReports: "No recent reports saved yet.",
    currentMetrics: "Current Health Metrics",
    riskTrend: "Risk Trend",
    age: "Age",
    weight: "Weight",
    height: "Height",
    bp: "Blood Pressure",
    sugar: "Sugar",
    heartRate: "Heart Rate",
    symptoms: "Symptoms",
    noneProvided: "None provided",
    lowRisk: "Low",
    moderateRisk: "Moderate",
    highRisk: "High",
    emergencyRisk: "Emergency",
  },
  hi: {
    title: "स्वास्थ्य विश्लेषण डैशबोर्ड",
    subtitle:
      "यह स्क्रीन दर्ज किए गए मानों के आधार पर शैक्षिक जोखिम मार्गदर्शन देती है। यह बीमारी का निदान नहीं करती।",
    riskSummary: "जोखिम सारांश",
    inputSnapshot: "दर्ज किए गए मान",
    measurements: "माप",
    concerns: "संभावित चिंताएं",
    urgentFlags: "तत्काल चेतावनी",
    recommendations: "अगले सुझाव",
    interpretation: "लक्षण व्याख्या",
    reports: "हाल की स्वास्थ्य रिपोर्ट",
    backHome: "होम पर वापस जाएं",
    saveReport: "रिपोर्ट सेव करें",
    reportSaved: "रिपोर्ट सेव हो गई",
    saveLocal: "यह रिपोर्ट इसी ब्राउज़र में सेव हुई है।",
    riskScore: "जोखिम स्कोर",
    emergencyAction: "आपातकालीन कार्रवाई",
    noSymptoms: "यदि आप अधिक लक्षण जोड़ेंगे तो विश्लेषण और बेहतर होगा।",
    noConcerns: "वर्तमान मानों से कोई बड़ी चिंता नहीं मिली।",
    noUrgent: "इन मानों से कोई आपातकालीन चेतावनी नहीं मिली।",
    noReports: "अभी तक कोई हाल की रिपोर्ट सेव नहीं हुई।",
    currentMetrics: "वर्तमान स्वास्थ्य मान",
    riskTrend: "जोखिम रुझान",
    age: "उम्र",
    weight: "वजन",
    height: "लंबाई",
    bp: "ब्लड प्रेशर",
    sugar: "शुगर",
    heartRate: "हार्ट रेट",
    symptoms: "लक्षण",
    noneProvided: "कोई लक्षण नहीं दिया गया",
    lowRisk: "कम",
    moderateRisk: "मध्यम",
    highRisk: "उच्च",
    emergencyRisk: "आपातकालीन",
  },
};

function translateLabel(label: string, language: Language) {
  if (language !== "hi") {
    return language === "en" ? label : translateUi(label, language);
  }

  const labels: Record<string, string> = {
    BMI: "बीएमआई",
    "Weight-related risk": "वजन से जुड़ा जोखिम",
    "Blood sugar": "ब्लड शुगर",
    "Diabetes risk": "डायबिटीज का जोखिम",
    "Prediabetes risk": "प्रीडायबिटीज का जोखिम",
    "Low blood sugar": "कम ब्लड शुगर",
    "Very high blood sugar": "बहुत अधिक ब्लड शुगर",
    "Blood pressure": "ब्लड प्रेशर",
    "Blood pressure crisis": "ब्लड प्रेशर संकट",
    Hypertension: "हाई ब्लड प्रेशर",
    "Heart rate": "हार्ट रेट",
    "Low heart rate": "कम हार्ट रेट",
    "Very fast heart rate": "बहुत तेज हार्ट रेट",
    "Age factor": "उम्र का प्रभाव",
    "Possible viral infection": "संभावित वायरल संक्रमण",
    "Possible uncontrolled diabetes": "संभावित अनियंत्रित डायबिटीज",
    "Possible cardiac emergency": "संभावित हृदय आपातस्थिति",
    "Breathing difficulty needs urgent medical review": "सांस लेने में कठिनाई को तुरंत चिकित्सकीय जांच की आवश्यकता है",
    "Dizziness or fainting can signal unstable vitals": "चक्कर या बेहोशी अस्थिर स्वास्थ्य मानों का संकेत हो सकती है",
    "Possible infection or viral illness": "संभावित संक्रमण या वायरल बीमारी",
    "Respiratory irritation or infection": "श्वसन तंत्र में जलन या संक्रमण",
    "Upper respiratory symptoms": "ऊपरी श्वसन लक्षण",
    "Throat infection or irritation": "गले का संक्रमण या जलन",
    "Headache may worsen with high BP or infection": "सिरदर्द हाई बीपी या संक्रमण के साथ बढ़ सकता है",
    "Vomiting increases dehydration risk": "उल्टी से डिहाइड्रेशन का खतरा बढ़ता है",
    "Diarrhea can cause dehydration": "दस्त से डिहाइड्रेशन हो सकता है",
    "Digestive or abdominal issue": "पाचन या पेट से जुड़ी समस्या",
    "chest pain": "सीने में दर्द",
    "shortness of breath": "सांस लेने में तकलीफ",
    dizziness: "चक्कर",
    fever: "बुखार",
    cough: "खांसी",
    cold: "जुकाम",
    "sore throat": "गले में दर्द",
    headache: "सिरदर्द",
    vomiting: "उल्टी",
    diarrhea: "दस्त",
    "stomach pain": "पेट दर्द",
  };

  return labels[label] || label;
}

function translateText(text: string, language: Language) {
  if (language !== "hi") {
    return language === "en" ? text : translateUi(text, language);
  }

  const exactMap: Record<string, string> = {
    "Higher BMI can increase blood pressure, diabetes, and heart disease risk.":
      "अधिक बीएमआई ब्लड प्रेशर, डायबिटीज और हृदय रोग का जोखिम बढ़ा सकता है।",
    "Borderline sugar can progress if not monitored early.":
      "यदि समय पर निगरानी न की जाए तो सीमा पर मौजूद शुगर आगे बढ़ सकती है।",
    "This reading suggests diabetes risk and needs confirmation by a clinician.":
      "यह रीडिंग डायबिटीज के जोखिम का संकेत देती है और डॉक्टर से पुष्टि की आवश्यकता है।",
    "Very high sugar can increase dehydration and infection risk.":
      "बहुत अधिक शुगर से डिहाइड्रेशन और संक्रमण का खतरा बढ़ सकता है।",
    "Persistent stage 2 BP raises stroke, kidney, and heart risk.":
      "लगातार स्टेज 2 ब्लड प्रेशर स्ट्रोक, किडनी और हृदय रोग का जोखिम बढ़ाता है।",
    "Older adults usually need earlier review when symptoms and abnormal vitals appear together.":
      "बढ़ी उम्र में लक्षण और असामान्य स्वास्थ्य मान साथ हों तो जल्दी डॉक्टर को दिखाना चाहिए।",
    "Fever, cough, and cold symptoms often fit a viral illness pattern.":
      "बुखार, खांसी और जुकाम के लक्षण अक्सर वायरल बीमारी के पैटर्न से मेल खाते हैं।",
    "Current inputs suggest low immediate risk, but continue routine monitoring.":
      "वर्तमान मानों के आधार पर तत्काल जोखिम कम लगता है, लेकिन नियमित निगरानी जारी रखें।",
    "One or more inputs suggest a possible emergency. This app should not replace urgent medical care.":
      "एक या अधिक मान संभावित आपात स्थिति दिखाते हैं। यह ऐप आपातकालीन चिकित्सा सहायता का विकल्प नहीं है।",
    "Your inputs include concerning findings that should be reviewed by a doctor soon.":
      "आपके मानों में कुछ चिंताजनक संकेत हैं जिन्हें डॉक्टर को जल्द दिखाना चाहिए।",
    "There are mild to moderate concerns worth watching and following up on.":
      "कुछ हल्के से मध्यम स्तर की चिंताएं हैं जिन पर नजर रखना और फॉलो-अप करना चाहिए।",
    "Chest pain together with breathing difficulty can be an emergency.":
      "सीने में दर्द और सांस लेने में कठिनाई साथ में होना आपात स्थिति हो सकती है।",
    "Seek emergency medical help now if symptoms are active or getting worse.":
      "यदि लक्षण मौजूद हैं या बढ़ रहे हैं तो तुरंत आपातकालीन चिकित्सा सहायता लें।",
    "Seek urgent medical help immediately.":
      "तुरंत आपातकालीन चिकित्सा सहायता लें।",
    "Consider a nutrition review if low weight is unintentional or you feel weak.":
      "यदि वजन कम होना बिना वजह है या आप कमजोरी महसूस कर रहे हैं तो पोषण संबंधी सलाह लें।",
    "Aim for regular walking, balanced meals, and a clinician-guided weight plan.":
      "नियमित टहलना, संतुलित भोजन और डॉक्टर की सलाह से वजन प्रबंधन योजना अपनाएं।",
    "Moderate weight reduction may improve BP and sugar readings over time.":
      "मध्यम वजन घटाने से समय के साथ बीपी और शुगर में सुधार हो सकता है।",
    "If you feel shaky, sweaty, confused, or weak, take fast-acting sugar and seek urgent medical help.":
      "यदि आप कांपना, पसीना, भ्रम या कमजोरी महसूस करें तो तुरंत मीठा लें और डॉक्टर से मदद लें।",
    "Arrange prompt medical review, especially if thirst, vomiting, or confusion are present.":
      "जल्दी डॉक्टर को दिखाएं, खासकर यदि प्यास, उल्टी या भ्रम हो।",
    "Cut sugary drinks, walk daily if able, and book a diabetes evaluation.":
      "मीठे पेय कम करें, रोज चलें और डायबिटीज जांच के लिए डॉक्टर से समय लें।",
    "Reduce refined sugar and repeat testing with your doctor if this was a fasting value.":
      "रिफाइंड शुगर कम करें और यदि यह फास्टिंग रीडिंग है तो डॉक्टर से दोबारा जांच कराएं।",
    "If low BP comes with dizziness, fainting, weakness, or dehydration, get medical review soon.":
      "यदि कम बीपी के साथ चक्कर, बेहोशी, कमजोरी या डिहाइड्रेशन हो तो जल्द डॉक्टर को दिखाएं।",
    "Seek emergency care now, especially if headache, chest pain, weakness, or breathlessness are present.":
      "तुरंत आपातकालीन देखभाल लें, खासकर यदि सिरदर्द, सीने में दर्द, कमजोरी या सांस फूलना हो।",
    "Reduce salt, avoid smoking, monitor BP again, and book a doctor visit soon.":
      "नमक कम करें, धूम्रपान से बचें, बीपी दोबारा जांचें और जल्द डॉक्टर से मिलें।",
    "Track BP at home for several days and review lifestyle measures like sleep, exercise, and salt intake.":
      "कुछ दिनों तक घर पर बीपी ट्रैक करें और नींद, व्यायाम व नमक सेवन जैसी आदतों पर ध्यान दें।",
    "Get medical advice soon if low pulse comes with dizziness, fainting, weakness, or chest discomfort.":
      "यदि कम नाड़ी के साथ चक्कर, बेहोशी, कमजोरी या सीने में असुविधा हो तो जल्द डॉक्टर से सलाह लें।",
    "Rest, hydrate, avoid stimulants, and seek urgent care if the fast pulse continues or symptoms worsen.":
      "आराम करें, पानी पिएं, उत्तेजक पेय से बचें और तेज नाड़ी बनी रहे तो जल्द इलाज लें।",
    "Rest, drink fluids, and get reviewed if breathing trouble, dehydration, or symptoms beyond 3 to 5 days occur.":
      "आराम करें, तरल पदार्थ लें, और यदि सांस की परेशानी, डिहाइड्रेशन या 3 से 5 दिन से अधिक लक्षण रहें तो डॉक्टर को दिखाएं।",
    "Use oral fluids or ORS and seek care early if urine output drops, weakness increases, or blood appears.":
      "ओआरएस या तरल लें और यदि पेशाब कम हो, कमजोरी बढ़े या खून आए तो जल्दी डॉक्टर को दिखाएं।",
    "This tool is for educational screening only and cannot diagnose disease or replace a doctor.":
      "यह टूल केवल शैक्षिक स्क्रीनिंग के लिए है। यह बीमारी का निदान नहीं कर सकता और डॉक्टर का विकल्प नहीं है।",
  };

  if (exactMap[text]) {
    return exactMap[text];
  }

  const patterns: Array<[RegExp, (...args: string[]) => string]> = [
    [/^BMI ([\d.]+) is below the usual healthy range\.$/, (value) => `बीएमआई ${value} सामान्य स्वस्थ सीमा से कम है।`],
    [/^BMI ([\d.]+) is in the obesity range\.$/, (value) => `बीएमआई ${value} मोटापे की श्रेणी में है।`],
    [/^BMI ([\d.]+) is above the healthy range\.$/, (value) => `बीएमआई ${value} स्वस्थ सीमा से ऊपर है।`],
    [/^BMI ([\d.]+) is in the usual healthy range\.$/, (value) => `बीएमआई ${value} सामान्य स्वस्थ सीमा में है।`],
    [/^Sugar level (\d+) mg\/dL may be dangerously low\.$/, (value) => `शुगर स्तर ${value} mg/dL खतरनाक रूप से कम हो सकता है।`],
    [/^Sugar level (\d+) mg\/dL is very high\.$/, (value) => `शुगर स्तर ${value} mg/dL बहुत अधिक है।`],
    [/^Sugar level (\d+) mg\/dL is in a diabetic range\.$/, (value) => `शुगर स्तर ${value} mg/dL डायबिटीज वाली सीमा में है।`],
    [/^Sugar level (\d+) mg\/dL is above the normal fasting range\.$/, (value) => `शुगर स्तर ${value} mg/dL सामान्य फास्टिंग सीमा से ऊपर है।`],
    [/^Sugar level (\d+) mg\/dL is not elevated\.$/, (value) => `शुगर स्तर ${value} mg/dL बढ़ा हुआ नहीं है।`],
    [/^BP (\d+)\/(\d+) is lower than usual\.$/, (s, d) => `ब्लड प्रेशर ${s}/${d} सामान्य से कम है।`],
    [/^BP (\d+)\/(\d+) needs emergency evaluation\.$/, (s, d) => `ब्लड प्रेशर ${s}/${d} के लिए तुरंत आपातकालीन जांच की आवश्यकता है।`],
    [/^BP (\d+)\/(\d+) is in stage 2 hypertension range\.$/, (s, d) => `ब्लड प्रेशर ${s}/${d} स्टेज 2 हाई बीपी की सीमा में है।`],
    [/^BP (\d+)\/(\d+) is in stage 1 hypertension range\.$/, (s, d) => `ब्लड प्रेशर ${s}/${d} स्टेज 1 हाई बीपी की सीमा में है।`],
    [/^BP (\d+)\/(\d+) is elevated\.$/, (s, d) => `ब्लड प्रेशर ${s}/${d} बढ़ा हुआ है।`],
    [/^BP (\d+)\/(\d+) is in a normal range\.$/, (s, d) => `ब्लड प्रेशर ${s}/${d} सामान्य सीमा में है।`],
    [/^Heart rate (\d+) bpm is very low\.$/, (value) => `हार्ट रेट ${value} bpm बहुत कम है।`],
    [/^Heart rate (\d+) bpm is slightly below the usual resting range\.$/, (value) => `हार्ट रेट ${value} bpm सामान्य आराम की सीमा से थोड़ा कम है।`],
    [/^Heart rate (\d+) bpm is unusually high\.$/, (value) => `हार्ट रेट ${value} bpm असामान्य रूप से अधिक है।`],
    [/^Heart rate (\d+) bpm is above the normal resting range\.$/, (value) => `हार्ट रेट ${value} bpm सामान्य आराम की सीमा से ऊपर है।`],
    [/^Heart rate (\d+) bpm is within the common resting range\.$/, (value) => `हार्ट रेट ${value} bpm सामान्य आराम की सीमा में है।`],
  ];

  for (const [pattern, formatter] of patterns) {
    const match = text.match(pattern);
    if (match) {
      return formatter(...match.slice(1));
    }
  }

  return text;
}

function translateItem(item: AnalysisItem, language: Language): AnalysisItem {
  return {
    ...item,
    label: translateLabel(item.label, language),
    detail: translateText(item.detail, language),
  };
}

export function localizeHealthAnalysis(analysis: HealthAnalysis, language: Language) {
  if (language !== "hi") {
    return {
      ...analysis,
      summary: translateText(analysis.summary, language),
      emergencyAdvice: analysis.emergencyAdvice
        ? translateText(analysis.emergencyAdvice, language)
        : null,
      measurements: analysis.measurements.map((item) => translateItem(item, language)),
      possibleConcerns: analysis.possibleConcerns.map((item) =>
        translateItem(item, language)
      ),
      urgentFlags: analysis.urgentFlags.map((item) => translateItem(item, language)),
      recommendations: analysis.recommendations.map((item) => ({
        ...item,
        text: translateText(item.text, language),
      })),
    };
  }

  const riskLevelMap: Record<HealthAnalysis["riskLevel"], HealthAnalysis["riskLevel"]> = {
    Low: "Low",
    Moderate: "Moderate",
    High: "High",
    Emergency: "Emergency",
  };

  return {
    ...analysis,
    riskLevel: riskLevelMap[analysis.riskLevel],
    summary: translateText(analysis.summary, language),
    emergencyAdvice: analysis.emergencyAdvice
      ? translateText(analysis.emergencyAdvice, language)
      : null,
    measurements: analysis.measurements.map((item) => translateItem(item, language)),
    possibleConcerns: analysis.possibleConcerns.map((item) =>
      translateItem(item, language)
    ),
    urgentFlags: analysis.urgentFlags.map((item) => translateItem(item, language)),
    recommendations: analysis.recommendations.map((item) => ({
      ...item,
      text: translateText(item.text, language),
    })),
  };
}

export function getDashboardCopy(language: Language) {
  const copy = dashboardCopy[language] ?? dashboardCopy.en!;
  if (language === "en" || language === "hi") {
    return copy;
  }

  return Object.fromEntries(
    Object.entries(dashboardCopy.en!).map(([key, value]) => [
      key,
      translateUi(value, language),
    ])
  ) as DashboardCopy;
}
