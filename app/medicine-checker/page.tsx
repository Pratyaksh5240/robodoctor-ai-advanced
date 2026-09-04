"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLanguage, useLocalize } from "@/app/context/LanguageContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import {
  DRUG_DATABASE,
  PRESET_COMBINATIONS,
  analyzeDrugSafety,
} from "@/lib/drugInteractions";

export default function MedicineCheckerPage() {
  const { language } = useLanguage();
  const localize = useLocalize();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(["paracetamol", "ibuprofen"]);

  // Filter autocomplete suggestions
  const filteredSuggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return DRUG_DATABASE.filter(
      (drug) =>
        !selectedIds.includes(drug.id) &&
        (drug.genericName.toLowerCase().includes(query) ||
          drug.brandNames.some((b) => b.toLowerCase().includes(query)) ||
          drug.category.toLowerCase().includes(query))
    );
  }, [searchTerm, selectedIds]);

  const addDrug = (id: string) => {
    if (!selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
    setSearchTerm("");
  };

  const removeDrug = (id: string) => {
    setSelectedIds(selectedIds.filter((item) => item !== id));
  };

  const loadPreset = (drugIds: string[]) => {
    setSelectedIds(drugIds);
  };

  const report = useMemo(() => analyzeDrugSafety(selectedIds), [selectedIds]);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "major":
        return {
          bg: "bg-red-500/20 text-red-400 border-red-500/40",
          label: localize("🚨 Major Interaction Risk", "🚨 गंभीर जोखिम (Major Risk)"),
          desc: localize(
            "This drug combination carries high risk of dangerous side effects or severe interactions. Doctor consultation required.",
            "इस दवा संयोजन में गंभीर दुष्प्रभाव या रक्तस्राव का जोखिम है। तुरंत डॉक्टर से परामर्श लें।"
          ),
        };
      case "moderate":
        return {
          bg: "bg-amber-500/20 text-amber-400 border-amber-500/40",
          label: localize("⚠️ Moderate Caution Required", "⚠️ मध्यम जोखिम (Moderate Caution)"),
          desc: localize(
            "Dose spacing or clinical monitoring recommended for this combination.",
            "दवाओं के समय में अंतर रखें या खुराक के लिए डॉक्टर की सलाह लें।"
          ),
        };
      case "minor":
        return {
          bg: "bg-blue-500/20 text-blue-400 border-blue-500/40",
          label: localize("ℹ️ Minor / Routine Combination", "ℹ️ मामूली इंटरैक्शन (Minor Interaction)"),
          desc: localize(
            "Generally safe under standard dosage limits with minor routine precautions.",
            "सामान्य खुराक सीमाओं के भीतर उपयोग करना आमतौर पर सुरक्षित है।"
          ),
        };
      default:
        return {
          bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
          label: localize("✅ No Major Known Direct Interaction", "✅ सुरक्षित संयोजन (Safe Combination)"),
          desc: localize(
            "No adverse direct interaction found between the selected medications.",
            "चुनी गई दवाओं के बीच कोई गंभीर अंतःक्रिया दर्ज नहीं की गई है।"
          ),
        };
    }
  };

  const overallBadge = getRiskBadge(report.overallRisk);

  return (
    <div className="min-h-screen bg-[#06101c] text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800 bg-[#091728]/80 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition text-sm font-semibold"
          >
            ← {localize("Back to Home", "मुख्य पृष्ठ")}
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>💊</span>
            <span>
              {localize("Drug Interaction & Safety Checker", "दवा सुरक्षा एवं इंटरैक्शन जांच")}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Intro Banner */}
        <section className="bg-gradient-to-r from-blue-900/30 via-slate-900 to-indigo-900/30 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
              <span>🛡️ Clinical Medication Safety</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {localize(
                "Check Medication Interactions & Side Effects",
                "क्या आपकी दवाएं एक साथ लेना सुरक्षित है?"
              )}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {localize(
                "Search and add 2 or more medicines to instantly check for dangerous drug interactions, bleeding risks, food/alcohol warnings, and dose spacing guidance.",
                "अपनी दवाओं को खोजें और चुनें। यह टूल दवाओं के बीच संभावित अंतःक्रिया (Interactions), दुष्प्रभावों, भोजन संबंधी चेतावनियों और खुराक के समय का विश्लेषण करता है।"
              )}
            </p>
          </div>

          {/* Database Scope Disclaimer */}
          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200/90 flex items-start gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <span className="font-bold">{localize("Database Scope Note:", "Database Scope Note:")}</span>{" "}
              {localize(
                "Our database covers a curated set of common medications and interactions. Unlisted drug pairs are marked as unverified and should be reviewed by a pharmacist or physician before combining.",
                "हमारा डेटाबेस सामान्य दवाओं के एक सीमित सेट को कवर करता है। जो दवा संयोजन सूचीबद्ध नहीं हैं, उन्हें अनवेरिफाइड (Unverified) के रूप में चिह्नित किया जाता है और उनका फार्मासिस्ट से परामर्श किया जाना चाहिए।"
              )}
            </div>
          </div>
        </section>

        {/* Quick Presets */}
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">
            {localize("Try Common Medicine Combinations", "त्वरित उदाहरण (Quick Examples)")}
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {PRESET_COMBINATIONS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset.drugIds)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>{localize(preset.titleEn, preset.titleHi)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Search & Selection Box */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              {localize("Search Medicine Name or Generic Component", "दवा का नाम खोजें (Search Medicine)")}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={localize(
                  "e.g. Dolo 650, Aspirin, Ibuprofen, Glycomet, Augmentin, Lisinopril...",
                  "उदा: Dolo 650, Aspirin, Combiflam, Metformin, Augmentin..."
                )}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
              />

              {/* Autocomplete Dropdown */}
              <AnimatePresence>
                {filteredSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-800"
                  >
                    {filteredSuggestions.map((drug) => (
                      <button
                        key={drug.id}
                        onClick={() => addDrug(drug.id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-900 transition flex items-center justify-between text-xs sm:text-sm"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{drug.genericName}</div>
                          <div className="text-slate-400 text-xs mt-0.5">
                            Brands: {drug.brandNames.join(", ")}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                          {drug.category}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Selected Medicine Badges */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold">
              {localize("Currently Selected Medicines:", "चुनी गई दवाएं (Selected Medicines):")}
            </h4>
            {selectedIds.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                {localize(
                  "No medicines selected. Search above to add medications for analysis.",
                  "कोई दवा नहीं चुनी गई है। सुरक्षा विश्लेषण के लिए ऊपर खोजें।"
                )}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {report.selectedDrugs.map((drug) => (
                  <div
                    key={drug.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs sm:text-sm font-medium"
                  >
                    <span>💊 {drug.genericName}</span>
                    <button
                      onClick={() => removeDrug(drug.id)}
                      className="hover:text-red-400 font-bold ml-1 text-slate-400"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Safety Analysis Report */}
        {selectedIds.length >= 2 && (
          <section className="space-y-6">
            {/* Overall Risk Card */}
            <div className={`p-6 rounded-2xl border ${overallBadge.bg} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-extrabold">{overallBadge.label}</span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900/60 border border-slate-700">
                  {localize(
                    `${report.selectedDrugs.length} Medicines Analyzed`,
                    `${report.selectedDrugs.length} दवाओं का विश्लेषण`
                  )}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed opacity-90">{overallBadge.desc}</p>
            </div>

            {/* Unverified Pair Warning Banner */}
            {report.unverifiedPairs.length > 0 && (
              <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm uppercase tracking-wide">
                  <span>⚠️</span>
                  <span>
                    {localize("Unverified Medication Pair", "अनवेरिफाइड दवा संयोजन (Unverified Drug Pair)")}
                  </span>
                </div>
                {report.unverifiedPairs.map(([drugA, drugB], uIdx) => (
                  <div
                    key={uIdx}
                    className="bg-slate-950/80 p-3.5 rounded-xl border border-amber-500/30 text-xs space-y-1"
                  >
                    <div className="font-bold text-slate-200">
                      {localize(drugA.genericName, drugA.genericName)} + {localize(drugB.genericName, drugB.genericName)}
                    </div>
                    <p className="text-amber-200/90 leading-relaxed">
                      {localize(
                        "This combination was not found in our limited interaction database — consult a pharmacist or doctor before combining.",
                        "यह संयोजन हमारे सीमित डेटाबेस में नहीं मिला — इन दवाओं को एक साथ लेने से पहले फार्मासिस्ट या डॉक्टर से परामर्श करें।"
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Interaction Pair Breakdowns */}
            {report.interactions.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-100">
                  {localize("Detected Drug-Drug Interactions", "संभावित दवा अंतःक्रियाएं (Detected Drug Interactions)")}
                </h3>
                {report.interactions.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <span>⚡</span>
                        <span>
                          {localize(item.drugA.genericName, item.drugA.genericName)} + {localize(item.drugB.genericName, item.drugB.genericName)}
                        </span>
                      </h4>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-bold uppercase ${
                          item.severity === "major"
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : item.severity === "moderate"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                        }`}
                      >
                        {localize(
                          `${item.severity.toUpperCase()} Risk`,
                          item.severity === "major"
                            ? "गंभीर जोखिम"
                            : item.severity === "moderate"
                            ? "मध्यम जोखिम"
                            : "मामूली जोखिम"
                        )}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="font-semibold text-slate-200">{localize(item.title, item.title)}</div>
                      <p className="text-slate-300 leading-relaxed">{localize(item.mechanism, item.mechanism)}</p>
                    </div>

                    {/* Symptoms to Watch */}
                    {item.symptoms.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                          {localize("Warning Symptoms to Watch:", "ध्यान देने योग्य लक्षण (Symptoms to Watch):")}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.symptoms.map((sym, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200"
                            >
                              ⚠️ {localize(sym, sym)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timing & Precaution Advice */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                        {localize("Timing & Dosing Advice:", "खुराक का समय एवं सलाह (Timing & Administration):")}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300">{localize(item.timingAdvice, item.timingAdvice)}</p>
                      {item.precautions.map((prec, pIdx) => (
                        <div key={pIdx} className="text-xs text-slate-400 flex items-start gap-2">
                          <span>👉</span>
                          <span>{localize(prec, prec)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <div className="text-2xl">✅</div>
                <h4 className="text-sm font-bold text-slate-200">
                  {localize("No Direct Major Interaction Detected", "कोई प्रत्यक्ष हानिकारक अंतःक्रिया नहीं मिली")}
                </h4>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  {localize(
                    "No high-risk pairwise interactions were detected among the selected medicines. Please review food and beverage warnings below.",
                    "चुनी गई दवाओं के बीच कोई गंभीर अंतःक्रिया दर्ज नहीं की गई है। भोजन और शराब संबंधी चेतावनियों के लिए नीचे देखें।"
                  )}
                </p>
              </div>
            )}

            {/* Food, Beverage & Special Precautions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Food & Beverage */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <span>🥗</span>
                  <span>{localize("Food & Meal Administration", "भोजन निर्देश (Food & Meal Warnings)")}</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  {report.foodAndBeverageWarnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span>•</span>
                      <span>{localize(warn, warn)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alcohol & Lifestyle */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <span>🍺</span>
                  <span>{localize("Alcohol & Special Safety Warnings", "शराब एवं जीवनशैली निर्देश")}</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  {report.specialWarnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span>⚠️</span>
                      <span>{localize(warn, warn)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <section className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-2">
          <div className="font-bold text-slate-300 flex items-center gap-2">
            <span>⚠️ Clinical Disclaimer:</span>
          </div>
          <p className="leading-relaxed">
            {localize(
              "This medication checker is an educational safety tool and does not constitute formal medical or pharmacological advice. Always consult a qualified physician or pharmacist before starting, stopping, or altering any medication doses.",
              "यह दवा जांच टूल केवल शैक्षणिक एवं सूचनात्मक उद्देश्यों के लिए है। यह पेशेवर चिकित्सीय सलाह या नुस्खे का स्थान नहीं लेता है। किसी भी दवा को बंद करने या बदलने से पहले हमेशा अपने डॉक्टर या फार्मासिस्ट से सलाह लें।"
            )}
          </p>
        </section>
        <MedicalDisclaimer />
      </main>
    </div>
  );
}
