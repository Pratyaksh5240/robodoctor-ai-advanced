import { NextRequest, NextResponse } from "next/server";
import { analyzeSkin } from "@/lib/skinAnalysis";

type SkinPayload = {
  bodyPart: string;
  duration: string;
  symptoms: string;
  texture: string;
  spreading: boolean;
  pain: boolean;
  itching: boolean;
  fever: boolean;
  discharge: boolean;
  bleeding: boolean;
  imageDataUrl?: string | null;
};

function fallbackResult(payload: SkinPayload) {
  return {
    analysis: analyzeSkin(payload),
    source: "rules",
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SkinPayload;
    const imageDataUrl = payload.imageDataUrl?.trim();
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!imageDataUrl) {
      return NextResponse.json(
        {
          error: "A skin photo is required before analysis.",
        },
        { status: 400 }
      );
    }

    if (!openAiKey) {
      return NextResponse.json(fallbackResult(payload));
    }

    const prompt = `
You are a cautious skin-triage assistant. Analyze the uploaded skin photo together with the symptom data.
Return strict JSON with this exact shape:
{
  "severity": "low|moderate|high|urgent",
  "score": number,
  "summary": string,
  "likelyPatterns": [{"title": string, "detail": string, "severity": "low|moderate|high|urgent"}],
  "redFlags": [{"title": string, "detail": string, "severity": "low|moderate|high|urgent"}],
  "precautions": [string],
  "followUp": string
}

Input details:
- Body part: ${payload.bodyPart}
- Duration: ${payload.duration}
- Symptoms: ${payload.symptoms}
- Texture/look: ${payload.texture}
- Spreading: ${payload.spreading}
- Pain: ${payload.pain}
- Itching: ${payload.itching}
- Fever: ${payload.fever}
- Discharge: ${payload.discharge}
- Bleeding: ${payload.bleeding}

Be conservative. Do not diagnose with certainty. Mention if the image is unclear.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SKIN_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              {
                type: "input_image",
                image_url: imageDataUrl,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(fallbackResult(payload));
    }

    const data = (await response.json()) as {
      output_text?: string;
    };

    if (!data.output_text) {
      return NextResponse.json(fallbackResult(payload));
    }

    const parsed = JSON.parse(data.output_text);

    return NextResponse.json({
      analysis: parsed,
      source: "openai",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to analyze skin image right now.",
      },
      { status: 500 }
    );
  }
}
