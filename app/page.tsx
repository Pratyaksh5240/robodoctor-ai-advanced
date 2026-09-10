"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage, useLocalize } from "@/app/context/LanguageContext";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/app/context/ActiveProfileContext";
import ProfileSwitcher, { openAddFamilyMemberModal } from "@/components/ProfileSwitcher";
import { getVitalsStreak, VitalsStreak } from "@/lib/streakService";

export const bodyCareCards = [
  {
    key: "vitals",
    titleEn: "Vital Risk Check",
    titleHi: "वाइटल जोखिम जांच",
    descriptionEn: "Enter symptoms, BP, sugar, pulse, age, height, and weight to get a structured risk summary.",
    descriptionHi: "लक्षण, बीपी, शुगर, पल्स, उम्र, लंबाई और वजन दर्ज करके संरचित जोखिम सारांश पाएं।",
    href: "/health-check",
    accent: "from-cyan-400/30 to-blue-500/30",
  },
  {
    key: "cad",
    titleEn: "CAD Risk Screener",
    titleHi: "सीएडी हृदय जांच",
    descriptionEn: "Angiographic coronary artery disease risk assessment based on clinical markers & angina symptoms.",
    descriptionHi: "क्लिनिकल मार्करों और एनजाइना लक्षणों के आधार पर कोरोनरी धमनी रोग जोखिम मूल्यांकन।",
    href: "/cad-check",
    accent: "from-rose-400/30 to-red-500/30",
  },
  {
    key: "skin",
    titleEn: "Skin Check",
    titleHi: "स्किन चेक",
    descriptionEn: "Upload or capture a skin photo, add symptoms, and get triage guidance with red flags.",
    descriptionHi: "त्वचा की फोटो अपलोड करें, लक्षण जोड़ें और रेड फ्लैग्स के साथ ट्रायज मार्गदर्शन पाएं।",
    href: "/skin-check",
    accent: "from-amber-300/30 to-rose-400/30",
  },
  {
    key: "lab",
    titleEn: "Lab Report Analyzer",
    titleHi: "लैब रिपोर्ट विश्लेषक",
    descriptionEn: "Enter common lab values like sugar, HbA1c, hemoglobin, TSH, and cholesterol for quick interpretation.",
    descriptionHi: "शुगर, HbA1c, हीमोग्लोबिन, TSH और कोलेस्ट्रॉल जैसी लैब वैल्यू भरकर तुरंत आसान व्याख्या पाएं।",
    href: "/lab-report",
    accent: "from-amber-400/30 to-yellow-300/30",
  },
  {
    key: "patienthistory",
    titleEn: "Patient History",
    titleHi: "रोगी का इतिहास",
    descriptionEn: "Track chronic conditions, longitudinal medication adjustments, prescription change frequency, and stability trends.",
    descriptionHi: "पुरानी बीमारियों, दवाओं के बदलाव की समयरेखा, नुस्खे में बदलाव की आवृत्ति और स्वास्थ्य रुझानों को ट्रैक करें।",
    href: "/patient-history",
    accent: "from-cyan-400/30 to-blue-500/30",
  },
  {
    key: "familyhistory",
    titleEn: "Family History Tree",
    titleHi: "पारिवारिक स्वास्थ्य वृक्ष",
    descriptionEn: "Pedigree family tree mapping conditions across blood relatives with multi-relative pattern advisory flags.",
    descriptionHi: "रक्त संबंधियों में बीमारियों का वंशावली चार्ट और बहु-रिश्तेदार पैटर्न की पहचान।",
    href: "/family-history",
    accent: "from-indigo-400/30 to-purple-500/30",
  },
  {
    key: "yoga",
    titleEn: "Yoga Videos",
    titleHi: "योग वीडियो",
    descriptionEn: "Watch guided yoga, breathing, stretching, and meditation videos for recovery and daily wellness.",
    descriptionHi: "रिकवरी और रोजमर्रा स्वास्थ्य के लिए गाइडेड योग, ब्रीदिंग, स्ट्रेचिंग और मेडिटेशन वीडियो देखें।",
    href: "/yoga-videos",
    accent: "from-fuchsia-400/30 to-cyan-400/30",
  },
];

export const everydayTrackingCards = [
  {
    key: "adherence",
    titleEn: "Medication Adherence",
    titleHi: "दवा अनुपालन चेकलिस्ट",
    descriptionEn: "Track daily scheduled doses (taken, late, missed, skipped) with non-judgmental missed-dose warnings & streaks.",
    descriptionHi: "दैनिक निर्धारित खुराक (ली गई, देर से, छूटी, छोड़ी गई) ट्रैक करें और स्ट्रिक बनाएं।",
    href: "/medication-adherence",
    accent: "from-cyan-400/30 to-emerald-400/30",
  },
  {
    key: "prescription",
    titleEn: "Prescription Scanner",
    titleHi: "प्रिस्क्रिप्शन स्कैनर",
    descriptionEn: "Scan doctor prescriptions with AI vision, review doses in confirmation modal, and save to active schedule.",
    descriptionHi: "एआई विज़न से डॉक्टर पर्चा स्कैन करें, खुराक की समीक्षा करें और शेड्यूल में जोड़ें।",
    href: "/prescription-scan",
    accent: "from-purple-400/30 to-cyan-400/30",
  },
  {
    key: "reminder",
    titleEn: "Smart Medicine Reminders",
    titleHi: "स्मार्ट मेडिसिन रिमाइंडर",
    descriptionEn: "Save medicine, water, walking, BP, and sugar-check reminders with Web Push notifications.",
    descriptionHi: "दवा, पानी, वॉक, BP और शुगर-चेक रिमाइंडर वेब पुश नोटिफिकेशन के साथ सेव करें।",
    href: "/medicine-reminder",
    accent: "from-emerald-400/30 to-lime-400/30",
  },
  {
    key: "drugchecker",
    titleEn: "Drug Interaction Checker",
    titleHi: "दवा सुरक्षा एवं इंटरैक्शन",
    descriptionEn: "Search multiple medicines to analyze dangerous drug interactions, side effects, and food warnings.",
    descriptionHi: "दवाओं के बीच खतरनाक अंतःक्रियाओं, दुष्प्रभावों और भोजन संबंधी चेतावनियों का विश्लेषण करें।",
    href: "/medicine-checker",
    accent: "from-blue-400/30 to-purple-500/30",
  },
  {
    key: "diet",
    titleEn: "Diet Planner",
    titleHi: "डाइट प्लानर",
    descriptionEn: "Browse simple meal outlines for blood pressure, blood sugar support, and weight management.",
    descriptionHi: "ब्लड प्रेशर, ब्लड शुगर सपोर्ट और वजन प्रबंधन के लिए सरल भोजन योजनाएं देखें।",
    href: "/diet-planner",
    accent: "from-lime-400/30 to-emerald-400/30",
  },
  {
    key: "reports",
    titleEn: "My Reports",
    titleHi: "मेरी रिपोर्ट",
    descriptionEn: "Review saved health and skin screenings in one signed-in dashboard backed by Firestore.",
    descriptionHi: "Firestore से जुड़ी एक जगह पर सेव की गई स्वास्थ्य और त्वचा रिपोर्ट देखें।",
    href: "/reports",
    accent: "from-emerald-400/30 to-cyan-400/30",
  },
  {
    key: "exportreport",
    titleEn: "Clinical SBAR PDF Export",
    titleHi: "डॉक्टर रिपोर्ट और SBAR निर्यात",
    descriptionEn: "Generate a formatted clinical SBAR summary PDF with 30-day adherence and pedigree insights for doctor visits.",
    descriptionHi: "डॉक्टर परामर्श के लिए 30-दिवसीय दवा अनुपालन और वाइटल्स की SBAR पीडीएफ रिपोर्ट बनाएं।",
    href: "/export-report",
    accent: "from-cyan-400/30 to-emerald-400/30",
  },
  {
    key: "medicines",
    titleEn: "Basic Medicines",
    titleHi: "बेसिक मेडिसिन",
    descriptionEn: "See common over-the-counter support ideas for fever, cold, acidity, and diarrhea with safety notes.",
    descriptionHi: "बुखार, सर्दी, एसिडिटी और दस्त जैसी समस्याओं के लिए सामान्य दवा-सहायता विचार और सुरक्षा नोट देखें।",
    href: "/basic-medicines",
    accent: "from-rose-400/30 to-fuchsia-400/30",
  },
];

export const emergencySafetyCards = [
  {
    key: "emergencyprofile",
    titleEn: "Emergency Medical Profile & SOS",
    titleHi: "आपातकालीन मेडिकल आईडी व एसओएस",
    descriptionEn: "Blood group, severe allergies, critical emergency meds, and primary contacts with one-tap dialing.",
    descriptionHi: "रक्त समूह, गंभीर एलर्जी, जरूरी दवाएं और सिंगल-टैप कॉल वाले प्राथमिक संपर्क।",
    href: "/emergency-profile",
    accent: "from-rose-500/40 to-red-600/40",
  },
  {
    key: "emergency",
    titleEn: "Emergency Guide",
    titleHi: "आपातकालीन गाइड",
    descriptionEn: "See when symptoms should move from watch-and-wait to urgent or emergency medical care.",
    descriptionHi: "जानें कब लक्षणों को इंतजार नहीं बल्कि तुरंत देखभाल की ज़रूरत है।",
    href: "/emergency-guide",
    accent: "from-rose-400/30 to-orange-500/30",
  },
  {
    key: "contacts",
    titleEn: "Emergency Contacts",
    titleHi: "इमरजेंसी कॉन्टैक्ट्स",
    descriptionEn: "Save family, doctor, and ambulance numbers for quick access in urgent situations.",
    descriptionHi: "जरूरी स्थिति में जल्दी पहुंच के लिए परिवार, डॉक्टर और एम्बुलेंस नंबर सेव रखें।",
    href: "/emergency-contacts",
    accent: "from-rose-400/30 to-red-400/30",
  },
  {
    key: "firstaid",
    titleEn: "First Aid",
    titleHi: "फर्स्ट एड",
    descriptionEn: "See quick first-aid steps for burns, cuts, fainting, choking, and other basic emergencies.",
    descriptionHi: "जलना, कट, बेहोशी, घुटना और अन्य बेसिक इमरजेंसी के लिए तुरंत फर्स्ट-एड कदम देखें।",
    href: "/first-aid",
    accent: "from-orange-400/30 to-amber-400/30",
  },
  {
    key: "nearby",
    titleEn: "Nearby Care",
    titleHi: "नजदीकी देखभाल",
    descriptionEn: "Use your current location to quickly open nearby hospitals, clinics, pharmacies, and emergency care.",
    descriptionHi: "अपनी लोकेशन से नजदीकी अस्पताल, क्लिनिक, फार्मेसी और इमरजेंसी केयर जल्दी खोजें।",
    href: "/nearby-care",
    accent: "from-sky-400/30 to-emerald-400/30",
  },
];


const strengthPointsList = [
  {
    en: "Structured risk levels instead of random generic advice",
    hi: "रैंडम सलाह की जगह संरचित जोखिम स्तर",
  },
  {
    en: "Skin screening with photo upload and symptom triage",
    hi: "फोटो अपलोड और लक्षणों के साथ स्किन स्क्रीनिंग",
  },
  {
    en: "Saved history for recent health and skin reports",
    hi: "स्वास्थ्य और त्वचा रिपोर्ट की सेव हिस्ट्री",
  },
  {
    en: "Emergency-safety guidance built into the product",
    hi: "प्रोडक्ट में इनबिल्ट आपातकालीन सुरक्षा मार्गदर्शन",
  },
  {
    en: "New lab, diet, medicine, and reminder modules for everyday care",
    hi: "रोजमर्रा की देखभाल के लिए नए लैब, डाइट, मेडिसिन और रिमाइंडर मॉड्यूल",
  },
];

export default function Home() {
  const localize = useLocalize();
  const { user, guestMode, clearGuestSession } = useAuth();
  const { activeProfileId, activeProfile } = useActiveProfile();
  const [mounted, setMounted] = useState(false);
  const [vitalsStreak, setVitalsStreak] = useState<VitalsStreak | null>(null);
  const [showNudge, setShowNudge] = useState<boolean>(false);
  const [todayAdherence, setTodayAdherence] = useState<{
    taken: number;
    total: number;
    streak: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!user) {
      setShowNudge(false);
      setTodayAdherence(null);
      return;
    }

    getVitalsStreak(user.uid, activeProfileId).then((streakData) => {
      setVitalsStreak(streakData);
      const today = new Date().toISOString().slice(0, 10);
      const dismissedToday = localStorage.getItem(`nudge-dismissed-${today}`);

      if (!dismissedToday && streakData.lastLoggedDate !== today) {
        setShowNudge(true);
      } else {
        setShowNudge(false);
      }
    });

    // Fetch Today's medication adherence
    const todayStr = new Date().toISOString().slice(0, 10);
    const depParam = activeProfileId || "myself";
    fetch(`/api/medication-adherence?userId=${user.uid}&dependentId=${depParam}&date=${todayStr}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.summary) {
          setTodayAdherence({
            taken: data.summary.dosesTaken || 0,
            total: data.summary.dosesTotal || 0,
            streak: data.summary.currentStreak || 0,
          });
        }
      })
      .catch(() => {});
  }, [user, activeProfileId]);

  const handleDismissNudge = () => {
    setShowNudge(false);
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`nudge-dismissed-${today}`, "true");
  };

  const displayName = guestMode
    ? localize("Guest", "गेस्ट")
    : user?.displayName?.trim() || user?.email?.split("@")[0] || "";

  const numbersGuide = [
    {
      key: "bp",
      titleEn: "Blood Pressure",
      titleHi: "ब्लड प्रेशर",
      normalEn: "Typical healthy reading: around 120/80 mmHg",
      normalHi: "सामान्य रीडिंग: लगभग 120/80 mmHg",
      noteEn:
        "Repeated values above 140/90 may need doctor review. Very high readings with chest pain, breathlessness, or severe headache can be urgent.",
      noteHi:
        "बार-बार 140/90 से ऊपर की रीडिंग डॉक्टर को दिखानी चाहिए। बहुत अधिक रीडिंग के साथ सीने में दर्द, सांस फूलना या तेज सिरदर्द हो तो स्थिति गंभीर हो सकती है।",
      accent: "text-cyan-300",
    },
    {
      key: "heart",
      titleEn: "Heart Rate",
      titleHi: "हार्ट रेट",
      normalEn: "Typical resting range: about 60 to 100 beats per minute",
      normalHi: "आराम की सामान्य सीमा: लगभग 60 से 100 धड़कन प्रति मिनट",
      noteEn:
        "A very fast or very low pulse with dizziness, fainting, chest pain, or weakness should not be ignored.",
      noteHi:
        "बहुत तेज या बहुत कम नाड़ी के साथ चक्कर, बेहोशी, सीने में दर्द या कमजोरी हो तो उसे नजरअंदाज नहीं करना चाहिए।",
      accent: "text-emerald-300",
    },
    {
      key: "sugar",
      titleEn: "Blood Sugar",
      titleHi: "ब्लड शुगर",
      normalEn: "Typical fasting range: about 70 to 99 mg/dL",
      normalHi: "फास्टिंग की सामान्य सीमा: लगभग 70 से 99 mg/dL",
      noteEn:
        "Fasting values of 100 to 125 can be borderline. 126 or higher may need diabetes evaluation, especially if repeated.",
      noteHi:
        "100 से 125 की फास्टिंग वैल्यू सीमा रेखा पर हो सकती है। 126 या उससे ऊपर की रीडिंग बार-बार आए तो डायबिटीज जांच की जरूरत हो सकती है।",
      accent: "text-amber-300",
    },
  ];

  const uiCopy = {
    subtitle: localize("Health screening assistant", "हेल्थ स्क्रीनिंग असिस्टेंट"),
    secureLogin: localize("Secure Login", "सुरक्षित लॉगिन"),
    welcome: localize("Welcome", "स्वागत"),
    logout: localize("Logout", "लॉगआउट"),
    heroTag: localize("Predict. Prevent. Protect.", "पूर्वानुमान. रोकथाम. सुरक्षा."),
    heroTitle: localize(
      "A stronger health assistant for daily risks, skin issues, recovery, and emergency warning signs.",
      "रोज़मर्रा के जोखिम, त्वचा समस्याओं, रिकवरी और आपातकालीन चेतावनियों के लिए एक बेहतर स्वास्थ्य सहायक।"
    ),
    heroText: localize(
      "RoboDoctor AI now works like a mini health platform, not just a form. Users can screen vital signs, check skin concerns, watch yoga sessions, track reports, and understand when to seek care.",
      "RoboDoctor AI अब सिर्फ एक फॉर्म नहीं, बल्कि एक छोटा हेल्थ प्लेटफॉर्म है। उपयोगकर्ता वाइटल्स, त्वचा समस्याएं, योग वीडियो, रिपोर्ट हिस्ट्री और देखभाल की ज़रूरत समझ सकते हैं।"
    ),
    startGuest: localize("Open Health Check", "हेल्थ चेक खोलें"),
    openSkin: localize("Open Skin Check", "स्किन चेक खोलें"),
    platformSnapshot: localize("Platform Snapshot", "प्लेटफॉर्म झलक"),
    smarter: localize("Screen smarter, recover better", "और समझदारी से स्क्रीनिंग करें"),
    guestMode: localize("Login access", "लॉगिन एक्सेस"),
    safetyLayer: localize("Safety Layer", "सुरक्षा परत"),
    safetyText: localize(
      "Built-in emergency guidance helps separate mild cases from high-risk situations that need urgent care.",
      "इनबिल्ट आपातकालीन मार्गदर्शन हल्के मामलों और गंभीर जोखिम वाले मामलों में अंतर करने में मदद करता है।"
    ),
    tools: localize("Tools", "टूल्स"),
    modules: localize("Core health modules", "मुख्य स्वास्थ्य मॉड्यूल"),
    openNow: localize("Open now", "अभी खोलें"),
    module: localize("Module", "मॉड्यूल"),
  };

  const strengthPoints = strengthPointsList.map((item) =>
    localize(item.en, item.hi)
  );

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(251,146,60,0.16),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.14),transparent_28%)]" />

      <header className="relative z-50 flex items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="RoboDoctor AI" width={44} height={44} />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">RoboDoctor AI</p>
            <p className="text-sm text-[var(--muted)]">{uiCopy.subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ProfileSwitcher />
          <LanguageSwitcher />
          <ThemeToggle />
          {mounted && (user || guestMode) ? (
            <>
              <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-[var(--foreground)]">
                {uiCopy.welcome} {displayName}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (guestMode) {
                    clearGuestSession();
                    return;
                  }
                  void signOut(auth);
                }}
                className="rounded-full border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-rose-500/20"
              >
                {uiCopy.logout}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-cyan-400/20"
            >
              {uiCopy.secureLogin}
            </Link>
          )}
        </div>
      </header>

      <main className="relative z-10 px-6 pb-12 md:px-10">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <p className="mb-3 text-sm uppercase tracking-[0.35em] text-emerald-400">
              {uiCopy.heroTag}
            </p>
            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              {uiCopy.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
              {uiCopy.heroText}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/health-check"
                className="rounded-full bg-emerald-400 px-7 py-4 font-semibold text-slate-950 hover:bg-emerald-300"
              >
                {uiCopy.startGuest}
              </Link>
              <button
                type="button"
                onClick={() => openAddFamilyMemberModal()}
                className="rounded-full border border-lime-400/40 bg-lime-500/10 px-7 py-4 font-semibold text-lime-400 hover:bg-lime-500/20 transition cursor-pointer flex items-center gap-2"
              >
                <span>➕</span>
                <span>{localize("Add Family Member", "परिवार का सदस्य जोड़ें")}</span>
              </button>
              <Link
                href="/yoga-videos"
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-7 py-4 font-semibold hover:opacity-90"
              >
                {localize("Open Yoga Videos", "योग वीडियो खोलें")}
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {strengthPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4 text-[var(--foreground)] shadow-sm"
                >
                  {point}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="rounded-[36px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-2xl backdrop-blur-md"
          >
            <div className="rounded-[28px] bg-[color:var(--surface-strong)] p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-cyan-400">{uiCopy.platformSnapshot}</p>
                  <h2 className="mt-2 text-2xl font-bold">{uiCopy.smarter}</h2>
                </div>
                <Link
                  href="/health-check"
                  className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-400/20"
                >
                  {uiCopy.guestMode}
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                  <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-300">
                    {localize("Vitals + symptoms", "वाइटल्स + लक्षण")}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {localize("Risk Score", "जोखिम स्कोर")}
                  </p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    {localize(
                      "Find BP, sugar, pulse, BMI, and symptom red flags faster.",
                      "बीपी, शुगर, पल्स, बीएमआई और रेड फ्लैग्स को जल्दी समझें।"
                    )}
                  </p>
                </div>
                <div className="rounded-3xl border border-fuchsia-500/20 bg-fuchsia-500/10 p-5">
                  <p className="text-sm font-semibold text-fuchsia-800 dark:text-fuchsia-300">
                    {localize("Recovery + wellness", "रिकवरी + वेलनेस")}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {localize("Yoga Videos", "योग वीडियो")}
                  </p>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                    {localize(
                      "Recover with breathing, stretching, yoga, and meditation sessions.",
                      "ब्रीदिंग, स्ट्रेचिंग, योग और मेडिटेशन वीडियो के साथ रिकवरी करें।"
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-800 dark:text-rose-300">{uiCopy.safetyLayer}</p>
                <p className="mt-2 text-slate-900 dark:text-slate-100">{uiCopy.safetyText}</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Today's Health Dashboard Panel */}
        {mounted && (user || guestMode) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-emerald-950/40 p-6 backdrop-blur-md shadow-xl"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/20 text-2xl border border-cyan-400/30">
                  📅
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      {localize("Today's Health Hub", "आज का स्वास्थ्य हब")}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-400/20">
                      👤 {activeProfile ? activeProfile.name : localize("Myself", "स्वयं")}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-[var(--foreground)] mt-0.5">
                    {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Medication Adherence Pill */}
                <Link
                  href="/medication-adherence"
                  className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2.5 hover:bg-emerald-900/40 transition group"
                >
                  <div className="text-2xl">💊</div>
                  <div>
                    <div className="text-xs text-emerald-300/80 font-medium">
                      {localize("Today's Doses", "आज की खुराक")}
                    </div>
                    <div className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                      <span>
                        {todayAdherence
                          ? `${todayAdherence.taken}/${todayAdherence.total} ${localize("Taken", "ली गईं")}`
                          : localize("Track Doses", "खुराक ट्रैक करें")}
                      </span>
                      {todayAdherence && todayAdherence.streak > 0 && (
                        <span className="text-xs text-amber-400">🔥 {todayAdherence.streak}d</span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Emergency SOS Button */}
                <Link
                  href="/emergency-profile"
                  className="flex items-center gap-2 rounded-2xl border border-rose-500/50 bg-rose-600/20 px-5 py-3 text-rose-300 hover:bg-rose-600/30 hover:border-rose-400 transition font-bold text-sm shadow-lg shadow-rose-950/30"
                >
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                  <span>🚨 {localize("Emergency SOS", "आपातकालीन एसओएस")}</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        <section className="mt-12">
          <div className="mb-6">
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[var(--muted)]">
              {localize("Learn", "जानकारी")}
            </p>
            <h2 className="text-3xl font-bold">
              {localize("Understand your health numbers", "अपने हेल्थ नंबर समझें")}
            </h2>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "Before starting a health check, quickly understand what normal BP, heart rate, and sugar ranges usually look like.",
                "हेल्थ चेक शुरू करने से पहले यह जल्दी समझ लें कि BP, हार्ट रेट और शुगर की सामान्य रेंज क्या होती है।"
              )}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {numbersGuide.map((item) => (
              <div
                key={item.key}
                className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-800 dark:text-cyan-300">
                  {localize(item.titleEn, item.titleHi)}
                </p>
                <h3 className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
                  {localize(item.normalEn, item.normalHi)}
                </h3>
                <p className="mt-4 text-slate-700 dark:text-slate-300">
                  {localize(item.noteEn, item.noteHi)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {showNudge && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-200 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <p className="font-extrabold text-amber-300 text-lg">
                  {localize("Keep your daily health streak going!", "अपना वाइटल्स स्ट्रिक जारी रखें!")}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  {vitalsStreak && vitalsStreak.currentStreak > 0
                    ? localize("You are currently on a {count}-day streak. Log today's vitals to keep your streak going!", "आप वर्तमान में {count} दिन के स्ट्रिक पर हैं। इसे बनाए रखने के लिए आज की जांच करें!", { count: vitalsStreak.currentStreak })
                    : localize(
                        "Log today's vital risk check to start your daily health streak.",
                        "अपना दैनिक स्वास्थ्य स्ट्रिक शुरू करने के लिए आज की जांच करें।"
                      )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/health-check"
                className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition"
              >
                {localize("Log Vitals Now", "अभी जांच करें")}
              </Link>
              <button
                type="button"
                onClick={handleDismissNudge}
                className="rounded-xl border border-amber-500/30 px-3 py-2 text-xs text-amber-200 hover:bg-amber-500/20 transition"
              >
                {localize("Dismiss", "हटाएं")}
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Body & Specialized Care */}
        <section className="mt-14">
          <div className="mb-6">
            <span className="inline-block rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-400 border border-cyan-500/20 mb-2">
              {localize("Clinical Screening & Vitals", "क्लिनिकल स्क्रीनिंग और वाइटल्स")}
            </span>
            <h2 className="text-3xl font-extrabold text-[var(--foreground)]">
              {localize("Body & Specialized Care", "शारीरिक एवं विशिष्ट देखभाल")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {localize(
                "Advanced clinical risk screeners, lab report analysis, dermatological checks, and chronic history trends.",
                "उन्नत क्लिनिकल जोखिम जांच, लैब रिपोर्ट विश्लेषण, त्वचा जांच और पुरानी बीमारियों का इतिहास।"
              )}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {bodyCareCards.map((card, index) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                className="group flex flex-col justify-between rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm hover:shadow-xl hover:border-cyan-400/40 transition-all duration-300"
              >
                <div>
                  <div className={`rounded-[20px] bg-gradient-to-br ${card.accent} p-4 border border-white/10`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800 dark:text-cyan-200">
                      {uiCopy.module}
                    </p>
                    <h3 className="mt-1.5 text-xl font-bold text-slate-950 dark:text-white">
                      {localize(card.titleEn, card.titleHi)}
                    </h3>
                    <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {localize(card.descriptionEn, card.descriptionHi)}
                    </p>
                  </div>
                </div>
                <Link
                  href={card.href}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 px-4 py-2.5 text-xs font-semibold transition-all group-hover:bg-cyan-500 group-hover:text-slate-950"
                >
                  <span>{uiCopy.openNow}</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 2: Everyday Health & Tracking */}
        <section className="mt-14">
          <div className="mb-6">
            <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400 border border-emerald-500/20 mb-2">
              {localize("Daily Routines & Habits", "दैनिक दिनचर्या और आदतें")}
            </span>
            <h2 className="text-3xl font-extrabold text-[var(--foreground)]">
              {localize("Everyday Health & Tracking", "रोजमर्रा स्वास्थ्य और ट्रैकिंग")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {localize(
                "Medication adherence checklists, prescription scanning, smart reminders, and clinical PDF exports.",
                "दवा अनुपालन चेकलिस्ट, प्रिस्क्रिप्शन स्कैनर, स्मार्ट रिमाइंडर और डॉक्टर PDF निर्यात।"
              )}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {everydayTrackingCards.map((card, index) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                className="group flex flex-col justify-between rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm hover:shadow-xl hover:border-emerald-400/40 transition-all duration-300"
              >
                <div>
                  <div className={`rounded-[20px] bg-gradient-to-br ${card.accent} p-4 border border-white/10`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800 dark:text-emerald-200">
                      {uiCopy.module}
                    </p>
                    <h3 className="mt-1.5 text-xl font-bold text-slate-950 dark:text-white">
                      {localize(card.titleEn, card.titleHi)}
                    </h3>
                    <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {localize(card.descriptionEn, card.descriptionHi)}
                    </p>
                  </div>
                </div>
                <Link
                  href={card.href}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-4 py-2.5 text-xs font-semibold transition-all group-hover:bg-emerald-500 group-hover:text-slate-950"
                >
                  <span>{uiCopy.openNow}</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 3: Emergency & Safety */}
        <section className="mt-14 mb-8">
          <div className="mb-6">
            <span className="inline-block rounded-full bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-rose-400 border border-rose-500/20 mb-2">
              {localize("Critical & Urgent Care", "गंभीर एवं आपातकालीन देखभाल")}
            </span>
            <h2 className="text-3xl font-extrabold text-[var(--foreground)]">
              {localize("Emergency & Safety", "आपातकालीन और सुरक्षा")}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {localize(
                "Instant medical SOS ID, urgent triage guides, emergency contacts, first-aid protocols, and nearby hospitals.",
                "त्वरित मेडिकल एसओएस आईडी, आपातकालीन ट्रायज गाइड, संपर्क, फर्स्ट एड और नजदीकी अस्पताल।"
              )}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {emergencySafetyCards.map((card, index) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.04 }}
                className="group flex flex-col justify-between rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm hover:shadow-xl hover:border-rose-400/40 transition-all duration-300"
              >
                <div>
                  <div className={`rounded-[20px] bg-gradient-to-br ${card.accent} p-4 border border-white/10`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-800 dark:text-rose-200">
                      {uiCopy.module}
                    </p>
                    <h3 className="mt-1.5 text-xl font-bold text-slate-950 dark:text-white">
                      {localize(card.titleEn, card.titleHi)}
                    </h3>
                    <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {localize(card.descriptionEn, card.descriptionHi)}
                    </p>
                  </div>
                </div>
                <Link
                  href={card.href}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-4 py-2.5 text-xs font-semibold transition-all group-hover:bg-rose-500 group-hover:text-white"
                >
                  <span>{uiCopy.openNow}</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
