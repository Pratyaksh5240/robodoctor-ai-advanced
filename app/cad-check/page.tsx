"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { useLocalize } from "@/app/context/LanguageContext";

type CadFactor = {
  feature: string;
  label: string;
  value: any;
  impact: number;
  direction: string;
  explanation: string;
};

type CadResult = {
  status: string;
  model_name: string;
  model_version: string;
  dataset: string;
  diagnostic_accuracy: string;
  cad_probability: number;
  cad_presence: boolean;
  diagnostic_assessment: string;
  risk_level: string;
  confidence: number;
  key_factors: CadFactor[];
  triage_guidance: string;
  clinical_recommendations: string[];
  disclaimer: string;
};

export default function CadCheckPage() {
  const localize = useLocalize();

  const [age, setAge] = useState<number>(55);
  const [sex, setSex] = useState<string>("1");
  const [cp, setCp] = useState<number>(4);
  const [trestbps, setTrestbps] = useState<number>(135);
  const [chol, setChol] = useState<number>(245);
  const [fbs, setFbs] = useState<boolean>(false);
  const [restecg, setRestecg] = useState<number>(0);
  const [thalach, setThalach] = useState<number>(145);
  const [exang, setExang] = useState<boolean>(false);
  const [oldpeak, setOldpeak] = useState<number>(1.0);
  const [slope, setSlope] = useState<number>(2);
  const [ca, setCa] = useState<number>(1);
  const [thal, setThal] = useState<number>(3);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CadResult | null>(null);

  const loadHighRiskPreset = () => {
    setAge(62);
    setSex("1");
    setCp(4);
    setTrestbps(150);
    setChol(275);
    setFbs(true);
    setRestecg(2);
    setThalach(125);
    setExang(true);
    setOldpeak(2.6);
    setSlope(2);
    setCa(2);
    setThal(7);
    setError(null);
  };

  const loadLowRiskPreset = () => {
    setAge(38);
    setSex("0");
    setCp(2);
    setTrestbps(116);
    setChol(185);
    setFbs(false);
    setRestecg(0);
    setThalach(172);
    setExang(false);
    setOldpeak(0.0);
    setSlope(1);
    setCa(0);
    setThal(3);
    setError(null);
  };

  const loadBaselinePreset = () => {
    setAge(52);
    setSex("1");
    setCp(1);
    setTrestbps(130);
    setChol(230);
    setFbs(false);
    setRestecg(0);
    setThalach(150);
    setExang(false);
    setOldpeak(0.5);
    setSlope(1);
    setCa(0);
    setThal(3);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/cad-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age,
          sex,
          cp,
          trestbps,
          chol,
          fbs,
          restecg,
          thalach,
          exang,
          oldpeak,
          slope,
          ca,
          thal,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || localize("Failed to calculate CAD diagnostic assessment.", "सीएडी डायग्नोस्टिक मूल्यांकन गणना करने में विफल।"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">
                RoboDoctor AI
              </span>
            </Link>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800">
              {localize("CAD Angiography Screener", "सीएडी एंजियोग्राफी स्क्रीनर")}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/health-check"
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              {localize("10-Yr Framingham Screener", "10-वर्षीय फ्रेमिंगहैम स्क्रीनर")}
            </Link>
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Title & Accuracy Benchmark Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-950 via-slate-900 to-rose-950 text-white p-6 sm:p-8 shadow-xl border border-red-900/40">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/30">
              <span>{localize("Gold-Standard Cleveland Angiographic Benchmark", "गोल्ड-स्टैंडर्ड क्लीवलैंड एंजियोग्राफिक बेंचमार्क")}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              <span>{localize("88.52% Validated Accuracy", "88.52% प्रमाणित सटीकता")}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {localize("Coronary Artery Disease (CAD) Diagnostic Screening", "कोरोनरी आर्टरी डिजीज (CAD) डायग्नोस्टिक स्क्रीनिंग")}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {localize(
                "Trained on clinically verified cardiac catheterization outcomes (fluoroscopy and coronary angiography). Detects present hemodynamically significant stenosis (>50% arterial luminal narrowing) with 88.52% accuracy, 95.24% ROC-AUC, and 92.86% clinical sensitivity.",
                "क्लिनिकली सत्यापित कार्डियक कैथीeterization परिणामों (फ्लोरोस्कोपी और कोरोनरी एंजियोग्राफी) पर प्रशिक्षित। 88.52% सटीकता, 95.24% ROC-AUC और 92.86% नैदानिक संवेदनशीलता के साथ वर्तमान हेमोडायनामिक रूप से महत्वपूर्ण स्टेनोसिस (>50% धमनी संकुचन) का पता लगाता है।"
              )}
            </p>

            {/* Benchmark stats */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase font-medium">
                  {localize("Test Accuracy", "परीक्षण सटीकता")}
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400">88.52%</div>
                <div className="text-[10px] text-slate-400">
                  {localize("Held-out cohort (54/61)", "होल्ड-आउट कोहोर्ट (54/61)")}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase font-medium">ROC-AUC</div>
                <div className="text-xl sm:text-2xl font-black text-blue-400">95.24%</div>
                <div className="text-[10px] text-slate-400">
                  {localize("Near-perfect separation", "उत्कृष्ट वर्गीकरण")}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase font-medium">
                  {localize("CAD Sensitivity", "सीएडी संवेदनशीलता")}
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-400">92.86%</div>
                <div className="text-[10px] text-slate-400">
                  {localize("26 of 28 CAD caught", "28 में से 26 सीएडी पहचाने")}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase font-medium">
                  {localize("Ensemble", "एंसेम्बल")}
                </div>
                <div className="text-base sm:text-lg font-bold text-amber-300 mt-1">RF + GB + LR</div>
                <div className="text-[10px] text-slate-400">
                  {localize("Calibrated soft voting", "कैलिब्रेटेड सॉफ्ट वोटिंग")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Quick-Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            {localize("Quick Clinical Test Profiles:", "त्वरित क्लिनिकल टेस्ट प्रोफाइल:")}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadHighRiskPreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 transition"
            >
              {localize("Load Confirmed CAD Case (~97% Risk)", "पुष्ट सीएडी केस लोड करें (~97% जोखिम)")}
            </button>
            <button
              type="button"
              onClick={loadLowRiskPreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition"
            >
              {localize("Load Healthy Non-CAD Case (~4% Risk)", "स्वस्थ गैर-सीएडी केस लोड करें (~4% जोखिम)")}
            </button>
            <button
              type="button"
              onClick={loadBaselinePreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              {localize("Reset to Baseline", "बेसलाइन पर रीसेट करें")}
            </button>
          </div>
        </div>

        {/* Input Form & Diagnostic Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Clinical Inputs */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Demographics & Resting Vitals */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h2 className="text-base font-bold">
                    {localize("Demographics & Resting Hemodynamics", "डेमोग्राफिक्स व रेस्टिंग हेमोडायनामिक्स")}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {localize("Patient Age (Years)", "मरीज की उम्र (वर्ष)")}
                    </label>
                    <input
                      type="number"
                      min={18}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {localize("Biological Sex", "जैविक लिंग")}
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="1">{localize("Male (Higher baseline risk)", "पुरुष (अधिक बेसलाइन जोखिम)")}</option>
                      <option value="0">{localize("Female", "महिला")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {localize("Resting Blood Pressure (mm Hg)", "रेस्टिंग ब्लड प्रेशर (मिमी एचजी)")}
                    </label>
                    <input
                      type="number"
                      min={80}
                      max={220}
                      value={trestbps}
                      onChange={(e) => setTrestbps(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400">
                      {localize("Normal: 120 mm Hg", "सामान्य: 120 मिमी एचजी")}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {localize("Serum Total Cholesterol (mg/dL)", "सीरम टोटल कोलेस्ट्रॉल (मिलीग्राम/डीएल)")}
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={600}
                      value={chol}
                      onChange={(e) => setChol(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400">
                      {localize("Optimal: <200 mg/dL", "उचित: <200 मिलीग्राम/डीएल")}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fbs}
                      onChange={(e) => setFbs(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300 dark:border-slate-700"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {localize(
                        "Fasting Blood Sugar > 120 mg/dL (Diabetic / Impaired fasting glucose)",
                        "फास्टिंग ब्लड शुगर > 120 मिलीग्राम/डीएल (डायबिटिक / बिगड़ा हुआ फास्टिंग ग्लूकोज)"
                      )}
                    </span>
                  </label>
                </div>
              </div>

              {/* Section 2: Symptoms & Electrocardiogram */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h2 className="text-base font-bold">
                    {localize("Chest Pain & Resting ECG", "सीने में दर्द व रेस्टिंग ईसीजी")}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {localize("Chest Pain Type (Anginal Classification)", "सीने के दर्द का प्रकार (एंजाइनल वर्गीकरण)")}
                    </label>
                    <select
                      value={cp}
                      onChange={(e) => setCp(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value={1}>{localize("Type 1: Typical Angina (Exertional, relieved by rest/nitrates)", "टाइप 1: विशिष्ट एनजाइना (परिश्रम से बढ़ता, आराम/नाइट्रेट से ठीक)")}</option>
                      <option value={2}>{localize("Type 2: Atypical Angina (Atypical chest discomfort)", "टाइप 2: असामान्य एनजाइना (असामान्य सीने की बेचैनी)")}</option>
                      <option value={3}>{localize("Type 3: Non-Anginal Pain (Musculoskeletal / gastrointestinal)", "टाइप 3: गैर-एंजाइनल दर्द (मांसपेशियों या पाचन संबंधी)")}</option>
                      <option value={4}>{localize("Type 4: Asymptomatic / Silent Ischemia Equivalent", "टाइप 4: लक्षणहीन / साइलेंट इस्केमिया समकक्ष")}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {localize("Resting ECG Assessment", "रेस्टिंग ईसीजी मूल्यांकन")}
                      </label>
                      <select
                        value={restecg}
                        onChange={(e) => setRestecg(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value={0}>{localize("0: Normal Resting ECG", "0: सामान्य रेस्टिंग ईसीजी")}</option>
                        <option value={1}>{localize("1: ST-T Wave Abnormality (T inversion / ST elevation)", "1: एसटी-टी तरंग असामान्यता (टी उलटाव / एसटी उभार)")}</option>
                        <option value={2}>{localize("2: Left Ventricular Hypertrophy (Estes criteria)", "2: लेफ्ट वेंट्रिकुलर हाइपरट्रॉफी (एस्टेस मानदंड)")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {localize("Maximum Achieved Heart Rate (bpm)", "अधिकतम प्राप्त हृदय गति (बीपीएम)")}
                      </label>
                      <input
                        type="number"
                        min={60}
                        max={220}
                        value={thalach}
                        onChange={(e) => setThalach(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400">
                        {localize("Peak HR during stress testing", "स्ट्रेस टेस्ट के दौरान उच्चतम हृदय गति")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Diagnostic Stress Test & Catheterization Markers */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h2 className="text-base font-bold">
                    {localize("Stress Testing & Angiographic Indicators", "स्ट्रेस टेस्टिंग व एंजियोग्राफिक संकेतक")}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {localize("Exercise-Induced Angina", "व्यायाम प्रेरित एनजाइना")}
                      </label>
                      <select
                        value={exang ? "1" : "0"}
                        onChange={(e) => setExang(e.target.value === "1")}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value="0">{localize("No (Exercise tolerated without angina)", "नहीं (बिना एनजाइना के व्यायाम सहन)")}</option>
                        <option value="1">{localize("Yes (Exertional chest tightness induced)", "हाँ (परिश्रम से सीने में जकड़न)")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {localize("Exercise ST Depression (oldpeak, mm)", "व्यायाम एसटी डिप्रेशन (ओल्डपीक, मिमी)")}
                      </label>
                      <input
                        type="number"
                        step={0.1}
                        min={0.0}
                        max={8.0}
                        value={oldpeak}
                        onChange={(e) => setOldpeak(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400">
                        {localize(">=1.0 mm indicates myocardial ischemia", ">=1.0 मिमी मायोकार्डियल इस्केमिया दर्शाता है")}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {localize("Peak ST Slope", "पीक एसटी स्लोप")}
                      </label>
                      <select
                        value={slope}
                        onChange={(e) => setSlope(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value={1}>{localize("1: Upsloping (Normal)", "1: ऊपर की ओर ढलान (सामान्य)")}</option>
                        <option value={2}>{localize("2: Flat (Ischemic)", "2: सपाट (इस्केमिक)")}</option>
                        <option value={3}>{localize("3: Downsloping (Severe)", "3: नीचे की ओर ढलान (गंभीर)")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {localize("Major Vessels Colored (ca)", "प्रमुख रंगीन वाहिकाएं (सीए)")}
                      </label>
                      <select
                        value={ca}
                        onChange={(e) => setCa(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value={0}>{localize("0 vessels (Clear fluoroscopy)", "0 वाहिकाएं (स्पष्ट फ्लोरोस्कोपी)")}</option>
                        <option value={1}>{localize("1 vessel (Single-vessel disease)", "1 वाहिका (एकल वाहिका रोग)")}</option>
                        <option value={2}>{localize("2 vessels (Bi-vessel disease)", "2 वाहिकाएं (द्वि-वाहिका रोग)")}</option>
                        <option value={3}>{localize("3 vessels (Triple-vessel disease)", "3 वाहिकाएं (त्रि-वाहिका रोग)")}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {localize("Thallium Scintigraphy", "थैलियम सिंटिग्राफी")}
                      </label>
                      <select
                        value={thal}
                        onChange={(e) => setThal(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value={3}>{localize("3: Normal Perfusion", "3: सामान्य परफ्यूजन")}</option>
                        <option value={6}>{localize("6: Fixed Defect (Prior Infarct)", "6: स्थिर दोष (पिछला इन्फार्क्ट)")}</option>
                        <option value={7}>{localize("7: Reversible Defect (Ischemia)", "7: प्रतिवर्ती दोष (इस्केमिया)")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-base shadow-lg shadow-red-500/20 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{localize("Evaluating Coronary Angiography Markers...", "कोरोनरी एंजियोग्राफी संकेतकों का मूल्यांकन हो रहा है...")}</span>
                  </span>
                ) : (
                  localize("Execute CAD Diagnostic Screening (88.52% Accuracy)", "सीएडी डायग्नोस्टिक स्क्रीनिंग निष्पादित करें (88.52% सटीकता)")
                )}
              </button>
            </form>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                <strong>{localize("Assessment Error:", "मूल्यांकन त्रुटि:")}</strong> {error}
              </div>
            )}
          </div>

          {/* Right Column: Diagnostic Results Dashboard */}
          <div className="lg:col-span-5 space-y-6">
            {result ? (
              <div className="space-y-6 animate-fade-in">
                {/* Result Card */}
                <div
                  className={`p-6 rounded-2xl border shadow-lg ${
                    result.cad_presence
                      ? "bg-red-50/80 dark:bg-red-950/30 border-red-300 dark:border-red-800"
                      : "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                        result.cad_presence
                          ? "bg-red-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {localize(result.risk_level, result.risk_level)} {localize("CAD Risk Tier", "सीएडी जोखिम स्तर")}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {localize("Model Conf:", "मॉडल विश्वास:")} {result.confidence}%
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                      {localize("Diagnostic Probability of Stenosis (>50%)", "स्टेनोसिस की नैदानिक संभावना (>50%)")}
                    </div>
                    <div className="flex items-baseline space-x-2 mt-1">
                      <span
                        className={`text-4xl sm:text-5xl font-black ${
                          result.cad_presence
                            ? "text-red-600 dark:text-red-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {result.cad_probability}%
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {result.cad_presence
                          ? localize("Significant CAD Detected", "महत्वपूर्ण सीएडी का पता चला")
                          : localize("CAD Unlikely / Normal", "सीएडी की संभावना कम / सामान्य")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium leading-relaxed">
                    {localize(result.diagnostic_assessment, result.diagnostic_assessment)}
                  </div>

                  <div className="mt-4 text-xs text-slate-600 dark:text-slate-400">
                    <strong>{localize("Triage:", "ट्राइएज:")}</strong> {localize(result.triage_guidance, result.triage_guidance)}
                  </div>
                </div>

                {/* Top Contributing Biological Factors */}
                {result.key_factors && result.key_factors.length > 0 && (
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {localize("Top Diagnostic Biomarkers", "शीर्ष नैदानिक बायोमार्कर्स")}
                    </h3>
                    <div className="space-y-3">
                      {result.key_factors.slice(0, 5).map((factor, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {localize(factor.label, factor.label)}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                                factor.direction === "higher"
                                  ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {factor.direction === "higher"
                                ? localize("+ Increases Risk", "+ जोखिम बढ़ाता है")
                                : localize("- Lowers Risk", "- जोखिम घटाता है")}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                            {localize(factor.explanation, factor.explanation)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical Recommendations */}
                {result.clinical_recommendations && result.clinical_recommendations.length > 0 && (
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {localize("Cardiology Care Recommendations", "कार्डियोलॉजी देखभाल सिफारिशें")}
                    </h3>
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {result.clinical_recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-red-500 font-bold mt-0.5">•</span>
                          <span>{localize(rec, rec)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              /* Placeholder before test is run */
              <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-2xl font-bold">
                  CAD
                </div>
                <h3 className="text-lg font-bold">
                  {localize("Ready for CAD Diagnostic Evaluation", "सीएडी डायग्नोस्टिक मूल्यांकन के लिए तैयार")}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {localize(
                    "Enter the patient hemodynamic and stress-test data or select one of the pre-filled clinical profiles above, then click Execute CAD Diagnostic Screening.",
                    "रोगी के हेमोडायनामिक और स्ट्रेस-टेस्ट डेटा दर्ज करें या ऊपर दिए गए क्लिनिकल प्रोफाइल में से किसी एक को चुनें, फिर सीएडी डायग्नोस्टिक स्क्रीनिंग निष्पादित करें पर क्लिक करें।"
                  )}
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    {localize("Why Angiographic CAD achieves 88.52% Accuracy:", "एंजियोग्राफिक सीएडी 88.52% सटीकता क्यों प्राप्त करता है:")}
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    {localize(
                      "Unlike 10-year epidemiological forecasts (Framingham) where unpredictable lifestyle changes over a decade introduce high Bayes noise, this model evaluates present coronary lumen narrowing using high-resolution stress ECG and fluoroscopy markers.",
                      "10-वर्षीय महामारी विज्ञान के पूर्वानुमानों (फ्रेमिंगहैम) के विपरीत, जहाँ एक दशक में जीवनशैली में अप्रत्याशित बदलाव बहुत अधिक शोर पैदा करते हैं, यह मॉडल उच्च-रिज़ॉल्यूशन स्ट्रेस ईसीजी और फ्लोरोस्कोपी मार्करों का उपयोग करके वर्तमान कोरोनरी ल्यूमेन संकुचन का सटीक मूल्यांकन करता है।"
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Medical Disclaimer Component */}
            <MedicalDisclaimer />
          </div>
        </div>
      </main>
    </div>
  );
}
