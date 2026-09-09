/**
 * RoboDoctor AI: SBAR File Parser & Importer Utility
 * Parses both structured JSON SbarReportData and unstructured clinical SBAR text/notes
 * for automated ingestion into Patient Longitudinal History and Family Pedigree modules.
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
 * Universal SBAR parser handling JSON files and clinical text notes
 */
export function parseSbarFileContent(rawText: string): ParsedSbarResult {
  const trimmed = rawText.trim();

  // 1. Try parsing as JSON (standard SbarReportData or EHR JSON)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed);
      return parseJsonSbar(data);
    } catch {
      // Fall through to text parser if JSON parse fails
    }
  }

  // 2. Parse as text / markdown clinical SBAR note
  return parseTextSbar(trimmed);
}

function parseJsonSbar(data: any): ParsedSbarResult {
  const root = Array.isArray(data) ? (data[0] || {}) : data;

  const conditions: ParsedSbarCondition[] = [];
  const familyHistory: ParsedSbarFamilyMember[] = [];

  // Chronic Conditions extraction
  const rawConds = root.chronicConditions || root.conditions || root.diagnoses || root.medicalHistory || [];
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

          conditions.push({
            name: cName,
            diagnosedDate: c.diagnosedDate || new Date().toISOString().slice(0, 10),
            status: c.status === "managed" || c.status === "resolved" ? c.status : "active",
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
        const rel = f.relation || f.relative || "Relative";
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

  // Also check familyHistoryPatterns array if available
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

function parseTextSbar(text: string): ParsedSbarResult {
  const conditions: ParsedSbarCondition[] = [];
  const familyHistory: ParsedSbarFamilyMember[] = [];
  const lines = text.split(/\r?\n/);

  let currentSection = "";
  const commonRelations = [
    "father", "mother", "brother", "sister", "grandfather", "grandmother",
    "paternal grandfather", "paternal grandmother", "maternal grandfather",
    "maternal grandmother", "uncle", "aunt", "sibling", "child", "son", "daughter"
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect SBAR headers
    const upper = line.toUpperCase();
    if (upper.startsWith("S:") || upper.startsWith("SITUATION")) {
      currentSection = "S";
      continue;
    } else if (upper.startsWith("B:") || upper.startsWith("BACKGROUND")) {
      currentSection = "B";
      continue;
    } else if (upper.startsWith("A:") || upper.startsWith("ASSESSMENT")) {
      currentSection = "A";
      continue;
    } else if (upper.startsWith("R:") || upper.startsWith("RECOMMENDATION")) {
      currentSection = "R";
      continue;
    }

    // Parse bulleted or line-based conditions in Background or general text
    const cleanLine = line.replace(/^[\*\-\•\d\.\s]+/, "").trim();

    // Check if line mentions a family relative
    const lowerLine = cleanLine.toLowerCase();
    const matchedRelation = commonRelations.find((r) => lowerLine.startsWith(r) || lowerLine.includes(`${r}:`) || lowerLine.includes(`${r} -`));

    if (matchedRelation) {
      // e.g. "Father: Type 2 Diabetes at age 52"
      const afterRel = cleanLine.replace(new RegExp(`^${matchedRelation}[\s\:\-\–]+`, "i"), "");
      const ageMatch = afterRel.match(/(?:at age|age|onset|diagnosed at)\s*(\d{1,2})/i);
      const cleanCondition = afterRel.replace(/(?:at age|age|onset|diagnosed at)\s*\d{1,2}/i, "").trim();

      if (cleanCondition) {
        familyHistory.push({
          relation: matchedRelation.charAt(0).toUpperCase() + matchedRelation.slice(1),
          condition: cleanCondition,
          ageOfOnset: ageMatch ? parseInt(ageMatch[1], 10) : null,
          notes: "Parsed from SBAR text line",
        });
      }
      continue;
    }

    // Check if line describes a medical condition
    if (currentSection === "B" || currentSection === "S" || lines.length <= 15) {
      // Patterns: "Hypertension: diagnosed 2022, on Amlodipine 5mg" or "Type 2 Diabetes - managed"
      if (cleanLine.length > 3 && cleanLine.length < 80) {
        const parts = cleanLine.split(/[:–-]/);
        const namePart = parts[0].trim();
        const detailPart = parts.slice(1).join(" - ").trim();

        // Check for common conditions
        const isMedCondition = /hypertension|diabetes|asthma|cardiovascular|coronary|cholesterol|arthritis|thyroid|copd|gerd|cancer|depression|anxiety|kidney|failure|angina/i.test(namePart);

        if (isMedCondition || (currentSection === "B" && parts.length >= 2)) {
          const medMatch = detailPart.match(/(?:on|taking|rx:?)\s*([^,;\.]+)/i);
          const medList = medMatch ? [{
            medicineName: medMatch[1].trim(),
            dosage: "Prescribed dose",
            startDate: new Date().toISOString().slice(0, 10),
            reasonForChange: "Extracted from SBAR clinical note",
          }] : [];

          conditions.push({
            name: namePart,
            diagnosedDate: new Date().toISOString().slice(0, 10),
            status: /controlled|managed|stable/i.test(detailPart) ? "managed" : "active",
            notes: detailPart || "Parsed from SBAR notes",
            medications: medList,
          });
        }
      }
    }
  }

  return {
    conditions,
    familyHistory,
    primaryChiefComplaint: text.slice(0, 150),
  };
}
