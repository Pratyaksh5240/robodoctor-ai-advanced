"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import FeatureGuide from "@/components/FeatureGuide";
import { useLanguage, useLocalize } from "@/app/context/LanguageContext";

const mealPlans = {
  bp: {
    titleEn: "DASH-style blood pressure plan",
    titleHi: "बीपी कंट्रोल डाइट योजना",
    mealsEn: [
      "Breakfast: Oats with fruits and flaxseeds",
      "Lunch: Roti, dal, spinach, and curd",
      "Snack: Roasted chana and unsalted nuts",
      "Dinner: Vegetable soup with millet roti",
    ],
    mealsHi: [
      "नाश्ता: फल और अलसी के बीज के साथ ओट्स",
      "दोपहर का खाना: रोटी, दाल, पालक और दही",
      "शाम का स्नैक: भुना चना और बिना नमक के ड्राई फ्रूट्स",
      "रात का खाना: बाजरा रोटी के साथ सब्जी का सूप",
    ],
  },
  sugar: {
    titleEn: "Balanced glycemic control plan",
    titleHi: "ब्लड शुगर बैलेंस प्लान",
    mealsEn: [
      "Breakfast: Sprouts salad and boiled eggs or paneer",
      "Lunch: Multigrain roti, green vegetables, and salad",
      "Snack: Buttermilk with chia seeds",
      "Dinner: Tofu or dal with mixed vegetables",
    ],
    mealsHi: [
      "नाश्ता: अंकुरित चाट और उबले अंडे या पनीर",
      "दोपहर का खाना: मल्टीग्रेन रोटी, हरी सब्जियां और सलाद",
      "शाम का स्नैक: चिया सीड्स के साथ छाछ",
      "रात का खाना: मिश्रित सब्जियों के साथ टोफू या दाल",
    ],
  },
  weight: {
    titleEn: "High-protein weight management plan",
    titleHi: "वजन प्रबंधन डाइट प्लान",
    mealsEn: [
      "Breakfast: Moong dal chela with green chutney",
      "Lunch: Brown rice or roti, chana, and cucumber salad",
      "Snack: Apple or guava with green tea",
      "Dinner: Light vegetable soup with grilled paneer or dal",
    ],
    mealsHi: [
      "नाश्ता: हरी चटनी के साथ मूंग दाल चीला",
      "दोपहर का खाना: ब्राउन राइस या रोटी, चना और खीरे का सलाद",
      "शाम का स्नैक: ग्रीन टी के साथ सेब या अमरूद",
      "रात का खाना: ग्रिल्ड पनीर या दाल के साथ हल्का सब्जी सूप",
    ],
  },
};

function DietPlannerContent() {
  const localize = useLocalize();
  const searchParams = useSearchParams();
  const [goal, setGoal] = useState<keyof typeof mealPlans>("bp");

  useEffect(() => {
    const track = searchParams?.get("track");
    if (track === "bp" || track === "sugar" || track === "weight") {
      setGoal(track as keyof typeof mealPlans);
    }
  }, [searchParams]);

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

                {/* Feature Usage Guide */}
        <FeatureGuide
          badge={localize("Evidence-Based Medical Nutrition", "चिकित्सीय पोषण एवं डाइट योजना")}
          title={localize("How to Use the Therapeutic Diet Planner", "चिकित्सीय डाइट प्लानर का उपयोग कैसे करें")}
          purpose={localize(
            "Get structured, whole-food meal plans designed specifically for chronic condition management: Hypertension (DASH diet), Diabetes (glycemic control), or Healthy Weight.",
            "हाई बीपी (DASH डाइट), डायबिटीज (ब्लड शुगर संतुलन) या स्वस्थ वजन घटाने के लिए विशेष रूप से डिज़ाइन की गई संतुलित भोजन योजना प्राप्त करें।"
          )}
          inputs={[
            localize("Select your health goal: Blood Pressure Control, Blood Sugar Support, or Weight Management", "अपना स्वास्थ्य लक्ष्य चुनें: बीपी नियंत्रण, ब्लड शुगर संतुलन, या वजन प्रबंधन"),
            localize("Optionally access via pre-set clinical links directly from Health Check or CAD screening", "या हेल्थ चेक / सीएडी स्क्रीनिंग के बाद सीधे अनुशंसित डाइट लिंक पर आएं"),
          ]}
          steps={[
            localize("Choose your primary wellness or chronic disease management target", "अपना प्राथमिक स्वास्थ्य लक्ष्य या पुरानी बीमारी प्रबंधन विकल्प चुनें"),
            localize("View the balanced daily 4-meal roadmap (Breakfast, Lunch, Snack, Dinner)", "दैनिक 4 समय के संतुलित भोजन का शेड्यूल (नाश्ता, दोपहर का खाना, स्नैक, रात का खाना) देखें"),
            localize("Adopt nutrient-dense Indian and international whole-food options with low sodium and steady carbs", "कम नमक, कम चीनी और उच्च फाइबर वाले पौष्टिक आहार विकल्पों को दिनचर्या में शामिल करें"),
          ]}
          outputs={[
            localize("Tailored 4-meal daily outline with portion and ingredient guidance", "सामग्री और मात्रा के सुझावों के साथ दिनभर का 4-समय का भोजन ढांचा"),
            localize("Specific nutrient focus (e.g. low-sodium potassium-rich for BP, high-fiber for sugar)", "विशिष्ट पोषक तत्वों पर ध्यान (जैसे बीपी के लिए कम सोडियम, शुगर के लिए उच्च फाइबर)"),
            localize("Practical snack substitutions to prevent sugar spikes and hunger dips", "शुगर स्पाइक्स और कमजोरी से बचने के लिए स्वस्थ स्नैक्स विकल्प"),
          ]}
          tip={localize(
            "Tip: Combine your dietary adjustments with adequate hydration and 20-30 minutes of gentle walking for the most significant improvements in BP and glucose levels.",
            "सुझाव: बीपी और शुगर में बेहतरीन सुधार के लिए डाइट के साथ पर्याप्त पानी पिएं और रोजाना 20-30 मिनट टहलें।"
          )}
        />

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
              {localize(plan.titleEn, plan.titleHi)}
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {plan.mealsEn.map((mealEn, idx) => (
                <div
                  key={mealEn}
                  className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5"
                >
                  {localize(mealEn, plan.mealsHi[idx])}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <MedicalDisclaimer />
    </div>
  );
}

export default function DietPlannerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] p-10 text-[var(--foreground)]">Loading diet planner...</div>}>
      <DietPlannerContent />
    </Suspense>
  );
}

