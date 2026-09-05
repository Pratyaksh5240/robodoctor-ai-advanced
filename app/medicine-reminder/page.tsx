"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { useAuth } from "@/components/AuthProvider";
import { useActiveProfile } from "@/app/context/ActiveProfileContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { getSubcollectionPath } from "@/lib/reportHistory";
import { useLocalize } from "@/lib/useLocalize";
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  subscribeToWebPushNotifications,
  registerServiceWorker,
  checkAndTriggerReminders,
  triggerDesktopNotification,
  speakReminderAlert,
  PermissionState,
  Reminder,
} from "@/lib/notificationScheduler";

function MedicineReminderContent() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { activeProfileId } = useActiveProfile();
  const searchParams = useSearchParams();
  const localize = useLocalize();

  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [permissionState, setPermissionState] = useState<PermissionState>("default");
  const [statusMsg, setStatusMsg] = useState("");

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const saved = localStorage.getItem("robodoctor-reminders");
    return saved ? (JSON.parse(saved) as Reminder[]) : [];
  });

  // Handle Preset & Prescription Scanner Search Params
  useEffect(() => {
    const preset = searchParams?.get("preset");
    const medName = searchParams?.get("medName");
    const dosage = searchParams?.get("dosage");
    const frequency = searchParams?.get("frequency");

    if (medName) {
      const suggestedTitle = `${medName}${dosage ? ` - ${dosage}` : ""}`;
      setTitle(suggestedTitle);
      if (frequency?.toLowerCase().includes("night") || frequency?.toLowerCase().includes("bed")) {
        setTime("21:00");
      } else if (frequency?.toLowerCase().includes("evening")) {
        setTime("18:00");
      } else {
        setTime("09:00");
      }
    } else if (preset === "bp-check") {
      setTitle(localize("Check Blood Pressure (Daily)", "ब्लड प्रेशर जांच (दैनिक)"));
      setTime("08:00");
    } else if (preset === "sugar-check") {
      setTitle(localize("Fasting Blood Sugar Check", "खाली पेट ब्लड शुगर जांच"));
      setTime("08:00");
    } else if (preset === "medication") {
      setTitle(localize("Take Daily Prescription Medicine", "दैनिक दवा लें"));
      setTime("09:00");
    }
  }, [searchParams, localize]);

  // Load reminders from Firestore if user signed in
  useEffect(() => {
    if (!user) return;
    async function loadFirestoreReminders() {
      try {
        const pathSegments = getSubcollectionPath(user!.uid, "reminders", activeProfileId);
        const colRef = collection(db, pathSegments[0], ...pathSegments.slice(1));
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const items: Reminder[] = [];
          snap.forEach((d) => {
            items.push(d.data() as Reminder);
          });
          setReminders(items);
        } else {
          setReminders([]);
        }
      } catch (err) {
        console.warn("Failed to load Firestore reminders:", err);
      }
    }
    loadFirestoreReminders();
  }, [user, activeProfileId]);

  // Save reminders to localStorage and Firestore
  useEffect(() => {
    localStorage.setItem("robodoctor-reminders", JSON.stringify(reminders));

    if (user) {
      reminders.forEach(async (r) => {
        try {
          const pathSegments = getSubcollectionPath(user.uid, "reminders", activeProfileId);
          const docRef = doc(db, pathSegments[0], ...pathSegments.slice(1), String(r.id));
          await setDoc(docRef, r, { merge: true });
        } catch (err) {
          console.warn("Failed to sync reminder to Firestore:", err);
        }
      });
    }
  }, [reminders, user, activeProfileId]);

  // Initial Permission Check, SW Registration & Web Push Subscription
  useEffect(() => {
    setPermissionState(getNotificationPermissionState());
    registerServiceWorker().then(() => {
      if (getNotificationPermissionState() === "granted") {
        subscribeToWebPushNotifications(user?.uid);
      }
    });
  }, [user]);

  // Background Notification Scheduler Loop (Runs every 5s for fast response)
  useEffect(() => {
    const interval = setInterval(() => {
      setReminders((currentReminders) => checkAndTriggerReminders(currentReminders));
    }, 5000);

    setReminders((currentReminders) => checkAndTriggerReminders(currentReminders));

    return () => clearInterval(interval);
  }, []);

  const handleEnableNotifications = async () => {
    const state = await requestNotificationPermission(user?.uid);
    setPermissionState(state);
    if (state === "granted") {
      setStatusMsg(
        localize(
          "Background Web Push & Desktop notifications enabled! Reminders will now reach you even when the tab is closed.",
          "वेब पुश और डेस्कटॉप नोटिफिकेशन सक्षम! टैब बंद होने पर भी आपको रिमाइंडर मिलेंगे।"
        )
      );
    } else if (state === "denied") {
      setStatusMsg(
        localize(
          "Notifications were blocked in your browser. Click the lock icon in address bar to allow Notifications.",
          "नोटिफिकेशन ब्लॉक हैं। एड्रेस बार में लॉक आइकन पर क्लिक करें।"
        )
      );
    }
  };

  const handleTestNotification = async () => {
    if (permissionState !== "granted") {
      await handleEnableNotifications();
    }

    const fired = await triggerDesktopNotification(
      "🔔 RoboDoctor AI Test Notification",
      "Desktop & laptop notifications are working perfectly on your machine!",
      "test-notification"
    );

    speakReminderAlert("RoboDoctor desktop notification test successful.");

    if (fired) {
      setStatusMsg(
        localize(
          "Instant desktop notification sent! Look at the bottom-right corner of your desktop screen.",
          "तुरंत डेस्कटॉप नोटिफिकेशन भेजा गया! अपनी स्क्रीन के नीचे-दाएं कोने में देखें।"
        )
      );
    } else {
      setStatusMsg(
        localize(
          "Notification failed. Please check if Windows Focus Assist / Do Not Disturb is turned off in your taskbar.",
          "नोटिफिकेशन नहीं आ पाया। कृपया देखें कि Windows Focus Assist / Do Not Disturb तो चालू नहीं है।"
        )
      );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-emerald-400">
              {localize("Reminders & Notifications", "रिमाइंडर और नोटिफिकेशन")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize(
                "Medicine and health task reminders",
                "मेडिसिन और हेल्थ टास्क रिमाइंडर"
              )}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "Save medicines, water, walks, BP checks, or sugar checks with real desktop & laptop OS notifications.",
                "असली डेस्कटॉप और लैपटॉप नोटिफिकेशन के साथ दवा, पानी, वॉक, BP चेक या शुगर चेक रिमाइंडर ट्रैक करें।"
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ProfileSwitcher />
            <LanguageSwitcher />
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90 transition"
            >
              {localize("Back Home", "होम पर वापस जाएं")}
            </Link>
          </div>
        </div>

        {/* Notification Permission Control Status Bar */}
        <div className="mb-8 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {permissionState === "granted"
                  ? "🟢"
                  : permissionState === "denied"
                  ? "🔴"
                  : "⚙️"}
              </span>
              <div>
                <h3 className="font-bold text-lg">
                  {permissionState === "granted"
                    ? localize("Notifications Enabled", "नोटिफिकेशन सक्षम हैं")
                    : permissionState === "denied"
                    ? localize("Notifications Disabled", "नोटिफिकेशन असमर्थ हैं")
                    : localize("Notification Settings", "नोटिफिकेशन सेटिंग्स")}
                </h3>
                <p className="text-xs text-[var(--muted)] mt-0.5">
                  {permissionState === "granted"
                    ? localize(
                        "Your browser is ready to display desktop notification banners when reminders are due.",
                        "आपका ब्राउज़र समय पूरा होने पर डेस्कटॉप नोटिफिकेशन बैनर दिखाने के लिए तैयार है।"
                      )
                    : permissionState === "denied"
                    ? localize(
                        "Notifications are blocked in browser. Click lock icon near URL to allow Notifications.",
                        "नोटिफिकेशन ब्राउज़र में ब्लॉक हैं। अनुमति देने के लिए यूआरएल के पास लॉक आइकन पर क्लिक करें।"
                      )
                    : localize(
                        "Enable notifications to receive real desktop & laptop alerts for your health tasks.",
                        "अपने स्वास्थ्य कार्यों के लिए वास्तविक डेस्कटॉप और लैपटॉप अलर्ट प्राप्त करने हेतु नोटिफिकेशन सक्षम करें।"
                      )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {permissionState !== "granted" && permissionState !== "unsupported" && (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300 transition"
                >
                  {localize("🔔 Enable Desktop Notifications", "🔔 डेस्कटॉप नोटिफिकेशन चालू करें")}
                </button>
              )}

              <button
                type="button"
                onClick={handleTestNotification}
                className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
              >
                {localize("🧪 Test Notification Now", "🧪 अभी टेस्ट नोटिफिकेशन भेजें")}
              </button>
            </div>
          </div>

          {statusMsg && (
            <p className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              {statusMsg}
            </p>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Form Section */}
          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-2xl font-bold">{localize("New reminder", "नया रिमाइंडर")}</h2>
            <div className="mt-5 grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  {localize("Task or medicine name", "काम या दवा का नाम")}
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm"
                  placeholder={localize("Example: Morning BP medicine", "जैसे: सुबह BP दवा")}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  {localize("Time", "समय")}
                </span>
                <input
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  type="time"
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm"
                />
              </label>

              <label className="flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={notificationEnabled}
                  onChange={(e) => setNotificationEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-[color:var(--border)] bg-[color:var(--surface-strong)] accent-emerald-400"
                />
                <span className="text-sm font-medium">
                  {localize("Send Desktop Notification when due 🔔", "समय पूरा होने पर डेस्कटॉप नोटिफिकेशन भेजें 🔔")}
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  if (!title.trim() || !time) {
                    return;
                  }

                  const newReminder: Reminder = {
                    id: Date.now(),
                    title: title.trim(),
                    time,
                    done: false,
                    notificationEnabled,
                  };

                  setReminders((current) => [newReminder, ...current]);
                  setTitle("");
                  setTime("");

                  if (notificationEnabled && permissionState !== "granted") {
                    handleEnableNotifications();
                  }
                }}
                className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 hover:bg-emerald-300 transition"
              >
                {localize("Add reminder", "रिमाइंडर जोड़ें")}
              </button>
            </div>
          </section>

          {/* Reminder Cards Section */}
          <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <h2 className="text-2xl font-bold">
              {localize("Your reminders", "आपके रिमाइंडर")}
            </h2>
            <div className="mt-5 space-y-4">
              {reminders.length === 0 ? (
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 text-[var(--muted)]">
                  {localize(
                    "No reminders yet. Start with medicine, water, walking, BP checks, or sugar checks.",
                    "अभी कोई रिमाइंडर नहीं है। दवा, पानी, वॉक, BP चेक, या शुगर चेक से शुरू करें।"
                  )}
                </div>
              ) : (
                reminders.map((reminder) => {
                  const isNotifOn = reminder.notificationEnabled !== false;

                  return (
                    <div
                      key={reminder.id}
                      className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 transition hover:border-emerald-500/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold">{reminder.title}</h3>
                            <button
                              type="button"
                              title={localize("Toggle notification", "नोटिफिकेशन बदलें")}
                              onClick={() =>
                                setReminders((current) =>
                                  current.map((item) =>
                                    item.id === reminder.id
                                      ? { ...item, notificationEnabled: !isNotifOn }
                                      : item
                                  )
                                )
                              }
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                isNotifOn
                                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                                  : "border-slate-600 bg-slate-800 text-slate-400"
                              }`}
                            >
                              {isNotifOn ? "🔔 Notifications ON" : "🔕 Notifications OFF"}
                            </button>
                          </div>
                          <p className="mt-1 text-sm text-[var(--muted)] font-mono">{reminder.time}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setReminders((current) =>
                                current.map((item) =>
                                  item.id === reminder.id
                                    ? { ...item, done: !item.done }
                                    : item
                                )
                              )
                            }
                            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                              reminder.done
                                ? "bg-emerald-400 text-slate-950"
                                : "border border-[color:var(--border)] bg-[color:var(--surface)] hover:opacity-90"
                            }`}
                          >
                            {reminder.done
                              ? localize("Done", "पूरा")
                              : localize("Mark done", "मार्क करें")}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setReminders((current) =>
                                current.filter((item) => item.id !== reminder.id)
                              )
                            }
                            className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 transition"
                          >
                            {localize("Delete", "हटाएं")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function MedicineReminderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] p-10 text-[var(--foreground)]">Loading medicine reminder...</div>}>
      <MedicineReminderContent />
    </Suspense>
  );
}

