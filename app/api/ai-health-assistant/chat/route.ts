import { NextRequest, NextResponse } from "next/server";
import { runSymptomChat } from "@/lib/ai-health-assistant/chatService";
import type {
  AssistantConversationMessage,
  BaselineHealthProfile,
} from "@/lib/ai-health-assistant/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      profile?: BaselineHealthProfile;
      messages?: AssistantConversationMessage[];
    };

    if (!payload.messages || payload.messages.length === 0) {
      return NextResponse.json(
        {
          error: "At least one chat message is required.",
        },
        { status: 400 }
      );
    }

    const result = await runSymptomChat({
      profile: payload.profile ?? {},
      messages: payload.messages,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to run the AI health assistant chat right now.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
