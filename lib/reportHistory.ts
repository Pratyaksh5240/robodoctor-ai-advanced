import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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

function withTimeout<T>(promise: Promise<T>, timeoutMs = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Cloud operation timed out")), timeoutMs)
    ),
  ]);
}

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
  // 1. Read from localStorage immediately
  const specificKey = getHealthStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<HealthReportRecord>(specificKey);
  const localGlobal = safeReadLocal<HealthReportRecord>(GLOBAL_HEALTH_KEY);
  let current = mergeAndDedupe(localSpecific, localGlobal);

  // 2. Attempt Firestore sync if authenticated
  if (userId && userId !== "guest") {
    try {
      const path = getSubcollectionPath(userId, "healthReports", dependentId);
      const collectionRef = collection(db, path[0], ...path.slice(1));
      const snapshot = await withTimeout(
        getDocs(query(collectionRef, orderBy("createdAt", "desc"), limit(maxItems))),
        1500
      );
      const cloudReports = snapshot.docs.map((doc) => doc.data() as HealthReportRecord);
      if (cloudReports.length > 0) {
        current = mergeAndDedupe(cloudReports, current);
        safeWriteLocal(specificKey, current);
        safeWriteLocal(GLOBAL_HEALTH_KEY, current);
      }
    } catch (err) {
      console.warn("Cloud Firestore loadHealthReportsPage fallback to local:", err);
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

  // 1. Immediate local persistence
  const specificKey = getHealthStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<HealthReportRecord>(specificKey);
  const localGlobal = safeReadLocal<HealthReportRecord>(GLOBAL_HEALTH_KEY);
  const merged = mergeAndDedupe([record], localSpecific, localGlobal).slice(0, 50);

  safeWriteLocal(specificKey, merged);
  safeWriteLocal(GLOBAL_HEALTH_KEY, merged);

  // 2. Safe background Firestore write
  if (userId && userId !== "guest") {
    try {
      const path = getSubcollectionPath(userId, "healthReports", dependentId);
      const collectionRef = collection(db, path[0], ...path.slice(1));
      void withTimeout(addDoc(collectionRef, record), 2000).catch((err) => {
        console.warn("Cloud Firestore saveHealthReport skipped/failed (local save preserved):", err);
      });
    } catch (err) {
      console.warn("Cloud Firestore saveHealthReport skipped/failed (local save preserved):", err);
    }
  }
}

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
  // 1. Read from localStorage immediately
  const specificKey = getSkinStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<SkinReportRecord>(specificKey);
  const localGlobal = safeReadLocal<SkinReportRecord>(GLOBAL_SKIN_KEY);
  let current = mergeAndDedupe(localSpecific, localGlobal);

  // 2. Attempt Firestore sync if authenticated
  if (userId && userId !== "guest") {
    try {
      const path = getSubcollectionPath(userId, "skinReports", dependentId);
      const collectionRef = collection(db, path[0], ...path.slice(1));
      const snapshot = await withTimeout(
        getDocs(query(collectionRef, orderBy("createdAt", "desc"), limit(maxItems))),
        1500
      );
      const cloudReports = snapshot.docs.map((doc) => doc.data() as SkinReportRecord);
      if (cloudReports.length > 0) {
        current = mergeAndDedupe(cloudReports, current);
        safeWriteLocal(specificKey, current);
        safeWriteLocal(GLOBAL_SKIN_KEY, current);
      }
    } catch (err) {
      console.warn("Cloud Firestore loadSkinReportsPage fallback to local:", err);
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

  // 1. Immediate local persistence
  const specificKey = getSkinStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<SkinReportRecord>(specificKey);
  const localGlobal = safeReadLocal<SkinReportRecord>(GLOBAL_SKIN_KEY);
  const merged = mergeAndDedupe([record], localSpecific, localGlobal).slice(0, 50);

  safeWriteLocal(specificKey, merged);
  safeWriteLocal(GLOBAL_SKIN_KEY, merged);

  // 2. Safe background Firestore write
  if (userId && userId !== "guest") {
    try {
      const path = getSubcollectionPath(userId, "skinReports", dependentId);
      const collectionRef = collection(db, path[0], ...path.slice(1));
      void withTimeout(addDoc(collectionRef, record), 2000).catch((err) => {
        console.warn("Cloud Firestore saveSkinReport skipped/failed (local save preserved):", err);
      });
    } catch (err) {
      console.warn("Cloud Firestore saveSkinReport skipped/failed (local save preserved):", err);
    }
  }
}

export async function loadLabReportsPage(
  userId?: string | null,
  maxItems = 20,
  dependentId?: string | null
): Promise<LabReportRecord[]> {
  const specificKey = getLabStorageKey(userId, dependentId);
  const localSpecific = safeReadLocal<LabReportRecord>(specificKey);
  const localGlobal = safeReadLocal<LabReportRecord>(GLOBAL_LAB_KEY);
  let current = mergeAndDedupe(localSpecific, localGlobal);

  if (userId && userId !== "guest") {
    try {
      const path = getSubcollectionPath(userId, "labReports", dependentId);
      const collectionRef = collection(db, path[0], ...path.slice(1));
      const snapshot = await withTimeout(
        getDocs(query(collectionRef, orderBy("createdAt", "desc"), limit(maxItems))),
        1500
      );
      const cloudReports = snapshot.docs.map((doc) => doc.data() as LabReportRecord);
      if (cloudReports.length > 0) {
        current = mergeAndDedupe(cloudReports, current);
        safeWriteLocal(specificKey, current);
        safeWriteLocal(GLOBAL_LAB_KEY, current);
      }
    } catch (err) {
      console.warn("Cloud Firestore loadLabReportsPage fallback to local:", err);
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

  if (userId && userId !== "guest") {
    try {
      const path = getSubcollectionPath(userId, "labReports", dependentId);
      const collectionRef = collection(db, path[0], ...path.slice(1));
      void withTimeout(addDoc(collectionRef, record), 2000).catch((err) => {
        console.warn("Cloud Firestore saveLabReport skipped/failed:", err);
      });
    } catch (err) {
      console.warn("Cloud Firestore saveLabReport skipped/failed:", err);
    }
  }
}

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

  if (userId && userId !== "guest") {
    try {
      const docRef = dependentId
        ? doc(db, "users", userId, "dependents", dependentId)
        : doc(db, "users", userId, "profile", "main");
      const snapshot = await withTimeout(getDoc(docRef), 1500);
      if (snapshot.exists()) {
        const data = snapshot.data();
        const cloudProfile: UserProfileRecord = {
          patientName: data.name || data.patientName,
          age: data.age,
          gender: data.gender,
          updatedAt: data.updatedAt || data.createdAt,
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(profileKey, JSON.stringify(cloudProfile));
        }
        return cloudProfile;
      }
    } catch (err) {
      console.warn("Cloud Firestore getUserProfile fallback to local:", err);
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

  if (userId && userId !== "guest") {
    try {
      const docRef = dependentId
        ? doc(db, "users", userId, "dependents", dependentId)
        : doc(db, "users", userId, "profile", "main");
      void withTimeout(
        setDoc(docRef, { ...profile, updatedAt: Date.now() }, { merge: true }),
        2000
      ).catch((err) => {
        console.warn("Cloud Firestore saveUserProfile skipped/failed:", err);
      });
    } catch (err) {
      console.warn("Cloud Firestore saveUserProfile skipped/failed:", err);
    }
  }
}
