import { NextRequest, NextResponse } from "next/server";
import { generatePersonalizedSuggestions } from "@/lib/ai-health-assistant/suggestionService";
import type { BaselineHealthProfile } from "@/lib/ai-health-assistant/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      profile?: BaselineHealthProfile;
      goal?: string;
    };

    const result = await generatePersonalizedSuggestions({
      profile: payload.profile ?? {},
      goal: payload.goal,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to generate personalized suggestions right now.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
