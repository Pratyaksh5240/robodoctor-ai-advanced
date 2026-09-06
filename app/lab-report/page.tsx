"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { useLocalize } from "@/app/context/LanguageContext";
import {
  evaluateLabForm,
  LabFormValues,
  LabGender,
  LabMetricEvaluation,
} from "@/lib/labEvaluator";
import {
  getUserProfile,
  saveLabReport,
  UserProfileRecord,
} from "@/lib/reportHistory";

const initialForm: LabFormValues = {
  fastingSugar: "",
  hba1c: "",
  hemoglobin: "",
  tsh: "",
  cholesterol: "",
  creatinine: "",
  platelets: "",
  wbc: "",
};

const toneCardStyles = {
  typo: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  critical: "border-rose-500/50 bg-rose-950/40 text-rose-100 ring-1 ring-rose-500/30",
  high: "border-rose-400/30 bg-rose-500/10 text-rose-100",
  medium: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  low: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
};

const badgeStyles = {
  typo: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  critical: "bg-rose-600/30 text-rose-200 border-rose-500 animate-pulse",
  high: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
};

export default function LabReportPage() {
  const localize = useLocalize();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [gender, setGender] = useState<LabGender>("male");
  const [form, setForm] = useState<LabFormValues>(initialForm);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync auth profile to pre-fill gender if available
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      if (currUser) {
        const profile = await getUserProfile(currUser.uid);
        if (profile) {
          setUserProfile(profile);
          if (profile.gender === "female" || profile.gender === "male") {
            setGender(profile.gender);
          }
        }
      }
    });
    return () => unsub();
  }, []);

  const analysis = useMemo(() => {
    return evaluateLabForm(form, gender);
  }, [form, gender]);

  const hasInputs = useMemo(() => {
    return Object.values(form).some((val) => val && val.trim() !== "");
  }, [form]);

  // Handle Preset Clicks
  const applyPreset = (preset: "healthy" | "anemia" | "diabetes" | "hypothyroid" | "polycythemia" | "typo") => {
    setSavedSuccess(false);
    switch (preset) {
      case "healthy":
        setForm({
          fastingSugar: "88",
          hba1c: "5.2",
          hemoglobin: gender === "female" ? "13.6" : "15.0",
          tsh: "2.1",
          cholesterol: "175",
          creatinine: gender === "female" ? "0.8" : "0.95",
          platelets: "260",
          wbc: "7.2",
        });
        break;
      case "anemia":
        setForm({
          fastingSugar: "92",
          hba1c: "5.1",
          hemoglobin: "8.4",
          tsh: "1.9",
          cholesterol: "160",
          creatinine: "0.8",
          platelets: "390",
          wbc: "6.5",
        });
        break;
      case "diabetes":
        setForm({
          fastingSugar: "188",
          hba1c: "8.9",
          hemoglobin: "14.0",
          tsh: "2.5",
          cholesterol: "248",
          creatinine: "1.15",
          platelets: "280",
          wbc: "8.5",
        });
        break;
      case "hypothyroid":
        setForm({
          fastingSugar: "96",
          hba1c: "5.4",
          hemoglobin: "11.6",
          tsh: "13.8",
          cholesterol: "262",
          creatinine: "1.0",
          platelets: "210",
          wbc: "5.8",
        });
        break;
      case "polycythemia":
        setForm({
          fastingSugar: "94",
          hba1c: "5.3",
          hemoglobin: "19.4",
          tsh: "2.0",
          cholesterol: "195",
          creatinine: "1.05",
          platelets: "340",
          wbc: "8.9",
        });
        break;
      case "typo":
        setForm({
          fastingSugar: "999",
          hba1c: "28.5",
          hemoglobin: "199",
          tsh: "250",
          cholesterol: "880",
          creatinine: "35",
          platelets: "2500",
          wbc: "150",
        });
        break;
    }
  };

  const handleClear = () => {
    setForm(initialForm);
    setSavedSuccess(false);
  };

  // Copy Summary to clipboard
  const handleCopySummary = async () => {
    if (!hasInputs) return;
    const lines = [
      "RoboDoctor Clinical Lab Summary",
      `Biological Sex: ${gender.toUpperCase()}`,
      `Overall Status: ${analysis.overallStatus.toUpperCase()}`,
      `Summary: ${analysis.summaryEn}`,
      "",
      "Evaluated Values:",
    ];
    for (const ev of analysis.evaluations) {
      lines.push(`- ${ev.nameEn}: ${ev.formattedValue} [${ev.badgeLabelEn}] (Ref: ${ev.referenceRangeText})`);
    }
    if (analysis.suggestedSpecialists.length > 0) {
      lines.push("");
      lines.push(`Suggested Follow-up: ${analysis.suggestedSpecialists.join(", ")}`);
    }

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  // Save to Medical History
  const handleSaveReport = async () => {
    if (!hasInputs || saving) return;
    setSaving(true);
    try {
      const targetId = user ? user.uid : "guest";
      await saveLabReport(targetId, {
        createdAt: Date.now(),
        gender,
        fastingSugar: form.fastingSugar,
        hba1c: form.hba1c,
        hemoglobin: form.hemoglobin,
        tsh: form.tsh,
        cholesterol: form.cholesterol,
        creatinine: form.creatinine,
        platelets: form.platelets,
        wbc: form.wbc,
        overallStatus: analysis.overallStatus,
        summary: analysis.summaryEn,
        findingsCount: analysis.evaluations.length,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save lab report", err);
    } finally {
      setSaving(false);
    }
  };

  // Form field definitions with badges and info
  const fieldList: {
    key: keyof LabFormValues;
    labelEn: string;
    labelHi: string;
    unit: string;
    step: string;
    placeholder: string;
    refInfo: string;
  }[] = [
    {
      key: "hemoglobin",
      labelEn: "Hemoglobin",
      labelHi: "हीमोग्लोबिन",
      unit: "g/dL",
      step: "0.1",
      placeholder: "e.g. 14.5",
      refInfo: gender === "male" ? "Ref: 13.8 – 17.5 g/dL (Male) | Bound: 3.0 – 25.0" : "Ref: 12.0 – 15.5 g/dL (Female) | Bound: 3.0 – 25.0",
    },
    {
      key: "fastingSugar",
      labelEn: "Fasting Blood Glucose",
      labelHi: "फास्टिंग ब्लड ग्लूकोज",
      unit: "mg/dL",
      step: "1",
      placeholder: "e.g. 95",
      refInfo: "Normal: 70 – 99 mg/dL | Bound: 20 – 750",
    },
    {
      key: "hba1c",
      labelEn: "HbA1c (Glycated Hb)",
      labelHi: "HbA1c (ग्लाइकेटेड हीमोग्लोबिन)",
      unit: "%",
      step: "0.1",
      placeholder: "e.g. 5.4",
      refInfo: "Normal: < 5.7% | Prediabetes: 5.7 – 6.4% | Bound: 3 – 20%",
    },
    {
      key: "tsh",
      labelEn: "TSH (Thyroid)",
      labelHi: "TSH (थायरॉयड हार्मोन)",
      unit: "mIU/L",
      step: "0.01",
      placeholder: "e.g. 2.1",
      refInfo: "Normal: 0.4 – 4.5 mIU/L | Bound: 0.01 – 150",
    },
    {
      key: "cholesterol",
      labelEn: "Total Cholesterol",
      labelHi: "कुल कोलेस्ट्रॉल",
      unit: "mg/dL",
      step: "1",
      placeholder: "e.g. 185",
      refInfo: "Desirable: < 200 mg/dL | Bound: 50 – 650",
    },
    {
      key: "creatinine",
      labelEn: "Serum Creatinine (Renal)",
      labelHi: "सीरम क्रिएटिनिन (किडनी)",
      unit: "mg/dL",
      step: "0.05",
      placeholder: "e.g. 0.9",
      refInfo: gender === "male" ? "Normal: 0.7 – 1.3 mg/dL (Male)" : "Normal: 0.5 – 1.1 mg/dL (Female)",
    },
    {
      key: "platelets",
      labelEn: "Platelet Count",
      labelHi: "प्लेटलेट काउंट",
      unit: "× 10³/µL",
      step: "1",
      placeholder: "e.g. 250",
      refInfo: "Normal: 150 – 450 × 10³/µL (1.5–4.5 Lakhs)",
    },
    {
      key: "wbc",
      labelEn: "WBC Count (TLC)",
      labelHi: "WBC काउंट (ल्यूकोसाइट)",
      unit: "× 10³/µL",
      step: "0.1",
      placeholder: "e.g. 7.5 or 7500",
      refInfo: "Normal: 4.0 – 11.0 × 10³/µL (4,000–11,000)",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] md:px-10 md:py-12">
      <div className="mx-auto max-w-7xl">
        {/* Top Header */}
        <div className="mb-8 flex flex-col gap-4 border-b border-[color:var(--border)] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                🔬 {localize("Clinical Lab Engine v2.0", "क्लिनिकल लैब इंजन v2.0")}
              </span>
              <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                🛡️ {localize("Typo Bounds & Staging Active", "टाइपो सुरक्षा व स्टेजिंग सक्रिय")}
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black md:text-4xl lg:text-5xl">
              {localize("Advanced Lab Report Analyzer", "उन्नत क्लिनिकल लैब विश्लेषक")}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)] md:text-base">
              {localize(
                "Enter routine blood chemistry and CBC values to obtain immediate multi-stage clinical staging, physiological limit validation, dynamic range meters, and targeted nutritional advice.",
                "रक्त जांच और सीबीसी मान दर्ज करें और तुरंत बहु-स्तरीय क्लिनिकल स्टेजिंग, शारीरिक सीमा सत्यापन, डायनामिक रेंज मीटर और लक्षित पोषण सलाह प्राप्त करें।"
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/export-report"
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
            >
              📄 {localize("SBAR PDF Export", "क्लिनिकल PDF एक्सपोर्ट")}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--foreground)] hover:opacity-90 transition"
            >
              {localize("Back Home", "होम वापस")}
            </Link>
          </div>
        </div>

        {/* Biological Sex Toggle & Preset Buttons Strip */}
        <div className="mb-8 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4 md:p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Biological Sex Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {localize("Biological Sex:", "जैविक लिंग:")}
              </span>
              <div className="inline-flex rounded-xl bg-slate-900/80 p-1 border border-slate-700/70">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    gender === "male"
                      ? "bg-cyan-500 text-slate-950 shadow-sm"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <span>♂</span>
                  <span>{localize("Male (Adult)", "पुरुष (वयस्क)")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                    gender === "female"
                      ? "bg-pink-500 text-white shadow-sm"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  <span>♀</span>
                  <span>{localize("Female (Adult)", "महिला (वयस्क)")}</span>
                </button>
              </div>
            </div>

            {/* Quick Sample Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                {localize("Quick Presets:", "त्वरित उदाहरण:")}
              </span>
              <button
                type="button"
                onClick={() => applyPreset("healthy")}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
              >
                🌟 {localize("Healthy Checkup", "स्वस्थ जांच")}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("anemia")}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
              >
                🩸 {localize("Low Hb (Anemia)", "एनीमिया (कम Hb)")}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("polycythemia")}
                className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition"
              >
                ⚠️ {localize("High Hb (19.4)", "उच्च Hb (19.4)")}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("diabetes")}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
              >
                🍬 {localize("Diabetic Pattern", "डायबिटीज")}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("hypothyroid")}
                className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition"
              >
                🦋 {localize("Thyroid Issue", "थायरॉयड")}
              </button>
              <button
                type="button"
                onClick={() => applyPreset("typo")}
                className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-2.5 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/50 transition"
                title="Test typing 199 for Hb and 999 for sugar"
              >
                ❌ {localize("Typo Test (Hb: 199)", "टाइपो टेस्ट (Hb: 199)")}
              </button>
              {hasInputs && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
                >
                  🧹 {localize("Clear", "साफ करें")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid: Left Inputs / Right Analysis */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Form Inputs (5 cols on lg) */}
          <section className="lg:col-span-5 space-y-4">
            <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-4 mb-5">
                <div>
                  <h2 className="text-xl font-black md:text-2xl">
                    {localize("Patient Lab Inputs", "रोगी लैब आंकड़े")}
                  </h2>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    {localize("Enter values from your printed lab slip", "अपनी लैब पर्ची से आंकड़े दर्ज करें")}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {analysis.evaluations.length}/8 {localize("Active", "दर्ज")}
                </span>
              </div>

              <div className="space-y-4">
                {fieldList.map((f) => {
                  const ev = analysis.evaluations.find((e) => e.key === f.key);
                  const isTypo = ev?.isTypo;
                  const hasVal = form[f.key].trim() !== "";

                  return (
                    <div
                      key={f.key}
                      className={`rounded-2xl border p-3.5 transition ${
                        isTypo
                          ? "border-rose-500/60 bg-rose-950/20"
                          : ev?.isCritical
                          ? "border-rose-500/40 bg-rose-500/5"
                          : hasVal
                          ? "border-slate-700 bg-[color:var(--surface-strong)]"
                          : "border-slate-800 bg-[color:var(--surface-strong)]/60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor={f.key}
                          className="text-xs font-bold text-slate-200"
                        >
                          {localize(f.labelEn, f.labelHi)}
                        </label>
                        {ev && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                              badgeStyles[ev.tone]
                            }`}
                          >
                            {localize(ev.badgeLabelEn, ev.badgeLabelHi)}
                          </span>
                        )}
                      </div>

                      <div className="relative flex items-center">
                        <input
                          id={f.key}
                          value={form[f.key]}
                          onChange={(e) => {
                            setSavedSuccess(false);
                            setForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                          }}
                          type="number"
                          step={f.step}
                          placeholder={f.placeholder}
                          className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold outline-none transition ${
                            isTypo
                              ? "border-rose-500 bg-rose-950/40 text-rose-100 placeholder-rose-400/50"
                              : "border-[color:var(--border)] bg-slate-900 text-slate-100 placeholder-slate-500 focus:border-cyan-400"
                          }`}
                        />
                        <span className="absolute right-3 text-xs font-bold text-slate-400">
                          {f.unit}
                        </span>
                      </div>

                      {/* Visual Range Meter Bar (rendered when input exists) */}
                      {ev && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                          {/* Segmented meter bar */}
                          <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                            {ev.gaugeZones.map((z, idx) => {
                              const widthPct = z.maxPercent - z.minPercent;
                              return (
                                <div
                                  key={idx}
                                  style={{ width: `${widthPct}%` }}
                                  className={`h-full ${z.color} opacity-70`}
                                  title={z.label}
                                />
                              );
                            })}
                            {/* Marker Pin */}
                            <div
                              style={{ left: `${ev.gaugePercent}%` }}
                              className="absolute top-0 bottom-0 w-1.5 -ml-0.5 bg-white shadow-md ring-2 ring-slate-950 rounded-full"
                            />
                          </div>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="truncate">{f.refInfo}</span>
                            <span className="font-bold text-slate-300">
                              {ev.formattedValue}
                            </span>
                          </div>
                        </div>
                      )}

                      {!ev && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          {f.refInfo}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Right Column: Interpretation, Warnings, Advice & Action (7 cols on lg) */}
          <section className="lg:col-span-7 space-y-5">
            {/* Overall Status Banner */}
            <div
              className={`rounded-[28px] border p-6 shadow-sm transition ${
                analysis.typos.length > 0
                  ? "border-amber-500/50 bg-amber-500/10"
                  : analysis.criticals.length > 0
                  ? "border-rose-500/60 bg-rose-950/40"
                  : analysis.abnormals.length > 0
                  ? "border-amber-400/40 bg-amber-500/10"
                  : hasInputs
                  ? "border-emerald-400/40 bg-emerald-500/10"
                  : "border-[color:var(--border)] bg-[color:var(--surface)]"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {analysis.typos.length > 0
                        ? "⚠️"
                        : analysis.criticals.length > 0
                        ? "🚨"
                        : analysis.abnormals.length > 0
                        ? "📋"
                        : hasInputs
                        ? "✅"
                        : "ℹ️"}
                    </span>
                    <h2 className="text-xl font-black md:text-2xl">
                      {analysis.typos.length > 0
                        ? localize("Typo / Physiological Bound Warning", "टाइपो या शारीरिक सीमा चेतावनी")
                        : analysis.criticals.length > 0
                        ? localize("Critical Clinical Alert", "अति गंभीर क्लिनिकल चेतावनी")
                        : analysis.abnormals.length > 0
                        ? localize("Medical Review Recommended", "डॉक्टर समीक्षा अनुशंसित")
                        : hasInputs
                        ? localize("All Values In Reference Range", "सभी मान सामान्य सीमा में हैं")
                        : localize("Awaiting Lab Values", "लैब आंकड़ों की प्रतीक्षा")}
                    </h2>
                  </div>
                  <p className="mt-2 text-xs md:text-sm leading-relaxed text-slate-300">
                    {localize(analysis.summaryEn, analysis.summaryHi)}
                  </p>
                </div>

                {/* Persistence & Copy Buttons */}
                {hasInputs && (
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSaveReport}
                      disabled={saving}
                      className="rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 transition flex items-center justify-center gap-1.5"
                    >
                      <span>{savedSuccess ? "✓" : "💾"}</span>
                      <span>
                        {savedSuccess
                          ? localize("Saved!", "सहेज लिया!")
                          : saving
                          ? localize("Saving...", "सहेज रहे हैं...")
                          : localize("Save to History", "रिकॉर्ड में सहेजें")}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                    >
                      <span>{copied ? "✓" : "📋"}</span>
                      <span>
                        {copied
                          ? localize("Copied!", "कॉपी हो गया!")
                          : localize("Copy Summary", "समरी कॉपी करें")}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Suggested Specialists Tag Strip */}
              {analysis.suggestedSpecialists.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {localize("Recommended Specialists:", "अनुशंसित विशेषज्ञ:")}
                  </span>
                  {analysis.suggestedSpecialists.map((spec) => (
                    <span
                      key={spec}
                      className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300"
                    >
                      👨‍⚕️ {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Findings List (Organized by Severity) */}
            <div className="space-y-4">
              {analysis.evaluations.length === 0 ? (
                <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-center text-[var(--muted)]">
                  <div className="text-4xl mb-3">🧪</div>
                  <h3 className="text-lg font-bold text-slate-200">
                    {localize("No lab values entered yet", "अभी कोई मान दर्ज नहीं किया गया है")}
                  </h3>
                  <p className="mt-1 text-xs max-w-md mx-auto">
                    {localize(
                      "Enter hemoglobin, fasting sugar, HbA1c, thyroid, or cholesterol on the left, or pick a 1-click preset above to test the evaluation engine.",
                      "बाईं ओर हीमोग्लोबिन, शुगर, थायरॉयड या कोलेस्ट्रॉल दर्ज करें या इंजन का परीक्षण करने के लिए ऊपर दिए गए उदाहरण पर क्लिक करें।"
                    )}
                  </p>
                </div>
              ) : (
                analysis.evaluations.map((ev) => (
                  <div
                    key={ev.key}
                    className={`rounded-[24px] border p-5 shadow-sm transition ${
                      toneCardStyles[ev.tone]
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                            {localize(ev.nameEn, ev.nameHi)}
                          </span>
                          <span className="font-mono text-xs font-bold opacity-90">
                            ({ev.formattedValue})
                          </span>
                        </div>
                        <h3 className="mt-1 text-lg font-bold">
                          {localize(ev.titleEn, ev.titleHi)}
                        </h3>
                      </div>
                      <span
                        className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${
                          badgeStyles[ev.tone]
                        }`}
                      >
                        {localize(ev.badgeLabelEn, ev.badgeLabelHi)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs md:text-sm leading-relaxed opacity-95">
                      {localize(ev.detailEn, ev.detailHi)}
                    </p>

                    {/* Action Guideline */}
                    <div className="mt-3.5 rounded-xl bg-black/20 p-3 border border-white/10 flex items-start gap-2">
                      <span className="text-sm shrink-0">💡</span>
                      <div className="text-xs font-medium leading-relaxed">
                        <span className="font-bold">
                          {localize("Recommended Action: ", "अनुशंसित कार्रवाई: ")}
                        </span>
                        <span>{localize(ev.actionEn, ev.actionHi)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Targeted Dietary & Lifestyle Rx Guidance */}
            {analysis.dietRecommendations.length > 0 && (
              <div className="rounded-[28px] border border-cyan-500/30 bg-slate-900/90 p-6 space-y-4">
                <div className="flex items-center gap-2 font-bold text-sm text-cyan-300 uppercase tracking-wide">
                  <span>🥗</span>
                  <span>
                    {localize(
                      "Personalized Dietary & Lifestyle Guidance",
                      "व्यक्तिगत आहार और जीवनशैली सलाह"
                    )}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {analysis.dietRecommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-700 bg-slate-950 p-4 space-y-2"
                    >
                      <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                        <span className="text-cyan-400">●</span>
                        <span>{localize(rec.titleEn, rec.titleHi)}</span>
                      </h4>
                      <ul className="space-y-1.5 text-[11px] text-slate-300 list-disc list-inside">
                        {rec.tipsEn.map((tip, tIdx) => (
                          <li key={tIdx} className="leading-relaxed">
                            {localize(tip, rec.tipsHi[tIdx] || tip)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Next Steps */}
            <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 space-y-3">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[var(--muted)]">
                <span>🔗</span>
                <span>
                  {localize("Connected Care Modules", "जुड़े हुए स्वास्थ्य मॉड्यूल्स")}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link
                  href="/diet-planner"
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 hover:border-cyan-400 transition group"
                >
                  <div className="text-base mb-1">🥗</div>
                  <div className="font-bold text-xs text-slate-200 group-hover:text-cyan-300">
                    {localize("Diet Planner", "डाइट प्लानर")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {localize("Custom nutrition meals", "अनुकूलित पोषण आहार")}
                  </div>
                </Link>

                <Link
                  href="/medicine-reminder"
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 hover:border-cyan-400 transition group"
                >
                  <div className="text-base mb-1">⏰</div>
                  <div className="font-bold text-xs text-slate-200 group-hover:text-cyan-300">
                    {localize("Med Reminders", "दवा रिमाइंडर")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {localize("Routine check reminders", "समय पर जांच अलर्ट")}
                  </div>
                </Link>

                <Link
                  href="/health-check"
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 hover:border-cyan-400 transition group"
                >
                  <div className="text-base mb-1">💓</div>
                  <div className="font-bold text-xs text-slate-200 group-hover:text-cyan-300">
                    {localize("Vital CVD Risk", "हृदय जोखिम जांच")}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {localize("Framingham risk score", "फ्रेमिंगहैम जोखिम स्कोर")}
                  </div>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-12">
        <MedicalDisclaimer />
      </div>
    </div>
  );
}
