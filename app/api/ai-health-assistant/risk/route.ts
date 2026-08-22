import { NextRequest, NextResponse } from "next/server";
import {
  buildBaselineHealthAnalysis,
  mergeSymptoms,
  summarizeHealthAnalysis,
  wrapExistingHealthAnalysis,
} from "@/lib/ai-health-assistant/riskWrapper";
import type { BaselineHealthProfile } from "@/lib/ai-health-assistant/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      profile?: BaselineHealthProfile;
      liveText?: string;
    };

    const profile = mergeSymptoms(payload.profile ?? {}, payload.liveText ?? "");
    const analysis = buildBaselineHealthAnalysis(profile);

    return NextResponse.json({
      risk: wrapExistingHealthAnalysis(analysis),
      baseline: summarizeHealthAnalysis(analysis),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to calculate risk right now.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
