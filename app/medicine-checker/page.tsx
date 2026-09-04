"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import { translateUi } from "@/lib/uiI18n";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  DRUG_DATABASE,
  PRESET_COMBINATIONS,
  analyzeDrugSafety,
  DrugInfo
} from "@/lib/drugInteractions";

export default function MedicineCheckerPage() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

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
          label: isHindi ? "🚨 गंभीर जोखिम (Major Risk)" : "🚨 Major Interaction Risk",
          desc: isHindi
            ? "इस दवा संयोजन में गंभीर दुष्प्रभाव या रक्तस्राव का जोखिम है। तुरंत डॉक्टर से परामर्श लें।"
            : "This drug combination carries high risk of dangerous side effects or severe interactions. Doctor consultation required."
        };
      case "moderate":
        return {
          bg: "bg-amber-500/20 text-amber-400 border-amber-500/40",
          label: isHindi ? "⚠️ मध्यम जोखिम (Moderate Caution)" : "⚠️ Moderate Caution Required",
          desc: isHindi
            ? "दवाओं के समय में अंतर रखें या खुराक के लिए डॉक्टर की सलाह लें।"
            : "Dose spacing or clinical monitoring recommended for this combination."
        };
      case "minor":
        return {
          bg: "bg-blue-500/20 text-blue-400 border-blue-500/40",
          label: isHindi ? "ℹ️ मामूली इंटरैक्शन (Minor Interaction)" : "ℹ️ Minor / Routine Combination",
          desc: isHindi
            ? "सामान्य खुराक सीमाओं के भीतर उपयोग करना आमतौर पर सुरक्षित है।"
            : "Generally safe under standard dosage limits with minor routine precautions."
        };
      default:
        return {
          bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
          label: isHindi ? "✅ सुरक्षित संयोजन (Safe Combination)" : "✅ No Major Known Direct Interaction",
          desc: isHindi
            ? "चुनी गई दवाओं के बीच कोई गंभीर अंतःक्रिया दर्ज नहीं की गई है।"
            : "No adverse direct interaction found between the selected medications."
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
            ← {isHindi ? "मुख्य पृष्ठ" : translateUi("Back to Home", language)}
          </Link>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>💊</span>
            <span>
              {isHindi ? "दवा सुरक्षा एवं इंटरैक्शन जांच" : "Drug Interaction & Safety Checker"}
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
              {isHindi
                ? "क्या आपकी दवाएं एक साथ लेना सुरक्षित है?"
                : "Check Medication Interactions & Side Effects"}
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {isHindi
                ? "अपनी दवाओं को खोजें और चुनें। यह टूल दवाओं के बीच संभावित अंतःक्रिया (Interactions), दुष्प्रभावों, भोजन संबंधी चेतावनियों और खुराक के समय का विश्लेषण करता है।"
                : "Search and add 2 or more medicines to instantly check for dangerous drug interactions, bleeding risks, food/alcohol warnings, and dose spacing guidance."}
            </p>
          </div>
        </section>

        {/* Quick Presets */}
        <section className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold">
            {isHindi ? "त्वरित उदाहरण (Quick Examples)" : "Try Common Medicine Combinations"}
          </h3>
          <div className="flex flex-wrap gap-2.5">
            {PRESET_COMBINATIONS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset.drugIds)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>{isHindi ? preset.titleHi : preset.titleEn}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Search & Selection Box */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              {isHindi ? "दवा का नाम खोजें (Search Medicine)" : "Search Medicine Name or Generic Component"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  isHindi
                    ? "उदा: Dolo 650, Aspirin, Combiflam, Metformin, Augmentin..."
                    : "e.g. Dolo 650, Aspirin, Ibuprofen, Glycomet, Augmentin, Lisinopril..."
                }
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
              {isHindi ? "चुनी गई दवाएं (Selected Medicines):" : "Currently Selected Medicines:"}
            </h4>
            {selectedIds.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                {isHindi
                  ? "कोई दवा नहीं चुनी गई है। सुरक्षा विश्लेषण के लिए ऊपर खोजें।"
                  : "No medicines selected. Search above to add medications for analysis."}
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
                  {report.selectedDrugs.length} Medicines Analyzed
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed opacity-90">{overallBadge.desc}</p>
            </div>

            {/* Interaction Pair Breakdowns */}
            {report.interactions.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-100">
                  {isHindi ? "संभावित दवा अंतःक्रियाएं (Detected Drug Interactions)" : "Detected Drug-Drug Interactions"}
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
                          {item.drugA.genericName} + {item.drugB.genericName}
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
                        {item.severity} Risk
                      </span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="font-semibold text-slate-200">{item.title}</div>
                      <p className="text-slate-300 leading-relaxed">{item.mechanism}</p>
                    </div>

                    {/* Symptoms to Watch */}
                    {item.symptoms.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                          {isHindi ? "ध्यान देने योग्य लक्षण (Symptoms to Watch):" : "Warning Symptoms to Watch:"}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {item.symptoms.map((sym, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200"
                            >
                              ⚠️ {sym}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timing & Precaution Advice */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                      <div className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                        {isHindi ? "खुराक का समय एवं सलाह (Timing & Administration):" : "Timing & Dosing Advice:"}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300">{item.timingAdvice}</p>
                      {item.precautions.map((prec, pIdx) => (
                        <div key={pIdx} className="text-xs text-slate-400 flex items-start gap-2">
                          <span>👉</span>
                          <span>{prec}</span>
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
                  {isHindi ? "कोई प्रत्यक्ष हानिकारक अंतःक्रिया नहीं मिली" : "No Direct Major Interaction Detected"}
                </h4>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  {isHindi
                    ? "चुनी गई दवाओं के बीच कोई गंभीर अंतःक्रिया दर्ज नहीं की गई है। भोजन और शराब संबंधी चेतावनियों के लिए नीचे देखें।"
                    : "No high-risk pairwise interactions were detected among the selected medicines. Please review food and beverage warnings below."}
                </p>
              </div>
            )}

            {/* Food, Beverage & Special Precautions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Food & Beverage */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <span>🥗</span>
                  <span>{isHindi ? "भोजन निर्देश (Food & Meal Warnings)" : "Food & Meal Administration"}</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  {report.foodAndBeverageWarnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span>•</span>
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alcohol & Lifestyle */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <span>🍺</span>
                  <span>{isHindi ? "शराब एवं जीवनशैली निर्देश" : "Alcohol & Special Safety Warnings"}</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-300">
                  {report.specialWarnings.map((warn, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span>⚠️</span>
                      <span>{warn}</span>
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
            {isHindi
              ? "यह दवा जांच टूल केवल शैक्षणिक एवं सूचनात्मक उद्देश्यों के लिए है। यह पेशेवर चिकित्सीय सलाह या नुस्खे का स्थान नहीं लेता है। किसी भी दवा को बंद करने या बदलने से पहले हमेशा अपने डॉक्टर या फार्मासिस्ट से सलाह लें।"
              : "This medication checker is an educational safety tool and does not constitute formal medical or pharmacological advice. Always consult a qualified physician or pharmacist before starting, stopping, or altering any medication doses."}
          </p>
        </section>
      </main>
    </div>
  );
}
