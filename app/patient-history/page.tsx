"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import FeatureGuide from "@/components/FeatureGuide";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/app/context/ActiveProfileContext";
import {
  getConditions,
  saveCondition,
  addMedicationChange,
  deleteCondition,
  PatientConditionRecord,
  MedicationHistoryEntry,
} from "@/lib/reportHistory";
import { mapRecordsToSbar, SbarReportData } from "@/lib/reportGenerator";
import { parseSbarFileContent, ParsedSbarResult } from "@/lib/sbarImport";
import { useLocalize } from "@/lib/useLocalize";

export default function PatientHistoryPage() {
  const localize = useLocalize();
  const { user } = useAuth();
  const { activeProfileId, activeProfile } = useActiveProfile();

  const [conditions, setConditions] = useState<PatientConditionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddConditionModal, setShowAddConditionModal] = useState(false);
  const [selectedConditionForMed, setSelectedConditionForMed] = useState<PatientConditionRecord | null>(null);
  const [showSbarModal, setShowSbarModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [parsedImport, setParsedImport] = useState<ParsedSbarResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Synthesize SBAR clinical data for direct export
  const sbarReport: SbarReportData = useMemo(() => {
    return mapRecordsToSbar(
      null,
      null,
      activeProfile
        ? {
            patientName: activeProfile.name,
            age: activeProfile.age,
            gender: activeProfile.gender,
            updatedAt: Date.now(),
          }
        : null,
      activeProfile?.name || user?.displayName || "Patient Record",
      "history_only",
      conditions,
      null
    );
  }, [conditions, activeProfile, user]);

  // New condition form
  const [condName, setCondName] = useState("");
  const [condDate, setCondDate] = useState(new Date().toISOString().slice(0, 10));
  const [condStatus, setCondStatus] = useState<"active" | "managed" | "resolved">("active");
  const [condNotes, setCondNotes] = useState("");

  // New medication change form
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medStartDate, setMedStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [medEndDate, setMedEndDate] = useState("");
  const [medIsCurrent, setMedIsCurrent] = useState(true);
  const [medReason, setMedReason] = useState("");
  const [medPrescribedBy, setMedPrescribedBy] = useState("");

  // Toast / feedback notice
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const records = await getConditions(user?.uid || "guest", activeProfileId);
      setConditions(records);
    } catch (e) {
      console.error("Failed to load patient conditions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, activeProfileId]);

  // Handle SBAR File Upload & Ingestion (Supports PDF, JSON, TXT)
  const processUploadedFile = (file: File) => {
    if (!file) return;
    setImportError(null);

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      setIsParsingFile(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileDataUrl = event.target?.result as string;
          const res = await fetch("/api/sbar-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileDataUrl }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with ${res.status}`);
          }

          const data = await res.json();
          const parsed = data.result as ParsedSbarResult;

          if (data.rawText) {
            setImportText(data.rawText);
          }

          if (!parsed || (!parsed.conditions?.length && !parsed.familyHistory?.length)) {
            setImportError(
              localize(
                "No chronic conditions could be automatically identified in this PDF. The extracted text has been placed in the box below for your review.",
                "इस PDF में स्वचालित रूप से कोई पुरानी स्थिति नहीं मिली। निकाला गया टेक्स्ट नीचे दिया गया है।"
              )
            );
          } else {
            setParsedImport(parsed);
          }
        } catch (err: any) {
          setImportError(err.message || "Failed to extract data from PDF.");
        } finally {
          setIsParsingFile(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = event.target?.result as string;
          setImportText(raw);
          const parsed = parseSbarFileContent(raw);
          if (parsed.conditions.length === 0) {
            setImportError(
              localize(
                "No chronic conditions found in file. Please ensure it is a valid SBAR report or text note.",
                "फाइल में कोई पुरानी स्थिति नहीं मिली।"
              )
            );
          } else {
            setParsedImport(parsed);
          }
        } catch (err: any) {
          setImportError(err.message || "Failed to parse SBAR file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    e.target.value = "";
  };

  const handleParsePastedText = () => {
    if (!importText.trim()) return;
    setImportError(null);
    try {
      const parsed = parseSbarFileContent(importText);
      if (parsed.conditions.length === 0) {
        setImportError(localize("No chronic conditions detected in pasted text. Format as SBAR or JSON.", "पेस्ट किए गए टेक्स्ट में कोई स्थिति नहीं मिली।"));
      } else {
        setParsedImport(parsed);
      }
    } catch (err: any) {
      setImportError(err.message || "Failed to parse SBAR text.");
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedImport || parsedImport.conditions.length === 0) return;
    setIsImporting(true);
    setImportError(null);

    try {
      let importedCount = 0;
      let medCount = 0;

      for (const cond of parsedImport.conditions) {
        const saved = await saveCondition(
          user?.uid || "guest",
          {
            name: cond.name,
            diagnosedDate: cond.diagnosedDate || new Date().toISOString().slice(0, 10),
            status: cond.status,
            notes: cond.notes || "Imported from SBAR report",
            medicationHistory: [],
          },
          activeProfileId
        );
        importedCount += 1;

        if (cond.medications && cond.medications.length > 0 && saved._id) {
          for (const med of cond.medications) {
            await addMedicationChange(
              user?.uid || "guest",
              saved._id,
              {
                medicineName: med.medicineName,
                dosage: med.dosage || "Standard",
                startDate: med.startDate || new Date().toISOString().slice(0, 10),
                endDate: null,
                reasonForChange: med.reasonForChange || "Imported from SBAR",
                prescribedBy: med.prescribedBy || "",
              },
              activeProfileId
            );
            medCount += 1;
          }
        }
      }

      setNotice(
        localize(
          `Successfully imported ${importedCount} condition(s) and ${medCount} medication changes from SBAR!`,
          `SBAR से ${importedCount} स्थितियां और ${medCount} दवाएं सफलतापूर्वक आयात की गईं!`
        )
      );
      setTimeout(() => setNotice(null), 5000);
      setShowImportModal(false);
      setParsedImport(null);
      setImportText("");
      await loadData();
    } catch (err: any) {
      setImportError(err.message || "Error saving imported conditions.");
    } finally {
      setIsImporting(false);
    }
  };

  // Handle adding new condition
  const handleCreateCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condName.trim()) return;

    try {
      await saveCondition(
        user?.uid || "guest",
        {
          name: condName.trim(),
          diagnosedDate: condDate,
          status: condStatus,
          notes: condNotes.trim(),
          medicationHistory: [],
        },
        activeProfileId
      );
      setCondName("");
      setCondNotes("");
      setShowAddConditionModal(false);
      setNotice(localize("Condition logged successfully.", "स्थिति सफलतापूर्वक जोड़ी गई।"));
      setTimeout(() => setNotice(null), 4000);
      await loadData();
    } catch (err) {
      console.error("Error creating condition:", err);
    }
  };

  // Handle adding medication change
  const handleAddMedChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConditionForMed || !medName.trim() || !medDosage.trim() || !medReason.trim()) {
      return;
    }

    try {
      await addMedicationChange(
        user?.uid || "guest",
        selectedConditionForMed._id || "",
        {
          medicineName: medName.trim(),
          dosage: medDosage.trim(),
          startDate: medStartDate,
          endDate: medIsCurrent ? null : medEndDate || null,
          reasonForChange: medReason.trim(),
          prescribedBy: medPrescribedBy.trim(),
        },
        activeProfileId
      );

      setMedName("");
      setMedDosage("");
      setMedReason("");
      setMedPrescribedBy("");
      setSelectedConditionForMed(null);
      setNotice(localize("Medication change logged.", "दवा में बदलाव दर्ज किया गया।"));
      setTimeout(() => setNotice(null), 4000);
      await loadData();
    } catch (err) {
      console.error("Error logging medication change:", err);
    }
  };

  const handleDeleteCondition = async (id?: string) => {
    if (!id) return;
    if (!confirm(localize("Are you sure you want to remove this condition record?", "क्या आप वाकई इस स्थिति को हटाना चाहते हैं?"))) {
      return;
    }
    await deleteCondition(user?.uid || "guest", id, activeProfileId);
    await loadData();
  };

  // Helper: check if a condition has >= 3 medication changes in the last 12 months
  const checkHighChangeFrequency = (cond: PatientConditionRecord): boolean => {
    if (!cond.medicationHistory || cond.medicationHistory.length < 3) return false;
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    const recentChanges = cond.medicationHistory.filter((m) => {
      const entryTime = m.createdAt || new Date(m.startDate).getTime();
      return entryTime >= oneYearAgo;
    });
    return recentChanges.length >= 3;
  };

  // Trends & Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = conditions.length;
    const active = conditions.filter((c) => c.status === "active").length;
    const managed = conditions.filter((c) => c.status === "managed").length;
    const resolved = conditions.filter((c) => c.status === "resolved").length;

    let totalMedChanges = 0;
    let changesLast12Months = 0;
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

    const yearlyDistribution: Record<string, number> = {};

    conditions.forEach((c) => {
      (c.medicationHistory || []).forEach((m) => {
        totalMedChanges += 1;
        const entryTime = m.createdAt || new Date(m.startDate).getTime();
        if (entryTime >= oneYearAgo) {
          changesLast12Months += 1;
        }
        const yr = new Date(m.startDate || m.createdAt).getFullYear();
        if (!isNaN(yr)) {
          yearlyDistribution[yr] = (yearlyDistribution[yr] || 0) + 1;
        }
      });
    });

    return {
      total,
      active,
      managed,
      resolved,
      totalMedChanges,
      changesLast12Months,
      yearlyDistribution,
    };
  }, [conditions]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition"
            >
              ←
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>📋</span>
                <span>{localize("Patient Chronic & Medication History", "रोगी का दीर्घकालिक व दवा इतिहास")}</span>
              </h1>
              <p className="text-xs text-[var(--muted)]">
                {localize(
                  "Longitudinal tracking of diagnoses, medication adjustments, and doctor review flags",
                  "निदान, दवा समायोजन और डॉक्टर परामर्श समीक्षा का विस्तृत इतिहास"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ProfileSwitcher />
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-8 md:px-8 space-y-8">
        <MedicalDisclaimer />

        {/* Feedback Alert Notice */}
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300 flex items-center justify-between"
          >
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-xs text-emerald-400 underline">
              ✕
            </button>
          </motion.div>
        )}

        {/* Header Action & Profile Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-3xl border border-[color:var(--border)] bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-cyan-950/40 p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <span>👤</span>
              <span>{activeProfile?.name || localize("Active Patient Profile", "सक्रिय रोगी प्रोफ़ाइल")}</span>
            </div>
            <h2 className="mt-1 text-2xl md:text-3xl font-black text-white">
              {localize("Longitudinal Clinical History", "दीर्घकालिक क्लिनिकल इतिहास")}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)] max-w-2xl">
              {localize(
                "Document how conditions and prescriptions evolve over time. When medications change frequently, RoboDoctor prompts a structured specialist review conversation.",
                "दवाओं और स्वास्थ्य स्थितियों के बदलाव को समय के साथ ट्रैक करें। जब दवाओं में बार-बार बदलाव होता है, तो रोबोडॉक्टर विशेषज्ञ परामर्श की सलाह देता है।"
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddConditionModal(true)}
              className="rounded-full bg-cyan-400 px-6 py-3.5 text-sm font-bold text-slate-950 hover:bg-cyan-300 shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <span>➕</span>
              <span>{localize("Log New Condition", "नई स्थिति जोड़ें")}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-3.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/20 transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>📥</span>
              <span>{localize("Upload SBAR File", "SBAR फाइल अपलोड करें")}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSbarModal(true)}
              className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-5 py-3.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/20 transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>📑</span>
              <span>{localize("Export SBAR PDF", "SBAR रिपोर्ट निर्यात")}</span>
            </button>
            <Link
              href="/export-report?mode=history_only"
              className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-3.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>{localize("SBAR Studio ↗", "SBAR स्टूडियो ↗")}</span>
            </Link>
          </div>
        </div>

        {/* Feature Usage Guide */}
        <FeatureGuide
          badge={localize("Longitudinal History & SBAR Ingestion", "दीर्घकालिक इतिहास व एसबीएआर आयात")}
          title={localize("How to Track Conditions & Import SBAR Reports", "बीमारियों को ट्रैक करने और एसबीएआर रिपोर्ट आयात करने का तरीका")}
          purpose={localize(
            "Maintain a structured timeline of your health conditions, medication changes, and hospital discharges. Easily import doctor notes and generate SBAR summaries.",
            "अपनी स्वास्थ्य स्थितियों, दवाओं के बदलाव और अस्पताल डिस्चार्ज का एक संरचित रिकॉर्ड रखें। डॉक्टर के पर्चे आसानी से आयात करें और एसबीएआर सारांश बनाएं।"
          )}
          inputs={[
            localize("Condition name (e.g. Hypertension, Type 2 Diabetes, Asthma)", "बीमारी का नाम (जैसे हाइपरटेंशन, टाइप 2 डायबिटीज, अस्थमा)"),
            localize("Status: Active (ongoing), Managed (under control), or Resolved", "स्थिति: सक्रिय (चल रही है), नियंत्रित, या ठीक हो चुकी"),
            localize("Medication changes: Drug name, dose, reason, and prescribing doctor", "दवा बदलाव: दवा का नाम, खुराक, बदलने का कारण और डॉक्टर"),
            localize("Or import directly: Drag and drop an SBAR PDF / hospital discharge file", "या सीधे आयात करें: एसबीएआर पीडीएफ / डिस्चार्ज फाइल ड्रैग और ड्रॉप करें"),
          ]}
          steps={[
            localize("Click 'Log New Condition' or 'Upload SBAR File'", "'नई स्थिति जोड़ें' या 'एसबीएआर फाइल अपलोड करें' पर क्लिक करें"),
            localize("Record new medications or dosage adjustments as they occur", "समय-समय पर नई दवाएं या खुराक में बदलाव दर्ज करें"),
            localize("Export clean clinical SBAR report for your next doctor appointment", "अपने अगले डॉक्टर अपॉइंटमेंट के लिए क्लिनिकल एसबीएआर रिपोर्ट डाउनलोड करें"),
          ]}
          outputs={[
            localize("Color-coded status timeline (Active vs Managed vs Resolved)", "रंग-कोडित स्थिति समयरेखा (सक्रिय बनाम नियंत्रित बनाम ठीक)"),
            localize("Frequent Medication Change Alerts (>3 changes prompts specialist review)", "अक्सर दवा बदलाव चेतावनी (3 से अधिक बदलाव पर डॉक्टर समीक्षा सलाह)"),
            localize("Standardized Hospital-Grade SBAR clinical summary ready to print", "प्रिंट के लिए तैयार मानकीकृत अस्पताल-ग्रेड एसबीएआर सारांश"),
          ]}
          tip={localize(
            "Tip: You can drag and drop any PDF discharge summary directly into the 'Upload SBAR File' window to instantly populate conditions and prescriptions with zero manual typing.",
            "सुझाव: बिना टाइप किए तुरंत बीमारियों और दवाओं को भरने के लिए 'एसबीएआर फाइल अपलोड करें' विंडो में किसी भी डिस्चार्ज पीडीएफ को सीधे ड्रैग-एंड-ड्रॉप कर सकते हैं।"
          )}
        />

        {/* Analytics & Longitudinal Trends Dashboard */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {localize("Tracked Conditions", "निगरानी की जा रही स्थितियां")}
            </p>
            <p className="mt-2 text-3xl font-black text-cyan-300">{summaryMetrics.total}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
              <span className="text-emerald-400 font-bold">{summaryMetrics.active} {localize("Active", "सक्रिय")}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold">{summaryMetrics.managed} {localize("Managed", "नियंत्रित")}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {localize("Total Rx Changes", "कुल दवा बदलाव")}
            </p>
            <p className="mt-2 text-3xl font-black text-white">{summaryMetrics.totalMedChanges}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {localize("Cumulative dosage & drug switches", "खुराक और दवाओं के ऐतिहासिक बदलाव")}
            </p>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {localize("Changes (Last 12 Mo)", "बदलाव (पिछले 12 महीने)")}
            </p>
            <p className={`mt-2 text-3xl font-black ${summaryMetrics.changesLast12Months >= 3 ? "text-amber-400" : "text-emerald-400"}`}>
              {summaryMetrics.changesLast12Months}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {summaryMetrics.changesLast12Months >= 3
                ? localize("High titration frequency alert", "बार-बार दवा बदलाव का संकेत")
                : localize("Treatment regimen stable", "इलाज की स्थिति स्थिर")}
            </p>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {localize("Clinical Stability", "क्लिनिकल स्थिरता")}
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-400">
              {summaryMetrics.total === 0
                ? "—"
                : summaryMetrics.changesLast12Months >= 3
                ? localize("Review Advised", "समीक्षा अनुशंसित")
                : localize("Optimal", "अनुकूल")}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {localize("Based on 12-month change rate", "12 महीने के परिवर्तन दर पर आधारित")}
            </p>
          </div>
        </div>

        {/* Visual Trend Chart: Medication Changes Over Time */}
        {Object.keys(summaryMetrics.yearlyDistribution).length > 0 && (
          <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📊</span>
                  <span>{localize("Medication Adjustment Trends by Year", "वर्षवार दवा समायोजन रुझान")}</span>
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {localize("Annual distribution of prescription modifications and dose titrations", "वार्षिक नुस्खे में बदलाव और खुराक समायोजन का विवरण")}
                </p>
              </div>
            </div>

            <div className="flex items-end gap-6 pt-4 pb-2 border-b border-[color:var(--border)] h-40">
              {Object.entries(summaryMetrics.yearlyDistribution).map(([year, count]) => {
                const maxCount = Math.max(...Object.values(summaryMetrics.yearlyDistribution), 1);
                const heightPct = Math.max(15, Math.round((count / maxCount) * 100));

                return (
                  <div key={year} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-xs font-mono font-bold text-cyan-300 opacity-80 group-hover:opacity-100">
                      {count} {localize("changes", "बदलाव")}
                    </span>
                    <div
                      className="w-full max-w-[50px] rounded-t-xl bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-300 group-hover:from-cyan-500 group-hover:to-cyan-300"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-xs font-mono text-[var(--muted)]">{year}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Conditions List & Longitudinal Timeline */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🩺</span>
              <span>{localize("Chronic Conditions & Treatment Timelines", "दीर्घकालिक स्थितियां और दवा समयरेखा")}</span>
            </h3>
            <span className="text-xs font-mono text-[var(--muted)]">
              {conditions.length} {localize("recorded", "दर्ज")}
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-12 text-center text-sm text-[var(--muted)]">
              {localize("Loading patient history...", "रोगी का इतिहास लोड हो रहा है...")}
            </div>
          ) : conditions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] p-12 text-center space-y-4">
              <span className="text-4xl">📋</span>
              <h4 className="text-lg font-bold text-white">
                {localize("No chronic conditions recorded yet", "अभी तक कोई पुरानी स्थिति दर्ज नहीं है")}
              </h4>
              <p className="text-xs text-[var(--muted)] max-w-md mx-auto">
                {localize(
                  "Log chronic conditions like Type 2 Diabetes, Hypertension, or Asthma to track medications and see how treatments evolved over time.",
                  "डायबिटीज, हाई ब्लड प्रेशर या अस्थमा जैसी स्थितियों को दर्ज करें ताकि आप उनकी दवाओं और समय के साथ हुए बदलावों को ट्रैक कर सकें।"
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddConditionModal(true)}
                  className="rounded-full bg-cyan-400 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 transition cursor-pointer"
                >
                  {localize("Add First Condition", "पहली स्थिति जोड़ें")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📥</span>
                  <span>{localize("Upload SBAR File", "SBAR फाइल अपलोड करें")}</span>
                </button>
              </div>
            </div>
          ) : (
            conditions.map((cond) => {
              const isHighFrequency = checkHighChangeFrequency(cond);
              const history = cond.medicationHistory || [];

              return (
                <div
                  key={cond._id}
                  className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-xl space-y-6 transition hover:border-cyan-500/30"
                >
                  {/* Condition Header */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-2xl font-black text-white">{cond.name}</h4>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                            cond.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : cond.status === "managed"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-slate-700/40 text-slate-300 border border-slate-600"
                          }`}
                        >
                          {cond.status === "active"
                            ? localize("Active Treatment", "सक्रिय उपचार")
                            : cond.status === "managed"
                            ? localize("Well Managed", "नियंत्रित")
                            : localize("Resolved", "ठीक हो चुका")}
                        </span>
                        <span className="text-xs text-[var(--muted)] font-mono">
                          {localize("Diagnosed:", "निदान:")} {cond.diagnosedDate}
                        </span>
                      </div>

                      {cond.notes && (
                        <p className="mt-2 text-xs text-[var(--muted)] italic">
                          "{cond.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedConditionForMed(cond)}
                        className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-400/20 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>➕</span>
                        <span>{localize("Log Medication Change", "दवा बदलाव दर्ज करें")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCondition(cond._id)}
                        className="rounded-full border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300 hover:bg-rose-500/20 transition"
                        title={localize("Delete condition", "स्थिति हटाएं")}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* High Frequency Clinical Flag (Gentle Doctor Referral Prompt) */}
                  {isHighFrequency && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-slate-900 p-4 text-xs shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🩺</span>
                        <div>
                          <p className="font-bold text-amber-300">
                            {localize(
                              "Treatment Review Advisory (3+ Medication Changes in 12 Months)",
                              "उपचार समीक्षा सलाह (पिछले 12 महीनों में 3+ दवा बदलाव)"
                            )}
                          </p>
                          <p className="mt-1 text-slate-200 leading-relaxed">
                            {localize(
                              "This condition's treatment has changed several times recently — worth discussing a specialist referral or a treatment review with your doctor at the next visit.",
                              "इस स्थिति के इलाज में हाल ही में कई बार बदलाव हुआ है — अपनी अगली मुलाकात में डॉक्टर से विशेषज्ञ परामर्श या उपचार समीक्षा पर चर्चा करना उचित होगा।"
                            )}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Vertical Medication History Timeline */}
                  <div className="border-t border-[color:var(--border)] pt-5">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-4 flex items-center gap-2">
                      <span>⏱️</span>
                      <span>{localize("Medication & Dosage Timeline", "दवा और खुराक की समयरेखा")}</span>
                    </h5>

                    {history.length === 0 ? (
                      <p className="text-xs text-[var(--muted)] italic">
                        {localize(
                          "No medication changes logged yet. Click 'Log Medication Change' to record historical or active prescriptions.",
                          "अभी कोई दवा बदलाव दर्ज नहीं है। ऐतिहासिक या सक्रिय नुस्खा दर्ज करने के लिए 'दवा बदलाव दर्ज करें' पर क्लिक करें।"
                        )}
                      </p>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-cyan-500/30 space-y-6">
                        {history.map((med, mIdx) => {
                          const isCurrent = !med.endDate || med.endDate.toLowerCase() === "present";

                          return (
                            <div key={med._id || mIdx} className="relative group">
                              {/* Timeline Dot Indicator */}
                              <div
                                className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 ${
                                  isCurrent
                                    ? "bg-cyan-400 border-slate-950 ring-4 ring-cyan-400/20"
                                    : "bg-slate-700 border-slate-950"
                                }`}
                              />

                              <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4 transition group-hover:border-cyan-400/40">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-white">
                                      💊 {med.medicineName}
                                    </span>
                                    <span className="font-mono text-xs text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                                      {med.dosage}
                                    </span>
                                    {isCurrent && (
                                      <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                                        {localize("Current", "वर्तमान")}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs text-[var(--muted)] font-mono">
                                    {med.startDate} → {isCurrent ? localize("Present", "वर्तमान") : med.endDate}
                                  </div>
                                </div>

                                <div className="mt-3 text-xs text-slate-300">
                                  <span className="font-semibold text-cyan-400">
                                    {localize("Reason for change:", "बदलाव का कारण:")}{" "}
                                  </span>
                                  <span>{med.reasonForChange}</span>
                                </div>

                                {med.prescribedBy && (
                                  <div className="mt-1 text-[11px] text-[var(--muted)] font-mono">
                                    <span>{localize("Prescribed by:", "द्वारा निर्धारित:")} </span>
                                    <span className="text-slate-300">{med.prescribedBy}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL: ADD CONDITION */}
      {showAddConditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-[color:var(--border)] bg-slate-900 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span>
                <span>{localize("Log Chronic Condition", "पुरानी स्थिति जोड़ें")}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddConditionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCondition} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {localize("Condition Name", "स्थिति का नाम")} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={localize("e.g. Type 2 Diabetes, Hypertension, Asthma", "उदा. टाइप 2 डायबिटीज, उच्च रक्तचाप")}
                  value={condName}
                  onChange={(e) => setCondName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {localize("Diagnosed Date", "निदान तिथि")} *
                  </label>
                  <input
                    type="date"
                    required
                    value={condDate}
                    onChange={(e) => setCondDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {localize("Status", "स्थिति")}
                  </label>
                  <select
                    value={condStatus}
                    onChange={(e) => setCondStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="active">{localize("Active Treatment", "सक्रिय उपचार")}</option>
                    <option value="managed">{localize("Well Managed", "नियंत्रित")}</option>
                    <option value="resolved">{localize("Resolved", "ठीक हो चुका")}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {localize("Clinical Notes / Symptoms Context", "क्लिनिकल नोट्स / संदर्भ")}
                </label>
                <textarea
                  rows={3}
                  placeholder={localize("e.g. Diagnosed after routine HbA1c check (7.4%). No retinopathy detected.", "उदा. नियमित जांच में पता चला।")}
                  value={condNotes}
                  onChange={(e) => setCondNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddConditionModal(false)}
                  className="rounded-full px-5 py-2.5 font-semibold text-slate-400 hover:text-white"
                >
                  {localize("Cancel", "रद्द करें")}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-cyan-400 px-6 py-2.5 font-bold text-slate-950 hover:bg-cyan-300 transition"
                >
                  {localize("Save Condition", "स्थिति सहेजें")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: ADD MEDICATION CHANGE */}
      {selectedConditionForMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-[color:var(--border)] bg-slate-900 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>💊</span>
                  <span>{localize("Log Medication Change", "दवा बदलाव दर्ज करें")}</span>
                </h4>
                <p className="text-xs text-cyan-400 font-semibold mt-0.5">
                  {localize("For:", "के लिए:")} {selectedConditionForMed.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedConditionForMed(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMedChange} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {localize("Medicine Name", "दवा का नाम")} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={localize("e.g. Metformin, Amlodipine", "उदा. मेटफॉर्मिन")}
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {localize("Dosage / Frequency", "खुराक / आवृत्ति")} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={localize("e.g. 500mg once daily", "उदा. 500mg दिन में एक बार")}
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {localize("Start Date", "शुरू होने की तिथि")} *
                  </label>
                  <input
                    type="date"
                    required
                    value={medStartDate}
                    onChange={(e) => setMedStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">
                    {localize("End Date", "समाप्ति तिथि")}
                  </label>
                  <input
                    type="date"
                    disabled={medIsCurrent}
                    value={medEndDate}
                    onChange={(e) => setMedEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white disabled:opacity-40 focus:border-cyan-400 focus:outline-none"
                  />
                  <div className="mt-1 flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="currentCheck"
                      checked={medIsCurrent}
                      onChange={(e) => setMedIsCurrent(e.target.checked)}
                      className="rounded text-cyan-400"
                    />
                    <label htmlFor="currentCheck" className="text-[11px] text-slate-400 cursor-pointer">
                      {localize("Currently taking this medicine", "वर्तमान में यह दवा ले रहे हैं")}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {localize("Reason for Change", "बदलाव का कारण")} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={localize("e.g. dose increased — BP not controlled, switched due to side effects", "उदा. खुराक बढ़ाई गई - रक्तचाप नियंत्रित नहीं था")}
                  value={medReason}
                  onChange={(e) => setMedReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {localize("Prescribing Doctor (Optional)", "प्रिस्क्राइब करने वाले डॉक्टर (वैकल्पिक)")}
                </label>
                <input
                  type="text"
                  placeholder={localize("e.g. Dr. Rajesh Sharma (Cardiologist)", "उदा. डॉ. शर्मा (हृदय रोग विशेषज्ञ)")}
                  value={medPrescribedBy}
                  onChange={(e) => setMedPrescribedBy(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConditionForMed(null)}
                  className="rounded-full px-5 py-2.5 font-semibold text-slate-400 hover:text-white"
                >
                  {localize("Cancel", "रद्द करें")}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-cyan-400 px-6 py-2.5 font-bold text-slate-950 hover:bg-cyan-300 transition"
                >
                  {localize("Save Medication Change", "बदलाव सहेजें")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Direct In-Module SBAR Handover Preview & Print Modal */}
      {showSbarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto space-y-6"
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📑</span>
                <div>
                  <h3 className="text-lg font-bold text-cyan-300">
                    {localize("SBAR Clinical Handover • Patient History & Meds", "SBAR क्लिनिकल सारांश • रोगी इतिहास व दवाइयां")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {localize("Standardized doctor-ready longitudinal handover", "चिकित्सक के लिए मानकीकृत सारांश")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300 shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>{localize("Print / Save PDF", "PDF सेव / प्रिंट")}</span>
                </button>
                <Link
                  href="/export-report?mode=history_only"
                  className="rounded-full border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  {localize("Full Studio ↗", "फुल स्टूडियो ↗")}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSbarModal(false)}
                  className="rounded-full border border-slate-700 bg-slate-800 p-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* SBAR Document Preview Sheet */}
            <div id="sbar-printable" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-6 text-xs text-slate-300">
              {/* Report Meta Banner */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-base font-extrabold text-cyan-400">🩺 RoboDoctor AI Clinical Handover</div>
                  <div className="text-[11px] text-slate-400">ID: {sbarReport.reportId} • Generated: {sbarReport.generatedAt}</div>
                  <div className="text-[11px] text-slate-300 font-semibold mt-1">Patient: {sbarReport.patientName} ({sbarReport.age}y / {sbarReport.gender})</div>
                </div>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 text-[11px] font-bold text-cyan-300">
                  {sbarReport.overallRiskLevel.toUpperCase()} REVIEW PRIORITY
                </span>
              </div>

              {/* S: Situation */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-sm">
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs font-black">S</span>
                  <span>SITUATION (Longitudinal Chronic Audit)</span>
                </div>
                <p className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-slate-200">
                  {sbarReport.primaryChiefComplaint}
                </p>
              </div>

              {/* B: Background */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-sm">
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs font-black">B</span>
                  <span>BACKGROUND (Tracked Conditions & Medication Changes)</span>
                </div>
                {sbarReport.chronicConditions && sbarReport.chronicConditions.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {sbarReport.chronicConditions.map((cond, cIdx) => (
                      <div key={cIdx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{cond.name}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            {cond.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Diagnosed: {cond.diagnosedDate} • {cond.changeCount} changes logged
                        </div>
                        {cond.currentMedicine && (
                          <div className="text-[11px] font-semibold text-emerald-400">
                            Active Rx: {cond.currentMedicine}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 italic">
                          {cond.historySummary}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No chronic conditions currently logged.</p>
                )}
              </div>

              {/* O: Objective */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-sm">
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs font-black">O</span>
                  <span>OBJECTIVE (Stability & Titration Metrics)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Conditions Tracked</span>
                    <span className="text-sm font-bold text-cyan-300 mt-0.5 block">{sbarReport.chronicConditions?.length || 0}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Active Prescriptions</span>
                    <span className="text-sm font-bold text-emerald-400 mt-0.5 block">{sbarReport.currentMedicines.length}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Rx Changes</span>
                    <span className="text-sm font-bold text-slate-100 mt-0.5 block">
                      {(sbarReport.chronicConditions || []).reduce((acc, c) => acc + (c.changeCount || 0), 0)}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Clinical Status</span>
                    <span className={`text-sm font-bold mt-0.5 block ${sbarReport.overallRiskLevel === "high" ? "text-amber-400" : "text-emerald-400"}`}>
                      {sbarReport.overallRiskLevel === "high" ? "Titration Review" : "Stable"}
                    </span>
                  </div>
                </div>
              </div>

              {/* A: Assessment */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-sm">
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs font-black">A</span>
                  <span>ASSESSMENT (Clinical Pharmacotherapy Findings)</span>
                </div>
                {sbarReport.redFlags && sbarReport.redFlags.length > 0 ? (
                  <div className="space-y-1.5">
                    {sbarReport.redFlags.map((rf, rIdx) => (
                      <div key={rIdx} className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-200">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>{rf.title}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-300">{rf.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-slate-300">
                    Chronic pharmacotherapy regimen demonstrates longitudinal stability with no high-frequency adjustments flagged.
                  </p>
                )}
              </div>

              {/* R: Recommendation */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-cyan-300 text-sm">
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-xs font-black">R</span>
                  <span>RECOMMENDATION & PRECAUTIONS</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                  <div className="font-semibold text-cyan-300">Follow-Up Guidance:</div>
                  <p>{sbarReport.recommendedFollowUp}</p>
                  <div className="border-t border-slate-800 pt-2 font-semibold text-slate-400">Clinical Precautions:</div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                    {sbarReport.precautions.map((prec, pIdx) => (
                      <li key={pIdx}>{prec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* SBAR File Upload & Ingestion Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📥</span>
                <div>
                  <h3 className="text-lg font-bold text-emerald-300">
                    {localize("Upload SBAR Clinical File", "SBAR क्लिनिकल फाइल अपलोड करें")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {localize("Import chronic conditions and prescriptions from an SBAR JSON or text note", "SBAR JSON या टेक्स्ट नोट से स्थितियों और दवाओं को आयात करें")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedImport(null);
                  setImportError(null);
                }}
                className="rounded-full border border-slate-700 bg-slate-800 p-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* File Dropzone */}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processUploadedFile(file);
              }}
              className={`block border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                isDraggingFile
                  ? "border-emerald-400 bg-emerald-950/40 scale-[1.01]"
                  : "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/10"
              }`}
            >
              <div className="text-3xl mb-2">📄</div>
              <div>
                <span className="font-bold text-emerald-400 hover:text-emerald-300 text-sm">
                  {isDraggingFile
                    ? localize("Drop your SBAR PDF or JSON file here", "अपनी SBAR PDF या JSON फाइल यहाँ छोड़ें")
                    : localize("Click to select or drag & drop SBAR file (.pdf, .json, .txt, .sbar)", "SBAR फाइल चुनें या ड्रैग करें (.pdf, .json, .txt, .sbar)")}
                </span>
                <input
                  type="file"
                  accept=".pdf,.json,.txt,.sbar,.md,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {localize("Supports clinical SBAR PDF reports, discharge summaries, and JSON exports", "क्लिनिकल SBAR PDF रिपोर्ट, डिस्चार्ज सारांश और JSON एक्सपोर्ट समर्थित")}
                </p>
              </div>
              {isParsingFile && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-emerald-400 animate-pulse pt-2">
                  <span className="animate-spin">⏳</span>
                  <span>{localize("AI is analyzing and extracting SBAR clinical data from PDF...", "AI PDF से SBAR डेटा निकाल रहा है...")}</span>
                </div>
              )}
            </label>

            {/* Paste Text Fallback */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {localize("Paste SBAR Text or JSON", "SBAR टेक्स्ट या JSON पेस्ट करें")}
              </label>
              <textarea
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='e.g. {"chronicConditions": [{"name": "Hypertension", "status": "managed", "currentMedicine": "Amlodipine 5mg"}]}'
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 focus:border-emerald-400 focus:outline-none"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-emerald-500/30 transition"
                >
                  {localize("Parse Content", "कंटेंट पार्स करें")}
                </button>
              </div>
            </div>

            {/* Parsed Preview */}
            {parsedImport && (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                    ✓ {localize("Detected Conditions to Import:", "आयात के लिए पहचानी गई स्थितियां:")}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {parsedImport.conditions.length} found
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {parsedImport.conditions.map((cond, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">{cond.name}</div>
                        <div className="text-[10px] text-slate-400">
                          Status: <span className="text-cyan-300 font-semibold uppercase">{cond.status}</span>
                          {cond.medications && cond.medications.length > 0 && (
                            <span className="ml-2 text-emerald-400">
                              • Rx: {cond.medications[0].medicineName} ({cond.medications[0].dosage})
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-emerald-400 font-bold text-xs">Ready</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-emerald-500/20">
                  <button
                    type="button"
                    onClick={() => setParsedImport(null)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    {localize("Clear", "साफ करें")}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="px-6 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                  >
                    {isImporting
                      ? localize("Importing...", "आयात हो रहा है...")
                      : localize(`Import ${parsedImport.conditions.length} Condition(s)`, `${parsedImport.conditions.length} स्थितियां आयात करें`)}
                  </button>
                </div>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs">
                <strong>Error:</strong> {importError}
              </div>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}
