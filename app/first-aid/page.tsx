"use client";

import Link from "next/link";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

const sections = [
  {
    titleEn: "Burns",
    titleHi: "जलना",
    stepsEn: [
      "Cool the burn under running water for about 20 minutes.",
      "Do not apply ice, toothpaste, or random creams.",
      "Cover with a clean non-stick cloth and seek care for large or deep burns.",
    ],
    stepsHi: [
      "जली जगह को लगभग 20 मिनट तक ठंडे बहते पानी से ठंडा करें।",
      "बर्फ, टूथपेस्ट या कोई भी गलत क्रीम न लगाएं।",
      "साफ न चिपकने वाले कपड़े से ढकें और बड़े या गहरे जलने पर डॉक्टर को दिखाएं।",
    ],
  },
  {
    titleEn: "Cuts and bleeding",
    titleHi: "कट और खून बहना",
    stepsEn: [
      "Apply firm direct pressure with a clean cloth.",
      "Raise the injured area if possible.",
      "Seek urgent care if bleeding does not stop or the cut is deep.",
    ],
    stepsHi: [
      "साफ कपड़े से सीधे दबाव डालें।",
      "संभव हो तो घायल हिस्से को ऊपर रखें।",
      "अगर खून न रुके या कट गहरा हो तो तुरंत डॉक्टर को दिखाएं।",
    ],
  },
  {
    titleEn: "Fainting",
    titleHi: "बेहोशी",
    stepsEn: [
      "Lay the person flat and lift the legs slightly.",
      "Loosen tight clothing and check breathing.",
      "If the person is not waking quickly or has chest pain or injury, seek urgent help.",
    ],
    stepsHi: [
      "व्यक्ति को सीधा लिटाएं और पैरों को थोड़ा ऊपर उठाएं।",
      "कसे हुए कपड़े ढीले करें और सांस जांचें।",
      "अगर व्यक्ति जल्दी न उठे या सीने में दर्द/चोट हो तो तुरंत मदद लें।",
    ],
  },
  {
    titleEn: "Choking",
    titleHi: "घुटना",
    stepsEn: [
      "Encourage coughing if the person can still speak.",
      "If airway is blocked, seek emergency help and perform age-appropriate first aid.",
      "Do not delay if lips turn blue or the person cannot breathe.",
    ],
    stepsHi: [
      "यदि व्यक्ति बोल पा रहा है तो उसे खांसने के लिए कहें।",
      "अगर सांस की नली बंद हो जाए तो तुरंत मदद बुलाएं और उम्र के अनुसार प्राथमिक उपचार करें।",
      "होंठ नीले पड़ें या सांस न आए तो देर न करें।",
    ],
  },
];

export default function FirstAidPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#0f101c_0%,#08111d_50%,#111827_100%)] px-6 py-10 text-white md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-orange-300">
              {localize("First Aid", "फर्स्ट एड")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize("Basic first-aid guide", "बेसिक फर्स्ट एड गाइड")}
            </h1>
            <p className="mt-3 max-w-3xl text-slate-300">
              {localize(
                "See quick first steps for burns, cuts, fainting, and choking situations.",
                "जलना, कट, बेहोशी और घुटने जैसी स्थितियों के लिए तुरंत शुरुआती कदम देखें।"
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-slate-100 hover:bg-white/10"
            >
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.titleEn}
              className="rounded-[28px] border border-white/10 bg-white/5 p-6"
            >
              <h2 className="text-2xl font-bold">
                {isHindi ? section.titleHi : translateUi(section.titleEn, language)}
              </h2>
              <ul className="mt-4 space-y-3 text-slate-100">
                {(isHindi
                  ? section.stepsHi
                  : section.stepsEn.map((step) => translateUi(step, language))
                ).map((step) => (
                  <li
                    key={step}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                  >
                    <span>•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 text-slate-100">
          {localize(
            "If breathing stops, bleeding is heavy, the person stays unconscious, or the condition is worsening fast, do not rely only on a guide. Seek emergency help immediately.",
            "यदि सांस बंद हो, बहुत खून बहे, व्यक्ति बेहोश रहे, या स्थिति तेजी से बिगड़ रही हो तो केवल गाइड न पढ़ें, तुरंत इमरजेंसी सहायता लें।"
          )}
        </div>
      </div>
    </div>
  );
}
