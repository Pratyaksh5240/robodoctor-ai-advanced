import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import Reminder from "@/lib/models/Reminder";
import webpush from "web-push";
import { DEFAULT_VAPID_PUBLIC_KEY, DEFAULT_VAPID_PRIVATE_KEY } from "@/lib/vapidKeys";

try {
  webpush.setVapidDetails(
    "mailto:support@robodoctor.ai",
    DEFAULT_VAPID_PUBLIC_KEY,
    DEFAULT_VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.warn("Cron WebPush VAPID setup warning:", err);
}

export async function GET() {
  try {
    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ processed: 0, sent: 0, message: "MongoDB offline or not configured" });
    }

    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // Check 5-minute window
    const activeTimes = new Set<string>();
    for (let offset = 0; offset < 5; offset++) {
      const checkMin = currentM - offset;
      if (checkMin >= 0) {
        const timeStr = `${String(currentH).padStart(2, "0")}:${String(checkMin).padStart(2, "0")}`;
        activeTimes.add(timeStr);
      }
    }

    let processedCount = 0;
    let pushSentCount = 0;

    const reminders = await Reminder.find({
      done: false,
      notificationEnabled: true,
      time: { $in: Array.from(activeTimes) },
    }).lean();

    for (const r of reminders) {
      processedCount++;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      activeTimes: Array.from(activeTimes),
      processedCount,
      pushSentCount,
    });
  } catch (err: any) {
    console.error("Cron error:", err);
    return NextResponse.json({ error: err?.message || "Failed to process cron" }, { status: 500 });
  }
}
