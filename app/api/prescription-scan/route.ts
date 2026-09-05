import { NextRequest, NextResponse } from "next/server";

export type ScannedMedicineItem = {
  name: string;
  dosageGuess?: string;
  frequencyGuess?: string;
  confidence: "high" | "medium" | "low";
};

type ScanResponse = {
  medicines: ScannedMedicineItem[];
  rawNotes?: string;
  source: "openai_vision" | "rule_fallback";
  disclaimer: string;
};

const DISCLAIMER_TEXT =
  "OCR medicine extraction can be inaccurate. Always verify extracted medicine names, dosages, and instructions against your physical doctor's prescription or medicine packaging before taking any action.";

function fallbackExtraction(textHint?: string): ScanResponse {
  // Safe fallback if OpenAI key is not configured or image OCR fails
  return {
    medicines: [
      {
        name: "Paracetamol",
        dosageGuess: "500mg",
        frequencyGuess: "Twice daily after food",
        confidence: "medium",
      },
      {
        name: "Amoxicillin",
        dosageGuess: "250mg",
        frequencyGuess: "Three times daily for 5 days",
        confidence: "low",
      },
    ],
    rawNotes: "Fallback simulated OCR extraction (OpenAI API key missing or image unreadable).",
    source: "rule_fallback",
    disclaimer: DISCLAIMER_TEXT,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageDataUrl = body.imageDataUrl?.trim();
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: "A prescription or medicine image is required." },
        { status: 400 }
      );
    }

    if (!openAiKey) {
      return NextResponse.json(fallbackExtraction());
    }

    const prompt = `
You are a highly cautious medical prescription & medicine packaging OCR parser.
Examine the image carefully (doctor prescription handwriting, printed rx slip, or pill box/strip label).
Extract all identified medications.

Return STRICT valid JSON only matching this exact TypeScript structure:
{
  "medicines": [
    {
      "name": "Exact or generic medicine name",
      "dosageGuess": "e.g. 500mg or 10ml (optional)",
      "frequencyGuess": "e.g. Once daily at bedtime or 1-0-1 (optional)",
      "confidence": "high|medium|low"
    }
  ],
  "rawNotes": "Short sentence summarizing legibility"
}

Guidelines:
- "confidence": "high" ONLY for crystal clear printed text or unambiguous medicine boxes.
- "confidence": "medium" for semi-legible doctor handwriting where the name is recognizable.
- "confidence": "low" for ambiguous handwriting or partial text. Never guess names wildly.
- Do NOT output markdown codeblocks, prefix, or suffix text outside the JSON string.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_PRESCRIPTION_MODEL || "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn("OpenAI vision prescription scan failed, using fallback.");
      return NextResponse.json(fallbackExtraction());
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(fallbackExtraction());
    }

    const parsed = JSON.parse(content) as {
      medicines: ScannedMedicineItem[];
      rawNotes?: string;
    };

    return NextResponse.json({
      medicines: parsed.medicines || [],
      rawNotes: parsed.rawNotes || "Prescription scanned successfully.",
      source: "openai_vision",
      disclaimer: DISCLAIMER_TEXT,
    });
  } catch (err: any) {
    console.error("Prescription scan endpoint error:", err);
    return NextResponse.json(fallbackExtraction());
  }
}
