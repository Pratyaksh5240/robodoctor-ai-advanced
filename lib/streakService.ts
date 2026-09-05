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

export async function getVitalsStreak(
  userId: string,
  dependentId?: string | null
): Promise<VitalsStreak> {
  const path = getStreakDocPath(userId, dependentId);
  const docRef = doc(db, path[0], ...path.slice(1));
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data() as VitalsStreak;
  }
  return { currentStreak: 0, longestStreak: 0, lastLoggedDate: "" };
}

export async function updateVitalsStreakOnLog(
  userId: string,
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

  const path = getStreakDocPath(userId, dependentId);
  const docRef = doc(db, path[0], ...path.slice(1));
  await setDoc(docRef, updated, { merge: true });

  return updated;
}
