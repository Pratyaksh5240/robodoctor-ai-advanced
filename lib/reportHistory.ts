export type HealthReportRecord = {
  createdAt: number;
  riskLevel: string;
  riskScore: number;
  summary: string;
  bp: string;
  sugar: string;
  heartRate: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  symptoms?: string;
  symptomTags?: string[];
};

export type SkinReportRecord = {
  createdAt: number;
  bodyPart: string;
  severity: string;
  score: number;
  summary: string;
  age?: number;
  gender?: string;
  symptoms?: string;
};

export type LabReportRecord = {
  createdAt: number;
  gender?: "male" | "female";
  fastingSugar?: string;
  hba1c?: string;
  hemoglobin?: string;
  tsh?: string;
  cholesterol?: string;
  creatinine?: string;
  platelets?: string;
  wbc?: string;
  overallStatus: string;
  summary: string;
  findingsCount: number;
};

export type UserProfileRecord = {
  patientName?: string;
  age?: number;
  gender?: string;
  updatedAt?: number;
};

export type MedicationHistoryEntry = {
  _id?: string;
  medicineName: string;
  dosage: string;
  startDate: string;
  endDate?: string | null;
  reasonForChange: string;
  prescribedBy?: string;
  createdAt: number;
};

export type PatientConditionRecord = {
  _id?: string;
  userId?: string;
  dependentId?: string;
  name: string;
  diagnosedDate: string;
  status: "active" | "managed" | "resolved";
  notes?: string;
  medicationHistory: MedicationHistoryEntry[];
  createdAt: number;
  updatedAt: number;
};

export type FamilyHistoryRecord = {
  _id?: string;
  userId?: string;
  dependentId?: string;
  relation: string;
  condition: string;
  ageOfOnset?: number | null;
  notes?: string;
  createdAt: number;
};

export function getSubcollectionPath(
  userId: string,
  subcollection: string,
  dependentId?: string | null
): [string, ...string[]] {
  if (dependentId) {
    return ["users", userId, "dependents", dependentId, subcollection];
  }
  return ["users", userId, subcollection];
}

function getHealthStorageKey(userId?: string | null, dependentId?: string | null) {
  const u = userId && userId !== "guest" ? userId : "guest";
  const d = dependentId || "myself";
  return `robodoctor_health_reports_${u}_${d}`;
}

function getSkinStorageKey(userId?: string | null, dependentId?: string | null) {
  const u = userId && userId !== "guest" ? userId : "guest";
  const d = dependentId || "myself";
  return `robodoctor_skin_reports_${u}_${d}`;
}

function getLabStorageKey(userId?: string | null, dependentId?: string | null) {
  const u = userId && userId !== "guest" ? userId : "guest";
  const d = dependentId || "myself";
  return `robodoctor_lab_reports_${u}_${d}`;
}

function getProfileStorageKey(userId?: string | null, dependentId?: string | null) {
  const u = userId && userId !== "guest" ? userId : "guest";
  const d = dependentId || "myself";
  return `robodoctor_user_profile_${u}_${d}`;
}

const GLOBAL_HEALTH_KEY = "robodoctor_health_history";
const GLOBAL_SKIN_KEY = "robodoctor-skin-history";
const GLOBAL_LAB_KEY = "robodoctor_lab_history";

function safeReadLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLocal<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("safeWriteLocal error:", e);
  }
}

function mergeAndDedupe<T extends { createdAt: number }>(...arrays: T[][]): T[] {
  const map = new Map<number, T>();
  for (const arr of arrays) {
    for (const item of arr) {
      if (item && typeof item.createdAt === "number") {
        if (!map.has(item.createdAt)) {
          map.set(item.createdAt, item);
        }
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

// ================= HEALTH REPORTS =================

export async function loadHealthReports(
  userId?: string | null,
  dependentId?: string | null
): Promise<HealthReportRecord[]> {
  return loadHealthReportsPage(userId, 6, dependentId);
}

export async function loadHealthReportsPage(
  userId?: string | null,
  maxItems = 20,
  dependentId?: string | null
): Promise<HealthReportRecord[]> {
  // 1. Read from local storage immediately for zero-delay UI
  const specificKey = getHealthStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<HealthReportRecord>(specificKey);
  const localGlobal = safeReadLocal<HealthReportRecord>(GLOBAL_HEALTH_KEY);
  let current = mergeAndDedupe(localSpecific, localGlobal);

  // 2. Fetch from MongoDB API
  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const depParam = encodeURIComponent(dependentId || "myself");
      const uParam = encodeURIComponent(userId);
      const res = await fetch(`/api/reports?type=health&userId=${uParam}&dependentId=${depParam}&limit=${maxItems}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reports) && data.reports.length > 0) {
          current = mergeAndDedupe(data.reports, current);
          safeWriteLocal(specificKey, current);
          safeWriteLocal(GLOBAL_HEALTH_KEY, current);
        }
      }
    } catch (err) {
      console.warn("MongoDB loadHealthReportsPage sync fallback to local:", err);
    }
  }

  return current.slice(0, maxItems);
}

export async function saveHealthReport(
  userId?: string | null,
  record?: HealthReportRecord | null,
  dependentId?: string | null
): Promise<void> {
  if (!record) return;

  // 1. Immediate local storage persistence
  const specificKey = getHealthStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<HealthReportRecord>(specificKey);
  const localGlobal = safeReadLocal<HealthReportRecord>(GLOBAL_HEALTH_KEY);
  const merged = mergeAndDedupe([record], localSpecific, localGlobal).slice(0, 50);

  safeWriteLocal(specificKey, merged);
  safeWriteLocal(GLOBAL_HEALTH_KEY, merged);

  // 2. Safe background MongoDB API write
  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      void fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "health",
          userId,
          dependentId: dependentId || "myself",
          record,
        }),
      }).catch((err) => {
        console.warn("MongoDB saveHealthReport sync warning:", err);
      });
    } catch (err) {
      console.warn("MongoDB saveHealthReport sync warning:", err);
    }
  }
}

// ================= SKIN REPORTS =================

export async function loadSkinReports(
  userId?: string | null,
  dependentId?: string | null
): Promise<SkinReportRecord[]> {
  return loadSkinReportsPage(userId, 6, dependentId);
}

export async function loadSkinReportsPage(
  userId?: string | null,
  maxItems = 20,
  dependentId?: string | null
): Promise<SkinReportRecord[]> {
  const specificKey = getSkinStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<SkinReportRecord>(specificKey);
  const localGlobal = safeReadLocal<SkinReportRecord>(GLOBAL_SKIN_KEY);
  let current = mergeAndDedupe(localSpecific, localGlobal);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const depParam = encodeURIComponent(dependentId || "myself");
      const uParam = encodeURIComponent(userId);
      const res = await fetch(`/api/reports?type=skin&userId=${uParam}&dependentId=${depParam}&limit=${maxItems}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reports) && data.reports.length > 0) {
          current = mergeAndDedupe(data.reports, current);
          safeWriteLocal(specificKey, current);
          safeWriteLocal(GLOBAL_SKIN_KEY, current);
        }
      }
    } catch (err) {
      console.warn("MongoDB loadSkinReportsPage sync fallback to local:", err);
    }
  }

  return current.slice(0, maxItems);
}

export async function saveSkinReport(
  userId?: string | null,
  record?: SkinReportRecord | null,
  dependentId?: string | null
): Promise<void> {
  if (!record) return;

  const specificKey = getSkinStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<SkinReportRecord>(specificKey);
  const localGlobal = safeReadLocal<SkinReportRecord>(GLOBAL_SKIN_KEY);
  const merged = mergeAndDedupe([record], localSpecific, localGlobal).slice(0, 50);

  safeWriteLocal(specificKey, merged);
  safeWriteLocal(GLOBAL_SKIN_KEY, merged);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      void fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "skin",
          userId,
          dependentId: dependentId || "myself",
          record,
        }),
      }).catch((err) => {
        console.warn("MongoDB saveSkinReport sync warning:", err);
      });
    } catch (err) {
      console.warn("MongoDB saveSkinReport sync warning:", err);
    }
  }
}

// ================= LAB REPORTS =================

export async function loadLabReportsPage(
  userId?: string | null,
  maxItems = 20,
  dependentId?: string | null
): Promise<LabReportRecord[]> {
  const specificKey = getLabStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<LabReportRecord>(specificKey);
  const localGlobal = safeReadLocal<LabReportRecord>(GLOBAL_LAB_KEY);
  let current = mergeAndDedupe(localSpecific, localGlobal);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const depParam = encodeURIComponent(dependentId || "myself");
      const uParam = encodeURIComponent(userId);
      const res = await fetch(`/api/reports?type=lab&userId=${uParam}&dependentId=${depParam}&limit=${maxItems}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.reports) && data.reports.length > 0) {
          current = mergeAndDedupe(data.reports, current);
          safeWriteLocal(specificKey, current);
          safeWriteLocal(GLOBAL_LAB_KEY, current);
        }
      }
    } catch (err) {
      console.warn("MongoDB loadLabReportsPage sync fallback to local:", err);
    }
  }

  return current.slice(0, maxItems);
}

export async function saveLabReport(
  userId?: string | null,
  record?: LabReportRecord | null,
  dependentId?: string | null
): Promise<void> {
  if (!record) return;

  const specificKey = getLabStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<LabReportRecord>(specificKey);
  const localGlobal = safeReadLocal<LabReportRecord>(GLOBAL_LAB_KEY);
  const merged = mergeAndDedupe([record], localSpecific, localGlobal).slice(0, 50);

  safeWriteLocal(specificKey, merged);
  safeWriteLocal(GLOBAL_LAB_KEY, merged);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      void fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "lab",
          userId,
          dependentId: dependentId || "myself",
          record,
        }),
      }).catch((err) => {
        console.warn("MongoDB saveLabReport sync warning:", err);
      });
    } catch (err) {
      console.warn("MongoDB saveLabReport sync warning:", err);
    }
  }
}

// ================= USER PROFILE =================

export async function getUserProfile(
  userId?: string | null,
  dependentId?: string | null
): Promise<UserProfileRecord | null> {
  const profileKey = getProfileStorageKey(userId, dependentId);
  let localProfile: UserProfileRecord | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(profileKey);
      if (raw) localProfile = JSON.parse(raw);
    } catch {}
  }

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const depParam = encodeURIComponent(dependentId || "myself");
      const uParam = encodeURIComponent(userId);
      const res = await fetch(`/api/profile?userId=${uParam}&dependentId=${depParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          if (typeof window !== "undefined") {
            localStorage.setItem(profileKey, JSON.stringify(data.profile));
          }
          return data.profile;
        }
      }
    } catch (err) {
      console.warn("MongoDB getUserProfile fallback to local:", err);
    }
  }

  return localProfile;
}

export async function saveUserProfile(
  userId?: string | null,
  profile?: Partial<UserProfileRecord> | null,
  dependentId?: string | null
): Promise<void> {
  if (!profile) return;

  const profileKey = getProfileStorageKey(userId, dependentId);
  const existing = (await getUserProfile(userId, dependentId)) || {};
  const updated: UserProfileRecord = {
    ...existing,
    ...profile,
    updatedAt: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(profileKey, JSON.stringify(updated));
    } catch {}
  }

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      void fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          dependentId: dependentId || "myself",
          profile: updated,
        }),
      }).catch((err) => {
        console.warn("MongoDB saveUserProfile sync warning:", err);
      });
    } catch (err) {
      console.warn("MongoDB saveUserProfile sync warning:", err);
    }
  }
}

// --- PATIENT CONDITIONS & MEDICATION HISTORY ---

export function getConditionsStorageKey(userId?: string | null, dependentId?: string | null) {
  const u = userId && userId !== "guest" ? userId : "guest";
  const d = dependentId || "myself";
  return `robodoctor_patient_conditions_${u}_${d}`;
}

export async function getConditions(
  userId?: string | null,
  dependentId?: string | null
): Promise<PatientConditionRecord[]> {
  const storageKey = getConditionsStorageKey(userId, dependentId);
  const local = safeReadLocal<PatientConditionRecord>(storageKey);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const q = new URLSearchParams({
        userId,
        dependentId: dependentId || "myself",
      });
      const res = await fetch(`/api/conditions?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.conditions) && data.conditions.length > 0) {
          safeWriteLocal(storageKey, data.conditions);
          return data.conditions;
        }
      }
    } catch (e) {
      console.warn("getConditions API error:", e);
    }
  }

  return local;
}

export async function saveCondition(
  userId: string | null | undefined,
  conditionData: {
    name: string;
    diagnosedDate: string;
    status: "active" | "managed" | "resolved";
    notes?: string;
    medicationHistory?: MedicationHistoryEntry[];
  },
  dependentId?: string | null
): Promise<PatientConditionRecord> {
  const storageKey = getConditionsStorageKey(userId, dependentId);
  const localList = safeReadLocal<PatientConditionRecord>(storageKey);

  const newRecord: PatientConditionRecord = {
    _id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: userId || "guest",
    dependentId: dependentId || "myself",
    name: conditionData.name,
    diagnosedDate: conditionData.diagnosedDate,
    status: conditionData.status,
    notes: conditionData.notes || "",
    medicationHistory: conditionData.medicationHistory || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updatedLocal = [newRecord, ...localList];
  safeWriteLocal(storageKey, updatedLocal);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const res = await fetch("/api/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_condition",
          userId,
          dependentId: dependentId || "myself",
          data: conditionData,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.condition && result.condition._id) {
          newRecord._id = result.condition._id;
          safeWriteLocal(storageKey, [newRecord, ...localList]);
        }
      }
    } catch (e) {
      console.warn("saveCondition API error:", e);
    }
  }

  return newRecord;
}

export async function addMedicationChange(
  userId: string | null | undefined,
  conditionId: string,
  medEntry: Omit<MedicationHistoryEntry, "createdAt" | "_id">,
  dependentId?: string | null
): Promise<void> {
  const storageKey = getConditionsStorageKey(userId, dependentId);
  const localList = safeReadLocal<PatientConditionRecord>(storageKey);

  const newMed: MedicationHistoryEntry = {
    _id: `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...medEntry,
    createdAt: Date.now(),
  };

  const updated = localList.map((cond) => {
    if (cond._id === conditionId) {
      return {
        ...cond,
        medicationHistory: [...(cond.medicationHistory || []), newMed],
        updatedAt: Date.now(),
      };
    }
    return cond;
  });

  safeWriteLocal(storageKey, updated);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      await fetch("/api/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_medication_change",
          userId,
          dependentId: dependentId || "myself",
          conditionId,
          data: medEntry,
        }),
      });
    } catch (e) {
      console.warn("addMedicationChange API error:", e);
    }
  }
}

export async function deleteCondition(
  userId: string | null | undefined,
  conditionId: string,
  dependentId?: string | null
): Promise<void> {
  const storageKey = getConditionsStorageKey(userId, dependentId);
  const localList = safeReadLocal<PatientConditionRecord>(storageKey);
  const updated = localList.filter((c) => c._id !== conditionId);
  safeWriteLocal(storageKey, updated);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      await fetch("/api/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_condition",
          userId,
          conditionId,
        }),
      });
    } catch (e) {
      console.warn("deleteCondition API error:", e);
    }
  }
}

// --- FAMILY HISTORY TREE ---

export function getFamilyHistoryStorageKey(userId?: string | null) {
  const u = userId && userId !== "guest" ? userId : "guest";
  return `robodoctor_family_history_${u}`;
}

export async function getFamilyHistory(
  userId?: string | null,
  dependentId?: string | null
): Promise<FamilyHistoryRecord[]> {
  const storageKey = getFamilyHistoryStorageKey(userId);
  const local = safeReadLocal<FamilyHistoryRecord>(storageKey);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const q = new URLSearchParams({
        userId,
        dependentId: dependentId || "myself",
      });
      const res = await fetch(`/api/family-history?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.entries) && data.entries.length > 0) {
          safeWriteLocal(storageKey, data.entries);
          return data.entries;
        }
      }
    } catch (e) {
      console.warn("getFamilyHistory API error:", e);
    }
  }

  return local;
}

export async function saveFamilyHistoryEntry(
  userId: string | null | undefined,
  entryData: {
    relation: string;
    condition: string;
    ageOfOnset?: number | null;
    notes?: string;
  },
  dependentId?: string | null
): Promise<FamilyHistoryRecord> {
  const storageKey = getFamilyHistoryStorageKey(userId);
  const localList = safeReadLocal<FamilyHistoryRecord>(storageKey);

  const newEntry: FamilyHistoryRecord = {
    _id: `fam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: userId || "guest",
    dependentId: dependentId || "myself",
    relation: entryData.relation,
    condition: entryData.condition,
    ageOfOnset: entryData.ageOfOnset !== undefined ? entryData.ageOfOnset : null,
    notes: entryData.notes || "",
    createdAt: Date.now(),
  };

  const updatedLocal = [newEntry, ...localList];
  safeWriteLocal(storageKey, updatedLocal);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const res = await fetch("/api/family-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          userId,
          dependentId: dependentId || "myself",
          data: entryData,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result.entry && result.entry._id) {
          newEntry._id = result.entry._id;
          safeWriteLocal(storageKey, [newEntry, ...localList]);
        }
      }
    } catch (e) {
      console.warn("saveFamilyHistoryEntry API error:", e);
    }
  }

  return newEntry;
}

export async function deleteFamilyHistoryEntry(
  userId: string | null | undefined,
  entryId: string
): Promise<void> {
  const storageKey = getFamilyHistoryStorageKey(userId);
  const localList = safeReadLocal<FamilyHistoryRecord>(storageKey);
  const updated = localList.filter((e) => e._id !== entryId);
  safeWriteLocal(storageKey, updated);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      await fetch("/api/family-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          userId,
          entryId,
        }),
      });
    } catch (e) {
      console.warn("deleteFamilyHistoryEntry API error:", e);
    }
  }
}

