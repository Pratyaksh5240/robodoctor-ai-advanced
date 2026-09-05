import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type VitalsStreak = {
  currentStreak: number;
  longestStreak: number;
  lastLoggedDate: string; // YYYY-MM-DD
};

function getTodayStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getStreakDocPath(userId: string, dependentId?: string | null): [string, ...string[]] {
  if (dependentId) {
    return ["users", userId, "dependents", dependentId, "streaks", "vitals"];
  }
  return ["users", userId, "streaks", "vitals"];
}

function getStreakStorageKey(userId?: string | null, dependentId?: string | null) {
  const u = userId && userId !== "guest" ? userId : "guest";
  const d = dependentId || "myself";
  return `robodoctor_vitals_streak_${u}_${d}`;
}

const GLOBAL_STREAK_KEY = "robodoctor_vitals_streak";

function safeReadStreak(userId?: string | null, dependentId?: string | null): VitalsStreak {
  if (typeof window === "undefined") {
    return { currentStreak: 0, longestStreak: 0, lastLoggedDate: "" };
  }
  try {
    const specific = localStorage.getItem(getStreakStorageKey(userId, dependentId));
    if (specific) {
      const parsed = JSON.parse(specific);
      if (parsed && typeof parsed.currentStreak === "number") return parsed;
    }
    const global = localStorage.getItem(GLOBAL_STREAK_KEY);
    if (global) {
      const parsed = JSON.parse(global);
      if (parsed && typeof parsed.currentStreak === "number") return parsed;
    }
  } catch {}
  return { currentStreak: 0, longestStreak: 0, lastLoggedDate: "" };
}

function safeWriteStreak(streak: VitalsStreak, userId?: string | null, dependentId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const json = JSON.stringify(streak);
    localStorage.setItem(getStreakStorageKey(userId, dependentId), json);
    localStorage.setItem(GLOBAL_STREAK_KEY, json);
  } catch {}
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Cloud operation timed out")), timeoutMs)
    ),
  ]);
}

export async function getVitalsStreak(
  userId?: string | null,
  dependentId?: string | null
): Promise<VitalsStreak> {
  // 1. Read local streak immediately
  let streak = safeReadStreak(userId, dependentId);

  // 2. Attempt Firestore sync in background if signed in
  if (userId && userId !== "guest") {
    try {
      const path = getStreakDocPath(userId, dependentId);
      const docRef = doc(db, path[0], ...path.slice(1));
      const snap = await withTimeout(getDoc(docRef), 1500);
      if (snap.exists()) {
        const cloudData = snap.data() as VitalsStreak;
        if (cloudData && typeof cloudData.currentStreak === "number") {
          // Merge by taking the most recent or highest streak
          const currentStreak = Math.max(streak.currentStreak, cloudData.currentStreak);
          const longestStreak = Math.max(streak.longestStreak, cloudData.longestStreak, currentStreak);
          const lastLoggedDate = cloudData.lastLoggedDate || streak.lastLoggedDate;
          streak = { currentStreak, longestStreak, lastLoggedDate };
          safeWriteStreak(streak, userId, dependentId);
        }
      }
    } catch (err) {
      console.warn("Cloud Firestore getVitalsStreak fallback to local:", err);
    }
  }

  return streak;
}

export async function updateVitalsStreakOnLog(
  userId?: string | null,
  dependentId?: string | null
): Promise<VitalsStreak> {
  const current = await getVitalsStreak(userId, dependentId);
  const today = getTodayStr();
  const yesterday = getYesterdayStr();

  if (current.lastLoggedDate === today) {
    return current;
  }

  let newCurrent = 1;
  if (current.lastLoggedDate === yesterday) {
    newCurrent = current.currentStreak + 1;
  }

  const newLongest = Math.max(current.longestStreak, newCurrent);

  const updated: VitalsStreak = {
    currentStreak: newCurrent,
    longestStreak: newLongest,
    lastLoggedDate: today,
  };

  // 1. Write to local storage immediately
  safeWriteStreak(updated, userId, dependentId);

  // 2. Background Firestore write
  if (userId && userId !== "guest") {
    try {
      const path = getStreakDocPath(userId, dependentId);
      const docRef = doc(db, path[0], ...path.slice(1));
      void withTimeout(setDoc(docRef, updated, { merge: true }), 2000).catch((err) => {
        console.warn("Cloud Firestore updateVitalsStreakOnLog skipped/failed (local streak preserved):", err);
      });
    } catch (err) {
      console.warn("Cloud Firestore updateVitalsStreakOnLog skipped/failed (local streak preserved):", err);
    }
  }

  return updated;
}
