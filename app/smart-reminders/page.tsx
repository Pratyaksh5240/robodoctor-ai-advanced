"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/app/context/LanguageContext";
import { useLocalize } from "@/lib/useLocalize";
import type {
  ReminderPlanItem,
  ReminderSuggestionOutput,
} from "@/lib/ai-health-assistant/types";

type SavedReminder = ReminderPlanItem & {
  id: string;
  done: boolean;
};

const STORAGE_KEY = "robodoctor-ai-smart-reminders";

async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T & {
    error?: string;
    details?: string;
  };

  if (!response.ok) {
    throw new Error(payload.details || payload.error || "Request failed.");
  }

  return payload;
}

function sourceLabel(provider: string, model: string, fallbackUsed: boolean) {
  if (fallbackUsed || provider === "fallback") {
    return "Rule-based fallback";
  }

  return `${provider.toUpperCase()} • ${model}`;
}

export default function SmartRemindersPage() {
  const { language } = useLanguage();
  const localize = useLocalize();

  const [goal, setGoal] = useState("");
  const [medications, setMedications] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [plan, setPlan] = useState<ReminderSuggestionOutput | null>(null);
  const [savedReminders, setSavedReminders] = useState<SavedReminder[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    setSavedReminders(JSON.parse(saved) as SavedReminder[]);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedReminders));
  }, [savedReminders]);

  const medicationList = useMemo(
    () =>
      medications
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    [medications]
  );

  const generatePlan = async () => {
    if (busy) {
      return;
    }

    setBusy(true);
    setStatus("");

    try {
      const result = await postJson<ReminderSuggestionOutput>(
        "/api/ai-health-assistant/reminders",
        {
          goal,
          medications: medicationList,
          scheduleNotes,
        }
      );

      setPlan(result);
      setStatus(
        localize(
          "Smart reminder plan generated.",
          "Smart reminder plan generate ho gaya."
        )
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : localize(
              "Unable to generate the reminder plan.",
              "Reminder plan generate nahi ho pa raha."
            )
      );
    } finally {
      setBusy(false);
    }
  };

  const savePlan = () => {
    if (!plan) {
      return;
    }

    const nextItems = plan.reminders.map((item, index) => ({
      ...item,
      id: `${Date.now()}-${index}`,
      done: false,
    }));

    setSavedReminders((current) => [...nextItems, ...current]);
    setStatus(
      localize(
        "Plan reminders saved locally in the new standalone reminder module.",
        "Plan reminders naye standalone reminder module me local save ho gaye."
      )
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)] md:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-emerald-400">
              {localize("Smart Reminders", "Smart Reminders")}
            </p>
            <h1 className="text-4xl font-black md:text-5xl">
              {localize(
                "Independent reminder planner for the AI Health Assistant",
                "AI Health Assistant ke liye independent reminder planner"
              )}
            </h1>
            <p className="mt-3 max-w-3xl text-[var(--muted)]">
              {localize(
                "This optional module generates reminder schedules with Gemini or Vertex AI and saves them under a new local storage key, separate from the existing medicine reminder page.",
                "Yeh optional module Gemini ya Vertex AI se reminder schedules generate karta hai aur unhe ek naye local storage key me save karta hai, existing medicine reminder page se alag."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/ai-health-assistant"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("AI Health Assistant", "AI Health Assistant")}
            </Link>
            <Link
              href="/report-understanding"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("Report Understanding", "Report Understanding")}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm hover:opacity-90"
            >
              {localize("Back Home", "Back Home")}
            </Link>
          </div>
        </div>

        {status && (
          <div className="mb-6 rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {status}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  {localize("Reminder goal", "Reminder goal")}
                </span>
                <input
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder={localize(
                    "Example: Daily medicines, water, BP checks, and walking",
                    "Example: Daily medicines, water, BP checks, aur walking"
                  )}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  {localize(
                    "Medicines or health tasks",
                    "Medicines ya health tasks"
                  )}
                </span>
                <textarea
                  value={medications}
                  onChange={(event) => setMedications(event.target.value)}
                  rows={4}
                  placeholder={localize(
                    "One item per line, for example: Morning BP tablet",
                    "Har line me ek item, jaise: Morning BP tablet"
                  )}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-[var(--muted)]">
                  {localize("Schedule notes", "Schedule notes")}
                </span>
                <textarea
                  value={scheduleNotes}
                  onChange={(event) => setScheduleNotes(event.target.value)}
                  rows={3}
                  placeholder={localize(
                    "Example: Prefer reminders around meals and one in the evening.",
                    "Example: Reminders meals ke aas-paas aur ek evening me chahiye."
                  )}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3"
                />
              </label>

              <button
                type="button"
                onClick={() => void generatePlan()}
                disabled={busy}
                className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? localize("Generating plan...", "Plan generate ho raha hai...")
                  : localize("Generate reminder plan", "Reminder plan generate karein")}
              </button>
            </div>
          </section>

          <section className="rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
            {!plan ? (
              <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 text-[var(--muted)]">
                {localize(
                  "Generate a plan to see AI-suggested reminder times, reasons, and daily tips.",
                  "Plan generate kijiye taaki AI suggested reminder times, reasons, aur daily tips dekh sakein."
                )}
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5">
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
                    {localize("Plan title", "Plan title")}
                  </p>
                  <h2 className="mt-3 text-3xl font-black">{plan.planTitle}</h2>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    {sourceLabel(plan.provider, plan.model, plan.fallbackUsed)}
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-bold">
                      {localize("Suggested reminders", "Suggested reminders")}
                    </h3>
                    <button
                      type="button"
                      onClick={savePlan}
                      className="rounded-full border border-emerald-200/20 bg-black/20 px-4 py-2 text-sm"
                    >
                      {localize("Save all", "Save all")}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {plan.reminders.map((item) => (
                      <div
                        key={`${item.title}-${item.time}`}
                        className="rounded-2xl border border-[color:var(--border)] bg-black/20 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">{item.title}</p>
                          <span className="text-sm text-[var(--muted)]">{item.time}</span>
                        </div>
                        <p className="mt-2 text-sm">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-5">
                  <h3 className="text-xl font-bold">
                    {localize("Daily tips", "Daily tips")}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {plan.dailyTips.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6">
          <h2 className="text-2xl font-bold">
            {localize("Saved standalone reminders", "Saved standalone reminders")}
          </h2>

          {savedReminders.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5 text-[var(--muted)]">
              {localize(
                "No reminders saved yet in this new module.",
                "Is naye module me abhi koi reminder save nahi hua hai."
              )}
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {savedReminders.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{item.title}</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">{item.time}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSavedReminders((current) =>
                          current.map((entry) =>
                            entry.id === item.id
                              ? { ...entry, done: !entry.done }
                              : entry
                          )
                        )
                      }
                      className={`rounded-full px-4 py-2 text-sm ${
                        item.done
                          ? "bg-emerald-400 text-slate-950"
                          : "border border-[color:var(--border)] bg-[color:var(--surface)]"
                      }`}
                    >
                      {item.done
                        ? localize("Done", "Done")
                        : localize("Mark done", "Mark done")}
                    </button>
                  </div>

                  <p className="mt-3 text-sm">{item.reason}</p>

                  <button
                    type="button"
                    onClick={() =>
                      setSavedReminders((current) =>
                        current.filter((entry) => entry.id !== item.id)
                      )
                    }
                    className="mt-4 rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100"
                  >
                    {localize("Delete", "Delete")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
