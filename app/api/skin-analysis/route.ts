import { NextRequest, NextResponse } from "next/server";
import { analyzeSkin, SkinAnalysis } from "@/lib/skinAnalysis";

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

type MlSkinResponse = {
  topClass: string;
  topClassName: string;
  confidence: number;
  probabilities: Record<string, number>;
  uncertainPrediction: boolean;
  imageQualityPassed: boolean;
  estimatedRiskScore: number;
  isHighRiskPattern: boolean;
  disclaimer: string;
};

function fallbackResult(payload: SkinPayload, mlRes?: MlSkinResponse | null) {
  const baseAnalysis = analyzeSkin(payload);

  if (!mlRes) {
    return {
      analysis: baseAnalysis,
      source: "rules",
    };
  }

  // Fuse PyTorch vision probabilities into analysis result
  const mergedAnalysis: SkinAnalysis = {
    ...baseAnalysis,
    topClass: mlRes.topClass,
    topClassName: mlRes.topClassName,
    confidence: mlRes.confidence,
    probabilities: mlRes.probabilities,
    uncertainPrediction: mlRes.uncertainPrediction,
    imageQualityPassed: mlRes.imageQualityPassed,
    isHighRiskPattern: mlRes.isHighRiskPattern,
    score: Math.min(100, Math.max(baseAnalysis.score, Math.round(mlRes.estimatedRiskScore))),
  };

  if (mlRes.isHighRiskPattern) {
    mergedAnalysis.precautions.unshift(
      "Avoid direct sun exposure on pigmented spots and protect skin with broad-spectrum sunscreen while awaiting dermatologist review."
    );
    mergedAnalysis.redFlags.unshift({
      title: `High-Risk Computer Vision Pattern: ${mlRes.topClassName}`,
      detail: `The screening model identified features matching ${mlRes.topClassName} with ${mlRes.confidence}% confidence. Prompt dermatologist review recommended.`,
      severity: "high",
    });

    if (mergedAnalysis.severity === "low" || mergedAnalysis.severity === "moderate") {
      mergedAnalysis.severity = "high";
      mergedAnalysis.summary = `Computer vision screening identified pattern features consistent with ${mlRes.topClassName} (${mlRes.confidence}% confidence). Dermatologist evaluation is recommended.`;
      mergedAnalysis.followUp = "Arrange a clinical or dermatologist review within 24 to 72 hours.";
    }
  }

  if (mlRes.uncertainPrediction) {
    mergedAnalysis.precautions.unshift(
      "The vision screening model reported low confidence (<45%) due to image lighting or lesion ambiguity. Clinical examination is recommended."
    );
  }

  return {
    analysis: mergedAnalysis,
    source: "pytorch_cv_hybrid",
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as SkinPayload;
    const imageDataUrl = payload.imageDataUrl?.trim();
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!imageDataUrl) {
      return NextResponse.json(
        { error: "A skin photo is required before analysis." },
        { status: 400 }
      );
    }

    // Step 1: Query Python FastAPI ML Backend for PyTorch skin screening
    let mlResult: MlSkinResponse | null = null;
    const mlUrl = process.env.SKIN_ML_SERVICE_URL || "http://127.0.0.1:8000/skin-predict";

    try {
      const mlRes = await fetch(mlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          bodyPart: payload.bodyPart,
          symptoms: payload.symptoms,
        }),
      });

      if (mlRes.ok) {
        mlResult = (await mlRes.json()) as MlSkinResponse;
      }
    } catch {
      console.warn("Python ML FastAPI backend unavailable, proceeding with rule fallback.");
    }

    if (!openAiKey) {
      return NextResponse.json(fallbackResult(payload, mlResult));
    }

    // Step 2: Query Multimodal LLM if OpenAI API key available
    const prompt = `
You are a cautious skin-triage assistant. Analyze the uploaded skin photo together with symptom data and PyTorch vision model outputs.
PyTorch Vision Screening:
- Top Pattern: ${mlResult?.topClassName || "N/A"} (${mlResult?.confidence || 0}% confidence)
- Probabilities: ${JSON.stringify(mlResult?.probabilities || {})}
- High Risk Flag: ${mlResult?.isHighRiskPattern || false}
- Uncertainty Flag: ${mlResult?.uncertainPrediction || false}

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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SKIN_MODEL || "gpt-4.1-mini",
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
      return NextResponse.json(fallbackResult(payload, mlResult));
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(fallbackResult(payload, mlResult));
    }

    const parsed = JSON.parse(content) as SkinAnalysis;

    if (mlResult) {
      parsed.topClass = mlResult.topClass;
      parsed.topClassName = mlResult.topClassName;
      parsed.confidence = mlResult.confidence;
      parsed.probabilities = mlResult.probabilities;
      parsed.uncertainPrediction = mlResult.uncertainPrediction;
      parsed.imageQualityPassed = mlResult.imageQualityPassed;
      parsed.isHighRiskPattern = mlResult.isHighRiskPattern;
    }

    return NextResponse.json({
      analysis: parsed,
      source: "openai_hybrid_cv",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to analyze skin image right now." },
      { status: 500 }
    );
  }
}
