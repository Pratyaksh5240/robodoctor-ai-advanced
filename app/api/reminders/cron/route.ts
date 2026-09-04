import { NextResponse } from "next/server";
import { collectionGroup, getDocs, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    // Check 5-minute window (e.g. if current min is 14, check 10 to 14)
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

    // Query all reminders across user subcollections
    const remindersSnap = await getDocs(collectionGroup(db, "reminders"));

    for (const reminderDoc of remindersSnap.docs) {
      const data = reminderDoc.data();
      if (data.done || data.notificationEnabled === false) {
        continue;
      }

      if (data.time && activeTimes.has(data.time)) {
        processedCount++;
        // Get user ID from parent path: users/{userId}/reminders/{reminderId}
        const parentPath = reminderDoc.ref.parent.parent;
        if (!parentPath) continue;
        const userId = parentPath.id;

        // Fetch user's Web Push subscriptions
        const subsSnap = await getDocs(collection(db, "users", userId, "pushSubscriptions"));

        for (const subDoc of subsSnap.docs) {
          const subData = subDoc.data();
          if (subData.subscription && subData.subscription.endpoint) {
            const isMedicine = /med|pill|tablet|cap|syrup|dawa/i.test(data.title || "");
            const isWater = /water|pani|hydrate/i.test(data.title || "");
            const isBP = /bp|pressure/i.test(data.title || "");

            let iconEmoji = "🩺";
            if (isMedicine) iconEmoji = "💊";
            else if (isWater) iconEmoji = "💧";
            else if (isBP) iconEmoji = "❤️";

            const payload = JSON.stringify({
              title: `${iconEmoji} RoboDoctor AI Reminder`,
              body: `Time for: ${data.title || "Health Task"} (${data.time}). Your scheduled reminder is due!`,
              icon: "/logo.png",
              tag: `reminder-${reminderDoc.id}`,
              url: "/medicine-reminder",
            });

            try {
              await webpush.sendNotification(subData.subscription, payload);
              pushSentCount++;
            } catch (pushErr: any) {
              console.warn(`Failed to push to endpoint ${subData.subscription.endpoint}:`, pushErr?.message);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      activeTimes: Array.from(activeTimes),
      processedCount,
      pushSentCount,
    });
  } catch (error: any) {
    console.error("Vercel Cron Reminder Route Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process reminder cron job." },
      { status: 500 }
    );
  }
}
