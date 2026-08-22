import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
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

type UserCollectionPath = [string, string, string];

async function loadCollection<T>(path: UserCollectionPath) {
  const collectionRef = collection(db, ...path);
  const snapshot = await getDocs(
    query(collectionRef, orderBy("createdAt", "desc"), limit(6))
  );

  return snapshot.docs.map((doc) => doc.data() as T);
}

async function loadCollectionWithLimit<T>(path: UserCollectionPath, maxItems: number) {
  const collectionRef = collection(db, ...path);
  const snapshot = await getDocs(
    query(collectionRef, orderBy("createdAt", "desc"), limit(maxItems))
  );

  return snapshot.docs.map((doc) => doc.data() as T);
}

async function addCollectionRecord<T extends { createdAt: number }>(
  path: UserCollectionPath,
  record: T
) {
  const collectionRef = collection(db, ...path);
  await addDoc(collectionRef, record);
}

export async function loadHealthReports(userId: string) {
  return loadCollection<HealthReportRecord>(["users", userId, "healthReports"]);
}

export async function loadHealthReportsPage(userId: string, maxItems = 20) {
  return loadCollectionWithLimit<HealthReportRecord>(
    ["users", userId, "healthReports"],
    maxItems
  );
}

export async function saveHealthReport(userId: string, record: HealthReportRecord) {
  return addCollectionRecord(["users", userId, "healthReports"], record);
}

export async function loadSkinReports(userId: string) {
  return loadCollection<SkinReportRecord>(["users", userId, "skinReports"]);
}

export async function loadSkinReportsPage(userId: string, maxItems = 20) {
  return loadCollectionWithLimit<SkinReportRecord>(
    ["users", userId, "skinReports"],
    maxItems
  );
}

export async function saveSkinReport(userId: string, record: SkinReportRecord) {
  return addCollectionRecord(["users", userId, "skinReports"], record);
}
