"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  HealthReportRecord,
  loadHealthReportsPage,
  loadSkinReportsPage,
  SkinReportRecord,
} from "@/lib/reportHistory";
import { useLanguage } from "@/app/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { translateUi } from "@/lib/uiI18n";

const HealthTrendChart = dynamic(
  () => import("@/components/ReportsCharts").then((mod) => mod.HealthTrendChart),
  { ssr: false }
);

const SkinTrendChart = dynamic(
  () => import("@/components/ReportsCharts").then((mod) => mod.SkinTrendChart),
  { ssr: false }
);

function formatShortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ReportsPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);

  const [user, setUser] = useState<User | null>(null);
  const [healthReports, setHealthReports] = useState<HealthReportRecord[]>([]);
  const [skinReports, setSkinReports] = useState<SkinReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const [health, skin] = await Promise.all([
          loadHealthReportsPage(currentUser.uid, 20),
          loadSkinReportsPage(currentUser.uid, 20),
        ]);

        setHealthReports(health);
        setSkinReports(skin);
      } catch {
        setStatus(
          localize(
            "Unable to load cloud reports right now. Please try again shortly.",
            "क्लाउड रिपोर्ट अभी लोड नहीं हो पाईं। कृपया थोड़ी देर बाद फिर कोशिश करें।"
          )
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [language]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStatus(
        localize("You have been signed out.", "आप सफलतापूर्वक लॉगआउट हो गए हैं।")
      );
    } catch {
      setStatus(
        localize(
          "Logout failed. Please try again.",
          "लॉगआउट नहीं हो पाया। कृपया फिर कोशिश करें।"
        )
      );
    }
  };

  const healthChartData = useMemo(
    () =>
      [...healthReports].reverse().map((report) => ({
        date: formatShortDate(report.createdAt),
        score: report.riskScore,
      })),
    [healthReports]
  );

  const skinChartData = useMemo(
    () =>
      [...skinReports].reverse().map((report) => ({
        date: formatShortDate(report.createdAt),
        score: report.score,
      })),
    [skinReports]
  );

  const stats = useMemo(() => {
    const latestHealth = healthReports[0];
    const previousHealth = healthReports[1];
    const latestSkin = skinReports[0];
    const previousSkin = skinReports[1];

    return {
      totalHealth: healthReports.length,
      totalSkin: skinReports.length,
      latestHealthScore: latestHealth?.riskScore ?? null,
      healthTrend:
        latestHealth && previousHealth
          ? latestHealth.riskScore - previousHealth.riskScore
          : null,
      latestSkinScore: latestSkin?.score ?? null,
      skinTrend:
        latestSkin && previousSkin ? latestSkin.score - previousSkin.score : null,
    };
  }, [healthReports, skinReports]);

  const copy = {
    pageTag: localize("My Reports", "मेरी रिपोर्ट"),
    title: localize("Your health and skin history", "आपकी स्वास्थ्य और त्वचा हिस्ट्री"),
    subtitle: localize(
      "Review saved screenings, compare severity over time, and keep one place for your cloud-backed reports.",
      "सेव की गई स्क्रीनिंग रिपोर्ट देखें, समय के साथ बदलाव समझें, और सब कुछ एक जगह रखें।"
    ),
    backHome: localize("Back Home", "होम पर वापस जाएं"),
    logout: localize("Logout", "लॉगआउट"),
    login: localize("Login", "लॉगिन"),
    loginRequired: localize("Login required", "लॉगिन आवश्यक है"),
    loginNeededText: localize(
      "Cloud reports are available only for signed-in users. Guest-mode history stays in your browser on the analysis pages.",
      "क्लाउड रिपोर्ट केवल साइन-इन उपयोगकर्ताओं के लिए उपलब्ध हैं। गेस्ट हिस्ट्री विश्लेषण पेजों पर ब्राउज़र में ही रहती है।"
    ),
    loginContinue: localize("Login to Continue", "लॉगिन करें"),
    createAccount: localize("Create Account", "अकाउंट बनाएं"),
    loading: localize("Loading your reports...", "आपकी रिपोर्ट लोड हो रही हैं..."),
    healthReports: localize("Health Reports", "स्वास्थ्य रिपोर्ट"),
    latestHealthRisk: localize("Latest Health Risk", "ताज़ा स्वास्थ्य जोखिम"),
    skinReports: localize("Skin Reports", "त्वचा रिपोर्ट"),
    latestSkinRisk: localize("Latest Skin Risk", "ताज़ा त्वचा जोखिम"),
    savedEntries: localize("Saved cloud entries", "सेव क्लाउड एंट्री"),
    currentRiskScore: localize("Current risk score", "वर्तमान जोखिम स्कोर"),
    currentSeverityScore: localize(
      "Current severity score",
      "वर्तमान गंभीरता स्कोर"
    ),
    trend: localize("Trend", "रुझान"),
    healthOverTime: localize("Health risk over time", "समय के साथ स्वास्थ्य जोखिम"),
    skinOverTime: localize("Skin severity over time", "समय के साथ त्वचा गंभीरता"),
    needTwo: localize("Need 2 reports", "2 रिपोर्ट चाहिए"),
    better: localize("better", "बेहतर"),
    higher: localize("higher", "ज्यादा"),
    saveToUnlockHealth: localize(
      "Save health reports to unlock trends.",
      "रुझान देखने के लिए स्वास्थ्य रिपोर्ट सेव करें।"
    ),
    saveToUnlockSkin: localize(
      "Save skin reports to unlock trends.",
      "रुझान देखने के लिए त्वचा रिपोर्ट सेव करें।"
    ),
    vitalReports: localize("Vital Reports", "वाइटल रिपोर्ट"),
    healthChecks: localize("Health checks", "स्वास्थ्य जांच"),
    newCheck: localize("New Check", "नई जांच"),
    noHealthReports: localize(
      "No saved health reports yet.",
      "अभी तक कोई स्वास्थ्य रिपोर्ट सेव नहीं हुई।"
    ),
    skinChecks: localize("Skin checks", "त्वचा जांच"),
    noSkinReports: localize(
      "No saved skin reports yet.",
      "अभी तक कोई त्वचा रिपोर्ट सेव नहीं हुई।"
    ),
    sugar: localize("Sugar", "शुगर"),
    pulse: localize("Pulse", "नाड़ी"),
  };

  const translateRiskLabel = (value: string) => {
    if (!isHindi) {
      return translateUi(value, language);
    }

    return value
      .replace("Emergency Risk", "आपातकालीन जोखिम")
      .replace("High Risk", "उच्च जोखिम")
      .replace("Moderate Risk", "मध्यम जोखिम")
      .replace("Low Risk", "कम जोखिम");
  };

  const translateSkinSeverity = (value: string) => {
    if (!isHindi) {
      return translateUi(value, language);
    }

    return value
      .replace("Urgent", "तत्काल")
      .replace("High", "उच्च")
      .replace("Moderate", "मध्यम")
      .replace("Low", "कम");
  };

  const translateBodyPart = (value: string) => {
    if (!isHindi) {
      return translateUi(value, language);
    }

    const map: Record<string, string> = {
      face: "चेहरा",
      arm: "हाथ",
      leg: "पैर",
      chest: "छाती",
      back: "पीठ",
      genitals: "निजी भाग",
      other: "अन्य",
    };

    return map[value] || value;
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-cyan-400">
              {copy.pageTag}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">{copy.title}</h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">{copy.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {copy.backHome}
            </Link>
            {user ? (
              <button
                onClick={handleLogout}
                className="rounded-full border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm text-rose-100 hover:bg-rose-500/20"
              >
                {copy.logout}
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                {copy.login}
              </Link>
            )}
          </div>
        </div>

        {status && (
          <div className="mb-6 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-4">
            {status}
          </div>
        )}

        {!user && !loading ? (
          <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8">
            <h2 className="text-2xl font-bold">{copy.loginRequired}</h2>
            <p className="mt-3 max-w-2xl text-[var(--muted)]">{copy.loginNeededText}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                {copy.loginContinue}
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-6 py-3 hover:opacity-90"
              >
                {copy.createAccount}
              </Link>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 text-[var(--muted)]">
            {copy.loading}
          </div>
        ) : (
          <>
            <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-500/10 p-6">
                <p className="text-sm uppercase tracking-[0.18em] text-cyan-200">
                  {copy.healthReports}
                </p>
                <p className="mt-3 text-4xl font-black">{stats.totalHealth}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{copy.savedEntries}</p>
              </div>
              <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-6">
                <p className="text-sm uppercase tracking-[0.18em] text-emerald-200">
                  {copy.latestHealthRisk}
                </p>
                <p className="mt-3 text-4xl font-black">{stats.latestHealthScore ?? "-"}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{copy.currentRiskScore}</p>
              </div>
              <div className="rounded-[28px] border border-amber-400/20 bg-amber-500/10 p-6">
                <p className="text-sm uppercase tracking-[0.18em] text-amber-200">
                  {copy.skinReports}
                </p>
                <p className="mt-3 text-4xl font-black">{stats.totalSkin}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{copy.savedEntries}</p>
              </div>
              <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6">
                <p className="text-sm uppercase tracking-[0.18em] text-rose-200">
                  {copy.latestSkinRisk}
                </p>
                <p className="mt-3 text-4xl font-black">{stats.latestSkinScore ?? "-"}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {copy.currentSeverityScore}
                </p>
              </div>
            </section>

            <section className="mb-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
                      {copy.trend}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">{copy.healthOverTime}</h2>
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-black/20 px-4 py-2 text-sm text-[var(--muted)]">
                    {stats.healthTrend === null
                      ? copy.needTwo
                      : stats.healthTrend <= 0
                        ? `${Math.abs(stats.healthTrend)} ${copy.better}`
                        : `${stats.healthTrend} ${copy.higher}`}
                  </span>
                </div>

                {healthChartData.length === 0 ? (
                  <p className="text-[var(--muted)]">{copy.saveToUnlockHealth}</p>
                ) : (
                  <HealthTrendChart data={healthChartData} />
                )}
              </div>

              <div className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-amber-400">
                      {copy.trend}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">{copy.skinOverTime}</h2>
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-black/20 px-4 py-2 text-sm text-[var(--muted)]">
                    {stats.skinTrend === null
                      ? copy.needTwo
                      : stats.skinTrend <= 0
                        ? `${Math.abs(stats.skinTrend)} ${copy.better}`
                        : `${stats.skinTrend} ${copy.higher}`}
                  </span>
                </div>

                {skinChartData.length === 0 ? (
                  <p className="text-[var(--muted)]">{copy.saveToUnlockSkin}</p>
                ) : (
                  <SkinTrendChart data={skinChartData} />
                )}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
                      {copy.vitalReports}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">{copy.healthChecks}</h2>
                  </div>
                  <Link
                    href="/health-check"
                    className="rounded-full border border-[color:var(--border)] bg-black/20 px-4 py-2 text-sm hover:bg-white/10"
                  >
                    {copy.newCheck}
                  </Link>
                </div>

                {healthReports.length === 0 ? (
                  <p className="text-[var(--muted)]">{copy.noHealthReports}</p>
                ) : (
                  <div className="space-y-4">
                    {healthReports.map((report) => (
                      <div
                        key={`${report.createdAt}-${report.summary}`}
                        className="rounded-2xl border border-[color:var(--border)] bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold">
                            {translateRiskLabel(report.riskLevel)}
                          </p>
                          <span className="text-sm text-[var(--muted)]">
                            {report.riskScore}/100
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{report.summary}</p>
                        <p className="mt-3 text-xs text-[var(--muted)]">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          BP {report.bp} | {copy.sugar} {report.sugar} | {copy.pulse}{" "}
                          {report.heartRate}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-amber-400">
                      {copy.skinReports}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">{copy.skinChecks}</h2>
                  </div>
                  <Link
                    href="/skin-check"
                    className="rounded-full border border-[color:var(--border)] bg-black/20 px-4 py-2 text-sm hover:bg-white/10"
                  >
                    {copy.newCheck}
                  </Link>
                </div>

                {skinReports.length === 0 ? (
                  <p className="text-[var(--muted)]">{copy.noSkinReports}</p>
                ) : (
                  <div className="space-y-4">
                    {skinReports.map((report) => (
                      <div
                        key={`${report.createdAt}-${report.summary}`}
                        className="rounded-2xl border border-[color:var(--border)] bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-semibold capitalize">
                            {translateBodyPart(report.bodyPart)}
                          </p>
                          <span className="text-sm text-[var(--muted)]">
                            {translateSkinSeverity(report.severity)} • {report.score}/100
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{report.summary}</p>
                        <p className="mt-3 text-xs text-[var(--muted)]">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
