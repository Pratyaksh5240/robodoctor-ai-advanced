"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { analyzeHealth, parseBloodPressure } from "@/lib/healthAnalysis";
import {
  getDashboardCopy,
  localizeHealthAnalysis,
} from "@/lib/healthAnalysisI18n";
import { auth } from "@/lib/firebase";
import { loadHealthReports, saveHealthReport } from "@/lib/reportHistory";
import { Language, parseLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

function DashboardContent() {
  const params = useSearchParams();
  const language: Language = parseLanguage(params.get("language"));
  const copy = getDashboardCopy(language);
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);

  const [history, setHistory] = useState<
    Array<{
      createdAt: number;
      riskLevel: string;
      riskScore: number;
      summary: string;
      bp: string;
      sugar: string;
      heartRate: string;
    }>
  >(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const saved = localStorage.getItem("robodoctor-health-history");
    return saved
      ? (JSON.parse(saved) as Array<{
          createdAt: number;
          riskLevel: string;
          riskScore: number;
          summary: string;
          bp: string;
          sugar: string;
          heartRate: string;
        }>)
      : [];
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("");

  const age = Number(params.get("age") || 0);
  const heightCm = Number(params.get("height") || 0);
  const weightKg = Number(params.get("weight") || 0);
  const sugarValue = params.get("sugar");
  const heartRateValue = params.get("heartRate");
  const bp = params.get("bp") || "";
  const symptoms = params.get("symptoms") || "";

  const { systolic, diastolic } = parseBloodPressure(bp);

  const analysis = localizeHealthAnalysis(
    analyzeHealth({
      age,
      heightCm,
      weightKg,
      systolic,
      diastolic,
      sugar: sugarValue ? Number(sugarValue) : null,
      heartRate: heartRateValue ? Number(heartRateValue) : null,
      symptoms,
    }),
    language
  );

  const localizedRiskLevel =
    analysis.riskLevel === "Low"
      ? copy.lowRisk
      : analysis.riskLevel === "Moderate"
        ? copy.moderateRisk
        : analysis.riskLevel === "High"
          ? copy.highRisk
          : copy.emergencyRisk;
  const riskSuffix = localize("Risk", "जोखिम");

  const historyEntry = useMemo(
    () => ({
      riskLevel: `${localizedRiskLevel} ${riskSuffix}`,
      riskScore: analysis.riskScore,
      summary: analysis.summary,
      bp: bp || "-",
      sugar: sugarValue || "-",
      heartRate: heartRateValue || "-",
    }),
    [
      analysis.riskScore,
      analysis.summary,
      bp,
      sugarValue,
      heartRateValue,
      localizedRiskLevel,
      riskSuffix,
    ]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId(null);
        return;
      }

      setUserId(user.uid);

      try {
        const cloudHistory = await loadHealthReports(user.uid);
        if (cloudHistory.length > 0) {
          setHistory(cloudHistory);
        }
      } catch {
        setSaveStatus(copy.saveLocal);
      }
    });

    return () => unsubscribe();
  }, [copy.saveLocal]);

  const hasNewAssessment = Boolean(bp || sugarValue || heartRateValue || symptoms);

  const alreadySaved = history.some(
    (item) =>
      item.summary === historyEntry.summary &&
      item.bp === historyEntry.bp &&
      item.sugar === historyEntry.sugar &&
      item.heartRate === historyEntry.heartRate
  );

  const saveReport = () => {
    if (alreadySaved) {
      return;
    }

    const reportToSave = {
      ...historyEntry,
      createdAt: Date.now(),
    };

    const nextHistory = [reportToSave, ...history].slice(0, 6);
    setHistory(nextHistory);
    localStorage.setItem("robodoctor-health-history", JSON.stringify(nextHistory));
    setSaveStatus(copy.saveLocal);

    if (userId) {
      saveHealthReport(userId, reportToSave)
        .then(() => {
          setSaveStatus(
            localize(
              "Report saved to your cloud history.",
              "रिपोर्ट आपकी क्लाउड हिस्ट्री में सेव हो गई।"
            )
          );
        })
        .catch(() => {
          setSaveStatus(
            localize(
              "Cloud save failed, but the report is still saved locally.",
              "क्लाउड सेव नहीं हो पाया, लेकिन रिपोर्ट लोकल में सेव है।"
            )
          );
        });
    }
  };

  const barData = [
    { name: copy.sugar, value: sugarValue ? Number(sugarValue) : 0 },
    { name: copy.heartRate, value: heartRateValue ? Number(heartRateValue) : 0 },
    { name: localize("Systolic BP", "सिस्टोलिक बीपी"), value: systolic ?? 0 },
    {
      name: localize("BMI x10", "बीएमआई x10"),
      value: analysis.bmi ? Number((analysis.bmi * 10).toFixed(1)) : 0,
    },
  ];

  const lineData = [
    { day: localize("Baseline", "पहले"), risk: 20 },
    { day: localize("Current", "अभी"), risk: analysis.riskScore || 15 },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)] md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
          >
            {copy.backHome}
          </Link>
          <Link
            href="/health-check"
            className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-2.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/20 transition"
          >
            {localize("Vital Risk Check", "वाइटल जोखिम जांच")}
          </Link>
          <Link
            href="/skin-check"
            className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-400/20 transition"
          >
            {localize("Skin Check", "स्किन चेक")}
          </Link>
        </div>

        <h1 className="mb-3 text-4xl font-bold">{copy.title}</h1>
        <p className="mb-8 text-[var(--muted)]">{copy.subtitle}</p>

        {hasNewAssessment && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <div>
              <h3 className="font-semibold text-cyan-300">
                {localize("Save Vital Check to Report History", "वाइटल जांच रिपोर्ट हिस्ट्री में सेव करें")}
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1">
                {localize(
                  "Keep a record of your vital screening in your cloud profile or local device history.",
                  "अपनी वाइटल स्क्रीन रिकॉर्ड को प्रोफाइल या लोकल हिस्ट्री में सेव रखें।"
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveReport}
                disabled={alreadySaved}
                className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 transition"
              >
                {alreadySaved ? copy.reportSaved : copy.saveReport}
              </button>
            </div>
            {saveStatus && <p className="w-full text-xs text-[var(--muted)] mt-1">{saveStatus}</p>}
          </div>
        )}

        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6 shadow-lg">
            <h3 className="mb-6 text-xl font-semibold text-cyan-400">
              {copy.currentMetrics}
            </h3>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6 shadow-lg">
            <h3 className="mb-6 text-xl font-semibold text-cyan-400">
              {copy.riskTrend}
            </h3>

            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="risk"
                  stroke={analysis.riskColor}
                  strokeWidth={3}
                  dot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-semibold text-cyan-400">
            {copy.reports}
          </h2>
          {history.length === 0 ? (
            <p className="text-[var(--muted)]">{copy.noReports}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {history.map((item) => (
                <div
                  key={`${item.createdAt}-${item.summary}`}
                  className="rounded-2xl border border-[color:var(--border)] bg-black/20 p-5 transition hover:border-cyan-500/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-cyan-300">{item.riskLevel}</p>
                    <span className="text-xs text-[var(--muted)] font-mono">{item.riskScore}/100</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--foreground)] leading-relaxed">{item.summary}</p>
                  <p className="mt-3 text-xs text-[var(--muted)] border-t border-[color:var(--border)] pt-2">
                    BP {item.bp} | {copy.sugar} {item.sugar} | {copy.heartRate}{" "}
                    {item.heartRate}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)] md:p-10">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-8 text-[var(--muted)]">
              {translateUi("Loading dashboard...", "en")}
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
