"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import MedicalDisclaimer from "@/components/MedicalDisclaimer";
import { useAuth } from "@/components/AuthProvider";
import {
  getFamilyHistory,
  saveFamilyHistoryEntry,
  deleteFamilyHistoryEntry,
  FamilyHistoryRecord,
} from "@/lib/reportHistory";
import { mapRecordsToSbar, SbarReportData } from "@/lib/reportGenerator";
import { parseSbarFileContent, ParsedSbarResult } from "@/lib/sbarImport";
import { useLocalize } from "@/lib/useLocalize";

const COMMON_RELATIONS = [
  // Grandparents
  { key: "Paternal Grandfather", labelEn: "Paternal Grandfather (Dad's Dad)", labelHi: "दादा जी (पिता के पिता)", tier: "grandparents", side: "paternal", icon: "👴" },
  { key: "Paternal Grandmother", labelEn: "Paternal Grandmother (Dad's Mom)", labelHi: "दादी जी (पिता की माँ)", tier: "grandparents", side: "paternal", icon: "👵" },
  { key: "Maternal Grandfather", labelEn: "Maternal Grandfather (Mom's Dad)", labelHi: "नाना जी (माता के पिता)", tier: "grandparents", side: "maternal", icon: "👴" },
  { key: "Maternal Grandmother", labelEn: "Maternal Grandmother (Mom's Mom)", labelHi: "नानी जी (माता की माँ)", tier: "grandparents", side: "maternal", icon: "👵" },
  // Parents
  { key: "Father", labelEn: "Father", labelHi: "पिता जी", tier: "parents", side: "core", icon: "👨" },
  { key: "Mother", labelEn: "Mother", labelHi: "माता जी", tier: "parents", side: "core", icon: "👩" },
  // Siblings & Self
  { key: "Self", labelEn: "Self (Patient)", labelHi: "स्वयं (रोगी)", tier: "self", side: "center", icon: "👤" },
  { key: "Brother", labelEn: "Brother", labelHi: "भाई", tier: "siblings", side: "left", icon: "👦" },
  { key: "Sister", labelEn: "Sister", labelHi: "बहन", tier: "siblings", side: "right", icon: "👧" },
  // Children
  { key: "Son", labelEn: "Son", labelHi: "बेटा", tier: "children", side: "left", icon: "👦" },
  { key: "Daughter", labelEn: "Daughter", labelHi: "बेटी", tier: "children", side: "right", icon: "👧" },
  // Extended
  { key: "Paternal Uncle", labelEn: "Paternal Uncle (Chacha/Tau)", labelHi: "चाचा / ताऊ जी", tier: "extended", side: "paternal", icon: "👨" },
  { key: "Paternal Aunt", labelEn: "Paternal Aunt (Bua)", labelHi: "बुआ जी", tier: "extended", side: "paternal", icon: "👩" },
  { key: "Maternal Uncle", labelEn: "Maternal Uncle (Mama)", labelHi: "मामा जी", tier: "extended", side: "maternal", icon: "👨" },
  { key: "Maternal Aunt", labelEn: "Maternal Aunt (Masi)", labelHi: "मौसी जी", tier: "extended", side: "maternal", icon: "👩" },
];

export default function FamilyHistoryPage() {
  const localize = useLocalize();
  const { user } = useAuth();

  const [entries, setEntries] = useState<FamilyHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSbarModal, setShowSbarModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [parsedImport, setParsedImport] = useState<ParsedSbarResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Synthesize SBAR pedigree report data for direct export
  const sbarReport: SbarReportData = useMemo(() => {
    return mapRecordsToSbar(
      null,
      null,
      null,
      user?.displayName || "Patient Record",
      "family_only",
      null,
      entries
    );
  }, [entries, user]);
  const [relation, setRelation] = useState(COMMON_RELATIONS[0].key);
  const [condition, setCondition] = useState("");
  const [ageOfOnset, setAgeOfOnset] = useState("");
  const [notes, setNotes] = useState("");

  const [toast, setToast] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getFamilyHistory(user?.uid || "guest");
      setEntries(list);
    } catch (e) {
      console.error("Failed to load family history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle SBAR File Upload & Ingestion for Family Tree (Supports PDF, JSON, TXT)
  const processUploadedFile = (file: File) => {
    if (!file) return;
    setImportError(null);

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      setIsParsingFile(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileDataUrl = event.target?.result as string;
          const res = await fetch("/api/sbar-pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileDataUrl }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server responded with ${res.status}`);
          }

          const data = await res.json();
          const parsed = data.result as ParsedSbarResult;

          if (data.rawText) {
            setImportText(data.rawText);
          }

          // If familyHistory is empty, but conditions are present, adapt them to family members
          if (parsed && (!parsed.familyHistory || parsed.familyHistory.length === 0) && parsed.conditions?.length) {
            parsed.familyHistory = parsed.conditions.map(c => ({
              relation: "Family Relative",
              condition: c.name,
              ageOfOnset: null,
              notes: c.notes || "Imported from SBAR document",
            }));
          }

          if (!parsed || !parsed.familyHistory?.length) {
            setImportError(
              localize(
                "No family pedigree records could be automatically detected in this PDF. Extracted text is placed in the box below for review.",
                "इस PDF में कोई पारिवारिक स्वास्थ्य स्थिति नहीं मिली। निकाला गया टेक्स्ट नीचे दिया गया है।"
              )
            );
          } else {
            setParsedImport(parsed);
          }
        } catch (err: any) {
          setImportError(err.message || "Failed to extract family data from PDF.");
        } finally {
          setIsParsingFile(false);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const raw = event.target?.result as string;
          setImportText(raw);
          const parsed = parseSbarFileContent(raw);
          if ((!parsed.familyHistory || parsed.familyHistory.length === 0) && parsed.conditions?.length) {
            parsed.familyHistory = parsed.conditions.map(c => ({
              relation: "Family Relative",
              condition: c.name,
              ageOfOnset: null,
              notes: c.notes || "Imported from SBAR document",
            }));
          }
          if (!parsed.familyHistory || parsed.familyHistory.length === 0) {
            setImportError(
              localize(
                "No family hereditary conditions found in file. Please ensure it is a valid SBAR report or pedigree record.",
                "फाइल में कोई पारिवारिक स्वास्थ्य इतिहास नहीं मिला।"
              )
            );
          } else {
            setParsedImport(parsed);
          }
        } catch (err: any) {
          setImportError(err.message || "Failed to parse SBAR file.");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
    e.target.value = "";
  };

  const handleParsePastedText = () => {
    if (!importText.trim()) return;
    setImportError(null);
    try {
      const parsed = parseSbarFileContent(importText);
      if ((!parsed.familyHistory || parsed.familyHistory.length === 0) && parsed.conditions?.length) {
        parsed.familyHistory = parsed.conditions.map(c => ({
          relation: "Family Relative",
          condition: c.name,
          ageOfOnset: null,
          notes: c.notes || "Imported from pasted text",
        }));
      }
      if (!parsed.familyHistory || parsed.familyHistory.length === 0) {
        setImportError(localize("No family conditions detected in text. Format as SBAR or JSON with familyHistory.", "टेक्स्ट में कोई पारिवारिक स्वास्थ्य स्थिति नहीं मिली।"));
      } else {
        setParsedImport(parsed);
      }
    } catch (err: any) {
      setImportError(err.message || "Failed to parse SBAR text.");
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedImport || parsedImport.familyHistory.length === 0) return;
    setIsImporting(true);
    setImportError(null);

    try {
      let importedCount = 0;
      for (const entry of parsedImport.familyHistory) {
        await saveFamilyHistoryEntry(user?.uid || "guest", {
          relation: entry.relation,
          condition: entry.condition,
          ageOfOnset: entry.ageOfOnset !== undefined ? entry.ageOfOnset : null,
          notes: entry.notes || "Imported from SBAR report",
        });
        importedCount += 1;
      }

      setToast(
        localize(
          `Successfully imported ${importedCount} family pedigree record(s) from SBAR!`,
          `SBAR से ${importedCount} पारिवारिक इतिहास रिकॉर्ड सफलतापूर्वक आयात किए गए!`
        )
      );
      setTimeout(() => setNotice(null), 5000);
      setShowImportModal(false);
      setParsedImport(null);
      setImportText("");
      await loadData();
    } catch (err: any) {
      setImportError(err.message || "Error saving imported family records.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condition.trim()) return;

    try {
      await saveFamilyHistoryEntry(user?.uid || "guest", {
        relation,
        condition: condition.trim(),
        ageOfOnset: ageOfOnset ? Number(ageOfOnset) : null,
        notes: notes.trim(),
      });

      setCondition("");
      setAgeOfOnset("");
      setNotes("");
      setShowAddModal(false);
      setToast(localize("Family history record saved.", "पारिवारिक इतिहास सहेजा गया।"));
      setTimeout(() => setToast(null), 4000);
      await loadData();
    } catch (err) {
      console.error("Error adding family history entry:", err);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm(localize("Remove this condition from family history?", "क्या आप इस स्थिति को पारिवारिक इतिहास से हटाना चाहते हैं?"))) {
      return;
    }
    await deleteFamilyHistoryEntry(user?.uid || "guest", id);
    await loadData();
  };

  // Group entries by relationship
  const entriesByRelation = useMemo(() => {
    const map = new Map<string, FamilyHistoryRecord[]>();
    entries.forEach((e) => {
      const list = map.get(e.relation) || [];
      list.push(e);
      map.set(e.relation, list);
    });
    return map;
  }, [entries]);

  // Non-diagnostic Pattern Flagging Engine
  const detectedPatterns = useMemo(() => {
    // Normalization keywords for common clusters
    const clusters: Array<{ category: string; keywords: string[]; matches: Array<{ relation: string; condition: string }> }> = [
      { category: "Diabetes / Glycemic Disorder", keywords: ["diabetes", "sugar", "t2d", "t1d", "diabetic"], matches: [] },
      { category: "Cardiovascular / Heart Disease & Hypertension", keywords: ["heart", "cardio", "hypertension", "bp", "blood pressure", "stroke", "chd", "infarction", "attack"], matches: [] },
      { category: "Cancer / Oncological History", keywords: ["cancer", "tumor", "carcinoma", "melanoma", "leukemia", "lymphoma", "sarcoma"], matches: [] },
      { category: "Thyroid Disorders", keywords: ["thyroid", "hypothyroid", "hyperthyroid", "goiter"], matches: [] },
      { category: "Respiratory / Asthma", keywords: ["asthma", "copd", "bronchitis"], matches: [] },
    ];

    // Check exact conditions or clusters
    const rawCounts: Record<string, string[]> = {};

    entries.forEach((e) => {
      const condLower = (e.condition || "").toLowerCase().trim();
      if (!condLower) return;

      // Exact name tracking
      if (!rawCounts[condLower]) rawCounts[condLower] = [];
      if (!rawCounts[condLower].includes(e.relation)) {
        rawCounts[condLower].push(e.relation);
      }

      // Cluster tracking
      clusters.forEach((cl) => {
        if (cl.keywords.some((kw) => condLower.includes(kw))) {
          if (!cl.matches.some((m) => m.relation === e.relation)) {
            cl.matches.push({ relation: e.relation, condition: e.condition });
          }
        }
      });
    });

    const flags: Array<{ title: string; relatives: string[]; categoryDesc?: string }> = [];

    // 1. Check exact condition repeats across >= 2 blood relatives
    Object.entries(rawCounts).forEach(([name, rels]) => {
      if (rels.length >= 2) {
        flags.push({
          title: name.charAt(0).toUpperCase() + name.slice(1),
          relatives: rels,
        });
      }
    });

    // 2. Check cluster repeats if not already captured
    clusters.forEach((cl) => {
      if (cl.matches.length >= 2) {
        const alreadyFlagged = flags.some((f) => f.title.toLowerCase().includes(cl.category.toLowerCase().split(" ")[0]));
        if (!alreadyFlagged) {
          flags.push({
            title: cl.category,
            relatives: cl.matches.map((m) => `${m.relation} (${m.condition})`),
            categoryDesc: `Cluster of related ${cl.category.toLowerCase()} identified across blood relatives`,
          });
        }
      }
    });

    return flags;
  }, [entries]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition"
            >
              ←
            </Link>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>🌳</span>
                <span>{localize("Family Health History Tree", "पारिवारिक स्वास्थ्य इतिहास वृक्ष")}</span>
              </h1>
              <p className="text-xs text-[var(--muted)]">
                {localize(
                  "Pedigree-style health map for physician consultations and multi-relative pattern screening",
                  "डॉक्टर परामर्श और बहु-रिश्तेदार स्वास्थ्य पैटर्न के लिए वंशावली चार्ट"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-8 md:px-8 space-y-8">
        <MedicalDisclaimer />

        {/* Feedback Toast */}
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-300 flex items-center justify-between"
          >
            <span>{toast}</span>
            <button onClick={() => setToast(null)} className="text-xs text-emerald-400 underline">
              ✕
            </button>
          </motion.div>
        )}

        {/* Overview Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-3xl border border-[color:var(--border)] bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
              <span>🧬</span>
              <span>{localize("Generational Clinical Context", "पीढ़ीगत क्लिनिकल संदर्भ")}</span>
            </div>
            <h2 className="mt-1 text-2xl md:text-3xl font-black text-white">
              {localize("Pedigree Family Tree & Patterns", "पारिवारिक वंशावली और पैटर्न")}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)] max-w-2xl">
              {localize(
                "Document conditions across maternal and paternal lineages. If the same condition appears across 2 or more relatives, RoboDoctor alerts you to mention it to your physician during your next clinical checkup.",
                "माता और पिता दोनों पक्षों की स्वास्थ्य स्थितियों को दर्ज करें। यदि कोई बीमारी 2 या अधिक रिश्तेदारों में दिखती है, तो रोबोडॉक्टर डॉक्टर से चर्चा करने की सलाह देता है।"
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="rounded-full bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <span>➕</span>
              <span>{localize("Add Relative's Condition", "रिश्तेदार की स्थिति जोड़ें")}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-5 py-3.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-400/20 transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>📥</span>
              <span>{localize("Upload SBAR File", "SBAR फाइल अपलोड करें")}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSbarModal(true)}
              className="rounded-full border border-indigo-400/40 bg-indigo-400/10 px-5 py-3.5 text-sm font-semibold text-indigo-300 hover:bg-indigo-400/20 transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>📑</span>
              <span>{localize("Export SBAR PDF", "SBAR रिपोर्ट निर्यात")}</span>
            </button>
            <Link
              href="/export-report?mode=family_only"
              className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-3.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>{localize("SBAR Studio ↗", "SBAR स्टूडियो ↗")}</span>
            </Link>
          </div>
        </div>

        {/* Multi-Relative Pattern Advisory Banner (Non-Diagnostic) */}
        {detectedPatterns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2 font-bold text-amber-300 text-base">
              <span className="text-2xl">⚠️</span>
              <span>
                {localize(
                  "Multi-Relative Family Health Pattern Identified",
                  "बहु-रिश्तेदार पारिवारिक स्वास्थ्य पैटर्न की पहचान"
                )}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {localize(
                "The following conditions appear in multiple blood relatives. Mention these patterns to your physician, as some conditions can run in families and may warrant earlier screening or lifestyle prevention protocols.",
                "ये स्वास्थ्य स्थितियां कई रक्त संबंधियों में दिखाई देती हैं। अपनी अगली मुलाकात में डॉक्टर को यह बताएं, क्योंकि कुछ स्थितियां परिवारों में चल सकती हैं।"
              )}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {detectedPatterns.map((pat, pIdx) => (
                <div
                  key={pIdx}
                  className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-white">{pat.title}</h4>
                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 px-2.5 py-0.5 text-[10px] font-bold font-mono">
                      {pat.relatives.length} {localize("relatives", "रिश्तेदार")}
                    </span>
                  </div>

                  <p className="text-xs text-amber-200">
                    <span className="font-semibold text-amber-300">
                      {localize("Present in:", "इनमें पाया गया:")}{" "}
                    </span>
                    {pat.relatives.join(", ")}
                  </p>

                  <div className="rounded-xl bg-slate-900/80 p-2.5 text-[11px] text-slate-300 italic border border-slate-800">
                    💡 "{localize(
                      "This condition appears in multiple family members — mention this to your doctor, as some conditions can run in families.",
                      "यह स्थिति कई पारिवारिक सदस्यों में दिखती है — अपने डॉक्टर से इसका उल्लेख करें, क्योंकि कुछ स्थितियां परिवारों में चल सकती हैं।"
                    )}"
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-[var(--muted)] italic pt-1">
              {localize(
                "Notice: This is a pattern-flagging tool to prompt human clinical conversation, not a genetic risk calculation or inherited diagnostic certainty.",
                "सूचना: यह क्लिनिकल बातचीत को प्रेरित करने वाला टूल है, कोई आनुवंशिक निदान या निश्चितता नहीं।"
              )}
            </p>
          </motion.div>
        )}

        {/* Interactive Pedigree Family Tree Diagram */}
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-2xl space-y-8">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🌳</span>
                <span>{localize("Pedigree Family Tree Diagram", "पारिवारिक वंशावली चार्ट")}</span>
              </h3>
              <p className="text-xs text-[var(--muted)]">
                {localize(
                  "Visual family layout: Grandparents (Top) → Parents (Middle) → Patient & Siblings (Core)",
                  "दृश्य संरचना: दादा-दादी/नाना-नानी (शीर्ष) → माता-पिता (मध्य) → स्वयं व भाई-बहन (केंद्र)"
                )}
              </p>
            </div>
            <span className="text-xs font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
              {entries.length} {localize("conditions logged", "दर्ज स्थितियां")}
            </span>
          </div>

          {/* Tree Tier Structure */}
          <div className="space-y-10 py-4">
            {/* TIER 1: GRANDPARENTS */}
            <div>
              <div className="text-center mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                  {localize("Tier 1: Grandparents (Maternal & Paternal)", "स्तर 1: दादा-दादी / नाना-नानी")}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {COMMON_RELATIONS.filter((r) => r.tier === "grandparents").map((rel) => {
                  const relEntries = entriesByRelation.get(rel.key) || [];

                  return (
                    <div
                      key={rel.key}
                      className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4 space-y-3 transition hover:border-indigo-400/40"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{rel.icon}</span>
                        <div>
                          <p className="font-bold text-xs text-white">
                            {localize(rel.labelEn, rel.labelHi)}
                          </p>
                          <p className="text-[10px] text-[var(--muted)] uppercase font-mono">
                            {rel.side}
                          </p>
                        </div>
                      </div>

                      <div className="min-h-[60px] space-y-1.5 border-t border-[color:var(--border)] pt-2">
                        {relEntries.length === 0 ? (
                          <p className="text-[11px] text-[var(--muted)] italic">
                            {localize("No conditions logged", "कोई स्थिति दर्ज नहीं")}
                          </p>
                        ) : (
                          relEntries.map((item) => (
                            <div
                              key={item._id}
                              className="group flex items-center justify-between rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-[11px]"
                            >
                              <span className="font-bold text-indigo-300 truncate max-w-[120px]">
                                {item.condition}
                                {item.ageOfOnset ? ` (${item.ageOfOnset}y)` : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDelete(item._id)}
                                className="text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connecting Tree SVG Linker */}
            <div className="flex justify-center -my-6 opacity-30">
              <div className="w-1 h-8 bg-indigo-400" />
            </div>

            {/* TIER 2: PARENTS & EXTENDED */}
            <div>
              <div className="text-center mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                  {localize("Tier 2: Parents & Extended Lineage", "स्तर 2: माता-पिता व परिजन")}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {COMMON_RELATIONS.filter((r) => r.tier === "parents" || r.tier === "extended").slice(0, 4).map((rel) => {
                  const relEntries = entriesByRelation.get(rel.key) || [];
                  const isParent = rel.tier === "parents";

                  return (
                    <div
                      key={rel.key}
                      className={`rounded-2xl border p-4 space-y-3 transition ${
                        isParent
                          ? "border-indigo-500/40 bg-indigo-950/20"
                          : "border-[color:var(--border)] bg-[color:var(--surface-strong)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{rel.icon}</span>
                        <div>
                          <p className={`font-bold text-xs ${isParent ? "text-indigo-300 font-black" : "text-white"}`}>
                            {localize(rel.labelEn, rel.labelHi)}
                          </p>
                          <p className="text-[10px] text-[var(--muted)] uppercase font-mono">
                            {isParent ? localize("Direct Parent", "सीधे माता/पिता") : rel.side}
                          </p>
                        </div>
                      </div>

                      <div className="min-h-[60px] space-y-1.5 border-t border-[color:var(--border)] pt-2">
                        {relEntries.length === 0 ? (
                          <p className="text-[11px] text-[var(--muted)] italic">
                            {localize("No conditions logged", "कोई स्थिति दर्ज नहीं")}
                          </p>
                        ) : (
                          relEntries.map((item) => (
                            <div
                              key={item._id}
                              className="group flex items-center justify-between rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-[11px]"
                            >
                              <span className="font-bold text-indigo-300 truncate max-w-[120px]">
                                {item.condition}
                                {item.ageOfOnset ? ` (${item.ageOfOnset}y)` : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDelete(item._id)}
                                className="text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                              >
                                ✕
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connecting Linker */}
            <div className="flex justify-center -my-6 opacity-30">
              <div className="w-1 h-8 bg-cyan-400" />
            </div>

            {/* TIER 3: PATIENT (SELF) & SIBLINGS */}
            <div>
              <div className="text-center mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)] bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
                  {localize("Tier 3: Patient (Self) & Siblings", "स्तर 3: स्वयं (रोगी) व भाई-बहन")}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                {/* Brother */}
                {(() => {
                  const rel = COMMON_RELATIONS.find((r) => r.key === "Brother")!;
                  const relEntries = entriesByRelation.get("Brother") || [];
                  return (
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{rel.icon}</span>
                        <div>
                          <p className="font-bold text-xs text-white">{localize(rel.labelEn, rel.labelHi)}</p>
                          <p className="text-[10px] text-[var(--muted)] uppercase font-mono">{localize("Sibling", "सहोदर")}</p>
                        </div>
                      </div>
                      <div className="min-h-[50px] space-y-1.5 border-t border-[color:var(--border)] pt-2">
                        {relEntries.map((item) => (
                          <div key={item._id} className="group flex items-center justify-between rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-[11px]">
                            <span className="font-bold text-indigo-300">{item.condition}</span>
                            <button onClick={() => handleDelete(item._id)} className="text-slate-400 hover:text-rose-400">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* SELF (Highlighted) */}
                {(() => {
                  const rel = COMMON_RELATIONS.find((r) => r.key === "Self")!;
                  const relEntries = entriesByRelation.get("Self") || [];
                  return (
                    <div className="rounded-3xl border-2 border-cyan-400 bg-cyan-950/40 p-5 space-y-3 shadow-xl ring-4 ring-cyan-500/20">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 font-black text-xl">
                          👤
                        </div>
                        <div>
                          <p className="font-black text-sm text-cyan-300">
                            {localize("Self (Patient)", "स्वयं (रोगी)")}
                          </p>
                          <p className="text-[10px] text-cyan-400 uppercase font-mono font-bold">
                            {localize("Core Health Index", "मुख्य स्वास्थ्य सूचकांक")}
                          </p>
                        </div>
                      </div>

                      <div className="min-h-[60px] space-y-1.5 border-t border-cyan-500/30 pt-3">
                        {relEntries.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            {localize("No personal chronic conditions logged here. (See Patient History module)", "व्यक्तिगत स्थिति हेतु पेशेंट हिस्ट्री देखें")}
                          </p>
                        ) : (
                          relEntries.map((item) => (
                            <div key={item._id} className="group flex items-center justify-between rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 text-xs">
                              <span className="font-bold text-white">{item.condition}</span>
                              <button onClick={() => handleDelete(item._id)} className="text-cyan-300 hover:text-rose-400">✕</button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Sister */}
                {(() => {
                  const rel = COMMON_RELATIONS.find((r) => r.key === "Sister")!;
                  const relEntries = entriesByRelation.get("Sister") || [];
                  return (
                    <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{rel.icon}</span>
                        <div>
                          <p className="font-bold text-xs text-white">{localize(rel.labelEn, rel.labelHi)}</p>
                          <p className="text-[10px] text-[var(--muted)] uppercase font-mono">{localize("Sibling", "सहोदर")}</p>
                        </div>
                      </div>
                      <div className="min-h-[50px] space-y-1.5 border-t border-[color:var(--border)] pt-2">
                        {relEntries.map((item) => (
                          <div key={item._id} className="group flex items-center justify-between rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-[11px]">
                            <span className="font-bold text-indigo-300">{item.condition}</span>
                            <button onClick={() => handleDelete(item._id)} className="text-slate-400 hover:text-rose-400">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed List of Logged Family Conditions */}
        <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>📋</span>
              <span>{localize("All Logged Family Records", "समस्त दर्ज पारिवारिक रिकॉर्ड")}</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold text-indigo-400 hover:underline"
            >
              + {localize("Add Record", "रिकॉर्ड जोड़ें")}
            </button>
          </div>

          {entries.length === 0 ? (
            <p className="text-xs text-[var(--muted)] italic text-center py-6">
              {localize("No family conditions logged yet. Use the button above to begin.", "अभी कोई पारिवारिक रिकॉर्ड नहीं है। ऊपर दिए गए बटन का उपयोग करें।")}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {entries.map((entry) => (
                <div
                  key={entry._id}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4 flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-300 uppercase tracking-wider">
                      {entry.relation}
                    </span>
                    <h4 className="font-black text-sm text-white mt-1">{entry.condition}</h4>
                    {entry.ageOfOnset && (
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">
                        {localize("Age of onset:", "शुरुआत की उम्र:")} {entry.ageOfOnset} {localize("years", "वर्ष")}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-[11px] text-[var(--muted)] italic mt-1">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(entry._id)}
                    className="text-slate-400 hover:text-rose-400 p-1"
                    title={localize("Delete entry", "हटाएं")}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODAL: ADD FAMILY CONDITION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-3xl border border-[color:var(--border)] bg-slate-900 p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <span>➕</span>
                <span>{localize("Log Relative's Health Condition", "रिश्तेदार की स्वास्थ्य स्थिति दर्ज करें")}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {localize("Relationship", "संबंध")} *
                </label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
                >
                  {COMMON_RELATIONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.icon} {localize(r.labelEn, r.labelHi)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {localize("Condition Name", "बीमारी / स्थिति का नाम")} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={localize("e.g. Type 2 Diabetes, Hypertension, Breast Cancer", "उदा. टाइप 2 डायबिटीज, उच्च रक्तचाप")}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {localize("Age of Onset (Optional)", "शुरुआत की उम्र (वैकल्पिक)")}
                </label>
                <input
                  type="number"
                  placeholder={localize("e.g. 48", "उदा. 48")}
                  value={ageOfOnset}
                  onChange={(e) => setAgeOfOnset(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  {localize("Notes / Severity (Optional)", "अतिरिक्त विवरण / गंभीरता (वैकल्पिक)")}
                </label>
                <textarea
                  rows={2}
                  placeholder={localize("e.g. Required insulin treatment, managed with lifestyle", "उदा. इंसुलिन उपचार की आवश्यकता थी")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-full px-5 py-2.5 font-semibold text-slate-400 hover:text-white"
                >
                  {localize("Cancel", "रद्द करें")}
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-indigo-500 px-6 py-2.5 font-bold text-white hover:bg-indigo-400 transition"
                >
                  {localize("Save Family Entry", "प्रविष्टि सहेजें")}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Direct In-Module SBAR Pedigree Preview & Print Modal */}
      {showSbarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl rounded-3xl border border-indigo-500/30 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto space-y-6"
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌳</span>
                <div>
                  <h3 className="text-lg font-bold text-indigo-300">
                    {localize("SBAR Clinical Handover • Family Pedigree Tree", "SBAR क्लिनिकल सारांश • पारिवारिक वंशावली")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {localize("Standardized doctor-ready hereditary risk handover", "चिकित्सक के लिए मानकीकृत वंशावली सारांश")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>{localize("Print / Save PDF", "PDF सेव / प्रिंट")}</span>
                </button>
                <Link
                  href="/export-report?mode=family_only"
                  className="rounded-full border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  {localize("Full Studio ↗", "फुल स्टूडियो ↗")}
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSbarModal(false)}
                  className="rounded-full border border-slate-700 bg-slate-800 p-2 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* SBAR Document Preview Sheet */}
            <div id="sbar-printable" className="rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-6 text-xs text-slate-300">
              {/* Report Meta Banner */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-base font-extrabold text-indigo-400">🩺 RoboDoctor AI Clinical Handover</div>
                  <div className="text-[11px] text-slate-400">ID: {sbarReport.reportId} • Generated: {sbarReport.generatedAt}</div>
                  <div className="text-[11px] text-slate-300 font-semibold mt-1">Patient: {sbarReport.patientName} ({sbarReport.age}y / {sbarReport.gender})</div>
                </div>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-[11px] font-bold text-indigo-300">
                  {sbarReport.overallRiskLevel.toUpperCase()} REVIEW PRIORITY
                </span>
              </div>

              {/* S: Situation */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-sm">
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs font-black">S</span>
                  <span>SITUATION (Family Pedigree & Lineage Risk Audit)</span>
                </div>
                <p className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-slate-200">
                  {sbarReport.primaryChiefComplaint}
                </p>
              </div>

              {/* B: Background */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-sm">
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs font-black">B</span>
                  <span>BACKGROUND (Documented Relatives & Medical Conditions)</span>
                </div>
                {sbarReport.familyHistory && sbarReport.familyHistory.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {sbarReport.familyHistory.map((fam, fIdx) => (
                      <div key={fIdx} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{fam.condition}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {fam.relation}
                          </span>
                        </div>
                        {fam.ageOfOnset && (
                          <div className="text-[11px] text-slate-400">
                            Age of Onset: {fam.ageOfOnset} years
                          </div>
                        )}
                        {fam.notes && (
                          <div className="text-[10px] text-slate-400 italic">
                            {fam.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No family history records currently documented.</p>
                )}
              </div>

              {/* O: Objective */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-sm">
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs font-black">O</span>
                  <span>OBJECTIVE (Pedigree Analysis & Generational Reach)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Documented Relatives</span>
                    <span className="text-sm font-bold text-indigo-300 mt-0.5 block">{sbarReport.familyHistory?.length || 0}</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Clustering Patterns</span>
                    <span className="text-sm font-bold text-amber-400 mt-0.5 block">{sbarReport.familyHistoryPatterns?.length || 0} Identified</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Hereditary Status</span>
                    <span className={`text-sm font-bold mt-0.5 block ${(sbarReport.familyHistoryPatterns?.length || 0) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {(sbarReport.familyHistoryPatterns?.length || 0) > 0 ? "Advisory Indicated" : "Standard"}
                    </span>
                  </div>
                </div>
              </div>

              {/* A: Assessment */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-sm">
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs font-black">A</span>
                  <span>ASSESSMENT (Familial Multi-Relative Disease Clustering)</span>
                </div>
                {sbarReport.familyHistoryPatterns && sbarReport.familyHistoryPatterns.length > 0 ? (
                  <div className="space-y-1.5">
                    {sbarReport.familyHistoryPatterns.map((pat, pIdx) => (
                      <div key={pIdx} className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-200">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>Multi-Relative Pattern: {pat}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-300">
                          Identified in ≥2 biological relatives. Suggests shared genetic, familial, or environmental predisposition. Non-diagnostic screening indicator for doctor discussion.
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-slate-300">
                    No multi-relative familial clustering patterns detected in currently documented lineage.
                  </p>
                )}
              </div>

              {/* R: Recommendation */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300 text-sm">
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs font-black">R</span>
                  <span>RECOMMENDATION & PHYSICIAN DISCUSSION PROMPTS</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                  <div className="font-semibold text-indigo-300">Physician Discussion Guidance:</div>
                  <p>{sbarReport.recommendedFollowUp}</p>
                  <div className="border-t border-slate-800 pt-2 font-semibold text-slate-400">Clinical Precautions:</div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
                    {sbarReport.precautions.map((prec, pIdx) => (
                      <li key={pIdx}>{prec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* SBAR File Upload & Family Ingestion Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-3xl border border-indigo-500/30 bg-slate-900 p-6 md:p-8 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📥</span>
                <div>
                  <h3 className="text-lg font-bold text-indigo-300">
                    {localize("Upload SBAR Family History File", "SBAR पारिवारिक इतिहास फाइल अपलोड करें")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {localize("Import multi-generational family conditions from an SBAR JSON or clinical text note", "SBAR JSON या क्लिनिकल नोट से पारिवारिक वंशावली स्थितियां आयात करें")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setParsedImport(null);
                  setImportError(null);
                }}
                className="rounded-full border border-slate-700 bg-slate-800 p-2 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* File Dropzone */}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingFile(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processUploadedFile(file);
              }}
              className={`block border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                isDraggingFile
                  ? "border-indigo-400 bg-indigo-950/40 scale-[1.01]"
                  : "border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-950/10"
              }`}
            >
              <div className="text-3xl mb-2">🌳</div>
              <div>
                <span className="font-bold text-indigo-400 hover:text-indigo-300 text-sm">
                  {isDraggingFile
                    ? localize("Drop your SBAR PDF or JSON file here", "अपनी SBAR PDF या JSON फाइल यहाँ छोड़ें")
                    : localize("Click to select or drag & drop SBAR file (.pdf, .json, .txt, .sbar)", "SBAR फाइल चुनें या ड्रैग करें (.pdf, .json, .txt, .sbar)")}
                </span>
                <input
                  type="file"
                  accept=".pdf,.json,.txt,.sbar,.md,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {localize("Supports clinical SBAR PDF reports, JSON exports, and pedigree text notes", "क्लिनिकल SBAR PDF रिपोर्ट, JSON एक्सपोर्ट और वंशावली नोट्स समर्थित")}
                </p>
              </div>
              {isParsingFile && (
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-400 animate-pulse pt-2">
                  <span className="animate-spin">⏳</span>
                  <span>{localize("AI is analyzing and extracting SBAR clinical data from PDF...", "AI PDF से SBAR डेटा निकाल रहा है...")}</span>
                </div>
              )}
            </label>

            {/* Paste Text Fallback */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                {localize("Paste SBAR Text or JSON", "SBAR टेक्स्ट या JSON पेस्ट करें")}
              </label>
              <textarea
                rows={4}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='e.g. {"familyHistory": [{"relation": "Father", "condition": "Type 2 Diabetes", "ageOfOnset": 52}]}'
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200 focus:border-indigo-400 focus:outline-none"
              />
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-indigo-500/30 transition"
                >
                  {localize("Parse Content", "कंटेंट पार्स करें")}
                </button>
              </div>
            </div>

            {/* Parsed Preview */}
            {parsedImport && (
              <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                    ✓ {localize("Detected Relatives & Conditions:", "पहचाने गए रिश्तेदार और स्थितियां:")}
                  </span>
                  <span className="text-xs font-mono text-indigo-400 font-bold">
                    {parsedImport.familyHistory.length} found
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {parsedImport.familyHistory.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {entry.relation}: <span className="text-indigo-300 font-bold">{entry.condition}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {entry.ageOfOnset ? `Age of onset: ${entry.ageOfOnset} years • ` : ""}
                          {entry.notes}
                        </div>
                      </div>
                      <span className="text-indigo-400 font-bold text-xs">Ready</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-indigo-500/20">
                  <button
                    type="button"
                    onClick={() => setParsedImport(null)}
                    className="px-4 py-2 rounded-full text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    {localize("Clear", "साफ करें")}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isImporting}
                    className="px-6 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
                  >
                    {isImporting
                      ? localize("Importing...", "आयात हो रहा है...")
                      : localize(`Import ${parsedImport.familyHistory.length} Relative(s)`, `${parsedImport.familyHistory.length} रिश्तेदार आयात करें`)}
                  </button>
                </div>
              </div>
            )}

            {importError && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs">
                <strong>Error:</strong> {importError}
              </div>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}
