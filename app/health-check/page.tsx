"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

type RiskResult = {
  risk: "Low" | "Moderate" | "High";
  probabilities: {
    Low: number;
    Moderate: number;
    High: number;
  };
  bmi: number;
  priorityFinding?: PriorityFinding | null;
  recommendations: Array<string | RecommendationCardItem>;
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
  });

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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setResult(null);
    setError("");

    setFormData((current) => ({
      ...current,
      [e.target.name]: e.target.value,
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
    const heartRate = formData.heartRate
      ? Number(formData.heartRate)
      : null;

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

    // ML model currently expects the full Vital Check input set.
    if (!formData.bp || sugar === null || heartRate === null) {
      setError(
        localize(
          "For the ML risk assessment, please enter blood pressure, blood sugar, and heart rate.",
          "ML risk assessment के लिए कृपया ब्लड प्रेशर, ब्लड शुगर और हार्ट रेट दर्ज करें।"
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
              "Unable to complete the ML health assessment.",
              "ML health assessment पूरा नहीं हो पाया।"
            )
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const continueToDashboard = () => {
    const query = new URLSearchParams({
      ...formData,
      language,
      risk: result?.risk ?? "",
      bmi: result?.bmi?.toFixed(1) ?? "",
    }).toString();

    router.push(`/dashboard?${query}`);
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
                "For the ML risk assessment, accurate BP, sugar, and heart-rate readings are needed.",
                "ML risk assessment के लिए सही BP, शुगर और हार्ट रेट की रीडिंग जरूरी है।"
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
              "The ML assessment needs these readings. Please measure them before running the new Vital Risk model.",
              "नए ML Vital Risk model को इन readings की जरूरत है। Analyze करने से पहले इन्हें मापें।"
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
            placeholder="25"
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
            placeholder="120/80"
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
            rows={4}
            placeholder="fever, cough, fatigue"
            className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3"
          />
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
            className="rounded-xl bg-cyan-500 px-8 py-4 font-semibold text-black hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing
              ? localize("Analyzing with ML...", "ML से analyze हो रहा है...")
              : t.analyze}
          </button>
        </div>
      </form>

      {result && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 rounded-3xl border border-cyan-400/20 bg-[color:var(--surface-strong)] p-6 md:p-8"
        >
          {result.priorityFinding && (
            <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/15 p-5 text-red-100">
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
            <div className="mb-6 rounded-2xl border border-red-500/40 bg-red-500/15 p-5 text-red-200">
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

          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] font-semibold text-cyan-300">
                {localize("ML Risk Assessment", "ML Risk Assessment")}
              </p>

              <h2 className="mt-2 text-4xl font-black uppercase">
                {result.risk}
              </h2>

              <p className="mt-2 text-[var(--muted)]">
                {result.message}
              </p>

              <p className="mt-3 text-sm font-medium text-[var(--muted)]">
                BMI: {result.bmi.toFixed(1)}
              </p>
            </div>

            <div
              className={`rounded-2xl px-6 py-5 text-center font-bold ${
                result.risk === "High"
                  ? "bg-red-500/20 text-red-200 border border-red-500/30"
                  : result.risk === "Moderate"
                    ? "bg-amber-500/20 text-amber-200 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
              }`}
            >
              <div className="text-3xl font-black">
                {result.probabilities[result.risk].toFixed(1)}%
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider font-semibold">
                {localize(
                  `${result.risk.toUpperCase()}-RISK PROBABILITY`,
                  `${result.risk.toUpperCase()}-RISK PROBABILITY`
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-[color:var(--border)] pt-6">
            <h3 className="text-lg font-bold mb-4">
              {localize("Risk Probabilities", "Risk Probabilities")}
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              {(
                [
                  ["Low", result.probabilities.Low],
                  ["Moderate", result.probabilities.Moderate],
                  ["High", result.probabilities.High],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4"
                >
                  <div className="flex justify-between font-medium">
                    <span>{label}</span>
                    <span>{value.toFixed(1)}%</span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        label === "High"
                          ? "bg-red-400"
                          : label === "Moderate"
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.min(value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-[color:var(--border)] pt-6">
            <div className="flex flex-col gap-1 mb-6">
              <h3 className="text-xl font-bold">
                {localize("Personalized Recommendations", "Personalized Recommendations")}
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
                            {localize("Recommendation Relevance", "Relevance")}
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

          <div className="mt-8 flex flex-wrap gap-4 items-center">
            <button
              type="button"
              onClick={continueToDashboard}
              className="rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-black hover:bg-cyan-400 transition"
            >
              {localize("Continue to Dashboard", "Dashboard पर जाएं")}
            </button>
          </div>

          <p className="mt-6 text-xs leading-5 text-[var(--muted)] border-t border-[color:var(--border)] pt-4">
            {localize(
              "This ML output is a screening prototype trained on synthetic data. It is not a medical diagnosis and should not replace a healthcare professional.",
              "यह ML output synthetic data पर trained screening prototype है। यह medical diagnosis नहीं है और healthcare professional की सलाह का विकल्प नहीं है।"
            )}
          </p>
        </motion.section>
      )}
    </div>
  );
}