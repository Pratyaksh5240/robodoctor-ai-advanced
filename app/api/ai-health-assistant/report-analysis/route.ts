import { NextRequest, NextResponse } from "next/server";
import { analyzeReportFile } from "@/lib/ai-health-assistant/reportAnalysisService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      fileDataUrl?: string;
      question?: string;
      patientContext?: string;
    };

    if (!payload.fileDataUrl?.trim()) {
      return NextResponse.json(
        {
          error: "A report, scan, X-ray, or PDF upload is required.",
        },
        { status: 400 }
      );
    }

    const result = await analyzeReportFile({
      fileDataUrl: payload.fileDataUrl,
      question: payload.question,
      patientContext: payload.patientContext,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to analyze the uploaded file right now.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
