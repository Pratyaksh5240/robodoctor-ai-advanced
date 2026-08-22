"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";

export type Language = "en" | "hi" | "es" | "fr" | "de" | "zh" | "ko";

export type TranslationSet = {
  healthCheck: string;
  speak: string;
  listening: string;
  example: string;
  analyze: string;
  age: string;
  weight: string;
  height: string;
  bloodPressure: string;
  bloodSugar: string;
  heartRate: string;
  symptoms: string;
  disclaimer: string;
  heightAlert: string;
  bpAlert: string;
  negativeAlert: string;
  unrealisticAlert: string;
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TranslationSet;
};

type SupportedLanguage = {
  value: Language;
  label: string;
};

export const supportedLanguages: SupportedLanguage[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "zh", label: "中文" },
  { value: "ko", label: "한국어" },
];

const DEFAULT_LANGUAGE: Language = "en";

export function parseLanguage(value: string | null | undefined): Language {
  return supportedLanguages.some((item) => item.value === value)
    ? (value as Language)
    : DEFAULT_LANGUAGE;
}

const translations: Record<Language, TranslationSet> = {
  en: {
    healthCheck: "Health Check",
    speak: "Speak Your Health Data",
    listening: "Listening...",
    example:
      'Example: "Age 45 sugar 140 heart rate 110 weight 70 height 170 blood pressure 150 over 95"',
    analyze: "Analyze Health",
    age: "Age",
    weight: "Weight (kg)",
    height: "Height (cm)",
    bloodPressure: "Blood Pressure",
    bloodSugar: "Blood Sugar",
    heartRate: "Heart Rate",
    symptoms: "Symptoms",
    disclaimer:
      "This tool gives educational risk guidance only. It is not a medical diagnosis.",
    heightAlert: "Please enter height in centimeters.",
    bpAlert: "Blood pressure must be in the format 120/80.",
    negativeAlert: "Health values cannot be negative.",
    unrealisticAlert: "Entered values are outside realistic medical range.",
  },
  hi: {
    healthCheck: "स्वास्थ्य जांच",
    speak: "अपना स्वास्थ्य डेटा बोलें",
    listening: "सुन रहा है...",
    example:
      'उदाहरण: "उम्र 45 शुगर 140 हार्ट रेट 110 वजन 70 लंबाई 170 ब्लड प्रेशर 150 ओवर 95"',
    analyze: "स्वास्थ्य विश्लेषण करें",
    age: "उम्र",
    weight: "वजन (किलो)",
    height: "लंबाई (सेमी)",
    bloodPressure: "ब्लड प्रेशर",
    bloodSugar: "ब्लड शुगर",
    heartRate: "हार्ट रेट",
    symptoms: "लक्षण",
    disclaimer:
      "यह टूल केवल शैक्षिक जोखिम मार्गदर्शन देता है। यह चिकित्सीय निदान नहीं है।",
    heightAlert: "कृपया लंबाई सेंटीमीटर में दर्ज करें।",
    bpAlert: "ब्लड प्रेशर 120/80 के फॉर्मेट में भरें।",
    negativeAlert: "स्वास्थ्य मान नकारात्मक नहीं हो सकते।",
    unrealisticAlert: "दर्ज किए गए मान वास्तविक चिकित्सा सीमा से बाहर हैं।",
  },
  es: {
    healthCheck: "Chequeo de salud",
    speak: "Habla tus datos de salud",
    listening: "Escuchando...",
    example:
      'Ejemplo: "Edad 45 azúcar 140 frecuencia cardíaca 110 peso 70 altura 170 presión arterial 150 sobre 95"',
    analyze: "Analizar salud",
    age: "Edad",
    weight: "Peso (kg)",
    height: "Altura (cm)",
    bloodPressure: "Presión arterial",
    bloodSugar: "Azúcar en sangre",
    heartRate: "Frecuencia cardíaca",
    symptoms: "Síntomas",
    disclaimer:
      "Esta herramienta solo ofrece orientación educativa sobre el riesgo. No es un diagnóstico médico.",
    heightAlert: "Introduce la altura en centímetros.",
    bpAlert: "La presión arterial debe tener el formato 120/80.",
    negativeAlert: "Los valores de salud no pueden ser negativos.",
    unrealisticAlert:
      "Los valores introducidos están fuera de un rango médico realista.",
  },
  fr: {
    healthCheck: "Bilan de santé",
    speak: "Dictez vos données de santé",
    listening: "Écoute en cours...",
    example:
      'Exemple : "Âge 45 sucre 140 fréquence cardiaque 110 poids 70 taille 170 tension artérielle 150 sur 95"',
    analyze: "Analyser la santé",
    age: "Âge",
    weight: "Poids (kg)",
    height: "Taille (cm)",
    bloodPressure: "Tension artérielle",
    bloodSugar: "Glycémie",
    heartRate: "Fréquence cardiaque",
    symptoms: "Symptômes",
    disclaimer:
      "Cet outil fournit uniquement une orientation éducative sur le risque. Il ne constitue pas un diagnostic médical.",
    heightAlert: "Veuillez saisir la taille en centimètres.",
    bpAlert: "La tension artérielle doit être au format 120/80.",
    negativeAlert: "Les valeurs de santé ne peuvent pas être négatives.",
    unrealisticAlert:
      "Les valeurs saisies sont en dehors d'une plage médicale réaliste.",
  },
  de: {
    healthCheck: "Gesundheitscheck",
    speak: "Sprich deine Gesundheitsdaten",
    listening: "Hört zu...",
    example:
      'Beispiel: "Alter 45 Zucker 140 Herzfrequenz 110 Gewicht 70 Größe 170 Blutdruck 150 über 95"',
    analyze: "Gesundheit analysieren",
    age: "Alter",
    weight: "Gewicht (kg)",
    height: "Größe (cm)",
    bloodPressure: "Blutdruck",
    bloodSugar: "Blutzucker",
    heartRate: "Herzfrequenz",
    symptoms: "Symptome",
    disclaimer:
      "Dieses Tool gibt nur edukative Risikohinweise. Es ist keine medizinische Diagnose.",
    heightAlert: "Bitte gib die Größe in Zentimetern ein.",
    bpAlert: "Der Blutdruck muss im Format 120/80 eingegeben werden.",
    negativeAlert: "Gesundheitswerte können nicht negativ sein.",
    unrealisticAlert:
      "Die eingegebenen Werte liegen außerhalb eines realistischen medizinischen Bereichs.",
  },
  zh: {
    healthCheck: "健康检查",
    speak: "说出你的健康数据",
    listening: "正在聆听...",
    example:
      '示例: “年龄45 血糖140 心率110 体重70 身高170 血压150比95”',
    analyze: "分析健康情况",
    age: "年龄",
    weight: "体重（公斤）",
    height: "身高（厘米）",
    bloodPressure: "血压",
    bloodSugar: "血糖",
    heartRate: "心率",
    symptoms: "症状",
    disclaimer:
      "此工具仅提供教育性质的风险提示，并非医学诊断。",
    heightAlert: "请输入以厘米为单位的身高。",
    bpAlert: "血压格式必须为 120/80。",
    negativeAlert: "健康数值不能为负数。",
    unrealisticAlert: "输入的数值超出了合理的医学范围。",
  },
  ko: {
    healthCheck: "건강 체크",
    speak: "건강 데이터를 말해 주세요",
    listening: "듣는 중...",
    example:
      '예시: "나이 45 혈당 140 심박수 110 체중 70 키 170 혈압 150에 95"',
    analyze: "건강 분석",
    age: "나이",
    weight: "체중 (kg)",
    height: "키 (cm)",
    bloodPressure: "혈압",
    bloodSugar: "혈당",
    heartRate: "심박수",
    symptoms: "증상",
    disclaimer:
      "이 도구는 교육용 위험 안내만 제공합니다. 의학적 진단이 아닙니다.",
    heightAlert: "키를 센티미터 단위로 입력해 주세요.",
    bpAlert: "혈압은 120/80 형식으로 입력해야 합니다.",
    negativeAlert: "건강 수치는 음수가 될 수 없습니다.",
    unrealisticAlert: "입력한 값이 현실적인 의학 범위를 벗어났습니다.",
  },
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const subscribeToLanguage = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === "robodoctor-language") {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
};

const getLanguageSnapshot = (): Language => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  return parseLanguage(localStorage.getItem("robodoctor-language"));
};

const getServerLanguageSnapshot = (): Language => DEFAULT_LANGUAGE;

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );

  const setLanguage = (nextLanguage: Language) => {
    localStorage.setItem("robodoctor-language", nextLanguage);
    window.dispatchEvent(
      new StorageEvent("storage", { key: "robodoctor-language" })
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
