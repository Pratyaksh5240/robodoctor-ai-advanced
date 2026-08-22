import { generateStructuredJson } from "./googleAiClient";
import type {
  ReminderPlanItem,
  ReminderSuggestionOutput,
} from "./types";

type ReminderModelPayload = {
  planTitle: string;
  reminders: ReminderPlanItem[];
  dailyTips: string[];
};

function normalizeTime(value: string, fallback: string) {
  return /^\d{2}:\d{2}$/.test(value.trim()) ? value.trim() : fallback;
}

function buildFallbackReminders(
  medications: string[],
  goal: string
): ReminderSuggestionOutput {
  const fallbackTimes = ["08:00", "14:00", "20:00", "22:00"];
  const reminders = (medications.length > 0 ? medications : [goal])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((item, index) => ({
      title: `${item} reminder`,
      time: fallbackTimes[index % fallbackTimes.length],
      reason: "A steady schedule can make it easier to stay consistent.",
    }));

  return {
    planTitle: goal.trim() || "Smart health reminders",
    reminders,
    dailyTips: [
      "Keep reminders realistic so they are easy to follow every day.",
      "Pair important reminders with meals, sleep, or another daily routine.",
      "Seek medical advice if your symptoms worsen despite following the plan.",
    ],
    provider: "fallback",
    model: "rule-based-reminders",
    fallbackUsed: true,
  };
}

export async function generateReminderPlan(input: {
  goal: string;
  medications: string[];
  scheduleNotes?: string;
}): Promise<ReminderSuggestionOutput> {
  try {
    const { data, meta } = await generateStructuredJson<ReminderModelPayload>({
      systemInstruction: [
        "You create reminder schedules for a health assistant app.",
        "Return strict JSON only with keys: planTitle, reminders, dailyTips.",
        "Each reminder must contain title, time, and reason.",
        "time must use 24-hour HH:MM format.",
        "Keep the plan practical and simple.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          parts: [
            {
              kind: "text",
              text: [
                `Goal: ${input.goal}`,
                `Health tasks or medicines: ${input.medications.join(", ") || "none provided"}`,
                input.scheduleNotes?.trim()
                  ? `Schedule notes: ${input.scheduleNotes.trim()}`
                  : "",
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        },
      ],
      maxOutputTokens: 800,
      temperature: 0.3,
    });

    const reminders = data.reminders
      .map((reminder, index) => ({
        title: reminder.title.trim() || `Reminder ${index + 1}`,
        time: normalizeTime(reminder.time, ["08:00", "14:00", "20:00"][index % 3]),
        reason: reminder.reason.trim() || "Stay consistent with your routine.",
      }))
      .filter((reminder) => reminder.title.length > 0)
      .slice(0, 8);

    return {
      planTitle: data.planTitle.trim() || input.goal.trim() || "Smart health reminders",
      reminders:
        reminders.length > 0
          ? reminders
          : buildFallbackReminders(input.medications, input.goal).reminders,
      dailyTips: data.dailyTips.map((item) => item.trim()).filter(Boolean).slice(0, 5),
      provider: meta.provider,
      model: meta.model,
      fallbackUsed: false,
    };
  } catch {
    return buildFallbackReminders(input.medications, input.goal);
  }
}
