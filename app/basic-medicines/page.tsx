"use client";

import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

const sections = [
  {
    titleEn: "Fever and body ache",
    titleHi: "बुखार और बदन दर्द",
    itemsEn: [
      "Paracetamol or acetaminophen",
      "Fluids and rest",
      "Doctor review if fever stays high or lasts more than 2 to 3 days",
    ],
    itemsHi: [
      "पैरासिटामोल या एसीटामिनोफेन",
      "पर्याप्त तरल और आराम",
      "यदि बुखार बहुत अधिक रहे या 2 से 3 दिन से ज्यादा रहे तो डॉक्टर को दिखाएं",
    ],
  },
  {
    titleEn: "Cold and cough",
    titleHi: "सर्दी और खांसी",
    itemsEn: [
      "Steam inhalation",
      "Saline nasal spray",
      "Basic cough syrup only if suitable for age and condition",
    ],
    itemsHi: [
      "भाप लेना",
      "सेलाइन नेजल स्प्रे",
      "उम्र और स्थिति के अनुसार उपयुक्त हो तो बेसिक कफ सिरप",
    ],
  },
  {
    titleEn: "Acidity and indigestion",
    titleHi: "एसिडिटी और अपच",
    itemsEn: [
      "Antacid tablets or liquid",
      "Small light meals",
      "Avoid spicy, oily, and late-night food",
    ],
    itemsHi: [
      "एंटासिड टैबलेट या लिक्विड",
      "हल्का और कम मात्रा वाला भोजन",
      "तेज मसालेदार, तैलीय और देर रात का खाना न लें",
    ],
  },
  {
    titleEn: "Diarrhea support",
    titleHi: "दस्त में सहायक देखभाल",
    itemsEn: [
      "ORS",
      "Plenty of fluids",
      "Doctor review if blood, dehydration, or persistent diarrhea occurs",
    ],
    itemsHi: [
      "ORS",
      "ज्यादा तरल पदार्थ",
      "यदि खून, डिहाइड्रेशन या लंबे समय तक दस्त रहे तो डॉक्टर को दिखाएं",
    ],
  },
];

export default function BasicMedicinesPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-rose-400">
              {localize("Basic Medicines Guide", "बेसिक मेडिसिन गाइड")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize(
                "Basic medicines for common health problems",
                "सामान्य बीमारियों के लिए बेसिक मेडिसिन सेक्शन"
              )}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "This section is for general awareness only. Before taking any medicine, consider age, allergies, pregnancy, other medicines, and doctor advice.",
                "यह सेक्शन केवल सामान्य जानकारी के लिए है। किसी भी दवा का उपयोग करने से पहले उम्र, एलर्जी, प्रेग्नेंसी, दूसरी दवाओं और डॉक्टर की सलाह का ध्यान रखें।"
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

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.titleEn}
              className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6"
            >
              <h2 className="text-2xl font-bold">
                {isHindi ? section.titleHi : translateUi(section.titleEn, language)}
              </h2>
              <ul className="mt-4 space-y-3 text-[var(--muted)]">
                {(isHindi
                  ? section.itemsHi
                  : section.itemsEn.map((item) => translateUi(item, language))
                ).map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-4"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6">
          <h2 className="text-2xl font-bold">
            {localize("Important safety note", "महत्वपूर्ण सुरक्षा नोट")}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--foreground)]">
            {localize(
              "If there is very high fever, breathing trouble, chest pain, allergic reaction, vomiting blood, severe weakness, or repeated vomiting/diarrhea, do not self-medicate. Please seek urgent medical care.",
              "यदि तेज बुखार, सांस लेने में कठिनाई, सीने में दर्द, एलर्जी रिएक्शन, खून की उल्टी, बहुत ज्यादा कमजोरी, या बार-बार उल्टी/दस्त हो, तो खुद दवा लेने की बजाय तुरंत डॉक्टर या इमरजेंसी सहायता लें।"
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
