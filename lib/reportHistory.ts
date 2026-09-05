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
};

export type SkinReportRecord = {
  createdAt: number;
  bodyPart: string;
  severity: string;
  score: number;
  summary: string;
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

async function loadCollection<T>(pathSegments: string[]) {
  const collectionRef = collection(db, pathSegments[0], ...pathSegments.slice(1));
  const snapshot = await getDocs(
    query(collectionRef, orderBy("createdAt", "desc"), limit(6))
  );

  return snapshot.docs.map((doc) => doc.data() as T);
}

async function loadCollectionWithLimit<T>(pathSegments: string[], maxItems: number) {
  const collectionRef = collection(db, pathSegments[0], ...pathSegments.slice(1));
  const snapshot = await getDocs(
    query(collectionRef, orderBy("createdAt", "desc"), limit(maxItems))
  );

  return snapshot.docs.map((doc) => doc.data() as T);
}

async function addCollectionRecord<T extends { createdAt: number }>(
  pathSegments: string[],
  record: T
) {
  const collectionRef = collection(db, pathSegments[0], ...pathSegments.slice(1));
  await addDoc(collectionRef, record);
}

export async function loadHealthReports(userId: string, dependentId?: string | null) {
  const path = getSubcollectionPath(userId, "healthReports", dependentId);
  return loadCollection<HealthReportRecord>(path);
}

export async function loadHealthReportsPage(
  userId: string,
  maxItems = 20,
  dependentId?: string | null
) {
  const path = getSubcollectionPath(userId, "healthReports", dependentId);
  return loadCollectionWithLimit<HealthReportRecord>(path, maxItems);
}

export async function saveHealthReport(
  userId: string,
  record: HealthReportRecord,
  dependentId?: string | null
) {
  const path = getSubcollectionPath(userId, "healthReports", dependentId);
  return addCollectionRecord(path, record);
}

export async function loadSkinReports(userId: string, dependentId?: string | null) {
  const path = getSubcollectionPath(userId, "skinReports", dependentId);
  return loadCollection<SkinReportRecord>(path);
}

export async function loadSkinReportsPage(
  userId: string,
  maxItems = 20,
  dependentId?: string | null
) {
  const path = getSubcollectionPath(userId, "skinReports", dependentId);
  return loadCollectionWithLimit<SkinReportRecord>(path, maxItems);
}

export async function saveSkinReport(
  userId: string,
  record: SkinReportRecord,
  dependentId?: string | null
) {
  const path = getSubcollectionPath(userId, "skinReports", dependentId);
  return addCollectionRecord(path, record);
}

export async function getUserProfile(
  userId: string,
  dependentId?: string | null
): Promise<UserProfileRecord | null> {
  const docRef = dependentId
    ? doc(db, "users", userId, "dependents", dependentId)
    : doc(db, "users", userId, "profile", "main");
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      patientName: data.name || data.patientName,
      age: data.age,
      gender: data.gender,
      updatedAt: data.updatedAt || data.createdAt,
    } as UserProfileRecord;
  }
  return null;
}

export async function saveUserProfile(
  userId: string,
  profile: Partial<UserProfileRecord>,
  dependentId?: string | null
) {
  const docRef = dependentId
    ? doc(db, "users", userId, "dependents", dependentId)
    : doc(db, "users", userId, "profile", "main");
  await setDoc(docRef, { ...profile, updatedAt: Date.now() }, { merge: true });
}
