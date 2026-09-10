import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Reminder from "@/lib/models/Reminder";
import DoseLog, { DoseStatus } from "@/lib/models/DoseLog";
import { getSessionUser, checkProfileAccess, logAuditEvent } from "@/lib/serverAuth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const dependentId = searchParams.get("dependentId") || "myself";
    const dateParam = searchParams.get("date") || new Date().toISOString().slice(0, 10);

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    const sessionUser = await getSessionUser(req);
    const access = await checkProfileAccess({
      sessionUser,
      targetUserId: userId,
      targetProfileId: dependentId,
      category: "adherence",
      action: "view",
    });

    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || "Unauthorized" }, { status: 403 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({
        date: dateParam,
        doses: [],
        summary: {
          todayRate: 0,
          dosesTaken: 0,
          dosesTotal: 0,
          dosesMissed: 0,
          dosesSkipped: 0,
          dosesPending: 0,
          sevenDayRate: 100,
          thirtyDayRate: 100,
          currentStreak: 0,
        },
        fallback: true,
      });
    }

    // 1. Fetch all active reminders for this profile
    const reminders = await Reminder.find({
      userId,
      dependentId,
      status: { $ne: "completed" },
    }).lean();

    // 2. Fetch logged doses for this target date
    const doseLogs = await DoseLog.find({
      userId,
      dependentId,
      scheduledDate: dateParam,
    }).lean();

    const doseLogMap = new Map<string, any>();
    doseLogs.forEach((dl) => {
      doseLogMap.set(`${dl.reminderId}_${dl.scheduledTime}`, dl);
    });

    // 3. Assemble scheduled dose list for the day
    const doses: Array<{
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
    }> = [];

    reminders.forEach((r: any) => {
      // Check if reminder is active within start/end dates
      if (r.startDate && r.startDate > dateParam) return;
      if (r.endDate && r.endDate < dateParam) return;

      const scheduleTimes: string[] =
        Array.isArray(r.times) && r.times.length > 0 ? r.times : [r.time || "09:00"];

      scheduleTimes.forEach((timeSlot) => {
        const key = `${r.id}_${timeSlot}`;
        const existingLog = doseLogMap.get(key);

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
          // Backward-compatible fallback: if reminder.done was checked today
          const todayStr = new Date().toISOString().slice(0, 10);
          if (dateParam === todayStr && r.done) {
            status = "taken";
          }
        }

        doses.push({
          id: existingLog?.id || `scheduled-${r.id}-${timeSlot}`,
          reminderId: r.id,
          title: r.title,
          genericName: r.genericName,
          dosage: r.dosage,
          form: r.form,
          instructions: r.instructions,
          scheduledDate: dateParam,
          scheduledTime: timeSlot,
          status,
          recordedAt,
          recordedBy,
          reason,
          note,
        });
      });
    });

    // Sort doses chronologically by scheduledTime
    doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    // 4. Calculate today summary stats
    const dosesTotal = doses.length;
    const dosesTaken = doses.filter((d) => d.status === "taken" || d.status === "taken_late").length;
    const dosesMissed = doses.filter((d) => d.status === "missed").length;
    const dosesSkipped = doses.filter((d) => d.status === "skipped").length;
    const dosesPending = doses.filter((d) => d.status === "pending").length;

    const accountableTotal = dosesTotal - dosesSkipped;
    const todayRate = accountableTotal > 0 ? Math.round((dosesTaken / accountableTotal) * 100) : 100;

    // 5. Calculate 7-day and 30-day historical adherence from DoseLogs
    const now = new Date(dateParam);
    const d7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const d30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const historicalLogs = await DoseLog.find({
      userId,
      dependentId,
      scheduledDate: { $gte: d30Ago, $lte: dateParam },
    }).lean();

    let logs7Taken = 0;
    let logs7Total = 0;
    let logs30Taken = 0;
    let logs30Total = 0;

    // Map logs by date to compute streak
    const dateMapLogs: Record<string, { total: number; taken: number }> = {};

    historicalLogs.forEach((hl) => {
      const isTaken = hl.status === "taken" || hl.status === "taken_late";
      const isAccountable = hl.status !== "skipped" && hl.status !== "not_applicable";

      if (hl.scheduledDate >= d7Ago) {
        if (isAccountable) logs7Total++;
        if (isTaken) logs7Taken++;
      }

      if (isAccountable) logs30Total++;
      if (isTaken) logs30Taken++;

      if (!dateMapLogs[hl.scheduledDate]) {
        dateMapLogs[hl.scheduledDate] = { total: 0, taken: 0 };
      }
      if (isAccountable) dateMapLogs[hl.scheduledDate].total++;
      if (isTaken) dateMapLogs[hl.scheduledDate].taken++;
    });

    const sevenDayRate = logs7Total > 0 ? Math.round((logs7Taken / logs7Total) * 100) : todayRate;
    const thirtyDayRate = logs30Total > 0 ? Math.round((logs30Taken / logs30Total) * 100) : todayRate;

    // Calculate streak of consecutive 100% adherence days leading up to dateParam
    let currentStreak = 0;
    let checkDate = new Date(now);
    for (let i = 0; i < 30; i++) {
      const dayStr = checkDate.toISOString().slice(0, 10);
      const dayData = dateMapLogs[dayStr];
      if (dayData && dayData.total > 0) {
        if (dayData.taken === dayData.total) {
          currentStreak++;
        } else {
          break;
        }
      } else if (i === 0 && dosesTotal > 0) {
        // Current day in progress
        if (dosesMissed === 0 && dosesTaken > 0) {
          currentStreak++;
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return NextResponse.json({
      date: dateParam,
      doses,
      summary: {
        todayRate,
        dosesTaken,
        dosesTotal,
        dosesMissed,
        dosesSkipped,
        dosesPending,
        sevenDayRate,
        thirtyDayRate,
        currentStreak,
      },
    });
  } catch (err) {
    console.error("GET /api/medication-adherence error:", err);
    return NextResponse.json({ error: "Failed to fetch adherence records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      dependentId = "myself",
      reminderId,
      scheduledDate,
      scheduledTime,
      status,
      reason,
      note,
      recordedBy,
    } = body;

    if (!userId || !reminderId || !scheduledDate || !scheduledTime || !status) {
      return NextResponse.json(
        { error: "Missing required dose status parameters" },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser(req);
    const access = await checkProfileAccess({
      sessionUser,
      targetUserId: userId,
      targetProfileId: dependentId,
      category: "adherence",
      action: "edit",
    });

    if (!access.allowed) {
      return NextResponse.json({ error: access.reason || "Unauthorized" }, { status: 403 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ success: true, savedToMongo: false });
    }

    const logId = `dose-${reminderId}-${scheduledDate}-${scheduledTime.replace(":", "")}`;
    const nowTime = Date.now();
    const recorder = recordedBy || sessionUser?.displayName || sessionUser?.email || "Patient";

    const doseLog = await DoseLog.findOneAndUpdate(
      { reminderId: String(reminderId), scheduledDate, scheduledTime },
      {
        id: logId,
        reminderId: String(reminderId),
        userId,
        dependentId,
        scheduledDate,
        scheduledTime,
        status: status as DoseStatus,
        recordedAt: nowTime,
        recordedBy: recorder,
        reason: reason || undefined,
        note: note || undefined,
      },
      { upsert: true, new: true }
    );

    // Sync Reminder.done if updating today's dose
    const todayStr = new Date().toISOString().slice(0, 10);
    if (scheduledDate === todayStr) {
      const isTaken = status === "taken" || status === "taken_late";
      await Reminder.findOneAndUpdate(
        { id: String(reminderId), userId },
        { done: isTaken }
      ).catch(() => {});
    }

    // Log security audit trail
    if (sessionUser) {
      void logAuditEvent({
        actorUserId: sessionUser.uid,
        actorName: sessionUser.displayName,
        actorEmail: sessionUser.email,
        targetUserId: userId,
        targetProfileId: dependentId,
        category: "adherence",
        action: "update",
        detail: `Dose recorded as '${status}' for reminder ${reminderId} at ${scheduledTime} on ${scheduledDate}${
          reason ? ` (Reason: ${reason})` : ""
        }`,
      });
    }

    return NextResponse.json({ success: true, doseLog });
  } catch (err) {
    console.error("POST /api/medication-adherence error:", err);
    return NextResponse.json({ error: "Failed to log dose adherence" }, { status: 500 });
  }
}
