"use client";

import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { translateUi } from "@/lib/uiI18n";

export default function EmergencyGuidePage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);

  const emergencyGroups = isHindi
    ? [
        {
          title: "अभी आपातकालीन मदद लें",
          items: [
            "सीने में दर्द, बहुत सांस फूलना, या बेहोशी",
            "शरीर के एक तरफ कमजोरी, बोलने में कठिनाई, या अचानक भ्रम",
            "बहुत अधिक ब्लड प्रेशर के साथ तेज सिरदर्द या धुंधला दिखना",
            "होंठ, जीभ या गले में गंभीर एलर्जी सूजन",
          ],
        },
        {
          title: "जल्दी डॉक्टर को दिखाएं",
          items: [
            "उल्टी, डिहाइड्रेशन या भ्रम के साथ बहुत अधिक शुगर",
            "बुखार, पस, तेजी से फैलने या चेहरे की सूजन के साथ त्वचा समस्या",
            "आराम की स्थिति में हार्ट रेट 120 से ऊपर या चक्कर के साथ 50 से कम",
            "लगातार उल्टी, दस्त, या डिहाइड्रेशन के संकेत",
          ],
        },
        {
          title: "रूटीन फॉलो-अप बुक करें",
          items: [
            "सीमा पर मौजूद शुगर या ब्लड प्रेशर रीडिंग",
            "बार-बार सिरदर्द, खांसी, या हल्की सांस की परेशानी",
            "दो हफ्ते से ज्यादा समय तक रहने वाले त्वचा घाव",
            "वजन, नींद या जीवनशैली से जुड़ी समस्याएं",
          ],
        },
      ]
    : [
        {
          title: translateUi("Call emergency help now", language),
          items: [
            translateUi("Chest pain, severe shortness of breath, or fainting", language),
            translateUi("One-sided weakness, trouble speaking, or sudden confusion", language),
            translateUi(
              "Very high blood pressure with severe headache or blurred vision",
              language
            ),
            translateUi("Severe allergic swelling of lips, tongue, or throat", language),
          ],
        },
        {
          title: translateUi("Seek urgent doctor review", language),
          items: [
            translateUi("High blood sugar with vomiting, dehydration, or confusion", language),
            translateUi("Skin rash with fever, pus, fast spread, or facial swelling", language),
            translateUi("Heart rate above 120 at rest or below 50 with dizziness", language),
            translateUi("Persistent vomiting, diarrhea, or signs of dehydration", language),
          ],
        },
        {
          title: translateUi("Track and book routine follow-up", language),
          items: [
            translateUi("Borderline sugar or blood pressure readings", language),
            translateUi("Recurrent headaches, cough, or mild breathing symptoms", language),
            translateUi("Skin lesions lasting more than two weeks", language),
            translateUi("Weight, sleep, or lifestyle issues affecting long-term health", language),
          ],
        },
      ];

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#120708_0%,#08111d_50%,#07161f_100%)] px-6 py-10 text-white md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-rose-300">
              {localize("Safety First", "सुरक्षा पहले")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize("Emergency guide and red flags", "आपातकालीन गाइड और चेतावनी संकेत")}
            </h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              {localize(
                "Use this guide to understand when a symptom should move from self-care to urgent or emergency medical help.",
                "इस गाइड की मदद से समझें कि कब किसी लक्षण को घरेलू देखभाल से आगे बढ़ाकर तुरंत चिकित्सा मदद की जरूरत है।"
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="self-start rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-slate-100 hover:bg-white/10"
            >
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {emergencyGroups.map((group, index) => (
            <section
              key={group.title}
              className={`rounded-[28px] border p-6 ${
                index === 0
                  ? "border-rose-400/30 bg-rose-500/10"
                  : index === 1
                    ? "border-orange-400/30 bg-orange-500/10"
                    : "border-cyan-400/30 bg-cyan-500/10"
              }`}
            >
              <h2 className="mb-4 text-2xl font-bold">{group.title}</h2>
              <ul className="space-y-3 text-slate-100">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-200">
          {localize(
            "RoboDoctor AI is a screening tool, not a replacement for professional diagnosis. If you feel seriously unwell, trust the symptom severity and seek care early.",
            "RoboDoctor AI एक स्क्रीनिंग टूल है, डॉक्टर का विकल्प नहीं। यदि आपको स्थिति गंभीर लगे तो जल्दी चिकित्सा सहायता लें।"
          )}
        </div>
      </div>
    </div>
  );
}
