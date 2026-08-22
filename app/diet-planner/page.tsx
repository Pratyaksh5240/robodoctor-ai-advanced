"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";

const mealPlans = {
  bp: {
    titleEn: "Blood pressure friendly plan",
    titleHi: "ब्लड प्रेशर फ्रेंडली प्लान",
    mealsEn: [
      "Breakfast: oats with fruit and unsalted nuts",
      "Lunch: dal, roti, salad, and curd",
      "Snack: coconut water or roasted chana",
      "Dinner: grilled paneer or tofu with vegetables",
    ],
    mealsHi: [
      "नाश्ता: ओट्स, फल और बिना नमक वाले नट्स",
      "दोपहर: दाल, रोटी, सलाद और दही",
      "स्नैक: नारियल पानी या भुना चना",
      "रात: ग्रिल्ड पनीर या टोफू के साथ सब्जियां",
    ],
  },
  sugar: {
    titleEn: "Blood sugar support plan",
    titleHi: "ब्लड शुगर सपोर्ट प्लान",
    mealsEn: [
      "Breakfast: besan chilla or eggs with vegetables",
      "Lunch: brown rice or roti with dal and sabzi",
      "Snack: sprouts or peanuts in small portion",
      "Dinner: soup, salad, and protein-focused meal",
    ],
    mealsHi: [
      "नाश्ता: बेसन चीला या अंडे सब्जियों के साथ",
      "दोपहर: ब्राउन राइस या रोटी के साथ दाल और सब्जी",
      "स्नैक: स्प्राउट्स या थोड़ी मात्रा में मूंगफली",
      "रात: सूप, सलाद और प्रोटीन वाला भोजन",
    ],
  },
  weight: {
    titleEn: "Weight management plan",
    titleHi: "वजन प्रबंधन प्लान",
    mealsEn: [
      "Breakfast: Greek yogurt or poha with vegetables",
      "Lunch: lean protein, vegetables, and smaller carbs",
      "Snack: fruit with seeds",
      "Dinner: early light meal with soup or salad",
    ],
    mealsHi: [
      "नाश्ता: ग्रीक योगर्ट या सब्जियों वाला पोहा",
      "दोपहर: लीन प्रोटीन, सब्जियां और कम कार्ब्स",
      "स्नैक: बीजों के साथ फल",
      "रात: जल्दी हल्का भोजन जैसे सूप या सलाद",
    ],
  },
};

export default function DietPlannerPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";
  const localize = (english: string, hindi: string) =>
    isHindi ? hindi : translateUi(english, language);
  const [goal, setGoal] = useState<keyof typeof mealPlans>("bp");

  const plan = useMemo(() => mealPlans[goal], [goal]);

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-lime-400">
              {localize("Diet Planner", "डाइट प्लानर")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize("Simple health diet planner", "सिंपल हेल्थ डाइट प्लानर")}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "See an easy day-structure meal outline for goals like BP control, sugar support, and weight management.",
                "BP, शुगर और वजन जैसे लक्ष्यों के लिए एक आसान दिनभर का भोजन ढांचा देखें।"
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

        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-2xl font-bold">
              {localize("Choose your goal", "अपना लक्ष्य चुनें")}
            </h2>
            <div className="mt-5 space-y-3">
              {[
                ["bp", localize("Blood pressure control", "ब्लड प्रेशर कंट्रोल")],
                ["sugar", localize("Blood sugar support", "ब्लड शुगर सपोर्ट")],
                ["weight", localize("Weight management", "वजन प्रबंधन")],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGoal(value as keyof typeof mealPlans)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left ${
                    goal === value
                      ? "border-lime-400/30 bg-lime-500/10"
                      : "border-[color:var(--border)] bg-[color:var(--surface-strong)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-2xl font-bold">
              {isHindi ? plan.titleHi : translateUi(plan.titleEn, language)}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(isHindi
                ? plan.mealsHi
                : plan.mealsEn.map((meal) => translateUi(meal, language))
              ).map((meal) => (
                <div
                  key={meal}
                  className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5"
                >
                  {meal}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-lime-400/20 bg-lime-500/10 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-lime-300">
                {localize("Keep in mind", "याद रखें")}
              </p>
              <p className="mt-2 text-sm leading-7">
                {localize(
                  "This is a general health eating guide. For kidney disease, pregnancy, diabetes medication, or any special condition, please ask a professional for a personal diet plan.",
                  "यह एक सामान्य हेल्थ डाइट गाइड है। किडनी रोग, गर्भावस्था, डायबिटीज दवा, या किसी खास बीमारी में व्यक्तिगत डाइट प्लान के लिए विशेषज्ञ से सलाह लें।"
                )}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
