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
