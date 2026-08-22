import { NextRequest, NextResponse } from "next/server";
import { generateReminderPlan } from "@/lib/ai-health-assistant/reminderService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      goal?: string;
      medications?: string[];
      scheduleNotes?: string;
    };

    if (!payload.goal?.trim() && (!payload.medications || payload.medications.length === 0)) {
      return NextResponse.json(
        {
          error: "Add at least one reminder goal or health task.",
        },
        { status: 400 }
      );
    }

    const result = await generateReminderPlan({
      goal: payload.goal?.trim() || "Smart health reminders",
      medications:
        payload.medications?.map((item) => item.trim()).filter(Boolean) ?? [],
      scheduleNotes: payload.scheduleNotes,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to generate the smart reminder plan right now.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
