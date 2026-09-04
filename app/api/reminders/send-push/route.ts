import { NextResponse } from "next/server";
import webpush from "web-push";
import { DEFAULT_VAPID_PUBLIC_KEY, DEFAULT_VAPID_PRIVATE_KEY } from "@/lib/vapidKeys";

try {
  webpush.setVapidDetails(
    "mailto:support@robodoctor.ai",
    DEFAULT_VAPID_PUBLIC_KEY,
    DEFAULT_VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.warn("WebPush VAPID setup warning:", err);
}

export async function POST(request: Request) {
  try {
    const { subscription, payload } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Valid PushSubscription object with endpoint is required." },
        { status: 400 }
      );
    }

    const pushPayload = JSON.stringify({
      title: payload?.title || "RoboDoctor AI Medicine Reminder",
      body: payload?.body || "Your scheduled health task or medicine is due.",
      icon: payload?.icon || "/logo.png",
      tag: payload?.tag || "robodoctor-push-reminder",
      url: payload?.url || "/medicine-reminder",
    });

    await webpush.sendNotification(subscription, pushPayload);

    return NextResponse.json({ success: true, message: "Push notification sent." });
  } catch (error: any) {
    console.error("Web Push Send Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to deliver Web Push notification." },
      { status: 500 }
    );
  }
}
