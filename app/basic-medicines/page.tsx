"use client";

import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { useLanguage, useLocalize } from "@/app/context/LanguageContext";

const sections = [
  {
    titleEn: "Fever and mild body pain",
    titleHi: "बुखार और हल्का बदन दर्द",
    itemsEn: [
      "Paracetamol 500mg or 650mg is commonly used after food for fever and body ache.",
      "Keep gaps of 4 to 6 hours between doses, and do not exceed daily doctor-recommended limits.",
      "Hydrate well, take rest, and monitor temperature regularly.",
    ],
    itemsHi: [
      "बुखार और बदन दर्द के लिए पेरासिटामोल 500mg या 650mg भोजन के बाद इस्तेमाल की जाती है।",
      "खुराक में 4 से 6 घंटे का अंतर रखें और डॉक्टर द्वारा बताई दैनिक सीमा से अधिक न लें।",
      "पर्याप्त पानी पिएं, आराम करें और नियमित रूप से तापमान मापें।",
    ],
  },
  {
    titleEn: "Cold, runny nose, and sneezing",
    titleHi: "सर्दी, जुकाम और छींक आना",
    itemsEn: [
      "Cetirizine 10mg or Levocetirizine is often taken once daily for runny nose or sneezing.",
      "Steam inhalation and warm water gargles help ease nasal block and throat irritation.",
      "Avoid cold water, cold beverages, and dust exposure.",
    ],
    itemsHi: [
      "छींक और बहती नाक के लिए सेटिरिज़िन 10mg या लेवोसिटिरिज़िन आमतौर पर दिन में एक बार ली जाती है।",
      "भाप लेना और गुनगुने पानी के गरारे करना नाक बंद होने और गले की खराश में राहत देता है।",
      "ठंडा पानी, ठंडे पेय और धूल-मिट्टी के संपर्क से बचें।",
    ],
  },
  {
    titleEn: "Acidity, heartburn, and gas",
    titleHi: "एसिडिटी, सीने में जलन और गैस",
    itemsEn: [
      "Antacids or Pantoprazole/Omeprazole (before food) help with hyperacidity and stomach burning.",
      "Avoid heavy, oily, spicy foods, caffeine, and immediate lying down after meals.",
      "Eat smaller meals and drink water regularly.",
    ],
    itemsHi: [
      "ज्यादा एसिडिटी और पेट की जलन के लिए एंटासिड या पेंटोप्रोजोल/ओमेप्राजोल (खाने से पहले) मदद करते हैं।",
      "भारी, मसालेदार, तला-भुना खाना, कैफीन और खाने के तुरंत बाद लेटने से बचें।",
      "कम मात्रा में बार-बार खाएं और पानी पिएं।",
    ],
  },
  {
    titleEn: "Loose motion, diarrhea, and vomiting",
    titleHi: "दस्त, दस्त की समस्या और उल्टी",
    itemsEn: [
      "ORS (Oral Rehydration Solution) is essential to prevent dehydration.",
      "Zinc supplements are often advised during diarrhea to support intestinal recovery.",
      "Eat light foods like curd rice, banana, apple sauce, and khichdi.",
    ],
    itemsHi: [
      "डिहाइड्रेशन (पानी की कमी) से बचने के लिए ORS का घोल बहुत जरूरी है।",
      "दस्त के समय आंतों की रिकवरी के लिए जिंक सप्लीमेंट की सलाह दी जाती है।",
      "दही-चावल, केला, और खिचड़ी जैसा हल्का भोजन लें।",
    ],
  },
];

export default function BasicMedicinesPage() {
  const localize = useLocalize();

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
                {localize(section.titleEn, section.titleHi)}
              </h2>
              <ul className="mt-4 space-y-3 text-[var(--muted)]">
                {section.itemsEn.map((itemEn, idx) => (
                  <li
                    key={itemEn}
                    className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-4"
                  >
                    {localize(itemEn, section.itemsHi[idx])}
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
      <MedicalDisclaimer />
    </div>
  );
}
