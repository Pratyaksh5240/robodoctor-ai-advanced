"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";

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
    setCp(4); // Asymptomatic / ischemic equivalent
    setTrestbps(150);
    setChol(275);
    setFbs(true);
    setRestecg(2); // LV hypertrophy
    setThalach(125); // Lower peak HR
    setExang(true); // Exercise angina
    setOldpeak(2.6); // 2.6 mm ST depression
    setSlope(2); // Flat ST
    setCa(2); // 2 vessels stenosed
    setThal(7); // Reversible defect
    setError(null);
  };

  const loadLowRiskPreset = () => {
    setAge(38);
    setSex("0");
    setCp(2); // Atypical angina
    setTrestbps(116);
    setChol(185);
    setFbs(false);
    setRestecg(0); // Normal ECG
    setThalach(172); // Excellent peak HR
    setExang(false); // No exercise angina
    setOldpeak(0.0); // No ST depression
    setSlope(1); // Normal upsloping
    setCa(0); // 0 vessels
    setThal(3); // Normal thallium
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
      setError(err.message || "Failed to calculate CAD diagnostic assessment.");
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
              CAD Angiography Screener
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/health-check"
              className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              10-Yr Framingham Screener
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
              <span>Gold-Standard Cleveland Angiographic Benchmark</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              <span>88.52% Validated Accuracy</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Coronary Artery Disease (CAD) Diagnostic Screening
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Trained on clinically verified cardiac catheterization outcomes (fluoroscopy and coronary angiography). 
              Detects present hemodynamically significant stenosis (&gt;50% arterial luminal narrowing) with 
              <strong className="text-white"> 88.52% accuracy</strong>, <strong className="text-white">95.24% ROC-AUC</strong>, and <strong className="text-white">92.86% clinical sensitivity</strong>.
            </p>

            {/* Benchmark stats */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase font-medium">Test Accuracy</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-400">88.52%</div>
                <div className="text-[10px] text-slate-400">Held-out cohort (54/61)</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase font-medium">ROC-AUC</div>
                <div className="text-xl sm:text-2xl font-black text-blue-400">95.24%</div>
                <div className="text-[10px] text-slate-400">Near-perfect separation</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase font-medium">CAD Sensitivity</div>
                <div className="text-xl sm:text-2xl font-black text-rose-400">92.86%</div>
                <div className="text-[10px] text-slate-400">26 of 28 CAD caught</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center">
                <div className="text-xs text-slate-400 uppercase font-medium">Ensemble</div>
                <div className="text-base sm:text-lg font-bold text-amber-300 mt-1">RF + GB + LR</div>
                <div className="text-[10px] text-slate-400">Calibrated soft voting</div>
              </div>
            </div>
          </div>
        </div>

        {/* Preset Quick-Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            Quick Clinical Test Profiles:
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadHighRiskPreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 transition"
            >
              Load Confirmed CAD Case (~97% Risk)
            </button>
            <button
              type="button"
              onClick={loadLowRiskPreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition"
            >
              Load Healthy Non-CAD Case (~4% Risk)
            </button>
            <button
              type="button"
              onClick={loadBaselinePreset}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Reset to Baseline
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
                  <h2 className="text-base font-bold">Demographics & Resting Hemodynamics</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Patient Age (Years)
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
                      Biological Sex
                    </label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value="1">Male (Higher baseline risk)</option>
                      <option value="0">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Resting Blood Pressure (mm Hg)
                    </label>
                    <input
                      type="number"
                      min={80}
                      max={220}
                      value={trestbps}
                      onChange={(e) => setTrestbps(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400">Normal: 120 mm Hg</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Serum Total Cholesterol (mg/dL)
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={600}
                      value={chol}
                      onChange={(e) => setChol(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-400">Optimal: &lt;200 mg/dL</span>
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
                      Fasting Blood Sugar &gt; 120 mg/dL (Diabetic / Impaired fasting glucose)
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
                  <h2 className="text-base font-bold">Chest Pain & Resting ECG</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Chest Pain Type (Anginal Classification)
                    </label>
                    <select
                      value={cp}
                      onChange={(e) => setCp(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                    >
                      <option value={1}>Type 1: Typical Angina (Exertional, relieved by rest/nitrates)</option>
                      <option value={2}>Type 2: Atypical Angina (Atypical chest discomfort)</option>
                      <option value={3}>Type 3: Non-Anginal Pain (Musculoskeletal / gastrointestinal)</option>
                      <option value={4}>Type 4: Asymptomatic / Silent Ischemia Equivalent</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Resting ECG Assessment
                      </label>
                      <select
                        value={restecg}
                        onChange={(e) => setRestecg(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value={0}>0: Normal Resting ECG</option>
                        <option value={1}>1: ST-T Wave Abnormality (T inversion / ST elevation)</option>
                        <option value={2}>2: Left Ventricular Hypertrophy (Estes criteria)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Maximum Achieved Heart Rate (bpm)
                      </label>
                      <input
                        type="number"
                        min={60}
                        max={220}
                        value={thalach}
                        onChange={(e) => setThalach(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400">Peak HR during stress testing</span>
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
                  <h2 className="text-base font-bold">Stress Testing & Angiographic Indicators</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Exercise-Induced Angina
                      </label>
                      <select
                        value={exang ? "1" : "0"}
                        onChange={(e) => setExang(e.target.value === "1")}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value="0">No (Exercise tolerated without angina)</option>
                        <option value="1">Yes (Exertional chest tightness induced)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Exercise ST Depression (oldpeak, mm)
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
                      <span className="text-[11px] text-slate-400">&gt;=1.0 mm indicates myocardial ischemia</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Peak ST Slope
                      </label>
                      <select
                        value={slope}
                        onChange={(e) => setSlope(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value={1}>1: Upsloping (Normal)</option>
                        <option value={2}>2: Flat (Ischemic)</option>
                        <option value={3}>3: Downsloping (Severe)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Major Vessels Colored (ca)
                      </label>
                      <select
                        value={ca}
                        onChange={(e) => setCa(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value={0}>0 vessels (Clear fluoroscopy)</option>
                        <option value={1}>1 vessel (Single-vessel disease)</option>
                        <option value={2}>2 vessels (Bi-vessel disease)</option>
                        <option value={3}>3 vessels (Triple-vessel disease)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Thallium Scintigraphy
                      </label>
                      <select
                        value={thal}
                        onChange={(e) => setThal(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        <option value={3}>3: Normal Perfusion</option>
                        <option value={6}>6: Fixed Defect (Prior Infarct)</option>
                        <option value={7}>7: Reversible Defect (Ischemia)</option>
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
                    <span>Evaluating Coronary Angiography Markers...</span>
                  </span>
                ) : (
                  "Execute CAD Diagnostic Screening (88.52% Accuracy)"
                )}
              </button>
            </form>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                <strong>Assessment Error:</strong> {error}
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
                      {result.risk_level} CAD Risk Tier
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Model Conf: {result.confidence}%
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                      Diagnostic Probability of Stenosis (&gt;50%)
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
                        {result.cad_presence ? "Significant CAD Detected" : "CAD Unlikely / Normal"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-medium leading-relaxed">
                    {result.diagnostic_assessment}
                  </div>

                  <div className="mt-4 text-xs text-slate-600 dark:text-slate-400">
                    <strong>Triage:</strong> {result.triage_guidance}
                  </div>
                </div>

                {/* Top Contributing Biological Factors */}
                {result.key_factors && result.key_factors.length > 0 && (
                  <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Top Diagnostic Biomarkers
                    </h3>
                    <div className="space-y-3">
                      {result.key_factors.slice(0, 5).map((factor, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {factor.label}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                                factor.direction === "higher"
                                  ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                                  : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {factor.direction === "higher" ? "+ Increases Risk" : "- Lowers Risk"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                            {factor.explanation}
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
                      Cardiology Care Recommendations
                    </h3>
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {result.clinical_recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="text-red-500 font-bold mt-0.5">•</span>
                          <span>{rec}</span>
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
                <h3 className="text-lg font-bold">Ready for CAD Diagnostic Evaluation</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Enter the patient hemodynamic and stress-test data or select one of the pre-filled clinical profiles above, then click <strong>Execute CAD Diagnostic Screening</strong>.
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-left text-xs space-y-2">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Why Angiographic CAD achieves 88.52% Accuracy:
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Unlike 10-year epidemiological forecasts (Framingham) where unpredictable lifestyle changes over a decade introduce high Bayes noise, this model evaluates <em>present coronary lumen narrowing</em> using high-resolution stress ECG and fluoroscopy markers.
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
