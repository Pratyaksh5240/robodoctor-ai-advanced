"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "firebase/auth";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase";
import { translateUi } from "@/lib/uiI18n";

const productCards = [
  {
    key: "vitals",
    titleEn: "Vital Risk Check",
    titleHi: "वाइटल जोखिम जांच",
    descriptionEn:
      "Enter symptoms, BP, sugar, pulse, age, height, and weight to get a structured risk summary.",
    descriptionHi:
      "लक्षण, बीपी, शुगर, पल्स, उम्र, लंबाई और वजन दर्ज करके संरचित जोखिम सारांश पाएं।",
    href: "/health-check",
    accent: "from-cyan-400/30 to-blue-500/30",
  },
  {
    key: "skin",
    titleEn: "Skin Check",
    titleHi: "स्किन चेक",
    descriptionEn:
      "Upload or capture a skin photo, add symptoms, and get triage guidance with red flags.",
    descriptionHi:
      "त्वचा की फोटो अपलोड करें, लक्षण जोड़ें और रेड फ्लैग्स के साथ ट्रायज मार्गदर्शन पाएं।",
    href: "/skin-check",
    accent: "from-amber-300/30 to-rose-400/30",
  },
  {
    key: "emergency",
    titleEn: "Emergency Guide",
    titleHi: "आपातकालीन गाइड",
    descriptionEn:
      "See when symptoms should move from watch-and-wait to urgent or emergency medical care.",
    descriptionHi:
      "जानें कब लक्षणों को इंतजार नहीं बल्कि तुरंत देखभाल की ज़रूरत है।",
    href: "/emergency-guide",
    accent: "from-rose-400/30 to-orange-500/30",
  },
  {
    key: "reports",
    titleEn: "My Reports",
    titleHi: "मेरी रिपोर्ट",
    descriptionEn:
      "Review saved health and skin screenings in one signed-in dashboard backed by Firestore.",
    descriptionHi:
      "Firestore से जुड़ी एक जगह पर सेव की गई स्वास्थ्य और त्वचा रिपोर्ट देखें।",
    href: "/reports",
    accent: "from-emerald-400/30 to-cyan-400/30",
  },
  {
    key: "nearby",
    titleEn: "Nearby Care",
    titleHi: "नजदीकी देखभाल",
    descriptionEn:
      "Use your current location to quickly open nearby hospitals, clinics, pharmacies, and emergency care.",
    descriptionHi:
      "अपनी लोकेशन से नजदीकी अस्पताल, क्लिनिक, फार्मेसी और इमरजेंसी केयर जल्दी खोजें।",
    href: "/nearby-care",
    accent: "from-sky-400/30 to-emerald-400/30",
  },
  {
    key: "yoga",
    titleEn: "Yoga Videos",
    titleHi: "योग वीडियो",
    descriptionEn:
      "Watch guided yoga, breathing, stretching, and meditation videos for recovery and daily wellness.",
    descriptionHi:
      "रिकवरी और रोजमर्रा स्वास्थ्य के लिए गाइडेड योग, ब्रीदिंग, स्ट्रेचिंग और मेडिटेशन वीडियो देखें।",
    href: "/yoga-videos",
    accent: "from-fuchsia-400/30 to-cyan-400/30",
  },
  {
    key: "lab",
    titleEn: "Lab Report Analyzer",
    titleHi: "लैब रिपोर्ट विश्लेषक",
    descriptionEn:
      "Enter common lab values like sugar, HbA1c, hemoglobin, TSH, and cholesterol for quick interpretation.",
    descriptionHi:
      "शुगर, HbA1c, हीमोग्लोबिन, TSH और कोलेस्ट्रॉल जैसी लैब वैल्यू भरकर तुरंत आसान व्याख्या पाएं।",
    href: "/lab-report",
    accent: "from-amber-400/30 to-yellow-300/30",
  },
  {
    key: "reminder",
    titleEn: "Medicine Reminder",
    titleHi: "मेडिसिन रिमाइंडर",
    descriptionEn:
      "Save medicine, water, walking, BP, and sugar-check reminders in one lightweight planner.",
    descriptionHi:
      "दवा, पानी, वॉक, BP और शुगर-चेक रिमाइंडर एक छोटे हेल्थ प्लानर में सेव करें।",
    href: "/medicine-reminder",
    accent: "from-emerald-400/30 to-lime-400/30",
  },
  {
    key: "diet",
    titleEn: "Diet Planner",
    titleHi: "डाइट प्लानर",
    descriptionEn:
      "Browse simple meal outlines for blood pressure, blood sugar support, and weight management.",
    descriptionHi:
      "ब्लड प्रेशर, ब्लड शुगर सपोर्ट और वजन प्रबंधन के लिए सरल भोजन योजनाएं देखें।",
    href: "/diet-planner",
    accent: "from-lime-400/30 to-emerald-400/30",
  },
  {
    key: "medicines",
    titleEn: "Basic Medicines",
    titleHi: "बेसिक मेडिसिन",
    descriptionEn:
      "See common over-the-counter support ideas for fever, cold, acidity, and diarrhea with safety notes.",
    descriptionHi:
      "बुखार, सर्दी, एसिडिटी और दस्त जैसी समस्याओं के लिए सामान्य दवा-सहायता विचार और सुरक्षा नोट देखें।",
    href: "/basic-medicines",
    accent: "from-rose-400/30 to-fuchsia-400/30",
  },
  {
    key: "chatbot",
    titleEn: "AI Chatbot",
    titleHi: "एआई चैटबॉट",
    descriptionEn:
      "Ask symptom questions in a guided chat and get simple next-step health guidance.",
    descriptionHi:
      "गाइडेड चैट में अपने लक्षण पूछें और आसान अगले कदमों का स्वास्थ्य मार्गदर्शन पाएं।",
    href: "/ai-chatbot",
    accent: "from-cyan-400/30 to-indigo-400/30",
  },
  {
    key: "contacts",
    titleEn: "Emergency Contacts",
    titleHi: "इमरजेंसी कॉन्टैक्ट्स",
    descriptionEn:
      "Save family, doctor, and ambulance numbers for quick access in urgent situations.",
    descriptionHi:
      "जरूरी स्थिति में जल्दी पहुंच के लिए परिवार, डॉक्टर और एम्बुलेंस नंबर सेव रखें।",
    href: "/emergency-contacts",
    accent: "from-rose-400/30 to-red-400/30",
  },
  {
    key: "firstaid",
    titleEn: "First Aid",
    titleHi: "फर्स्ट एड",
    descriptionEn:
      "See quick first-aid steps for burns, cuts, fainting, choking, and other basic emergencies.",
    descriptionHi:
      "जलना, कट, बेहोशी, घुटना और अन्य बेसिक इमरजेंसी के लिए तुरंत फर्स्ट-एड कदम देखें।",
    href: "/first-aid",
    accent: "from-orange-400/30 to-amber-400/30",
  },
];

const strengthPointsEn = [
  "Structured risk levels instead of random generic advice",
  "Skin screening with photo upload and symptom triage",
  "Saved history for recent health and skin reports",
  "Emergency-safety guidance built into the product",
  "New lab, diet, medicine, and reminder modules for everyday care",
];

const strengthPointsHi = [
  "रैंडम सलाह की जगह संरचित जोखिम स्तर",
  "फोटो अपलोड और लक्षणों के साथ स्किन स्क्रीनिंग",
  "स्वास्थ्य और त्वचा रिपोर्ट की सेव हिस्ट्री",
  "प्रोडक्ट में इनबिल्ट आपातकालीन सुरक्षा मार्गदर्शन",
];

export default function Home() {
  const { language } = useLanguage();
  const { user, guestMode, clearGuestSession } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isHindi = language === "hi";
  const displayName = guestMode
    ? isHindi
      ? "गेस्ट"
      : "Guest"
    : user?.displayName?.trim() || user?.email?.split("@")[0] || "";
  const numbersGuide = [
    {
      key: "bp",
      titleEn: "Blood Pressure",
      titleHi: "ब्लड प्रेशर",
      normalEn: "Typical healthy reading: around 120/80 mmHg",
      normalHi: "सामान्य रीडिंग: लगभग 120/80 mmHg",
      noteEn: "Repeated values above 140/90 may need doctor review. Very high readings with chest pain, breathlessness, or severe headache can be urgent.",
      noteHi: "बार-बार 140/90 से ऊपर की रीडिंग डॉक्टर को दिखानी चाहिए। बहुत अधिक रीडिंग के साथ सीने में दर्द, सांस फूलना या तेज सिरदर्द हो तो स्थिति गंभीर हो सकती है।",
      accent: "text-cyan-300",
    },
    {
      key: "heart",
      titleEn: "Heart Rate",
      titleHi: "हार्ट रेट",
      normalEn: "Typical resting range: about 60 to 100 beats per minute",
      normalHi: "आराम की सामान्य सीमा: लगभग 60 से 100 धड़कन प्रति मिनट",
      noteEn: "A very fast or very low pulse with dizziness, fainting, chest pain, or weakness should not be ignored.",
      noteHi: "बहुत तेज या बहुत कम नाड़ी के साथ चक्कर, बेहोशी, सीने में दर्द या कमजोरी हो तो उसे नजरअंदाज नहीं करना चाहिए।",
      accent: "text-emerald-300",
    },
    {
      key: "sugar",
      titleEn: "Blood Sugar",
      titleHi: "ब्लड शुगर",
      normalEn: "Typical fasting range: about 70 to 99 mg/dL",
      normalHi: "फास्टिंग की सामान्य सीमा: लगभग 70 से 99 mg/dL",
      noteEn: "Fasting values of 100 to 125 can be borderline. 126 or higher may need diabetes evaluation, especially if repeated.",
      noteHi: "100 से 125 की फास्टिंग वैल्यू सीमा रेखा पर हो सकती है। 126 या उससे ऊपर की रीडिंग बार-बार आए तो डायबिटीज जांच की जरूरत हो सकती है।",
      accent: "text-amber-300",
    },
  ];

  const copy = {
    subtitle: isHindi ? "हेल्थ स्क्रीनिंग असिस्टेंट" : "Health screening assistant",
    secureLogin: isHindi ? "सुरक्षित लॉगिन" : "Secure Login",
    welcome: isHindi ? "स्वागत" : "Welcome",
    logout: isHindi ? "लॉगआउट" : "Logout",
    heroTag: isHindi ? "पूर्वानुमान. रोकथाम. सुरक्षा." : "Predict. Prevent. Protect.",
    heroTitle: isHindi
      ? "रोज़मर्रा के जोखिम, त्वचा समस्याओं, रिकवरी और आपातकालीन चेतावनियों के लिए एक बेहतर स्वास्थ्य सहायक।"
      : "A stronger health assistant for daily risks, skin issues, recovery, and emergency warning signs.",
    heroText: isHindi
      ? "RoboDoctor AI अब सिर्फ एक फॉर्म नहीं, बल्कि एक छोटा हेल्थ प्लेटफॉर्म है। उपयोगकर्ता वाइटल्स, त्वचा समस्याएं, योग वीडियो, रिपोर्ट हिस्ट्री और देखभाल की ज़रूरत समझ सकते हैं।"
      : "RoboDoctor AI now works like a mini health platform, not just a form. Users can screen vital signs, check skin concerns, watch yoga sessions, track reports, and understand when to seek care.",
    startGuest: isHindi ? "हेल्थ चेक खोलें" : "Open Health Check",
    openSkin: isHindi ? "स्किन चेक खोलें" : "Open Skin Check",
    platformSnapshot: isHindi ? "प्लेटफॉर्म झलक" : "Platform Snapshot",
    smarter: isHindi ? "और समझदारी से स्क्रीनिंग करें" : "Screen smarter, recover better",
    guestMode: isHindi ? "लॉगिन एक्सेस" : "Login access",
    safetyLayer: isHindi ? "सुरक्षा परत" : "Safety Layer",
    safetyText: isHindi
      ? "इनबिल्ट आपातकालीन मार्गदर्शन हल्के मामलों और गंभीर जोखिम वाले मामलों में अंतर करने में मदद करता है।"
      : "Built-in emergency guidance helps separate mild cases from high-risk situations that need urgent care.",
    tools: isHindi ? "टूल्स" : "Tools",
    modules: isHindi ? "मुख्य स्वास्थ्य मॉड्यूल" : "Core health modules",
    openNow: isHindi ? "अभी खोलें" : "Open now",
    module: isHindi ? "मॉड्यूल" : "Module",
  };

  const uiCopy = Object.fromEntries(
    Object.entries(copy).map(([key, value]) => [
      key,
      typeof value === "string" && !isHindi ? translateUi(value, language) : value,
    ])
  ) as typeof copy;
  const resolvedDisplayName =
    guestMode && !isHindi ? translateUi("Guest", language) : displayName;
  const strengthPoints = (isHindi ? strengthPointsHi : strengthPointsEn).map((point) =>
    isHindi ? point : translateUi(point, language)
  );
  const learnLabel = isHindi ? "जानकारी" : translateUi("Learn", language);
  const numbersTitle = isHindi ? "अपने हेल्थ नंबर समझें" : translateUi("Understand your health numbers", language);
  const numbersText = isHindi
    ? "हेल्थ चेक शुरू करने से पहले यह जल्दी समझ लें कि BP, हार्ट रेट और शुगर की सामान्य रेंज क्या होती है।"
    : translateUi(
        "Before starting a health check, quickly understand what normal BP, heart rate, and sugar ranges usually look like.",
        language
      );

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_80%_18%,rgba(251,146,60,0.16),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.14),transparent_28%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="RoboDoctor AI" width={44} height={44} />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-400">RoboDoctor AI</p>
            <p className="text-sm text-[var(--muted)]">{uiCopy.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {mounted && (user || guestMode) ? (
            <>
              <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-medium text-[var(--foreground)]">
                {uiCopy.welcome} {resolvedDisplayName}
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
              <Link
                href="/yoga-videos"
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-7 py-4 font-semibold hover:opacity-90"
              >
                {isHindi ? "योग वीडियो खोलें" : translateUi("Open Yoga Videos", language)}
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
                <div className="rounded-3xl border border-[color:var(--border)] bg-cyan-500/10 p-5">
                  <p className="text-sm text-cyan-300">{isHindi ? "वाइटल्स + लक्षण" : translateUi("Vitals + symptoms", language)}</p>
                  <p className="mt-2 text-3xl font-black">{isHindi ? "जोखिम स्कोर" : translateUi("Risk Score", language)}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {isHindi
                      ? "बीपी, शुगर, पल्स, बीएमआई और रेड फ्लैग्स को जल्दी समझें।"
                      : translateUi("Find BP, sugar, pulse, BMI, and symptom red flags faster.", language)}
                  </p>
                </div>
                <div className="rounded-3xl border border-[color:var(--border)] bg-fuchsia-500/10 p-5">
                  <p className="text-sm text-fuchsia-300">{isHindi ? "रिकवरी + वेलनेस" : translateUi("Recovery + wellness", language)}</p>
                  <p className="mt-2 text-3xl font-black">{isHindi ? "योग वीडियो" : "Yoga Videos"}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {isHindi
                      ? "ब्रीदिंग, स्ट्रेचिंग, योग और मेडिटेशन वीडियो के साथ रिकवरी करें।"
                      : translateUi("Recover with breathing, stretching, yoga, and meditation sessions.", language)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-5">
                <p className="text-sm uppercase tracking-[0.2em] text-rose-300">{uiCopy.safetyLayer}</p>
                <p className="mt-2 text-[var(--foreground)]">{uiCopy.safetyText}</p>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="mt-12">
          <div className="mb-6">
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[var(--muted)]">{learnLabel}</p>
            <h2 className="text-3xl font-bold">{numbersTitle}</h2>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">{numbersText}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {numbersGuide.map((item) => (
              <div
                key={item.key}
                className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
              >
                <p className={`text-sm uppercase tracking-[0.22em] ${item.accent}`}>
                  {isHindi ? item.titleHi : translateUi(item.titleEn, language)}
                </p>
                <h3 className="mt-3 text-2xl font-bold">
                  {isHindi ? item.normalHi : translateUi(item.normalEn, language)}
                </h3>
                <p className="mt-4 text-[var(--muted)]">
                  {isHindi ? item.noteHi : translateUi(item.noteEn, language)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[var(--muted)]">{uiCopy.tools}</p>
              <h2 className="text-3xl font-bold">{uiCopy.modules}</h2>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-5">
            {productCards.map((card, index) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 backdrop-blur-sm"
              >
                <div className={`rounded-[22px] bg-gradient-to-br ${card.accent} p-5`}>
                  <p className="text-sm uppercase tracking-[0.22em] text-slate-100/85">{uiCopy.module}</p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-50">
                    {isHindi ? card.titleHi : translateUi(card.titleEn, language)}
                  </h3>
                  <p className="mt-3 text-slate-100/85">
                    {isHindi ? card.descriptionHi : translateUi(card.descriptionEn, language)}
                  </p>
                </div>
                <Link
                  href={card.href}
                  className="mt-5 inline-flex rounded-full border border-[color:var(--border)] bg-black/20 px-5 py-3 text-sm font-medium group-hover:bg-white/10"
                >
                  {uiCopy.openNow}
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
