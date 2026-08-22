"use client";

import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

const yogaVideos = [
  {
    id: "stress",
    titleEn: "Stress Relief Yoga",
    titleHi: "तनाव कम करने वाला योग",
    descriptionEn:
      "Gentle yoga and breathing to relax the body and calm the mind.",
    descriptionHi: "शरीर को रिलैक्स और मन को शांत करने के लिए हल्का योग और ब्रीदिंग।",
    embed: "https://www.youtube.com/embed/v7AYKMP6rOE",
  },
  {
    id: "bp",
    titleEn: "Yoga for Blood Pressure",
    titleHi: "ब्लड प्रेशर के लिए योग",
    descriptionEn:
      "Slow movements and breathing-focused practice for better circulation and calmness.",
    descriptionHi:
      "बेहतर रक्त संचार और शांति के लिए धीमी मूवमेंट और ब्रीदिंग अभ्यास।",
    embed: "https://www.youtube.com/embed/4pKly2JojMw",
  },
  {
    id: "diabetes",
    titleEn: "Yoga for Diabetes Support",
    titleHi: "डायबिटीज सपोर्ट के लिए योग",
    descriptionEn:
      "Low-impact yoga that supports daily movement, energy, and healthy routines.",
    descriptionHi:
      "हल्का योग जो रोज़ाना मूवमेंट, ऊर्जा और हेल्दी रूटीन को सपोर्ट करता है।",
    embed: "https://www.youtube.com/embed/sTANio_2E0Q",
  },
  {
    id: "meditation",
    titleEn: "Meditation and Deep Breathing",
    titleHi: "मेडिटेशन और डीप ब्रीदिंग",
    descriptionEn:
      "Use this for stress, sleep support, and emotional balance.",
    descriptionHi: "इसे तनाव, नींद और मानसिक संतुलन के लिए उपयोग करें।",
    embed: "https://www.youtube.com/embed/inpok4MKVLM",
  },
  {
    id: "stretch",
    titleEn: "Morning Stretch and Mobility",
    titleHi: "सुबह की स्ट्रेचिंग और मोबिलिटी",
    descriptionEn:
      "A beginner-friendly stretching session to improve flexibility and stiffness.",
    descriptionHi:
      "फ्लेक्सिबिलिटी और जकड़न कम करने के लिए शुरुआती स्ट्रेचिंग सेशन।",
    embed: "https://www.youtube.com/embed/g_tea8ZNk5A",
  },
  {
    id: "sleep",
    titleEn: "Yoga for Better Sleep",
    titleHi: "अच्छी नींद के लिए योग",
    descriptionEn:
      "Calm evening yoga to unwind and prepare the body for sleep.",
    descriptionHi: "शरीर को सुलाने से पहले रिलैक्स करने के लिए शाम का शांत योग।",
    embed: "https://www.youtube.com/embed/BiWDsfZ3zbo",
  },
];

export default function YogaVideosPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-fuchsia-400">
              {localize("Yoga Videos", "योग वीडियो")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize(
                "A dedicated yoga and wellness video section",
                "अलग योग और वेलनेस वीडियो सेक्शन"
              )}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "This section gives guided videos for stress, blood pressure, diabetes support, stretching, meditation, and sleep.",
                "यह सेक्शन तनाव, ब्लड प्रेशर, डायबिटीज, स्ट्रेचिंग, मेडिटेशन और नींद के लिए गाइडेड वीडियो देता है।"
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {yogaVideos.map((video) => (
            <section
              key={video.id}
              className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-xl"
            >
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={video.embed}
                  title={isHindi ? video.titleHi : translateUi(video.titleEn, language)}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-400">
                  {localize("Wellness Module", "वेलनेस मॉड्यूल")}
                </p>
                <h2 className="mt-3 text-2xl font-bold">
                  {isHindi ? video.titleHi : translateUi(video.titleEn, language)}
                </h2>
                <p className="mt-3 text-[var(--muted)]">
                  {isHindi
                    ? video.descriptionHi
                    : translateUi(video.descriptionEn, language)}
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
