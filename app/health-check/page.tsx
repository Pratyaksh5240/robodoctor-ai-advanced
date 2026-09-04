"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Language,
  supportedLanguages,
  useLanguage,
} from "../context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

type RecommendationCardItem = {
  id?: string;
  title: string;
  description: string;
  category: string;
  reason?: string;
  score?: number;
  priority?: string;
};

type PriorityFinding = {
  title: string;
  detail: string;
  explanation: string;
  severity: string;
};

type ContributingFactor = {
  feature: string;
  label: string;
  value: string;
  contributionPct: number;
  effect: "higher" | "lower" | string;
  explanation: string;
};

type MedicationInfoCard = {
  id: string;
  category: string;
  title: string;
  generalPurpose: string;
  medicationClasses: string[];
  safetyConsiderations: string;
  contraindicationsWarnings: string;
  clinicianDiscussionPoints: string;
};

type UsefulHealthInfoItem = {
  topic: string;
  value: string;
  explanation: string;
};

type RiskResult = {
  risk: "Low" | "Moderate" | "High";
  probability: number;
  probabilities: {
    Low: number;
    Moderate: number;
    High: number;
  };
  bmi: number;
  model: string;
  modelAccuracy?: string;
  priorityFinding?: PriorityFinding | null;
  keyContributingFactors?: ContributingFactor[];
  recommendations: Array<string | RecommendationCardItem>;
  medicationInformation?: MedicationInfoCard[];
  usefulInformation?: UsefulHealthInfoItem[];
  urgent: boolean;
  message: string;
};

type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<
    ArrayLike<{
      transcript: string;
    }>
  >;
};

const voicePatterns = {
  age: /(age|umr|उम्र)\s*(\d+)/,
  sugar: /(sugar|shugar|शुगर)\s*(\d+)/,
  heartRate: /(heart rate|pulse|हार्ट रेट|नाड़ी)\s*(\d+)/,
  weight: /(weight|wazan|वजन)\s*(\d+)/,
  height: /(height|lambai|लंबाई)\s*(\d+)/,
  bp: /(\d+)\s*(over|\/|बाय|पर)\s*(\d+)/,
};

const speechLocales: Record<Language, string> = {
  en: "en-US",
  hi: "hi-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  zh: "zh-CN",
  ko: "ko-KR",
};

export default function HealthCheck() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const isHindi = language === "hi";

  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);

  const [formData, setFormData] = useState({
    age: "",
    height: "",
    weight: "",
    bp: "",
    sugar: "",
    heartRate: "",
    symptoms: "",
    // Optional Additional Cardiovascular Fields (Framingham V2)
    sex: "female",
    currentSmoker: false,
    cigsPerDay: "0",
    bpMeds: false,
    prevalentStroke: false,
    diabetes: false,
    totChol: "",
  });

  const [showOptionalCardio, setShowOptionalCardio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [knowsReadings, setKnowsReadings] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [error, setError] = useState("");

  const measurementGuide = [
    {
      key: "bp",
      title: localize("How to check blood pressure", "ब्लड प्रेशर कैसे लें"),
      detail: isHindi
        ? "डिजिटल BP मशीन का उपयोग करें। बैठकर 5 मिनट आराम करें, हाथ को सीधा रखें, फिर रीडिंग लें।"
        : translateUi(
            "Use a digital BP machine. Sit calmly for 5 minutes, keep your arm supported, then take the reading.",
            language
          ),
    },
    {
      key: "heartRate",
      title: localize("How to check heart rate", "हार्ट रेट कैसे देखें"),
      detail: isHindi
        ? "कलाई या गर्दन की नाड़ी 60 सेकंड तक गिनें, या smartwatch/oximeter का उपयोग करें।"
        : translateUi(
            "Count your pulse at the wrist or neck for 60 seconds, or use a smartwatch or oximeter.",
            language
          ),
    },
    {
      key: "sugar",
      title: localize("How to check blood sugar", "ब्लड शुगर कैसे जांचें"),
      detail: isHindi
        ? "ग्लूकोमीटर से जांच करें। सुबह खाली पेट की रीडिंग फास्टिंग शुगर मानी जाती है।"
        : translateUi(
            "Use a glucometer. A morning reading before food is usually considered fasting sugar.",
            language
          ),
    },
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setResult(null);
    setError("");

    const target = e.target;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

    setFormData((current) => ({
      ...current,
      [target.name]: value,
    }));
  };

  const startVoiceInput = () => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };

    const SpeechRecognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        translateUi(
          "Voice recognition not supported in this browser.",
          language
        )
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = speechLocales[language];
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0][0].transcript.toLowerCase();

      const ageMatch = transcript.match(voicePatterns.age);
      const sugarMatch = transcript.match(voicePatterns.sugar);
      const heartMatch = transcript.match(voicePatterns.heartRate);
      const weightMatch = transcript.match(voicePatterns.weight);
      const heightMatch = transcript.match(voicePatterns.height);
      const bpMatch = transcript.match(voicePatterns.bp);

      setFormData((prev) => ({
        ...prev,
        age: ageMatch ? ageMatch[2] : prev.age,
        sugar: sugarMatch ? sugarMatch[2] : prev.sugar,
        heartRate: heartMatch ? heartMatch[2] : prev.heartRate,
        weight: weightMatch ? weightMatch[2] : prev.weight,
        height: heightMatch ? heightMatch[2] : prev.height,
        bp: bpMatch ? `${bpMatch[1]}/${bpMatch[3]}` : prev.bp,
        symptoms: transcript,
      }));

      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setResult(null);

    const age = Number(formData.age);
    const height = Number(formData.height);
    const weight = Number(formData.weight);
    const sugar = formData.sugar ? Number(formData.sugar) : null;
    const heartRate = formData.heartRate ? Number(formData.heartRate) : null;

    if ([age, height, weight].some((value) => value <= 0)) {
      alert(t.negativeAlert);
      return;
    }

    if (
      age > 120 ||
      height > 250 ||
      weight > 300 ||
      (sugar !== null && sugar > 500) ||
      (heartRate !== null && heartRate > 220)
    ) {
      alert(t.unrealisticAlert);
      return;
    }

    if (height < 80 || height > 250) {
      alert(t.heightAlert);
      return;
    }

    if (
      formData.bp &&
      !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(formData.bp.trim())
    ) {
      alert(t.bpAlert);
      return;
    }

    if (!formData.bp || sugar === null || heartRate === null) {
      setError(
        localize(
          "For the Framingham ML risk assessment, please enter blood pressure, blood sugar, and heart rate.",
          "Framingham ML risk assessment के लिए कृपया ब्लड प्रेशर, ब्लड शुगर और हार्ट रेट दर्ज करें।"
        )
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/vital-risk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          age,
          heightCm: height,
          weightKg: weight,
          bloodPressure: formData.bp,
          bloodSugar: sugar,
          heartRate,
          symptoms: formData.symptoms,
          // Additional Optional Cardiovascular Fields (Framingham)
          sex: formData.sex,
          currentSmoker: formData.currentSmoker,
          cigsPerDay: formData.currentSmoker ? Number(formData.cigsPerDay || 0) : 0,
          bpMeds: formData.bpMeds,
          prevalentStroke: formData.prevalentStroke,
          diabetes: formData.diabetes,
          totChol: formData.totChol ? Number(formData.totChol) : undefined,
        }),
      });

      const data = (await response.json()) as RiskResult & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Unable to analyze health.");
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : localize(
              "Unable to complete the Framingham ML health assessment.",
              "Framingham ML health assessment पूरा नहीं हो पाया।"
            )
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-8 text-[var(--foreground)] md:p-16">
      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-4xl font-bold"
      >
        {t.healthCheck}
      </motion.h1>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="mb-6 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2"
      >
        {supportedLanguages.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>

      <motion.button
        onClick={startVoiceInput}
        whileHover={{ scale: 1.02 }}
        className="mb-4 rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-black hover:bg-cyan-400"
      >
        {t.speak}
      </motion.button>

      {isListening && (
        <div className="mb-8 rounded-xl border border-cyan-500 bg-[color:var(--surface-strong)] p-6">
          <p className="mb-2 font-semibold text-cyan-400">{t.listening}</p>
          <p className="mt-2 italic text-[var(--muted)]">{t.example}</p>
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {localize("How to take your readings", "रीडिंग कैसे लें")}
            </h2>

            <p className="mt-2 text-[var(--muted)]">
              {localize(
                "For the Framingham ML risk assessment, accurate BP, sugar, and heart-rate readings are needed.",
                "Framingham ML risk assessment के लिए सही BP, शुगर और हार्ट रेट की रीडिंग जरूरी है।"
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setKnowsReadings((current) => !current)}
            className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-cyan-100 hover:bg-cyan-400/20"
          >
            {knowsReadings
              ? isHindi
                ? "मुझे ये रीडिंग नहीं पता"
                : translateUi("I don't know these readings", language)
              : isHindi
                ? "मुझे रीडिंग पता है"
                : translateUi("I know my readings", language)}
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {measurementGuide.map((item) => (
            <div
              key={item.key}
              className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
            >
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {item.detail}
              </p>
            </div>
          ))}
        </div>

        {!knowsReadings && (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            {localize(
              "The Framingham ML assessment needs these readings. Please measure them before running the Vital Risk model.",
              "Framingham ML Vital Risk model को इन readings की जरूरत है। Analyze करने से पहले इन्हें मापें।"
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-[var(--muted)]">{t.age}</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            required
            min={1}
            max={120}
            placeholder="45"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-[var(--muted)]">{t.weight}</label>
          <input
            type="number"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            required
            min={1}
            max={300}
            placeholder="70"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-[var(--muted)]">{t.height}</label>
          <input
            type="number"
            name="height"
            value={formData.height}
            onChange={handleChange}
            required
            min={80}
            max={250}
            placeholder="170"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-[var(--muted)]">
            {t.bloodPressure}
          </label>
          <input
            type="text"
            name="bp"
            value={formData.bp}
            onChange={handleChange}
            placeholder="130/85"
            disabled={!knowsReadings}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-[var(--muted)]">
            {t.bloodSugar}
          </label>
          <input
            type="number"
            name="sugar"
            value={formData.sugar}
            onChange={handleChange}
            min={1}
            max={500}
            placeholder="95"
            disabled={!knowsReadings}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-[var(--muted)]">
            {t.heartRate}
          </label>
          <input
            type="number"
            name="heartRate"
            value={formData.heartRate}
            onChange={handleChange}
            min={1}
            max={220}
            placeholder="72"
            disabled={!knowsReadings}
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-[var(--muted)]">
            {t.symptoms}
          </label>
          <textarea
            name="symptoms"
            value={formData.symptoms}
            onChange={handleChange}
            rows={3}
            placeholder="fever, cough, fatigue"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
          />
        </div>

        {/* Optional Additional Cardiovascular Information Section */}
        <div className="md:col-span-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">
                {localize("Additional Cardiovascular Information (Optional)", "अतिरिक्त कार्डियोवैस्कुलर जानकारी (ऐच्छिक)")}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                {localize(
                  "Provide smoking status, cholesterol, or medication history to refine Framingham 10-year risk accuracy.",
                  "Framingham 10-year risk सटीकता को रिफाइन करने के लिए धूम्रपान, कोलेस्ट्रॉल या दवा का इतिहास दर्ज करें।"
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOptionalCardio((prev) => !prev)}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200"
            >
              {showOptionalCardio ? localize("Hide Options ▲", "छिपाएं ▲") : localize("Add Details ▼", "जोड़ें ▼")}
            </button>
          </div>

          {showOptionalCardio && (
            <div className="mt-5 grid gap-5 md:grid-cols-3 border-t border-[color:var(--border)] pt-5">
              <div>
                <label className="mb-1.5 block text-xs text-[var(--muted)] font-semibold">
                  {localize("Biological Sex", "जैविक लिंग")}
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm"
                >
                  <option value="female">{localize("Female", "महिला")}</option>
                  <option value="male">{localize("Male", "पुरुष")}</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-[var(--muted)] font-semibold">
                  {localize("Total Cholesterol (mg/dL)", "कुल कोलेस्ट्रॉल (mg/dL)")}
                </label>
                <input
                  type="number"
                  name="totChol"
                  value={formData.totChol}
                  onChange={handleChange}
                  placeholder="236"
                  min={50}
                  max={500}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="currentSmoker"
                  name="currentSmoker"
                  checked={formData.currentSmoker}
                  onChange={handleChange}
                  className="h-5 w-5 accent-cyan-400"
                />
                <label htmlFor="currentSmoker" className="text-sm font-medium cursor-pointer">
                  {localize("Active Smoker?", "धूम्रपान करते हैं?")}
                </label>
              </div>

              {formData.currentSmoker && (
                <div>
                  <label className="mb-1.5 block text-xs text-[var(--muted)] font-semibold">
                    {localize("Cigarettes Per Day", "प्रतिदिन सिगरेट संख्या")}
                  </label>
                  <input
                    type="number"
                    name="cigsPerDay"
                    value={formData.cigsPerDay}
                    onChange={handleChange}
                    placeholder="10"
                    min={1}
                    max={100}
                    className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 md:pt-6">
                <input
                  type="checkbox"
                  id="bpMeds"
                  name="bpMeds"
                  checked={formData.bpMeds}
                  onChange={handleChange}
                  className="h-5 w-5 accent-cyan-400"
                />
                <label htmlFor="bpMeds" className="text-sm font-medium cursor-pointer">
                  {localize("Taking BP Medication?", "BP की दवा ले रहे हैं?")}
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2 md:pt-6">
                <input
                  type="checkbox"
                  id="prevalentStroke"
                  name="prevalentStroke"
                  checked={formData.prevalentStroke}
                  onChange={handleChange}
                  className="h-5 w-5 accent-cyan-400"
                />
                <label htmlFor="prevalentStroke" className="text-sm font-medium cursor-pointer">
                  {localize("Prior Stroke History?", "क्या पहले स्ट्रोक हुआ है?")}
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 md:col-span-2">
          <p className="mb-4 text-sm text-[var(--muted)]">
            {t.disclaimer}
          </p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isAnalyzing}
            className="rounded-xl bg-cyan-500 px-8 py-4 font-semibold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 transition"
          >
            {isAnalyzing
              ? localize("Analyzing Framingham ML Risk...", "Framingham ML से analyze हो रहा है...")
              : t.analyze}
          </button>
        </div>
      </form>

      {/* Upgraded Framingham Result Section */}
      {result && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-3xl border border-cyan-400/20 bg-[color:var(--surface-strong)] p-6 md:p-8 space-y-8"
        >
          {/* 1. Priority Finding Banner (P0/P1 Safety Layer) */}
          {result.priorityFinding && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/15 p-5 text-red-100">
              <div className="flex items-center justify-between font-bold text-lg text-red-400 uppercase tracking-wide">
                <div className="flex items-center gap-2">
                  <span>🚨</span>
                  <span>{localize("PRIORITY FINDING", "PRIORITY FINDING")}</span>
                </div>
                <span className="rounded-full border border-red-400/30 bg-red-500/20 px-3 py-0.5 text-xs font-semibold text-red-300">
                  {result.priorityFinding.severity}
                </span>
              </div>
              <h4 className="mt-2 text-base font-bold text-red-200">
                {result.priorityFinding.title}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-red-100">
                {result.priorityFinding.detail}
              </p>
              <p className="mt-3 text-xs italic text-red-200/90 border-t border-red-500/20 pt-2">
                <span className="font-semibold not-italic text-red-300">
                  {localize("Coherence Note:", "Coherence Note:")}{" "}
                </span>
                {result.priorityFinding.explanation}
              </p>
            </div>
          )}

          {result.urgent && !result.priorityFinding && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/15 p-5 text-red-200">
              <div className="flex items-center gap-2 font-bold text-lg text-red-400 uppercase tracking-wide">
                <span>⚠️</span>
                <span>{localize("URGENT WARNING", "URGENT WARNING")}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                {localize(
                  "Do not rely on the ML screening result for emergency decisions. Seek appropriate urgent medical care.",
                  "आपातकालीन निर्णयों के लिए ML स्क्रीनिंग परिणाम पर निर्भर न रहें। उचित आपातकालीन चिकित्सा देखभाल प्राप्त करें।"
                )}
              </p>
            </div>
          )}

          {/* 2. ML Risk Assessment Header & 10-Year CHD Probability */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm uppercase tracking-[0.2em] font-semibold text-cyan-300">
                  {localize("ML Risk Assessment", "ML Risk Assessment")}
                </p>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-0.5 text-xs text-cyan-300 font-mono">
                  {result.model || "Framingham Heart Study Model"}
                </span>
                {result.modelAccuracy && (
                  <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-0.5 text-xs font-semibold text-emerald-300 font-mono">
                    📊 {result.modelAccuracy}
                  </span>
                )}
              </div>

              <h2 className="mt-2 text-4xl font-black uppercase">
                {result.risk} {localize("Risk Tier", "जोखिम स्तर")}
              </h2>

              <p className="mt-2 text-sm text-[var(--muted)] max-w-2xl leading-relaxed">
                {result.message}
              </p>

              <p className="mt-3 text-sm font-medium text-[var(--muted)]">
                BMI: {result.bmi.toFixed(1)}
              </p>
            </div>

            <div
              className={`rounded-2xl px-6 py-5 text-center font-bold min-w-[200px] ${
                result.risk === "High"
                  ? "bg-red-500/20 text-red-200 border border-red-500/30"
                  : result.risk === "Moderate"
                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
              }`}
            >
              <div className="text-4xl font-black">
                {result.probability ? result.probability.toFixed(1) : (result.probabilities[result.risk] || 0).toFixed(1)}%
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider font-semibold">
                {localize("Estimated 10-Year CHD Event Risk", "Estimated 10-Year CHD Event Risk")}
              </div>
            </div>
          </div>

          {/* 3. Key Contributing Factors (Explainable AI - XAI) */}
          {result.keyContributingFactors && result.keyContributingFactors.length > 0 && (
            <div className="border-t border-[color:var(--border)] pt-6">
              <div className="mb-4 flex flex-col gap-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                  <h3 className="text-xl font-bold">
                    🧠 {localize("Key Contributing Factors", "मुख्य योगदानकर्ता कारक")}
                  </h3>
                  <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider font-mono">
                    {localize("Relative Model Contribution", "Relative Model Contribution")}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {localize(
                    "These values represent the relative contribution of displayed features to the model's estimated risk for this input (calculated via Logistic Regression normalized coefficients).",
                    "ये मान मॉडल के 10-वर्षीय कार्डियोवैस्कुलर जोखिम अनुमान में प्रदर्शित विशेषताओं के सापेक्ष योगदान का प्रतिनिधित्व करते हैं।"
                  )}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {result.keyContributingFactors.map((factor) => (
                  <div
                    key={factor.feature}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="text-[var(--foreground)]">{factor.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan-300">{factor.value}</span>
                        <span className="text-xs text-cyan-400 font-semibold">{factor.contributionPct}% relative contribution</span>
                      </div>
                    </div>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${Math.min(factor.contributionPct, 100)}%` }}
                      />
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                      {factor.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Personalized Recommendations (Priority + Cosine Relevance) */}
          <div className="border-t border-[color:var(--border)] pt-6">
            <div className="flex flex-col gap-1 mb-6">
              <h3 className="text-xl font-bold">
                🎯 {localize("Personalized Recommendations", "व्यक्तिगत सिफारिशें")}
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {localize(
                  "Ranked using content-based cosine similarity between your vital profile and clinical knowledge items.",
                  "आपकी वाइटल प्रोफाइल और क्लिनिकल नॉलेज के बीच कंटेंट-आधारित कोसाइन समानता का उपयोग करके रैंक किया गया।"
                )}
              </p>
            </div>

            <div className="space-y-4">
              {result.recommendations.map((item, idx) => {
                const isObj = typeof item === "object" && item !== null;
                const title = isObj ? item.title : item;
                const desc = isObj ? item.description : item;
                const category = isObj ? item.category : "General Recommendation";
                const reason = isObj ? item.reason : undefined;
                const score = isObj ? item.score : undefined;
                const priority = isObj ? item.priority : undefined;

                return (
                  <div
                    key={isObj ? item.id || idx : idx}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 transition hover:border-cyan-500/30"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 font-mono text-sm font-bold text-cyan-400">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-bold">{title}</h4>
                            {priority && (
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                priority === "P0"
                                  ? "border-red-400/40 bg-red-500/20 text-red-300"
                                  : priority === "P1"
                                  ? "border-amber-400/40 bg-amber-500/20 text-amber-300"
                                  : priority === "P2"
                                  ? "border-orange-400/40 bg-orange-500/20 text-orange-300"
                                  : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
                              }`}>
                                {priority}
                              </span>
                            )}
                            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-0.5 text-xs font-semibold text-cyan-300">
                              {category}
                            </span>
                          </div>

                          <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                            {desc}
                          </p>

                          {reason && (
                            <p className="mt-2 text-xs italic text-[var(--muted)]">
                              <span className="font-semibold not-italic text-cyan-400/90">
                                {localize("Why this is recommended:", "यह क्यों अनुशंसित है:")}{" "}
                              </span>
                              {reason}
                            </p>
                          )}
                        </div>
                      </div>

                      {score !== undefined && (
                        <div className="min-w-[140px] rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-3 text-right">
                          <div className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                            {localize("Relevance", "Relevance")}
                          </div>
                          <div className="mt-1 text-lg font-black text-cyan-300">
                            {score.toFixed(0)}%
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                            <div
                              className="h-full rounded-full bg-cyan-400"
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Medication Information (Educational Knowledge Layer) */}
          {result.medicationInformation && result.medicationInformation.length > 0 && (
            <div className="border-t border-[color:var(--border)] pt-6">
              <div className="mb-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">
                    💊 {localize("Medication Information (Educational)", "दवा संबंधी जानकारी (शैक्षणिक)")}
                  </h3>
                  <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-0.5 text-xs font-semibold text-amber-200">
                    {localize("No Prescriptions", "No Prescriptions")}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {localize(
                    "Educational knowledge regarding medication classes commonly evaluated by physicians for your vital profile.",
                    "आपकी वाइटल प्रोफाइल के लिए चिकित्सकों द्वारा सामान्यतः मूल्यांकित की जाने वाली दवा श्रेणियों के बारे में शैक्षणिक ज्ञान।"
                  )}
                </p>
              </div>

              <div className="space-y-4">
                {result.medicationInformation.map((med) => (
                  <div
                    key={med.id}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="font-bold text-base text-cyan-300">{med.title}</h4>
                      <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">{med.category}</span>
                    </div>

                    <p className="mt-2 text-sm leading-relaxed">{med.generalPurpose}</p>

                    <div className="mt-3">
                      <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
                        {localize("Common Medication Classes:", "सामान्य दवा श्रेणियां:")}
                      </p>
                      <ul className="mt-1 grid gap-1.5 md:grid-cols-2 text-xs text-[var(--muted)] font-mono">
                        {med.medicationClasses.map((cls, cIdx) => (
                          <li key={cIdx} className="flex items-center gap-2">
                            <span>•</span>
                            <span>{cls}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
                      <span className="font-bold text-amber-300">{localize("Safety Warning & Contraindications: ", "सुरक्षा चेतावनी: ")}</span>
                      {med.contraindicationsWarnings}
                    </div>

                    <p className="mt-3 text-xs italic text-cyan-200">
                      <span className="font-semibold not-italic">{localize("Discuss with your clinician: ", "डॉक्टर से चर्चा करें: ")}</span>
                      {med.clinicianDiscussionPoints}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Useful Health Information */}
          {result.usefulInformation && result.usefulInformation.length > 0 && (
            <div className="border-t border-[color:var(--border)] pt-6">
              <div className="mb-4 flex flex-col gap-1">
                <h3 className="text-xl font-bold">
                  📋 {localize("Useful Health Information", "उपयोगी स्वास्थ्य जानकारी")}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {localize(
                    "Plain-English interpretation of your submitted health metrics.",
                    "आपकी स्वास्थ्य जानकारी का सरल भाषा में विश्लेषण।"
                  )}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {result.usefulInformation.map((info, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                  >
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span className="text-cyan-300">{info.topic}</span>
                      <span className="font-mono text-xs bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full text-cyan-200">{info.value}</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                      {info.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4 items-center border-t border-[color:var(--border)] pt-6">
            <Link
              href="/"
              className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-black hover:bg-cyan-400 transition"
            >
              {localize("Back to Home", "मुख्य पृष्ठ पर जाएं")}
            </Link>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-3 font-semibold hover:bg-cyan-500/10 transition"
            >
              {localize("New Assessment", "नया आंकलन")}
            </button>
          </div>

          <p className="text-xs leading-5 text-[var(--muted)] border-t border-[color:var(--border)] pt-4">
            {localize(
              "This ML output is an educational screening prototype based on the Framingham Heart Study dataset. It is not a medical diagnosis and should not replace a qualified healthcare professional.",
              "यह ML आउटपुट Framingham Heart Study डेटासेट पर आधारित एक शैक्षणिक स्क्रीनिंग प्रोटोटाइप है। यह एक चिकित्सा निदान नहीं है और योग्य स्वास्थ्य सेवा पेशेवर का स्थान नहीं लेता है।"
            )}
          </p>
        </motion.section>
      )}
    </div>
  );
}