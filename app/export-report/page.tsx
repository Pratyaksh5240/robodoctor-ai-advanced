"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { generateSampleSbarData, SbarReportData } from "@/lib/reportGenerator";

export default function ExportReportPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [report, setReport] = useState<SbarReportData>(generateSampleSbarData());
  const [isEditing, setIsEditing] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const updateField = (field: keyof SbarReportData, value: unknown) => {
    setReport({ ...report, [field]: value });
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

  return (
    <div className="min-h-screen bg-[#06101c] text-slate-100 flex flex-col font-sans print:bg-white print:text-black">
      {/* Top Action Bar (Hidden during Print) */}
      <header className="border-b border-slate-800 bg-[#091728]/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition text-sm font-semibold"
          >
            ← {isHindi ? "मुख्य पृष्ठ" : translateUi("Back to Home", language)}
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>📄</span>
            <span>
              {isHindi ? "डॉक्टर रिपोर्ट और SBAR सारांश निर्यात" : "Clinical PDF & Doctor Summary Export"}
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
          >
            <span>{isEditing ? "👁️ View Preview" : "✏️ Edit Details"}</span>
          </button>

          <button
            onClick={() => setReport(generateSampleSbarData())}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            🔄 Reset
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
          >
            <span>🖨️</span>
            <span>{isHindi ? "PDF डाउनलोड / प्रिंट" : "Download PDF / Print"}</span>
          </button>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6 print:p-0 print:m-0 print:max-w-full">
        {/* Printable Document Sheet */}
        <div className="bg-slate-900 border border-slate-800 print:border-slate-300 rounded-2xl p-6 sm:p-10 space-y-8 print:bg-white print:text-black print:shadow-none print:rounded-none">
          {/* Header Banner */}
          <div className="border-b border-slate-800 print:border-slate-300 pb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 print:text-blue-700 font-extrabold text-xl sm:text-2xl tracking-wide">
                <span>🩺 RoboDoctor AI</span>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 print:bg-blue-50 print:border-blue-300 font-medium">
                  Clinical SBAR Summary
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
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1 font-semibold">Primary Chief Complaint</label>
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
                <div className="font-bold text-slate-200 print:text-slate-900 mt-0.5">{report.patientName}</div>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-500 font-semibold">Age / Gender:</span>
                <div className="font-bold text-slate-200 print:text-slate-900 mt-0.5">
                  {report.age} Yrs / {report.gender}
                </div>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-500 font-semibold">Affected Region:</span>
                <div className="font-bold text-slate-200 print:text-slate-900 mt-0.5">{report.affectedBodyPart}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="font-semibold text-slate-300 print:text-slate-800">Chief Complaint & History:</div>
              <p className="text-slate-300 print:text-slate-700 leading-relaxed bg-slate-950/40 print:bg-transparent p-3 rounded-lg border border-slate-800/40 print:border-none">
                {report.primaryChiefComplaint}
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-400 print:text-slate-600">Reported Symptoms:</span>
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
          </section>

          {/* SBAR Section 2: Objective */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-2">
              <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 print:bg-blue-100 print:text-blue-800">
                O
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 print:text-slate-900 uppercase tracking-wider">
                2. Objective — Vitals, Vision Screening & Lab Metrics
              </h3>
            </div>

            {/* Vitals Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-center">
                <span className="text-[11px] text-slate-400 print:text-slate-500 font-semibold block">Blood Pressure</span>
                <span className="text-sm sm:text-base font-extrabold text-cyan-400 print:text-blue-700 mt-1 block">
                  {report.vitals.bloodPressure}
                </span>
              </div>
              <div className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-center">
                <span className="text-[11px] text-slate-400 print:text-slate-500 font-semibold block">Blood Sugar</span>
                <span className="text-sm sm:text-base font-extrabold text-cyan-400 print:text-blue-700 mt-1 block">
                  {report.vitals.bloodSugar} mg/dL
                </span>
              </div>
              <div className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-center">
                <span className="text-[11px] text-slate-400 print:text-slate-500 font-semibold block">Heart Rate</span>
                <span className="text-sm sm:text-base font-extrabold text-cyan-400 print:text-blue-700 mt-1 block">
                  {report.vitals.heartRate} bpm
                </span>
              </div>
              <div className="bg-slate-950/70 print:bg-slate-50 p-3 rounded-xl border border-slate-800 print:border-slate-200 text-center">
                <span className="text-[11px] text-slate-400 print:text-slate-500 font-semibold block">Body Mass Index</span>
                <span className="text-sm sm:text-base font-extrabold text-cyan-400 print:text-blue-700 mt-1 block">
                  {report.vitals.bmi} BMI
                </span>
              </div>
            </div>

            {/* Computer Vision Skin Screening Output */}
            {report.skinScreening && (
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
            {report.labValues && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {report.labValues.fastingSugar && (
                  <div className="bg-slate-950 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800 print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-500 block text-[10px]">Fasting Glucose</span>
                    <span className="font-bold text-slate-200 print:text-slate-900">{report.labValues.fastingSugar} mg/dL</span>
                  </div>
                )}
                {report.labValues.hbA1c && (
                  <div className="bg-slate-950 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800 print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-500 block text-[10px]">HbA1c</span>
                    <span className="font-bold text-slate-200 print:text-slate-900">{report.labValues.hbA1c}%</span>
                  </div>
                )}
                {report.labValues.hemoglobin && (
                  <div className="bg-slate-950 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800 print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-500 block text-[10px]">Hemoglobin</span>
                    <span className="font-bold text-slate-200 print:text-slate-900">{report.labValues.hemoglobin} g/dL</span>
                  </div>
                )}
                {report.labValues.tsh && (
                  <div className="bg-slate-950 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800 print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-500 block text-[10px]">TSH Thyroid</span>
                    <span className="font-bold text-slate-200 print:text-slate-900">{report.labValues.tsh} mIU/L</span>
                  </div>
                )}
                {report.labValues.totalCholesterol && (
                  <div className="bg-slate-950 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800 print:border-slate-200">
                    <span className="text-slate-400 print:text-slate-500 block text-[10px]">Cholesterol</span>
                    <span className="font-bold text-slate-200 print:text-slate-900">{report.labValues.totalCholesterol} mg/dL</span>
                  </div>
                )}
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
                <span className="text-xs text-slate-400 print:text-slate-500 font-semibold block">Triage Risk Category:</span>
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
              <p className="text-slate-200 print:text-slate-800 font-semibold">{report.recommendedFollowUp}</p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-300 print:text-slate-800">Dynamic Patient Precautions:</span>
              <div className="space-y-1.5">
                {report.precautions.map((prec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-slate-950/50 print:bg-slate-50 p-2.5 rounded-lg border border-slate-800/60 print:border-slate-200 text-slate-300 print:text-slate-700"
                  >
                    <span className="font-bold text-cyan-400 print:text-blue-700">{idx + 1}.</span>
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
                <div className="font-bold text-slate-300 print:text-slate-700">⚠️ Physician Disclaimer:</div>
                <p className="leading-relaxed">
                  RoboDoctor AI is an educational technology prototype. This document is a computer-assisted triage summary intended to facilitate communication during clinical consultation and does not constitute a definitive medical diagnosis.
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
      </main>
    </div>
  );
}
