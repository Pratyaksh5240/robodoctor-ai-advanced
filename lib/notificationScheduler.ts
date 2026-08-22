export type PermissionState = "granted" | "denied" | "default" | "unsupported";

export type Reminder = {
  id: number;
  title: string;
  time: string; // "HH:MM" e.g. "08:00"
  done: boolean;
  notificationEnabled?: boolean;
  voiceEnabled?: boolean;
  lastNotifiedOccurrence?: string;
};

const STORAGE_OCCURRENCES_KEY = "robodoctor-notified-occurrences";

export function getNotificationPermissionState(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as PermissionState;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    await registerServiceWorker();
    const permission = await Notification.requestPermission();
    return permission as PermissionState;
  } catch (error) {
    console.error("Failed to request notification permission:", error);
    return "denied";
  }
}

export function speakReminderAlert(text: string) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Voice speech synthesis alert failed:", e);
    }
  }
}

function getNotifiedOccurrences(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const saved = localStorage.getItem(STORAGE_OCCURRENCES_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
}

function markOccurrenceNotified(occurrenceKey: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getNotifiedOccurrences();
    current.add(occurrenceKey);
    const arr = Array.from(current).slice(-100);
    localStorage.setItem(STORAGE_OCCURRENCES_KEY, JSON.stringify(arr));
  } catch (error) {
    console.error("Failed to save notified occurrence:", error);
  }
}

export async function triggerDesktopNotification(
  title: string,
  body: string,
  tag: string
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("Notifications not supported in window.");
    return false;
  }

  if (Notification.permission !== "granted") {
    console.warn("Notification permission is not granted:", Notification.permission);
    return false;
  }

  const icon = "/logo.png";
  const url = "/medicine-reminder";

  let triggered = false;

  // 1. Try direct Browser Notification first for maximum instant reliability
  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon,
      data: { url },
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    triggered = true;
  } catch (e) {
    console.warn("Direct Notification constructor failed, trying Service Worker:", e);
  }

  // 2. Try Service Worker message as backup or primary SW push handler
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    try {
      navigator.serviceWorker.controller.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        body,
        tag,
        icon,
        url,
      });
      triggered = true;
    } catch (e) {
      console.warn("Service worker postMessage failed:", e);
    }
  }

  return triggered;
}

export function checkAndTriggerReminders(reminders: Reminder[]): Reminder[] {
  if (typeof window === "undefined" || Notification.permission !== "granted") {
    return reminders;
  }

  const now = new Date();
  const currentDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const notifiedSet = getNotifiedOccurrences();

  let updated = false;
  const nextReminders = reminders.map((item) => {
    if (item.done || item.notificationEnabled === false) {
      return item;
    }

    if (!item.time || !item.time.includes(":")) {
      return item;
    }

    const [targetH, targetM] = item.time.split(":").map(Number);
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), targetH, targetM, 0, 0);

    const diffMs = now.getTime() - targetDate.getTime();
    const occurrenceKey = `${item.id}-${currentDateStr}-${item.time}`;

    // Trigger if time is due now or was due within the last 3 minutes (180,000 ms) and not yet notified
    if (diffMs >= 0 && diffMs <= 180000 && !notifiedSet.has(occurrenceKey)) {
      const isMedicine = /med|pill|tablet|cap|syrup|dawa/i.test(item.title);
      const isWater = /water|pani|hydrate/i.test(item.title);
      const isBP = /bp|pressure/i.test(item.title);

      let iconEmoji = "🩺";
      if (isMedicine) iconEmoji = "💊";
      else if (isWater) iconEmoji = "💧";
      else if (isBP) iconEmoji = "❤️";

      const notifTitle = `${iconEmoji} RoboDoctor AI Reminder`;
      const notifBody = `Time for: ${item.title} (${item.time}). Your health task is due!`;

      // Trigger Desktop OS Notification
      triggerDesktopNotification(notifTitle, notifBody, `reminder-${item.id}`);

      // Trigger Voice Alert
      if (item.voiceEnabled !== false) {
        speakReminderAlert(`RoboDoctor Reminder: Time for ${item.title}.`);
      }

      markOccurrenceNotified(occurrenceKey);
      updated = true;

      return {
        ...item,
        lastNotifiedOccurrence: occurrenceKey,
      };
    }

    return item;
  });

  return updated ? nextReminders : reminders;
}
