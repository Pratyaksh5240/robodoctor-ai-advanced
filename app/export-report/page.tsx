"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, onAuthStateChanged, User } from "@/lib/auth";
import { useLanguage, useLocalize } from "@/app/context/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import {
  generateSampleSbarData,
  mapRecordsToSbar,
  SbarExportMode,
  SbarReportData,
} from "@/lib/reportGenerator";
import {
  getUserProfile,
  HealthReportRecord,
  loadHealthReportsPage,
  loadSkinReportsPage,
  saveUserProfile,
  SkinReportRecord,
  UserProfileRecord,
  getConditions,
  getFamilyHistory,
  PatientConditionRecord,
  FamilyHistoryRecord,
} from "@/lib/reportHistory";

export default function ExportReportPage() {
  const { language } = useLanguage();
  const localize = useLocalize();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthReports, setHealthReports] = useState<HealthReportRecord[]>([]);
  const [skinReports, setSkinReports] = useState<SkinReportRecord[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfileRecord | null>(null);
  const [conditions, setConditions] = useState<PatientConditionRecord[]>([]);
  const [familyHistory, setFamilyHistory] = useState<FamilyHistoryRecord[]>([]);
  const [adherenceSummary, setAdherenceSummary] = useState<SbarReportData["medicationAdherenceSummary"] | null>(null);

  const [exportMode, setExportMode] = useState<SbarExportMode>("vitals_only");
  const [selectedHealthIndex, setSelectedHealthIndex] = useState(0);
  const [selectedSkinIndex, setSelectedSkinIndex] = useState(0);

  const [report, setReport] = useState<SbarReportData>(generateSampleSbarData());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      const targetId = currentUser ? currentUser.uid : "guest";

      try {
        const [health, skin, profile, conds, fam] = await Promise.all([
          loadHealthReportsPage(targetId, 20),
          loadSkinReportsPage(targetId, 20),
          getUserProfile(targetId),
          getConditions(targetId),
          getFamilyHistory(targetId),
        ]);

        let adhSummary: SbarReportData["medicationAdherenceSummary"] | null = null;
        try {
          const resAdh = await fetch(`/api/medication-adherence?userId=${encodeURIComponent(targetId)}`);
          if (resAdh.ok) {
            const dataAdh = await resAdh.json();
            if (dataAdh.summary) {
              adhSummary = {
                totalDoses: dataAdh.summary.dosesTotal,
                takenDoses: dataAdh.summary.dosesTaken,
                adherenceRate: dataAdh.summary.thirtyDayRate,
                currentStreak: dataAdh.summary.currentStreak,
                dateRange: "Past 30 Days Compliance",
                selfReportedDisclaimer:
                  "Patient self-reported medication adherence logs. May reflect self-reporting inaccuracies. Clinical verification recommended.",
              };
              setAdherenceSummary(adhSummary);
            }
          }
        } catch (adhErr) {
          console.warn("Failed to fetch adherence summary for SBAR export:", adhErr);
        }

        setHealthReports(health);
        setSkinReports(skin);
        setUserProfile(profile);
        setConditions(conds);
        setFamilyHistory(fam);

        // Read URL query parameter for requested export mode
        const urlParams =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search)
            : null;
        const requested = (urlParams?.get("mode") || "").toLowerCase();

        let initialMode: SbarExportMode = "vitals_only";
        if (requested === "history" || requested === "history_only") {
          initialMode = "history_only";
        } else if (requested === "family" || requested === "family_only") {
          initialMode = "family_only";
        } else if (requested === "comprehensive" || requested === "combined") {
          initialMode = "comprehensive";
        } else if (requested === "skin" || requested === "skin_only") {
          initialMode = "skin_only";
        } else if (requested === "vitals" || requested === "vitals_only") {
          initialMode = "vitals_only";
        } else {
          // Smart fallback based on available clinical records
          if (health.length > 0) initialMode = "vitals_only";
          else if (conds.length > 0) initialMode = "history_only";
          else if (fam.length > 0) initialMode = "family_only";
          else if (skin.length > 0) initialMode = "skin_only";
          else initialMode = "vitals_only";
        }

        setExportMode(initialMode);
        setSelectedHealthIndex(0);
        setSelectedSkinIndex(0);

        setReport(
          mapRecordsToSbar(
            health[0] || null,
            skin[0] || null,
            profile,
            currentUser?.displayName || undefined,
            initialMode,
            conds,
            fam,
            adhSummary
          )
        );
      } catch (err) {
        console.error("Failed to load user reports for export", err);
      } finally {
        setLoading(false);
      }
    });


    return () => unsubscribe();
  }, []);

  const handleModeChange = (newMode: SbarExportMode) => {
    setExportMode(newMode);
    setReport(
      mapRecordsToSbar(
        healthReports[selectedHealthIndex] || null,
        skinReports[selectedSkinIndex] || null,
        userProfile,
        user?.displayName || undefined,
        newMode,
        conditions,
        familyHistory,
        adherenceSummary
      )
    );
  };

  const handleSelectHealth = (index: number) => {
    setSelectedHealthIndex(index);
    setReport(
      mapRecordsToSbar(
        healthReports[index] || null,
        skinReports[selectedSkinIndex] || null,
        userProfile,
        user?.displayName || undefined,
        exportMode,
        conditions,
        familyHistory,
        adherenceSummary
      )
    );
  };

  const handleSelectSkin = (index: number) => {
    setSelectedSkinIndex(index);
    setReport(
      mapRecordsToSbar(
        healthReports[selectedHealthIndex] || null,
        skinReports[index] || null,
        userProfile,
        user?.displayName || undefined,
        exportMode,
        conditions,
        familyHistory,
        adherenceSummary
      )
    );
  };


  const handlePrint = () => {
    window.print();
  };

  const updateField = (field: keyof SbarReportData, value: unknown) => {
    const updated = { ...report, [field]: value };
    setReport(updated);

    if (
      user &&
      (field === "patientName" || field === "age" || field === "gender")
    ) {
      saveUserProfile(user.uid, {
        patientName: updated.patientName,
        age: updated.age,
        gender: updated.gender,
      }).catch((err) =>
        console.error("Failed to persist updated user profile demographics", err)
      );
    }
  };

  const getRiskBadgeStyle = (risk: string) => {
    switch (risk) {
      case "urgent":
        return "bg-red-500/20 text-red-400 border-red-500/50 print:bg-red-100 print:text-red-800 print:border-red-400";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50 print:bg-orange-100 print:text-orange-800 print:border-orange-400";
      case "moderate":
        return "bg-amber-500/20 text-amber-400 border-amber-500/50 print:bg-amber-100 print:text-amber-800 print:border-amber-400";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 print:bg-emerald-100 print:text-emerald-800 print:border-emerald-400";
    }
  };

  const hasReports =
    healthReports.length > 0 ||
    skinReports.length > 0 ||
    conditions.length > 0 ||
    familyHistory.length > 0;

  return (
    <div className="min-h-screen bg-[#06101c] text-slate-100 flex flex-col font-sans print:bg-white print:text-black">
      {/* Top Action Bar (Hidden during Print) */}
      <header className="border-b border-slate-800 bg-[#091728]/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition text-sm font-semibold"
          >
            ← {localize("Back to Home", "मुख्य पृष्ठ")}
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>📄</span>
            <span>
              {localize(
                "Clinical PDF & Doctor Summary Export",
                "डॉक्टर रिपोर्ट और SBAR सारांश निर्यात"
              )}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
          >
            <span>
              {isEditing
                ? localize("👁️ View Preview", "👁️ पूर्वावलोकन देखें")
                : localize("✏️ Edit Details", "✏️ विवरण संपादित करें")}
            </span>
          </button>

          <button
            onClick={() =>
              setReport(
                mapRecordsToSbar(
                  healthReports[selectedHealthIndex] || null,
                  skinReports[selectedSkinIndex] || null,
                  userProfile,
                  user?.displayName || undefined,
                  exportMode,
                  conditions,
                  familyHistory
                )
              )
            }
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            🔄 {localize("Reset", "रीसेट")}
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>
              {localize("Download PDF / Print", "PDF डाउनलोड / प्रिंट")}
            </span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-5 print:p-0 print:m-0 print:max-w-full">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <p className="animate-pulse">
              {localize("Loading saved reports...", "आपकी रिपोर्ट लोड हो रही है...")}
            </p>
          </div>
        ) : !hasReports ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-8">
            <div className="text-4xl">📋</div>
            <h2 className="text-xl font-bold text-slate-100">
              {localize(
                "No saved records yet — log clinical data first",
                "अभी तक कोई डेटा नहीं है"
              )}
            </h2>
            <p className="text-sm text-slate-400">
              {localize(
                "Complete a vital screening, skin check, chronic condition history, or family tree to generate an SBAR handover.",
                "SBAR रिपोर्ट जनरेट करने के लिए पहले अपनी स्वास्थ्य जांच, त्वचा जांच, रोगी इतिहास या पारिवारिक ट्री भरें।"
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/health-check"
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
              >
                🩺 {localize("Vital Check", "वाइटल जांच")}
              </Link>
              <Link
                href="/skin-check"
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition"
              >
                🔬 {localize("Skin Check", "त्वचा जांच")}
              </Link>
              <Link
                href="/patient-history"
                className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold text-xs transition"
              >
                💊 {localize("Patient History", "रोगी इतिहास")}
              </Link>
              <Link
                href="/family-history"
                className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold text-xs transition"
              >
                🌳 {localize("Family Tree", "पारिवारिक ट्री")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Super-Easy Scope / Mode Selector (Hidden during Print) */}
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-lg print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider pl-1">
                  {localize("Export Scope:", "रिपोर्ट प्रकार:")}
                </span>
                <div className="inline-flex flex-wrap rounded-xl bg-slate-950 p-1 border border-slate-800 gap-1">
                  <button
                    onClick={() => handleModeChange("vitals_only")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      exportMode === "vitals_only"
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <span>🩺</span>
                    <span>{localize("Vitals", "वाइटल्स")}</span>
                    {healthReports.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/25 text-slate-100 font-mono">
                        {healthReports.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleModeChange("skin_only")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      exportMode === "skin_only"
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <span>🔬</span>
                    <span>{localize("Skin", "त्वचा")}</span>
                    {skinReports.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/25 text-slate-100 font-mono">
                        {skinReports.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleModeChange("history_only")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      exportMode === "history_only"
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <span>💊</span>
                    <span>{localize("History & Meds", "इतिहास व दवाइयां")}</span>
                    {conditions.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/25 text-slate-100 font-mono">
                        {conditions.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleModeChange("family_only")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      exportMode === "family_only"
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <span>🌳</span>
                    <span>{localize("Family Tree", "पारिवारिक ट्री")}</span>
                    {familyHistory.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/25 text-slate-100 font-mono">
                        {familyHistory.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => handleModeChange("comprehensive")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      exportMode === "comprehensive" || exportMode === "combined"
                        ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                        : "text-slate-300 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    <span>📑</span>
                    <span>{localize("Comprehensive", "विस्तृत सारांश")}</span>
                  </button>
                </div>
              </div>

              {/* Record Selector Dropdown for Active Mode */}
              <div className="flex flex-wrap items-center gap-2">
                {exportMode === "vitals_only" && healthReports.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">
                      {localize("Vital Record:", "वाइटल रिकॉर्ड:")}
                    </span>
                    <select
                      value={selectedHealthIndex}
                      onChange={(e) => handleSelectHealth(Number(e.target.value))}
                      className="bg-slate-950 text-cyan-300 text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-700 max-w-[280px] truncate"
                    >
                      {healthReports.map((hr, idx) => (
                        <option key={idx} value={idx}>
                          {new Date(hr.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} — {hr.riskLevel} ({hr.riskScore}/100) — BP: {hr.bp}{hr.age ? `, Age: ${hr.age}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {exportMode === "skin_only" && skinReports.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">
                      {localize("Skin Record:", "स्किन रिकॉर्ड:")}
                    </span>
                    <select
                      value={selectedSkinIndex}
                      onChange={(e) => handleSelectSkin(Number(e.target.value))}
                      className="bg-slate-950 text-cyan-300 text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-700 max-w-[280px] truncate"
                    >
                      {skinReports.map((sr, idx) => (
                        <option key={idx} value={idx}>
                          {new Date(sr.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} — {sr.bodyPart.toUpperCase()} ({sr.severity})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {exportMode === "combined" && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {healthReports.length > 0 && (
                      <select
                        value={selectedHealthIndex}
                        onChange={(e) => handleSelectHealth(Number(e.target.value))}
                        className="bg-slate-950 text-cyan-300 text-xs font-bold rounded-lg px-2 py-1.5 border border-slate-700 max-w-[190px] truncate"
                      >
                        {healthReports.map((hr, idx) => (
                          <option key={idx} value={idx}>
                            Vital: {new Date(hr.createdAt).toLocaleDateString([], { dateStyle: "short" })} ({hr.riskLevel})
                          </option>
                        ))}
                      </select>
                    )}
                    {skinReports.length > 0 && (
                      <select
                        value={selectedSkinIndex}
                        onChange={(e) => handleSelectSkin(Number(e.target.value))}
                        className="bg-slate-950 text-cyan-300 text-xs font-bold rounded-lg px-2 py-1.5 border border-slate-700 max-w-[190px] truncate"
                      >
                        {skinReports.map((sr, idx) => (
                          <option key={idx} value={idx}>
                            Skin: {new Date(sr.createdAt).toLocaleDateString([], { dateStyle: "short" })} ({sr.bodyPart})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="bg-slate-900 border border-slate-800 print:border-slate-300 rounded-2xl p-6 sm:p-10 space-y-8 print:bg-white print:text-black print:shadow-none print:rounded-none">
              {/* Header Banner */}
              <div className="border-b border-slate-800 print:border-slate-300 pb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-cyan-400 print:text-blue-700 font-extrabold text-xl sm:text-2xl tracking-wide">
                    <span>🩺 RoboDoctor AI</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 print:bg-blue-50 print:border-blue-300 font-medium">
                      {exportMode === "vitals_only"
                        ? "Clinical SBAR • Vital Signs Screening"
                        : exportMode === "skin_only"
                        ? "Clinical SBAR • Dermatological Screening"
                        : exportMode === "history_only"
                        ? "Clinical SBAR • Chronic History & Pharmacotherapy Audit"
                        : exportMode === "family_only"
                        ? "Clinical SBAR • Family Pedigree & Hereditary Risk"
                        : "Clinical SBAR • Comprehensive Clinical Dossier"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 print:text-slate-600 font-medium">
                    Standardized Patient Triage & Health Screening Summary for Physician Review
                  </p>
                </div>

                <div className="text-right text-xs space-y-1 bg-slate-950 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200">
                  <div className="font-mono font-bold text-cyan-300 print:text-blue-800">
                    ID: {report.reportId}
                  </div>
                  <div className="text-slate-400 print:text-slate-600">Date: {report.generatedAt}</div>
                  <div className="text-[10px] text-slate-500 print:text-slate-500 uppercase tracking-wider font-semibold">
                    Status: Completed Triage
                  </div>
                </div>
              </div>

              {/* Edit Panel (Shown only when Edit toggle active) */}
              {isEditing && (
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-xl space-y-4 print:hidden">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    ✏️ Edit Patient Report Data
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Patient Name</label>
                      <input
                        type="text"
                        value={report.patientName}
                        onChange={(e) => updateField("patientName", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Age</label>
                      <input
                        type="number"
                        value={report.age}
                        onChange={(e) => updateField("age", Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Gender</label>
                      <input
                        type="text"
                        value={report.gender}
                        onChange={(e) => updateField("gender", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-slate-400 mb-1 font-semibold">
                        Primary Chief Complaint
                      </label>
                      <textarea
                        value={report.primaryChiefComplaint}
                        onChange={(e) => updateField("primaryChiefComplaint", e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-100"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SBAR Section 1: Subjective */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-2">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800">
                    S
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 print:text-slate-900 uppercase tracking-wider">
                    1. Subjective — Patient History & Symptoms
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 print:bg-slate-50 p-4 rounded-xl border border-slate-800/80 print:border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 print:text-slate-500 font-semibold">Patient Record:</span>
                    <div className="font-bold text-slate-200 print:text-slate-900 mt-0.5">
                      {report.patientName}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-500 font-semibold">Age / Gender:</span>
                    <div className="font-bold text-slate-200 print:text-slate-900 mt-0.5">
                      {report.age} Yrs / {report.gender}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 print:text-slate-500 font-semibold">Affected Region:</span>
                    <div className="font-bold text-slate-200 print:text-slate-900 mt-0.5">
                      {report.affectedBodyPart}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="font-semibold text-slate-300 print:text-slate-800">
                    Chief Complaint & History:
                  </div>
                  <p className="text-slate-300 print:text-slate-700 leading-relaxed bg-slate-950/40 print:bg-transparent p-3 rounded-lg border border-slate-800/40 print:border-none">
                    {report.primaryChiefComplaint}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="font-semibold text-slate-400 print:text-slate-600">
                    Reported Symptoms & Screening Tags:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {report.symptomsList.map((sym, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 print:bg-slate-100 border border-slate-700 print:border-slate-300 text-slate-200 print:text-slate-800 font-medium"
                      >
                        • {sym}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Chronic Medical Conditions & Prescription History (Feature A) */}
                {report.chronicConditions && report.chronicConditions.length > 0 && (
                  <div className="space-y-2 border-t border-slate-800 print:border-slate-300 pt-3 text-xs">
                    <span className="font-bold text-slate-300 print:text-slate-800 flex items-center gap-1.5">
                      <span>🩺</span>
                      <span>Chronic Medical Conditions & Prescription History:</span>
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {report.chronicConditions.map((cond, cIdx) => (
                        <div
                          key={cIdx}
                          className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-lg border border-slate-800 print:border-slate-200 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200 print:text-slate-900">
                              {cond.name}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-300 print:bg-blue-50 print:text-blue-800 border border-cyan-500/20">
                              {cond.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 print:text-slate-600">
                            Diagnosed: {cond.diagnosedDate} • {cond.changeCount} Rx Changes Recorded
                          </div>
                          {cond.currentMedicine && (
                            <div className="text-[11px] font-semibold text-emerald-400 print:text-emerald-700">
                              Active: {cond.currentMedicine}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 print:text-slate-600 italic">
                            {cond.historySummary}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Family Health History & Multi-Relative Patterns (Feature C) */}
                {report.familyHistory && report.familyHistory.length > 0 && (
                  <div className="space-y-2 border-t border-slate-800 print:border-slate-300 pt-3 text-xs">
                    <span className="font-bold text-slate-300 print:text-slate-800 flex items-center gap-1.5">
                      <span>🌳</span>
                      <span>Family Health History (Pedigree Lineage):</span>
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {report.familyHistory.map((fam, fIdx) => (
                        <div
                          key={fIdx}
                          className="bg-slate-950/70 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800 print:border-slate-200 flex items-center justify-between"
                        >
                          <div>
                            <span className="text-[10px] font-mono text-cyan-400 print:text-blue-700 uppercase font-bold block">
                              {fam.relation}
                            </span>
                            <span className="font-bold text-slate-200 print:text-slate-900">
                              {fam.condition}
                            </span>
                          </div>
                          {fam.ageOfOnset && (
                            <span className="text-[10px] font-mono text-slate-400 print:text-slate-600">
                              Onset: {fam.ageOfOnset}y
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {report.familyHistoryPatterns && report.familyHistoryPatterns.length > 0 && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 print:text-amber-800 text-[11px] space-y-0.5">
                        <span className="font-bold block">⚠️ Generational Multi-Relative Pattern Noted:</span>
                        {report.familyHistoryPatterns.map((pat, pIdx) => (
                          <div key={pIdx}>• {pat} (Recommended for physician discussion)</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* SBAR Section 2: Objective */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-2">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800">
                    O
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 print:text-slate-900 uppercase tracking-wider">
                    2. Objective — {
                      exportMode === "skin_only"
                        ? "Dermatological Lesion & Vision Screening"
                        : exportMode === "history_only"
                        ? "Longitudinal Condition Stability & Pharmacotherapy Tracking"
                        : exportMode === "family_only"
                        ? "Pedigree Lineage & Generational Clustering Analysis"
                        : "Vitals, History, Vision & Clinical Metrics"
                    }
                  </h3>
                </div>

                {/* Specific Scorecard for History Only */}
                {exportMode === "history_only" && (
                  <div className="bg-slate-950/70 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 print:text-blue-800 flex items-center gap-1.5">
                        <span>💊</span>
                        <span>Longitudinal Pharmacotherapy & Condition Tracking Audit:</span>
                      </span>
                      <span className="font-mono text-slate-400 print:text-slate-600">
                        {report.chronicConditions?.length || 0} Condition(s) Tracked
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Tracked Conditions</span>
                        <span className="text-sm font-bold text-slate-100 print:text-slate-900 mt-0.5 block">{report.chronicConditions?.length || 0}</span>
                      </div>
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Active Prescriptions</span>
                        <span className="text-sm font-bold text-emerald-400 print:text-emerald-700 mt-0.5 block">{report.currentMedicines.length}</span>
                      </div>
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Total Rx Changes</span>
                        <span className="text-sm font-bold text-cyan-400 print:text-blue-700 mt-0.5 block">
                          {(report.chronicConditions || []).reduce((acc, c) => acc + (c.changeCount || 0), 0)}
                        </span>
                      </div>
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Titration Triage</span>
                        <span className={`text-sm font-bold mt-0.5 block ${report.overallRiskLevel === "high" ? "text-amber-400 print:text-amber-800" : "text-emerald-400 print:text-emerald-700"}`}>
                          {report.overallRiskLevel === "high" ? "Review Indicated" : "Stable Regimen"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Specific Scorecard for Family Only */}
                {exportMode === "family_only" && (
                  <div className="bg-slate-950/70 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 print:text-blue-800 flex items-center gap-1.5">
                        <span>🌳</span>
                        <span>Family Health Pedigree & Hereditary Clustering Audit:</span>
                      </span>
                      <span className="font-mono text-slate-400 print:text-slate-600">
                        {report.familyHistory?.length || 0} Relative(s) Documented
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Documented Relatives</span>
                        <span className="text-sm font-bold text-slate-100 print:text-slate-900 mt-0.5 block">{report.familyHistory?.length || 0}</span>
                      </div>
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Clustering Patterns</span>
                        <span className="text-sm font-bold text-amber-400 print:text-amber-700 mt-0.5 block">
                          {report.familyHistoryPatterns?.length || 0} Identified
                        </span>
                      </div>
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Hereditary Triage</span>
                        <span className="text-sm font-bold text-cyan-400 print:text-blue-700 mt-0.5 block">
                          {(report.familyHistoryPatterns?.length || 0) > 0 ? "Advisory Indicated" : "Standard Baseline"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vitals Grid: Rendered only when vitals are part of the scope */}
                {exportMode !== "skin_only" && exportMode !== "history_only" && exportMode !== "family_only" && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-center">
                      <span className="text-[11px] text-slate-400 print:text-slate-500 font-semibold block">
                        Blood Pressure
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-cyan-400 print:text-blue-700 mt-1 block">
                        {report.vitals.bloodPressure}
                      </span>
                    </div>
                    <div className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-center">
                      <span className="text-[11px] text-slate-400 print:text-slate-500 font-semibold block">
                        Blood Sugar
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-cyan-400 print:text-blue-700 mt-1 block">
                        {report.vitals.bloodSugar} mg/dL
                      </span>
                    </div>
                    <div className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-center">
                      <span className="text-[11px] text-slate-400 print:text-slate-500 font-semibold block">
                        Heart Rate
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-cyan-400 print:text-blue-700 mt-1 block">
                        {report.vitals.heartRate} bpm
                      </span>
                    </div>
                    <div className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-center">
                      <span className="text-[11px] text-slate-400 print:text-slate-500 font-semibold block">
                        Body Mass Index
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-cyan-400 print:text-blue-700 mt-1 block">
                        {report.vitals.bmi} BMI
                      </span>
                    </div>
                  </div>
                )}

                {/* Notice when viewing skin-only report */}
                {exportMode === "skin_only" && (
                  <div className="bg-slate-950/60 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-xs text-slate-400 print:text-slate-600">
                    ℹ️ {localize("Focused Dermatological Examination — Systemic vitals were not recorded during this skin photo session.", "विशिष्ट त्वचा परीक्षण — इस सत्र के दौरान सामान्य वाइटल्स रिकॉर्ड नहीं किए गए।")}
                  </div>
                )}

                {/* Computer Vision Skin Screening Output: Rendered only when skin is part of the scope */}
                {exportMode !== "vitals_only" && report.skinScreening && (
                  <div className="bg-slate-950 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 print:text-slate-900 flex items-center gap-1.5">
                        <span>🔬 PyTorch Vision Screening (HAM10000 Dataset):</span>
                      </span>
                      <span className="font-mono text-cyan-400 print:text-blue-700 font-bold">
                        {report.skinScreening.confidence}% Confidence
                      </span>
                    </div>
                    <div className="text-slate-300 print:text-slate-700 font-medium">
                      Predicted Dermoscopic Pattern: <strong>{report.skinScreening.topPattern}</strong>
                    </div>
                  </div>
                )}

                {/* Lab Report Metrics */}
                {exportMode !== "skin_only" && report.labValues && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    {report.labValues.fastingSugar && (
                      <div className="bg-slate-950 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800 print:border-slate-200">
                        <span className="text-slate-400 print:text-slate-500 block text-[10px]">
                          Fasting Glucose
                        </span>
                        <span className="font-bold text-slate-200 print:text-slate-900">
                          {report.labValues.fastingSugar} mg/dL
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Medication Adherence Summary Section */}
                {report.medicationAdherenceSummary && (
                  <div className="bg-slate-950/80 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-200 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-300 print:text-blue-800 flex items-center gap-1.5">
                        <span>💊</span>
                        <span>Medication Adherence & Daily Dose Compliance Audit:</span>
                      </span>
                      <span className="font-mono text-slate-400 print:text-slate-600">
                        {report.medicationAdherenceSummary.dateRange}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Compliance Rate</span>
                        <span className="text-sm font-bold text-emerald-400 print:text-emerald-700 mt-0.5 block">
                          {report.medicationAdherenceSummary.adherenceRate}%
                        </span>
                      </div>
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Doses Taken</span>
                        <span className="text-sm font-bold text-cyan-400 print:text-blue-700 mt-0.5 block">
                          {report.medicationAdherenceSummary.takenDoses} / {report.medicationAdherenceSummary.totalDoses}
                        </span>
                      </div>
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Active Streak</span>
                        <span className="text-sm font-bold text-amber-400 print:text-amber-700 mt-0.5 block">
                          {report.medicationAdherenceSummary.currentStreak} Days
                        </span>
                      </div>
                      <div className="bg-slate-900 print:bg-white p-2.5 rounded-lg border border-slate-800 print:border-slate-300">
                        <span className="text-[10px] text-slate-400 print:text-slate-500 font-semibold block">Adherence Triage</span>
                        <span
                          className={`text-sm font-bold mt-0.5 block ${
                            report.medicationAdherenceSummary.adherenceRate >= 80
                              ? "text-emerald-400 print:text-emerald-700"
                              : "text-rose-400 print:text-rose-700"
                          }`}
                        >
                          {report.medicationAdherenceSummary.adherenceRate >= 80
                            ? "Optimal Compliance"
                            : "Sub-optimal / Review"}
                        </span>
                      </div>
                    </div>

                    {/* Self-reported disclaimer notice */}
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 print:text-amber-900 text-[11px] leading-relaxed">
                      <span className="font-bold">⚠️ Self-Reported Data Notice: </span>
                      {report.medicationAdherenceSummary.selfReportedDisclaimer}
                    </div>
                  </div>
                )}
              </section>


              {/* SBAR Section 3: Assessment */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-2">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800">
                    A
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 print:text-slate-900 uppercase tracking-wider">
                    3. Assessment — Risk Level & Priority Red Flags
                  </h3>
                </div>

                {/* Overall Triage Risk Level */}
                <div className="flex items-center justify-between bg-slate-950 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-200">
                  <div>
                    <span className="text-xs text-slate-400 print:text-slate-500 font-semibold block">
                      Triage Risk Category:
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-100 print:text-slate-900">
                      {report.overallRiskLevel.toUpperCase()} RISK (Score: {report.riskScore}/100)
                    </span>
                  </div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-extrabold uppercase border ${getRiskBadgeStyle(
                      report.overallRiskLevel
                    )}`}
                  >
                    {report.overallRiskLevel} Risk
                  </span>
                </div>

                {/* Red Flag Callouts */}
                {report.redFlags.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-300 print:text-slate-800 uppercase tracking-wide">
                      Identified Clinical Red Flags:
                    </span>
                    {report.redFlags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 print:bg-slate-50 p-3 rounded-lg border border-slate-800 print:border-slate-200 space-y-1 text-xs"
                      >
                        <div className="font-bold text-amber-400 print:text-amber-800 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>{flag.title}</span>
                        </div>
                        <p className="text-slate-300 print:text-slate-700">{flag.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* SBAR Section 4: Plan */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-2">
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800">
                    P
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-100 print:text-slate-900 uppercase tracking-wider">
                    4. Plan — Precautions & Physician Follow-up Timeline
                  </h3>
                </div>

                <div className="bg-slate-950/80 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-200 space-y-2 text-xs">
                  <div className="font-bold text-cyan-300 print:text-blue-800 uppercase tracking-wide">
                    Recommended Action Plan & Follow-up Window:
                  </div>
                  <p className="text-slate-200 print:text-slate-800 font-semibold">
                    {report.recommendedFollowUp}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <span className="font-bold text-slate-300 print:text-slate-800">
                    Dynamic Patient Precautions:
                  </span>
                  <div className="space-y-1.5">
                    {report.precautions.map((prec, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 bg-slate-950/50 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800/60 print:border-slate-200 text-slate-300 print:text-slate-700"
                      >
                        <span className="font-bold text-cyan-400 print:text-blue-700">
                          {idx + 1}.
                        </span>
                        <span>{prec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Medical Disclaimer & Signature Footer */}
              <footer className="border-t border-slate-800 print:border-slate-300 pt-6 space-y-4 text-[11px] text-slate-400 print:text-slate-600">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="font-bold text-slate-300 print:text-slate-700">
                      ⚠️ Physician Disclaimer:
                    </div>
                    <p className="leading-relaxed">
                      RoboDoctor AI is an educational technology prototype. This document is a
                      computer-assisted triage summary intended to facilitate communication during
                      clinical consultation and does not constitute a definitive medical diagnosis.
                    </p>
                  </div>
                  <div className="text-right space-y-1 border-l border-slate-800 print:border-slate-300 pl-4">
                    <div className="font-mono text-xs text-slate-300 print:text-slate-700 font-bold">
                      Verified Summary ID
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{report.reportId}</div>
                  </div>
                </div>
              </footer>
            </div>
          </>
        )}
        <MedicalDisclaimer />
      </main>
    </div>
  );
}
