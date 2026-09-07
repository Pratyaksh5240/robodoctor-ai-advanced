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

export async function getVitalsStreak(
  userId?: string | null,
  dependentId?: string | null
): Promise<VitalsStreak> {
  let streak = safeReadStreak(userId, dependentId);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      const depParam = encodeURIComponent(dependentId || "myself");
      const uParam = encodeURIComponent(userId);
      const res = await fetch(`/api/streaks?userId=${uParam}&dependentId=${depParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.streak && typeof data.streak.currentStreak === "number") {
          const currentStreak = Math.max(streak.currentStreak, data.streak.currentStreak);
          const longestStreak = Math.max(streak.longestStreak, data.streak.longestStreak, currentStreak);
          const lastLoggedDate = data.streak.lastLoggedDate || streak.lastLoggedDate;
          streak = { currentStreak, longestStreak, lastLoggedDate };
          safeWriteStreak(streak, userId, dependentId);
        }
      }
    } catch (err) {
      console.warn("MongoDB getVitalsStreak fallback to local:", err);
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

  safeWriteStreak(updated, userId, dependentId);

  if (typeof window !== "undefined" && userId && userId !== "guest") {
    try {
      void fetch("/api/streaks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          dependentId: dependentId || "myself",
          streak: updated,
        }),
      }).catch((err) => {
        console.warn("MongoDB updateVitalsStreakOnLog warning:", err);
      });
    } catch (err) {
      console.warn("MongoDB updateVitalsStreakOnLog warning:", err);
    }
  }

  return updated;
}
