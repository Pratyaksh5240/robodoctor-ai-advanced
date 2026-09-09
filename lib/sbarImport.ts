/**
 * RoboDoctor AI: SBAR File Parser & Importer Utility
 * Parses structured JSON SbarReportData, multi-line RoboDoctor SBAR PDFs,
 * hospital EHR discharge notes, and standard SBAR clinical notes.
 */

export interface ParsedSbarCondition {
  name: string;
  diagnosedDate?: string;
  status: "active" | "managed" | "resolved";
  notes?: string;
  medications?: Array<{
    medicineName: string;
    dosage: string;
    startDate?: string;
    reasonForChange?: string;
    prescribedBy?: string;
  }>;
}

export interface ParsedSbarFamilyMember {
  relation: string;
  condition: string;
  ageOfOnset?: number | null;
  notes?: string;
}

export interface ParsedSbarResult {
  patientName?: string;
  age?: number;
  gender?: string;
  reportId?: string;
  generatedAt?: string;
  conditions: ParsedSbarCondition[];
  familyHistory: ParsedSbarFamilyMember[];
  vitals?: {
    bloodPressure?: string;
    bloodSugar?: number;
    heartRate?: number;
  };
  primaryChiefComplaint?: string;
  overallRiskLevel?: string;
}

/**
 * Universal SBAR parser handling JSON files, multi-line PDFs, and clinical text notes
 */
export function parseSbarFileContent(rawText: string): ParsedSbarResult {
  const trimmed = rawText.trim();

  // 1. Try parsing directly as JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed);
      return parseJsonSbar(data);
    } catch {
      // Fall through to text parser
    }
  }

  // 2. Check for markdown code fences with JSON
  const jsonFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonFenceMatch) {
    try {
      const data = JSON.parse(jsonFenceMatch[1]);
      return parseJsonSbar(data);
    } catch {}
  }

  // 3. Check if raw text contains an embedded JSON block
  const jsonStart = trimmed.indexOf("{\n  \"reportId\"");
  if (jsonStart !== -1) {
    try {
      const jsonEnd = trimmed.lastIndexOf("}");
      const data = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
      return parseJsonSbar(data);
    } catch {}
  }

  // 4. Parse as text / markdown clinical SBAR note
  return parseTextSbar(trimmed);
}

function parseJsonSbar(data: any): ParsedSbarResult {
  const root = Array.isArray(data) ? (data[0] || {}) : data;

  const conditions: ParsedSbarCondition[] = [];
  const familyHistory: ParsedSbarFamilyMember[] = [];

  // Chronic Conditions extraction
  const rawConds = root.chronicConditions || root.conditions || root.diagnoses || root.medicalHistory || root.pastMedicalHistory || root.problemList || [];
  if (Array.isArray(rawConds)) {
    rawConds.forEach((c: any) => {
      if (typeof c === "string" && c.trim()) {
        conditions.push({
          name: c.trim(),
          diagnosedDate: new Date().toISOString().slice(0, 10),
          status: "active",
          notes: "Imported from SBAR report",
          medications: [],
        });
      } else if (c && typeof c === "object") {
        const cName = c.name || c.condition || c.diagnosis || c.title || "";
        if (cName) {
          const medList: ParsedSbarCondition["medications"] = [];
          if (c.currentMedicine) {
            medList.push({
              medicineName: c.currentMedicine,
              dosage: "Standard",
              startDate: c.diagnosedDate || new Date().toISOString().slice(0, 10),
              reasonForChange: "Active prescription in SBAR summary",
            });
          }
          if (Array.isArray(c.medicationHistory || c.medications)) {
            (c.medicationHistory || c.medications).forEach((m: any) => {
              if (m && (m.medicineName || m.name)) {
                medList.push({
                  medicineName: m.medicineName || m.name,
                  dosage: m.dosage || "As prescribed",
                  startDate: m.startDate || new Date().toISOString().slice(0, 10),
                  reasonForChange: m.reasonForChange || m.reason || "SBAR transition",
                  prescribedBy: m.prescribedBy || "",
                });
              }
            });
          }

          let normStatus: "active" | "managed" | "resolved" = "active";
          if (c.status === "managed" || c.status === "controlled" || c.status === "stable") {
            normStatus = "managed";
          } else if (c.status === "resolved" || c.status === "cured" || c.status === "remission") {
            normStatus = "resolved";
          }

          conditions.push({
            name: cName,
            diagnosedDate: c.diagnosedDate || new Date().toISOString().slice(0, 10),
            status: normStatus,
            notes: c.historySummary || c.notes || "Imported from SBAR clinical handover",
            medications: medList,
          });
        }
      }
    });
  }

  // Family History extraction
  const rawFam = root.familyHistory || root.pedigree || root.familyMembers || [];
  if (Array.isArray(rawFam)) {
    rawFam.forEach((f: any) => {
      if (typeof f === "string" && f.trim()) {
        familyHistory.push({
          relation: "Family Relative",
          condition: f.trim(),
          notes: "Imported from SBAR report",
        });
      } else if (f && typeof f === "object") {
        const rel = f.relation || f.relative || "Family Relative";
        const cond = f.condition || f.diagnosis || f.disease || "";
        if (cond) {
          familyHistory.push({
            relation: rel,
            condition: cond,
            ageOfOnset: typeof f.ageOfOnset === "number" ? f.ageOfOnset : null,
            notes: f.notes || "Imported from SBAR family history record",
          });
        }
      }
    });
  }

  if (Array.isArray(root.familyHistoryPatterns) && familyHistory.length === 0) {
    root.familyHistoryPatterns.forEach((pat: string) => {
      if (typeof pat === "string" && pat.includes(" in ")) {
        const parts = pat.split(" in ");
        familyHistory.push({
          condition: parts[0].trim(),
          relation: parts[1].trim(),
          notes: "Extracted from SBAR generational pattern",
        });
      }
    });
  }

  return {
    patientName: root.patientName || undefined,
    age: typeof root.age === "number" ? root.age : undefined,
    gender: root.gender || undefined,
    reportId: root.reportId || undefined,
    generatedAt: root.generatedAt || undefined,
    conditions,
    familyHistory,
    vitals: root.vitals || undefined,
    primaryChiefComplaint: root.primaryChiefComplaint || undefined,
    overallRiskLevel: root.overallRiskLevel || undefined,
  };
}

const COMMON_RELATIONS = [
  "paternal grandfather", "paternal grandmother", "maternal grandfather", "maternal grandmother",
  "grandfather", "grandmother", "grandpa", "grandma",
  "paternal uncle", "paternal aunt", "maternal uncle", "maternal aunt",
  "father", "mother", "dad", "mom", "parent",
  "brother", "sister", "sibling", "twin",
  "uncle", "aunt", "son", "daughter", "child",
  "first cousin", "cousin", "nephew", "niece"
];

function titleCase(str: string): string {
  return str
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const CONDITION_KEYWORDS = [
  "hypertension", "high blood pressure", "htn",
  "diabetes", "diabetic", "dm", "t2d", "t1d", "hyperglycemia",
  "coronary", "cad", "angina", "myocardial infarction", "heart attack", "ischemic", "atherosclerosis",
  "heart failure", "chf", "cardiomyopathy", "atrial fibrillation", "afib", "arrhythmia",
  "cholesterol", "hyperlipidemia", "dyslipidemia", "hypercholesterolemia",
  "asthma", "copd", "bronchitis", "emphysema", "apnea", "pulmonary",
  "arthritis", "osteoarthritis", "rheumatoid", "osteoporosis", "gout", "spondylitis",
  "kidney", "ckd", "renal", "nephropathy", "proteinuria",
  "thyroid", "hypothyroidism", "hyperthyroidism", "hashimoto", "graves", "goiter",
  "gerd", "acid reflux", "gastritis", "ulcer", "ibs", "crohn", "colitis", "celiac",
  "liver", "fatty liver", "cirrhosis", "hepatitis", "pancreatitis",
  "depression", "anxiety", "bipolar", "ptsd", "panic disorder",
  "migraine", "headache", "epilepsy", "seizure", "neuropathy", "stroke", "cva", "tia",
  "cancer", "carcinoma", "lymphoma", "leukemia", "melanoma", "tumor", "neoplasm",
  "eczema", "psoriasis", "dermatitis"
];

function isLikelyCondition(text: string): boolean {
  const l = text.toLowerCase();
  return CONDITION_KEYWORDS.some(kw => l.includes(kw));
}

function parseTextSbar(text: string): ParsedSbarResult {
  const conditions: ParsedSbarCondition[] = [];
  const familyHistory: ParsedSbarFamilyMember[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let patientName: string | undefined;
  let age: number | undefined;
  let gender: string | undefined;
  let reportId: string | undefined;
  let generatedAt: string | undefined;
  let primaryChiefComplaint: string | undefined;

  let currentSection: "S" | "B" | "O" | "A" | "R" | "FAM" | "MED" | "" = "";
  let pendingCondition: ParsedSbarCondition | null = null;
  let pendingFamilyMember: ParsedSbarFamilyMember | null = null;
  let lastConditionCandidate = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip dividers, page markers
    if (/^--\s*\d+\s*of\s*\d+\s*--$/i.test(line) ||
        /^page\s+\d+/i.test(line) ||
        /^={3,}|^-{3,}|\*{3,}/.test(line) ||
        line.includes("REVIEW PRIORITY") ||
        line.startsWith("🩺 RoboDoctor") ||
        line.startsWith("RoboDoctor AI Clinical")) {
      continue;
    }

    // Metadata extraction
    if (/^ID:\s*([^\s•*]+)/i.test(line)) {
      const idMatch = line.match(/^ID:\s*([^\s•*]+)/i);
      if (idMatch) reportId = idMatch[1].trim();
      const genMatch = line.match(/Generated:\s*([^\n•*]+)/i);
      if (genMatch) generatedAt = genMatch[1].trim();
      continue;
    }

    if (/^Patient(?:\s*Name)?:\s*(.+)$/i.test(line)) {
      const pMatch = line.match(/^Patient(?:\s*Name)?:\s*([^(|•]+)(?:\(([^)]+)\)|\|(.+))?/i);
      if (pMatch) {
        patientName = pMatch[1].trim();
        const details = (pMatch[2] || pMatch[3] || "");
        const ageMatch = details.match(/(?:age\s*:?\s*)?(\d{1,3})\s*(?:y|yo|years|yrs)?/i);
        if (ageMatch) age = parseInt(ageMatch[1], 10);
        if (/female|woman|\bf\b/i.test(details)) gender = "Female";
        else if (/male|man|\bm\b/i.test(details)) gender = "Male";
      }
      continue;
    }

    // Section header detection
    let workingLine = line;
    const upper = line.toUpperCase();

    // Family History Section Header
    if (/^(?:FAMILY HISTORY|FAMILY PEDIGREE|HEREDITARY RISK|FAMILY HEALTH)/i.test(upper)) {
      currentSection = "FAM";
      const stripped = line.replace(/^(?:FAMILY HISTORY|FAMILY PEDIGREE|HEREDITARY RISK|FAMILY HEALTH)\s*[:\-–]?\s*(?:\([^)]*\))?\s*/i, "").trim();
      if (!stripped) continue;
      workingLine = stripped;
    }
    // S: Situation / Chief Complaint
    else if (/^(?:S[:\s]+)?(?:SITUATION|CHIEF COMPLAINT|SUBJECTIVE)\b|^S:\s*/i.test(upper)) {
      currentSection = "S";
      const stripped = line.replace(/^(?:S[:\s]+)?(?:SITUATION|CHIEF COMPLAINT|SUBJECTIVE)\s*[:\-–]?\s*(?:\([^)]*\))?|^S:\s*/i, "").trim();
      if (!stripped) continue;
      workingLine = stripped;
    }
    // B: Background / Past Medical History
    else if (/^(?:B[:\s]+)?(?:BACKGROUND|PAST MEDICAL HISTORY|PMH|CHRONIC CONDITIONS|PROBLEM LIST)\b|^B:\s*/i.test(upper)) {
      if (upper.includes("DOCUMENTED RELATIVES") || upper.includes("FAMILY PEDIGREE") || upper.includes("HEREDITARY")) {
        currentSection = "FAM";
      } else {
        currentSection = "B";
      }
      const stripped = line.replace(/^(?:B[:\s]+)?(?:BACKGROUND|PAST MEDICAL HISTORY|PMH|CHRONIC CONDITIONS|PROBLEM LIST)\s*[:\-–]?\s*(?:\([^)]*\))?|^B:\s*/i, "").trim();
      if (!stripped) continue;
      workingLine = stripped;
    }
    // O: Objective
    else if (/^(?:O[:\s]+)?(?:OBJECTIVE|VITALS|LAB VALUES|PHYSICAL EXAM)\b|^O:\s*/i.test(upper)) {
      currentSection = "O";
      const stripped = line.replace(/^(?:O[:\s]+)?(?:OBJECTIVE|VITALS|LAB VALUES|PHYSICAL EXAM)\s*[:\-–]?\s*(?:\([^)]*\))?|^O:\s*/i, "").trim();
      if (!stripped) continue;
      workingLine = stripped;
    }
    // A: Assessment
    else if (/^(?:A[:\s]+)?(?:ASSESSMENT|IMPRESSION|DIAGNOSES)\b|^A:\s*/i.test(upper)) {
      currentSection = "A";
      const stripped = line.replace(/^(?:A[:\s]+)?(?:ASSESSMENT|IMPRESSION|DIAGNOSES)\s*[:\-–]?\s*(?:\([^)]*\))?|^A:\s*/i, "").trim();
      if (!stripped) continue;
      workingLine = stripped;
    }
    // R: Recommendation / Plan
    else if (/^(?:R[:\s]+)?(?:RECOMMENDATION|PLAN|FOLLOW UP|DISCHARGE PLAN)\b|^R:\s*/i.test(upper)) {
      currentSection = "R";
      const stripped = line.replace(/^(?:R[:\s]+)?(?:RECOMMENDATION|PLAN|FOLLOW UP|DISCHARGE PLAN)\s*[:\-–]?\s*(?:\([^)]*\))?|^R:\s*/i, "").trim();
      if (!stripped) continue;
      workingLine = stripped;
    }
    // Medications section
    else if (/^(?:CURRENT MEDICATIONS|MEDICATIONS|ACTIVE MEDICATIONS|MEDICATION LIST|RX)\s*[:\-–]?$/i.test(upper)) {
      currentSection = "MED";
      continue;
    }

    // Clean bullet points: *, -, •, numbers
    const cleanLine = workingLine.replace(/^[\*\-\•\d\.\s]+/, "").trim();
    const cleanLower = cleanLine.toLowerCase();

    // 1. Check for RoboDoctor Card Status Line: "ACTIVE", "MANAGED", "RESOLVED"
    if (/^(ACTIVE|MANAGED|RESOLVED|CONTROLLED|STABLE)$/i.test(cleanLine)) {
      if (pendingCondition) {
        const val = cleanLine.toLowerCase();
        pendingCondition.status = (val === "resolved" ? "resolved" : val === "managed" || val === "controlled" || val === "stable" ? "managed" : "active");
        continue;
      }
    }

    // 2. Check for Diagnosed Date line: "Diagnosed: 2023-05-12 * 2 changes logged"
    if (/^diagnosed\s*:\s*(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{4})/i.test(cleanLine)) {
      const dMatch = cleanLine.match(/^diagnosed\s*:\s*(\d{4}[-\/]\d{2}[-\/]\d{2}|\d{4})/i);
      if (dMatch && pendingCondition) {
        pendingCondition.diagnosedDate = dMatch[1];
        continue;
      }
    }

    // 3. Check for Active Rx line: "Active Rx: Amlodipine 5mg once daily"
    if (/^(?:active rx|current rx|rx|current medicine|medication)\s*:\s*(.+)$/i.test(cleanLine)) {
      const rxMatch = cleanLine.match(/^(?:active rx|current rx|rx|current medicine|medication)\s*:\s*(.+)$/i);
      if (rxMatch && pendingCondition) {
        const medName = rxMatch[1].trim();
        const doseMatch = medName.match(/\b\d+\s*(?:mg|mcg|ml|g|units|tablet|daily|bid|tid|qid|prn)\b.*/i);
        pendingCondition.medications = [{
          medicineName: medName,
          dosage: doseMatch ? doseMatch[0] : "Standard prescribed dose",
          startDate: pendingCondition.diagnosedDate || new Date().toISOString().slice(0, 10),
          reasonForChange: "Active prescription in SBAR summary",
        }];
        continue;
      }
    }

    // 4. Check for Medication History summary note: "Amlodipine 5mg [2023-05-12 - Present]: ..."
    if (pendingCondition && /\[\d{4}.*?Present\]/i.test(cleanLine)) {
      pendingCondition.notes = cleanLine;
      continue;
    }

    // 5. Check for RoboDoctor Family History Card Layout:
    const isExactRelation = COMMON_RELATIONS.includes(cleanLower);
    if (isExactRelation) {
      const relStr = titleCase(cleanLower);
      const condName = (pendingCondition ? pendingCondition.name : lastConditionCandidate) || "Hereditary Risk Condition";

      if (pendingCondition) {
        const idx = conditions.indexOf(pendingCondition);
        if (idx !== -1) conditions.splice(idx, 1);
        pendingCondition = null;
      }

      const famEntry: ParsedSbarFamilyMember = {
        relation: relStr,
        condition: condName,
        ageOfOnset: null,
        notes: "",
      };
      familyHistory.push(famEntry);
      pendingFamilyMember = famEntry;
      lastConditionCandidate = "";
      continue;
    }

    // Check for Age of Onset line: "Age of Onset: 52 years"
    if (/^age of onset\s*:\s*(\d{1,2})/i.test(cleanLine)) {
      const aMatch = cleanLine.match(/^age of onset\s*:\s*(\d{1,2})/i);
      if (aMatch && pendingFamilyMember) {
        pendingFamilyMember.ageOfOnset = parseInt(aMatch[1], 10);
        continue;
      }
    }

    // Check for Family Member Notes line right after Age of Onset
    if (pendingFamilyMember && currentSection === "FAM") {
      if (!pendingFamilyMember.notes) {
        pendingFamilyMember.notes = cleanLine;
        continue;
      }
    }

    // 6. Inline Family Member statements:
    const inlineRelMatch = COMMON_RELATIONS.find(rel => {
      return cleanLower.startsWith(rel + ":") ||
             cleanLower.startsWith(rel + " -") ||
             cleanLower.startsWith(rel + " –") ||
             cleanLower.startsWith(rel + " has ") ||
             cleanLower.startsWith(rel + " had ") ||
             cleanLower.startsWith(rel + " was ");
    });

    if (inlineRelMatch) {
      const relStr = titleCase(inlineRelMatch);
      const afterRel = cleanLine.replace(new RegExp(`^${inlineRelMatch}[\\s:\\-–hasdw]+`, "i"), "").trim();
      const ageMatch = afterRel.match(/(?:at age|age of onset:?|onset age:?|onset at age|diagnosed at age|age)\s*(\d{1,2})/i);
      const ageVal = ageMatch ? parseInt(ageMatch[1], 10) : null;
      const cleanCond = afterRel.replace(/(?:at age|age of onset:?|onset age:?|onset at age|diagnosed at age|age)\s*\d{1,2}/gi, "").trim().replace(/[,\.]$/, "");

      if (cleanCond) {
        const condParts = cleanCond.split(/,\s*(?=[A-Z])/);
        condParts.forEach(cp => {
          const trimmedCp = cp.trim();
          if (trimmedCp) {
            const famEntry: ParsedSbarFamilyMember = {
              relation: relStr,
              condition: trimmedCp,
              ageOfOnset: ageVal,
              notes: `Documented from family history note (${afterRel})`,
            };
            familyHistory.push(famEntry);
            pendingFamilyMember = famEntry;
          }
        });
        continue;
      }
    }

    // 7. Situation / Chief Complaint text (capture text, do not add as chronic condition)
    if (currentSection === "S") {
      if (!primaryChiefComplaint) {
        primaryChiefComplaint = cleanLine;
      }
      continue;
    }

    // In Family section, track condition candidates or notes
    if (currentSection === "FAM") {
      lastConditionCandidate = cleanLine;
      continue;
    }

    // 8. General Condition Line Parsing (in Background, PMH, or general clinical note)
    const isConditionCandidate = isLikelyCondition(cleanLine) ||
      (currentSection === "B" && cleanLine.length < 80 && !cleanLine.toLowerCase().startsWith("vitals") && !cleanLine.toLowerCase().startsWith("total"));

    if (isConditionCandidate) {
      let condName = cleanLine;
      let status: "active" | "managed" | "resolved" = "active";
      let diagnosedDate = new Date().toISOString().slice(0, 10);
      let extractedMed: { medicineName: string; dosage: string } | null = null;

      // Check status tags: [Managed], (Active), etc.
      const tagMatch = condName.match(/\[(Active|Managed|Resolved|Controlled|Stable)\]|\((Active|Managed|Resolved|Controlled|Stable)\)/i);
      if (tagMatch) {
        const s = (tagMatch[1] || tagMatch[2]).toLowerCase();
        status = s === "resolved" ? "resolved" : s === "managed" || s === "controlled" || s === "stable" ? "managed" : "active";
        condName = condName.replace(/\[.*?\]|\(.*?\)/, "").trim();
      }

      // Check medication: word boundary \b(on|taking|prescribed|with|rx:?)\b
      const medMatch = condName.match(/\b(?:on|taking|prescribed|with|rx:?)\b\s*([a-zA-Z0-9\s,\.\-]+)/i);
      if (medMatch) {
        const rawMed = medMatch[1].trim().replace(/[;\.]$/, "");
        const doseMatch = rawMed.match(/\b\d+\s*(?:mg|mcg|ml|g|units|tablet|daily|bid|tid|qid|prn)\b.*/i);
        extractedMed = {
          medicineName: rawMed,
          dosage: doseMatch ? doseMatch[0] : "Prescribed dose",
        };
        condName = condName.slice(0, medMatch.index).trim().replace(/[-–:,]$/, "").trim();
      }

      // Check diagnosed year/date
      const dateMatch = cleanLine.match(/\b(20\d{2}[-\/]\d{2}[-\/]\d{2}|20\d{2}|19\d{2})\b/);
      if (dateMatch) {
        diagnosedDate = dateMatch[1];
      }

      // Clean condition name
      condName = condName.replace(/^(?:Patient has|History of|Diagnosed with|Known case of)\s*/i, "").trim();
      condName = condName.replace(/[-–:,]$/, "").trim();

      if (condName.length > 2) {
        const newCond: ParsedSbarCondition = {
          name: condName,
          diagnosedDate,
          status: extractedMed && status === "active" ? "managed" : status,
          notes: "Imported from SBAR document",
          medications: extractedMed ? [{
            medicineName: extractedMed.medicineName,
            dosage: extractedMed.dosage,
            startDate: diagnosedDate,
            reasonForChange: "Active prescription in clinical note",
          }] : [],
        };
        conditions.push(newCond);
        pendingCondition = newCond;
      }
    }
  }

  return {
    patientName,
    age,
    gender,
    reportId,
    generatedAt,
    conditions,
    familyHistory,
    primaryChiefComplaint,
  };
}
