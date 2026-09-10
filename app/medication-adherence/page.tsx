"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import FeatureGuide from "@/components/FeatureGuide";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/app/context/ActiveProfileContext";
import { useLocalize } from "@/lib/useLocalize";
import { DoseStatus } from "@/lib/models/DoseLog";

interface ScheduledDose {
  id: string;
  reminderId: string;
  title: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  instructions?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: DoseStatus;
  recordedAt?: number;
  recordedBy?: string;
  reason?: string;
  note?: string;
}

interface AdherenceSummary {
  todayRate: number;
  dosesTaken: number;
  dosesTotal: number;
  dosesMissed: number;
  dosesSkipped: number;
  dosesPending: number;
  sevenDayRate: number;
  thirtyDayRate: number;
  currentStreak: number;
}

const COMMON_REASONS = [
  { key: "side_effects", en: "Side effects or discomfort", hi: "दुष्प्रभाव या असहजता" },
  { key: "felt_better", en: "Felt better / symptoms resolved", hi: "बेहतर महसूस हुआ / लक्षण ठीक हुए" },
  { key: "forgot", en: "Forgot / disrupted schedule", hi: "भूल गए / व्यस्तता" },
  { key: "doctor_advised", en: "Doctor or pharmacist advised stop", hi: "डॉक्टर या फार्मासिस्ट ने रोकने को कहा" },
  { key: "ran_out", en: "Ran out of medication / refill needed", hi: "दवा खत्म हो गई / रीफिल चाहिए" },
  { key: "fasting", en: "Fasting or dietary restriction", hi: "उपवास या भोजन प्रतिबंध" },
  { key: "other", en: "Other reason", hi: "अन्य कारण" },
];

function MedicationAdherenceContent() {
  const localize = useLocalize();
  const { user } = useAuth();
  const { activeProfileId, activeProfile } = useActiveProfile();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [doses, setDoses] = useState<ScheduledDose[]>([]);
  const [summary, setSummary] = useState<AdherenceSummary>({
    todayRate: 100,
    dosesTaken: 0,
    dosesTotal: 0,
    dosesMissed: 0,
    dosesSkipped: 0,
    dosesPending: 0,
    sevenDayRate: 100,
    thirtyDayRate: 100,
    currentStreak: 0,
  });
  const [loading, setLoading] = useState(true);

  // Reason Modal State
  const [activeModalDose, setActiveModalDose] = useState<{
    dose: ScheduledDose;
    targetStatus: DoseStatus;
  } | null>(null);
  const [selectedReason, setSelectedReason] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const isToday = useMemo(() => {
    return selectedDate === new Date().toISOString().slice(0, 10);
  }, [selectedDate]);

  // Load Doses & Summary
  const fetchAdherenceData = async () => {
    setLoading(true);
    try {
      const uParam = encodeURIComponent(user?.uid || "guest");
      const dParam = encodeURIComponent(activeProfileId || "myself");
      const dateParam = encodeURIComponent(selectedDate);

      const res = await fetch(
        `/api/medication-adherence?userId=${uParam}&dependentId=${dParam}&date=${dateParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setDoses(data.doses || []);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn("Failed to load adherence records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdherenceData();
  }, [user, activeProfileId, selectedDate]);

  // Navigate Date
  const handleDateShift = (deltaDays: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // Direct Quick Status Update (for Taken / Taken Late)
  const handleQuickStatus = async (dose: ScheduledDose, status: DoseStatus) => {
    if (status === "missed" || status === "skipped") {
      // Open Reason modal to collect context
      setActiveModalDose({ dose, targetStatus: status });
      setSelectedReason("");
      setCustomNote("");
      return;
    }

    await submitStatusChange(dose, status, undefined, undefined);
  };

  const submitStatusChange = async (
    dose: ScheduledDose,
    status: DoseStatus,
    reason?: string,
    note?: string
  ) => {
    setSubmittingStatus(true);
    try {
      const payload = {
        userId: user?.uid || "guest",
        dependentId: activeProfileId || "myself",
        reminderId: dose.reminderId,
        scheduledDate: dose.scheduledDate,
        scheduledTime: dose.scheduledTime,
        status,
        reason,
        note,
        recordedBy: user?.displayName || user?.email || "Patient",
      };

      const res = await fetch("/api/medication-adherence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Optimistically update list
        setDoses((prev) =>
          prev.map((d) =>
            d.reminderId === dose.reminderId && d.scheduledTime === dose.scheduledTime
              ? {
                  ...d,
                  status,
                  recordedAt: Date.now(),
                  reason,
                  note,
                }
              : d
          )
        );

        if (status === "missed" || status === "skipped") {
          setAlertMessage(
            localize(
              "Dose recorded. Remember: Do not double the next dose to make up for this dose.",
              "खुराक दर्ज की गई। याद रखें: छूटी खुराक की भरपाई के लिए अगली खुराक को दोगुना न करें।"
            )
          );
          setTimeout(() => setAlertMessage(null), 6000);
        }

        // Re-fetch summary stats in background
        void fetchAdherenceData();
      }
    } catch (err) {
      console.error("Failed to update dose status:", err);
    } finally {
      setSubmittingStatus(false);
      setActiveModalDose(null);
    }
  };

  // Group doses by time period of day
  const groupedDoses = useMemo(() => {
    const morning: ScheduledDose[] = [];
    const afternoon: ScheduledDose[] = [];
    const evening: ScheduledDose[] = [];
    const night: ScheduledDose[] = [];

    doses.forEach((d) => {
      const hour = parseInt(d.scheduledTime.split(":")[0], 10) || 9;
      if (hour >= 5 && hour < 12) {
        morning.push(d);
      } else if (hour >= 12 && hour < 17) {
        afternoon.push(d);
      } else if (hour >= 17 && hour < 21) {
        evening.push(d);
      } else {
        night.push(d);
      }
    });

    return [
      { key: "morning", titleEn: "Morning", titleHi: "सुबह", icon: "🌅", range: "05:00 - 11:59", items: morning },
      { key: "afternoon", titleEn: "Afternoon", titleHi: "दोपहर", icon: "☀️", range: "12:00 - 16:59", items: afternoon },
      { key: "evening", titleEn: "Evening", titleHi: "शाम", icon: "🌆", range: "17:00 - 20:59", items: evening },
      { key: "night", titleEn: "Night / Bedtime", titleHi: "रात / सोते समय", icon: "🌙", range: "21:00 - 04:59", items: night },
    ];
  }, [doses]);

  const getFormIcon = (form?: string) => {
    switch (form?.toLowerCase()) {
      case "syrup":
        return "🧪";
      case "injection":
        return "💉";
      case "inhaler":
        return "🌬️";
      case "drops":
        return "💧";
      case "cream":
        return "🧴";
      case "capsule":
        return "💊";
      default:
        return "💊";
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-24">
      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/90 backdrop-blur-md px-6 py-4">
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
                <span>🗓️</span>
                <span>{localize("Medication Adherence Checklist", "दवा पालन व खुराक चेकलिस्ट")}</span>
              </h1>
              <p className="text-xs text-[var(--muted)]">
                {localize("Daily scheduled doses, adherence tracking & safety log", "दैनिक निर्धारित खुराक, पालन दर व सुरक्षा ट्रैकिंग")}
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

      <main className="mx-auto max-w-7xl px-4 pt-6 md:px-8 space-y-6">
        <MedicalDisclaimer />

        {/* Feature Usage Guide */}
        <FeatureGuide
          badge={localize("Daily Medication Compliance", "दैनिक दवा अनुपालन")}
          title={localize("How to Track Your Daily Medication Adherence", "अपनी दैनिक दवा खुराक को कैसे ट्रैक करें")}
          purpose={localize(
            "Track scheduled doses, log whether medicines were taken on time, late, or missed, and build longitudinal adherence history for doctor reviews.",
            "निर्धारित खुराक ट्रैक करें, दर्ज करें कि दवा समय पर ली गई, देर से ली गई या छूट गई, और डॉक्टर समीक्षा के लिए विस्तृत इतिहास बनाएं।"
          )}
          inputs={[
            localize("Select active patient profile (Myself or family dependent)", "सक्रिय रोगी चुनें (स्वयं या परिवार का सदस्य)"),
            localize("Choose the date you want to review or record", "वह तारीख चुनें जिसकी समीक्षा या प्रविष्टि करनी है"),
            localize("Mark each scheduled dose: Taken, Taken Late, Missed, or Skipped", "प्रत्येक खुराक दर्ज करें: ली गई, देर से ली, छूट गई, या छोड़ दी"),
          ]}
          steps={[
            localize("1. Check your morning, afternoon, evening, and night dose cards", "1. सुबह, दोपहर, शाम और रात की खुराक कार्ड देखें"),
            localize("2. Click 'Taken' after taking your medicine, or 'Missed' if skipped", "2. दवा लेने के बाद 'Taken' दबाएं, छूटने पर 'Missed' चुनें"),
            localize("3. If missed or skipped, optionally note why (e.g. side effects, forgot)", "3. छूटने पर कारण दर्ज करें (उदा. दुष्प्रभाव, भूल गए)"),
          ]}
          outputs={[
            localize("Real-time adherence percentage for today, 7 days, and 30 days", "आज, 7 दिन और 30 दिन की वास्तविक दवा पालन दर"),
            localize("Consecutive days adherence streak tracker", "लगातार सही समय पर दवा लेने का स्ट्रिक रिकॉर्ड"),
            localize("Structured adherence table ready for clinical SBAR export", "क्लीनिकल SBAR रिपोर्ट में शामिल करने हेतु तैयार डेटा"),
          ]}
          tip={localize(
            "Safety Warning: Never double up on your next dose to make up for a missed dose. If in doubt, speak to your prescribing physician or pharmacist.",
            "सुरक्षा चेतावनी: कभी भी छूटी हुई खुराक की भरपाई के लिए अगली खुराक दोगुनी न करें। संशय होने पर डॉक्टर या फार्मासिस्ट से परामर्श लें।"
          )}
        />

        {/* Active Profile & Date Navigator Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-3xl border border-[color:var(--border)] bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-cyan-950/40 p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                {localize("Active Patient Profile", "सक्रिय रोगी प्रोफ़ाइल")}
              </p>
              <h2 className="text-xl font-black text-white">
                {activeProfile ? activeProfile.name : user?.displayName || localize("Myself (Account Owner)", "स्वयं (खाता धारक)")}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleDateShift(-1)}
              className="rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2 text-sm font-semibold hover:bg-slate-700 transition"
              title={localize("Previous Day", "पिछला दिन")}
            >
              ◀
            </button>
            <button
              type="button"
              onClick={handleSetToday}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                isToday
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
                  : "border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
              }`}
            >
              {localize("Today", "आज")}
            </button>
            <button
              type="button"
              onClick={() => handleDateShift(1)}
              className="rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2 text-sm font-semibold hover:bg-slate-700 transition"
              title={localize("Next Day", "अगला दिन")}
            >
              ▶
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Missed Dose Warning Alert */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs md:text-sm text-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-bold text-amber-300">
                {localize("Clinical Safety Reminder on Missed Doses", "छूटी हुई खुराक पर क्लीनिकल सुरक्षा निर्देश")}
              </p>
              <p className="mt-1 leading-relaxed">
                {localize(
                  "Do not double the next dose to compensate for a missed dose unless specifically instructed by your doctor or pharmacist. Doing so can cause medication toxicity or unexpected side effects.",
                  "किसी छूटी हुई खुराक की भरपाई के लिए अगली खुराक को कभी भी दोगुना न करें, जब तक कि डॉक्टर या फार्मासिस्ट ने स्पष्ट निर्देश न दिया हो। इससे विषाक्तता या दुष्प्रभाव हो सकते हैं।"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Temporary Alert Toast */}
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 text-sm font-semibold text-emerald-300 flex items-center justify-between"
          >
            <span>{alertMessage}</span>
            <button onClick={() => setAlertMessage(null)} className="text-xs underline text-emerald-400">
              ✕
            </button>
          </motion.div>
        )}

        {/* Adherence Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Today's Rate */}
          <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/70 p-5 shadow-lg flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-cyan-400 font-bold">
                {localize("Today's Adherence", "आज का अनुपालन")}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-black text-white">{summary.todayRate}%</span>
                <span className="text-xs text-[var(--muted)]">
                  ({summary.dosesTaken}/{summary.dosesTotal})
                </span>
              </div>
            </div>
            <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, summary.todayRate))}%` }}
              />
            </div>
          </div>

          {/* 7-Day Rate */}
          <div className="rounded-3xl border border-emerald-500/20 bg-slate-900/70 p-5 shadow-lg flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                {localize("7-Day Adherence", "7-दिवसीय अनुपालन")}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-black text-white">{summary.sevenDayRate}%</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              {localize("Weekly compliance trend", "साप्ताहिक दवा अनुपालन")}
            </p>
          </div>

          {/* 30-Day Rate */}
          <div className="rounded-3xl border border-indigo-500/20 bg-slate-900/70 p-5 shadow-lg flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-400 font-bold">
                {localize("30-Day Adherence", "30-दिवसीय अनुपालन")}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-black text-white">{summary.thirtyDayRate}%</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              {localize("Monthly clinical consistency", "मासिक क्लीनिकल निरंतरता")}
            </p>
          </div>

          {/* Streak Badge */}
          <div className="rounded-3xl border border-amber-500/20 bg-slate-900/70 p-5 shadow-lg flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <span>🔥</span>
                <span>{localize("Adherence Streak", "निरंतरता स्ट्रिक")}</span>
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-black text-amber-300">
                  {summary.currentStreak}
                </span>
                <span className="text-xs text-amber-400/80">{localize("days", "दिन")}</span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">
              {localize("100% adherence consecutive days", "लगातार 100% समय पर खुराक")}
            </p>
          </div>
        </div>

        {/* Main Schedule Sections */}
        {loading ? (
          <div className="py-16 text-center text-[var(--muted)] animate-pulse">
            {localize("Loading scheduled doses...", "निर्धारित खुराक लोड हो रही हैं...")}
          </div>
        ) : doses.length === 0 ? (
          <div className="rounded-3xl border border-[color:var(--border)] bg-slate-900/60 p-10 text-center max-w-xl mx-auto">
            <span className="text-5xl">💊</span>
            <h3 className="mt-4 text-xl font-bold text-white">
              {localize("No Medications Scheduled for This Date", "इस तारीख के लिए कोई दवा निर्धारित नहीं है")}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {localize(
                "You can add medications to your daily planner or scan a doctor's prescription with AI vision.",
                "आप अपने दैनिक प्लानर में दवाएं जोड़ सकते हैं या एआई विज़न से पर्चा स्कैन कर सकते हैं।"
              )}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/prescription-scan"
                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
              >
                📷 {localize("Scan Prescription", "पर्चा स्कैन करें")}
              </Link>
              <Link
                href="/medicine-reminder"
                className="rounded-xl border border-white/20 bg-slate-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition"
              >
                ➕ {localize("Add Medicine Reminder", "रिमाइंडर जोड़ें")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedDoses.map((group) => {
              if (group.items.length === 0) return null;

              return (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span>
                      <h3 className="text-base font-bold text-white">
                        {localize(group.titleEn, group.titleHi)}
                      </h3>
                      <span className="text-xs text-[var(--muted)]">({group.range})</span>
                    </div>
                    <span className="text-xs font-semibold text-cyan-400">
                      {group.items.length} {localize("doses", "खुराक")}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {group.items.map((dose) => (
                      <div
                        key={dose.id}
                        className={`rounded-3xl border p-5 transition shadow-lg backdrop-blur-sm ${
                          dose.status === "taken"
                            ? "border-emerald-500/40 bg-slate-900/80"
                            : dose.status === "taken_late"
                            ? "border-teal-500/40 bg-slate-900/80"
                            : dose.status === "missed"
                            ? "border-rose-500/40 bg-slate-900/80"
                            : dose.status === "skipped"
                            ? "border-amber-500/40 bg-slate-900/80"
                            : "border-[color:var(--border)] bg-slate-900/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{getFormIcon(dose.form)}</span>
                            <div>
                              <h4 className="font-extrabold text-base text-white">{dose.title}</h4>
                              {dose.genericName && (
                                <p className="text-xs text-cyan-400 font-medium">{dose.genericName}</p>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                                {dose.dosage && <span>{dose.dosage}</span>}
                                <span>•</span>
                                <span className="font-bold text-white">🕒 {dose.scheduledTime}</span>
                              </div>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              dose.status === "taken"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : dose.status === "taken_late"
                                ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                                : dose.status === "missed"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : dose.status === "skipped"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {dose.status === "taken" && `✓ ${localize("Taken", "ली गई")}`}
                            {dose.status === "taken_late" && `🕒 ${localize("Taken Late", "देर से ली")}`}
                            {dose.status === "missed" && `✕ ${localize("Missed", "छूट गई")}`}
                            {dose.status === "skipped" && `↷ ${localize("Skipped", "छोड़ दी")}`}
                            {dose.status === "pending" && `⌛ ${localize("Pending", "लंबित")}`}
                          </span>
                        </div>

                        {/* Instructions */}
                        {dose.instructions && (
                          <p className="text-xs text-slate-300 bg-slate-950/40 rounded-xl p-2.5 mb-3 border border-white/5">
                            📌 {dose.instructions}
                          </p>
                        )}

                        {/* Reason / Note display */}
                        {(dose.reason || dose.note) && (
                          <div className="text-[11px] text-amber-300/90 bg-amber-500/10 rounded-xl p-2.5 mb-3 border border-amber-500/20">
                            {dose.reason && <p className="font-semibold">⚠️ {dose.reason}</p>}
                            {dose.note && <p className="mt-0.5 text-slate-300">{dose.note}</p>}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickStatus(dose, "taken")}
                              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                dose.status === "taken"
                                  ? "bg-emerald-500 text-slate-950"
                                  : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              }`}
                            >
                              <span>✓</span>
                              <span>{localize("Taken", "ली गई")}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickStatus(dose, "taken_late")}
                              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                dose.status === "taken_late"
                                  ? "bg-teal-500 text-slate-950"
                                  : "border border-teal-500/30 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20"
                              }`}
                            >
                              <span>🕒</span>
                              <span>{localize("Late", "देर से")}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickStatus(dose, "missed")}
                              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                dose.status === "missed"
                                  ? "bg-rose-500 text-white"
                                  : "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                              }`}
                            >
                              <span>✕</span>
                              <span>{localize("Missed", "छूट गई")}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickStatus(dose, "skipped")}
                              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                dose.status === "skipped"
                                  ? "bg-amber-500 text-slate-950"
                                  : "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                              }`}
                            >
                              <span>↷</span>
                              <span>{localize("Skipped", "छोड़ दी")}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveModalDose({ dose, targetStatus: dose.status });
                              setSelectedReason(dose.reason || "");
                              setCustomNote(dose.note || "");
                            }}
                            className="text-[11px] text-[var(--muted)] hover:text-cyan-400 underline transition cursor-pointer"
                          >
                            {localize("Add Reason / Note", "कारण / नोट जोड़ें")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Navigation Links */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/patient-history"
              className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-5 py-3 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition"
            >
              📋 {localize("View Longitudinal Patient History", "दीर्घकालिक रोगी इतिहास देखें")}
            </Link>
            <Link
              href="/export-report?mode=history"
              className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              📄 {localize("Export Clinical SBAR Summary", "क्लीनिकल SBAR सारांश निर्यात करें")}
            </Link>
          </div>

          <Link
            href="/medicine-reminder"
            className="rounded-2xl bg-slate-800 px-5 py-3 text-xs font-bold text-white hover:bg-slate-700 transition"
          >
            ⏰ {localize("Manage Reminder Schedules", "रिमाइंडर शेड्यूल प्रबंधित करें")}
          </Link>
        </div>
      </main>

      {/* Reason / Note Modal */}
      <AnimatePresence>
        {activeModalDose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>📝</span>
                    <span>{localize("Record Reason for Dose Status", "खुराक स्थिति का कारण दर्ज करें")}</span>
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {activeModalDose.dose.title} • {activeModalDose.dose.scheduledTime}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModalDose(null)}
                  className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Missed Dose Warning in Modal */}
              {(activeModalDose.targetStatus === "missed" || activeModalDose.targetStatus === "skipped") && (
                <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                  <span className="font-bold">⚠️ {localize("Important Safety Advice:", "महत्वपूर्ण सुरक्षा सलाह:")}</span>{" "}
                  {localize(
                    "Do not take a double dose next time to make up for a missed dose. Contact your doctor or pharmacist if unsure.",
                    "छूटी हुई खुराक की भरपाई के लिए अगली बार दोगुनी खुराक न लें। संशय होने पर डॉक्टर या फार्मासिस्ट से संपर्क करें।"
                  )}
                </div>
              )}

              {/* Status Selector */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {localize("Dose Status", "खुराक की स्थिति")}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["taken", "taken_late", "missed", "skipped"] as DoseStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setActiveModalDose({
                          ...activeModalDose,
                          targetStatus: st,
                        })
                      }
                      className={`rounded-xl py-2 text-xs font-bold transition capitalize ${
                        activeModalDose.targetStatus === st
                          ? "bg-cyan-500 text-slate-950 shadow-md"
                          : "border border-slate-700 bg-slate-800 text-slate-300"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Selector */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {localize("Reason (Optional)", "कारण (वैकल्पिक)")}
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {COMMON_REASONS.map((r) => {
                    const label = localize(r.en, r.hi);
                    const isSelected = selectedReason === label;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setSelectedReason(isSelected ? "" : label)}
                        className={`w-full text-left rounded-xl px-3 py-2 text-xs transition flex items-center justify-between ${
                          isSelected
                            ? "border border-cyan-500/50 bg-cyan-500/15 text-cyan-300 font-bold"
                            : "border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <span>{label}</span>
                        {isSelected && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Note */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {localize("Additional Notes / Symptoms (Optional)", "अतिरिक्त विवरण / लक्षण (वैकल्पिक)")}
                </label>
                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder={localize(
                    "e.g. Mild nausea after lunch, delayed by 1 hour due to meeting...",
                    "उदा. दोपहर के भोजन के बाद हल्का सिरदर्द, बैठक के कारण 1 घंटा देर..."
                  )}
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModalDose(null)}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  {localize("Cancel", "रद्द करें")}
                </button>
                <button
                  type="button"
                  disabled={submittingStatus}
                  onClick={() =>
                    submitStatusChange(
                      activeModalDose.dose,
                      activeModalDose.targetStatus,
                      selectedReason || undefined,
                      customNote || undefined
                    )
                  }
                  className="rounded-xl bg-cyan-500 px-6 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition"
                >
                  {submittingStatus ? localize("Saving...", "सहेज रहे हैं...") : localize("Save Dose Status", "स्थिति सहेजें")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MedicationAdherencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)] p-10 text-[var(--foreground)]">
          Loading Medication Adherence Checklist...
        </div>
      }
    >
      <MedicationAdherenceContent />
    </Suspense>
  );
}
