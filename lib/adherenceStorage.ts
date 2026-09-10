"use client";

import { DoseStatus } from "@/lib/models/DoseLog";

export interface LocalReminder {
  id: string | number;
  title: string;
  time?: string;
  times?: string[];
  dosage?: string;
  form?: string;
  instructions?: string;
  genericName?: string;
  prescribingDoctor?: string;
  notificationEnabled?: boolean;
  done?: boolean;
  startDate?: string;
  endDate?: string;
  frequency?: string;
  status?: "active" | "paused" | "completed";
  userId?: string;
  dependentId?: string;
  createdAt?: number;
}

export interface LocalDoseLog {
  id?: string;
  reminderId: string | number;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  status: DoseStatus;
  recordedAt: number;
  recordedBy?: string;
  reason?: string;
  note?: string;
}

export interface ScheduledDose {
  id: string;
  reminderId: string;
  title: string;
  genericName?: string;
  dosage?: string;
  form?: string;
  instructions?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: DoseStatus;
  recordedAt?: number;
  recordedBy?: string;
  reason?: string;
  note?: string;
}

export interface AdherenceSummary {
  todayRate: number;
  dosesTaken: number;
  dosesTotal: number;
  dosesMissed: number;
  dosesSkipped: number;
  dosesPending: number;
  sevenDayRate: number;
  thirtyDayRate: number;
  currentStreak: number;
}

export const REMINDERS_KEY = "robodoctor-reminders";
export const DOSE_LOGS_KEY = "robodoctor-dose-logs";

// Custom browser events to synchronize components and tabs
export const REMINDERS_UPDATED_EVENT = "robodoctor-reminders-updated";
export const ADHERENCE_UPDATED_EVENT = "robodoctor-adherence-updated";

/**
 * Infer dosage unit from title (e.g. 'Metformin 500mg' -> '500mg')
 */
export function inferDosageFromTitle(title: string): string | undefined {
  const match = title.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|IU|units|pills?|tablets?|caps?))\b/i);
  return match ? match[1] : undefined;
}

/**
 * Infer medication form from title
 */
export function inferFormFromTitle(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("syrup") || lower.includes("liquid") || lower.includes("suspension")) return "syrup";
  if (lower.includes("injection") || lower.includes("insulin") || lower.includes("shot")) return "injection";
  if (lower.includes("inhaler") || lower.includes("puff") || lower.includes("spray")) return "inhaler";
  if (lower.includes("drop")) return "drops";
  if (lower.includes("cream") || lower.includes("gel") || lower.includes("ointment")) return "cream";
  if (lower.includes("capsule") || lower.includes("cap")) return "capsule";
  if (lower.includes("water") || lower.includes("hydration")) return "drops";
  if (lower.includes("walk") || lower.includes("exercise") || lower.includes("check")) return "other";
  return "tablet";
}

/**
 * Get all reminders stored in localStorage
 */
export function getLocalReminders(dependentId?: string | null): LocalReminder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LocalReminder[];
    if (!Array.isArray(parsed)) return [];

    const targetDep = dependentId || "myself";
    return parsed.filter((r) => {
      if (!r) return false;
      // If reminder has no dependentId specified, treat as myself
      const dep = r.dependentId || "myself";
      return dep === targetDep || targetDep === "myself";
    });
  } catch (err) {
    console.warn("Failed to load local reminders:", err);
    return [];
  }
}

/**
 * Save reminders to localStorage and dispatch update events
 */
export function saveLocalReminders(reminders: LocalReminder[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
    window.dispatchEvent(new Event(REMINDERS_UPDATED_EVENT));
  } catch (err) {
    console.warn("Failed to save local reminders:", err);
  }
}

/**
 * Get all dose logs stored in localStorage
 * Stored as a dictionary: key is `${reminderId}_${scheduledDate}_${scheduledTime}`
 */
export function getLocalDoseLogs(): Record<string, LocalDoseLog> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DOSE_LOGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LocalDoseLog>;
  } catch (err) {
    console.warn("Failed to load local dose logs:", err);
    return {};
  }
}

/**
 * Save or update a single dose log in localStorage
 */
export function saveLocalDoseLog(
  reminderId: string | number,
  scheduledDate: string,
  scheduledTime: string,
  status: DoseStatus,
  details?: {
    recordedBy?: string;
    reason?: string;
    note?: string;
  }
): void {
  if (typeof window === "undefined") return;
  try {
    const logs = getLocalDoseLogs();
    const key = `${reminderId}_${scheduledDate}_${scheduledTime}`;

    logs[key] = {
      id: `local-dose-${reminderId}-${scheduledDate}-${scheduledTime.replace(":", "")}`,
      reminderId,
      scheduledDate,
      scheduledTime,
      status,
      recordedAt: Date.now(),
      recordedBy: details?.recordedBy || "Patient",
      reason: details?.reason,
      note: details?.note,
    };

    localStorage.setItem(DOSE_LOGS_KEY, JSON.stringify(logs));

    // Two-way synchronization: If recording status for today, sync reminder.done
    const todayStr = new Date().toISOString().slice(0, 10);
    if (scheduledDate === todayStr) {
      const reminders = getLocalReminders();
      const reminderIndex = reminders.findIndex(
        (r) => String(r.id) === String(reminderId)
      );

      if (reminderIndex !== -1) {
        const isTaken = status === "taken" || status === "taken_late";
        reminders[reminderIndex].done = isTaken;
        localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
        window.dispatchEvent(new Event(REMINDERS_UPDATED_EVENT));
      }
    }

    window.dispatchEvent(new Event(ADHERENCE_UPDATED_EVENT));
  } catch (err) {
    console.warn("Failed to save local dose log:", err);
  }
}

/**
 * Generate scheduled doses for ANY date (past, present, or future) from active reminders
 */
export function generateDosesForDate(
  dateStr: string,
  reminders: LocalReminder[],
  doseLogs?: Record<string, LocalDoseLog>
): ScheduledDose[] {
  const logs = doseLogs || getLocalDoseLogs();
  const todayStr = new Date().toISOString().slice(0, 10);
  const doses: ScheduledDose[] = [];

  reminders.forEach((r) => {
    if (!r || !r.title) return;
    if (r.status === "completed" || r.status === "paused") return;

    // Check optional date validity boundaries
    if (r.startDate && r.startDate > dateStr) return;
    if (r.endDate && r.endDate < dateStr) return;

    const scheduleTimes: string[] =
      Array.isArray(r.times) && r.times.length > 0
        ? r.times
        : [r.time || "09:00"];

    scheduleTimes.forEach((timeSlot) => {
      const key = `${r.id}_${dateStr}_${timeSlot}`;
      const existingLog = logs[key];

      let status: DoseStatus = "pending";
      let recordedAt: number | undefined;
      let recordedBy: string | undefined;
      let reason: string | undefined;
      let note: string | undefined;

      if (existingLog) {
        status = existingLog.status;
        recordedAt = existingLog.recordedAt;
        recordedBy = existingLog.recordedBy;
        reason = existingLog.reason;
        note = existingLog.note;
      } else {
        // Fallback: If viewing today and reminder card was marked done
        if (dateStr === todayStr && r.done) {
          status = "taken";
        }
      }

      doses.push({
        id: existingLog?.id || `scheduled-${r.id}-${dateStr}-${timeSlot}`,
        reminderId: String(r.id),
        title: r.title,
        genericName: r.genericName,
        dosage: r.dosage || inferDosageFromTitle(r.title),
        form: r.form || inferFormFromTitle(r.title),
        instructions: r.instructions,
        scheduledDate: dateStr,
        scheduledTime: timeSlot,
        status,
        recordedAt,
        recordedBy,
        reason,
        note,
      });
    });
  });

  // Sort doses chronologically
  doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return doses;
}

/**
 * Compute comprehensive adherence summary (Today, 7-Day, 30-Day, and Streak)
 */
export function computeAdherenceSummary(
  doses: ScheduledDose[],
  targetDate: string,
  allDoseLogs?: Record<string, LocalDoseLog>,
  reminders?: LocalReminder[]
): AdherenceSummary {
  const logs = allDoseLogs || getLocalDoseLogs();
  const allReminders = reminders || getLocalReminders();

  const dosesTotal = doses.length;
  const dosesTaken = doses.filter((d) => d.status === "taken" || d.status === "taken_late").length;
  const dosesMissed = doses.filter((d) => d.status === "missed").length;
  const dosesSkipped = doses.filter((d) => d.status === "skipped").length;
  const dosesPending = doses.filter((d) => d.status === "pending").length;

  const accountableTotal = dosesTotal - dosesSkipped;
  const todayRate =
    dosesTotal === 0
      ? 100
      : accountableTotal > 0
      ? Math.round((dosesTaken / accountableTotal) * 100)
      : 100;

  // Compute 7-day and 30-day rates backwards from targetDate
  const targetTime = new Date(targetDate).getTime();
  const d7Ago = new Date(targetTime - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const d30Ago = new Date(targetTime - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let logs7Taken = 0;
  let logs7Total = 0;
  let logs30Taken = 0;
  let logs30Total = 0;

  // Track daily completion for streak calculation
  const dailyStats: Record<string, { total: number; taken: number; missed: number }> = {};

  // Walk through the last 30 days
  const cur = new Date(targetDate);
  for (let i = 0; i < 30; i++) {
    const dayStr = cur.toISOString().slice(0, 10);
    const dayDoses =
      dayStr === targetDate
        ? doses
        : generateDosesForDate(dayStr, allReminders, logs);

    const dayAccountable = dayDoses.filter((d) => d.status !== "skipped" && d.status !== "not_applicable");
    const dayTaken = dayDoses.filter((d) => d.status === "taken" || d.status === "taken_late").length;
    const dayMissed = dayDoses.filter((d) => d.status === "missed").length;

    dailyStats[dayStr] = {
      total: dayAccountable.length,
      taken: dayTaken,
      missed: dayMissed,
    };

    if (dayStr >= d7Ago) {
      logs7Total += dayAccountable.length;
      logs7Taken += dayTaken;
    }
    if (dayStr >= d30Ago) {
      logs30Total += dayAccountable.length;
      logs30Taken += dayTaken;
    }

    cur.setDate(cur.getDate() - 1);
  }

  const sevenDayRate = logs7Total > 0 ? Math.round((logs7Taken / logs7Total) * 100) : todayRate;
  const thirtyDayRate = logs30Total > 0 ? Math.round((logs30Taken / logs30Total) * 100) : todayRate;

  // Calculate consecutive adherence streak leading up to targetDate
  let currentStreak = 0;
  const streakCursor = new Date(targetDate);
  for (let i = 0; i < 30; i++) {
    const dayStr = streakCursor.toISOString().slice(0, 10);
    const st = dailyStats[dayStr];

    if (!st || st.total === 0) {
      // If no medications were scheduled on this past day, don't break streak if streak already began
      if (currentStreak > 0) {
        streakCursor.setDate(streakCursor.getDate() - 1);
        continue;
      }
      break;
    }

    if (i === 0) {
      // Current target day in progress: credit streak if all taken so far with no missed doses
      if (st.taken > 0 && st.missed === 0) {
        currentStreak++;
      } else if (st.taken === st.total && st.total > 0) {
        currentStreak++;
      }
    } else {
      // Full past days must have taken all accountable doses
      if (st.taken >= st.total && st.total > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    streakCursor.setDate(streakCursor.getDate() - 1);
  }

  return {
    todayRate,
    dosesTaken,
    dosesTotal,
    dosesMissed,
    dosesSkipped,
    dosesPending,
    sevenDayRate,
    thirtyDayRate,
    currentStreak,
  };
}

/**
 * Fast synchronous metrics reader for Today's Health Hub banner on the home page
 */
export function getTodayAdherenceMetrics(dependentId?: string | null): {
  taken: number;
  total: number;
  streak: number;
} {
  if (typeof window === "undefined") {
    return { taken: 0, total: 0, streak: 0 };
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const reminders = getLocalReminders(dependentId);
  const logs = getLocalDoseLogs();
  const doses = generateDosesForDate(todayStr, reminders, logs);
  const summary = computeAdherenceSummary(doses, todayStr, logs, reminders);

  return {
    taken: summary.dosesTaken,
    total: summary.dosesTotal,
    streak: summary.currentStreak,
  };
}
