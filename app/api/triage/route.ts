import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export type TriageResult = {
  route:
    | "skin-check"
    | "health-check"
    | "medicine-checker"
    | "lab-report"
    | "emergency-guide"
    | "ai-chatbot"
    | "diet-planner"
    | "basic-medicines";
  confidence: "high" | "medium" | "low";
  urgent: boolean;
  extractedSymptoms: string[];
  reasoning: string;
};

const SYSTEM_INSTRUCTION = `
You are an expert medical symptom triage and module routing classifier for RoboDoctor AI.
Your sole task is to analyze the user's health query or description and return a strict JSON object classifying the intent.

ROUTING TARGETS:
- "skin-check": Rash, skin lesion, mole, wound, visible skin symptom, itching, acne, eczema, burn, blister, insect bite.
- "health-check": Fever, blood pressure (BP), pulse rate, blood sugar, general vitals-related concerns, dizziness, fatigue, body aches.
- "medicine-checker": Specific drug/medicine names (e.g., Paracetamol, Metformin, Aspirin, Dolo, Amoxicillin, Lisinopril), drug reactions, side effects, or questions like "is it safe to take X with Y".
- "lab-report": Specific lab test values (HbA1c, cholesterol, TSH, hemoglobin, WBC, liver enzymes, kidney function, CBC) or "what does my report mean".
- "diet-planner": Diet, food, nutrition, weight loss, weight gain, meal planning goals.
- "basic-medicines": General OTC symptom relief questions (mild headache, common cold, sore throat, acidity, cough syrup).
- "ai-chatbot": Anything ambiguous, general health questions, or queries that do not match a specific module.
- "emergency-guide": Must be selected if urgent safety warning criteria are met.

URGENT SAFETY CRITERIA:
Set "urgent": true (and route to "emergency-guide") whenever the description includes any of the following:
1. Chest pain, pressure, or tightness
2. Severe difficulty breathing or shortness of breath
3. Fainting, loss of consciousness, or collapse
4. Heavy or uncontrolled bleeding
5. Stroke-like symptoms (face drooping, slurred speech, sudden one-sided weakness or paralysis)
6. Suicidal ideation or self-harm intent

JSON OUTPUT FORMAT:
You MUST respond with STRICT JSON ONLY. Do not include markdown fences, code blocks, or conversational text.
Shape:
{
  "route": "skin-check" | "health-check" | "medicine-checker" | "lab-report" | "emergency-guide" | "ai-chatbot" | "diet-planner" | "basic-medicines",
  "confidence": "high" | "medium" | "low",
  "urgent": boolean,
  "extractedSymptoms": ["string", ...],
  "reasoning": "one short sentence explaining the routing choice"
}
`.trim();

function getHeuristicFallback(input: string): TriageResult {
  const text = input.toLowerCase();

  // Emergency Check
  if (
    text.includes("chest pain") ||
    text.includes("shortness of breath") ||
    text.includes("breathlessness") ||
    text.includes("fainted") ||
    text.includes("fainting") ||
    text.includes("unconscious") ||
    text.includes("heavy bleeding") ||
    text.includes("stroke") ||
    text.includes("face drooping") ||
    text.includes("slurred speech") ||
    text.includes("suicide") ||
    text.includes("suicidal") ||
    text.includes("सीने में दर्द") ||
    text.includes("सांस लेने में तकलीफ")
  ) {
    return {
      route: "emergency-guide",
      confidence: "high",
      urgent: true,
      extractedSymptoms: [input.slice(0, 50)],
      reasoning: "Emergency warning symptoms detected requiring immediate medical attention.",
    };
  }

  // Skin Check
  if (
    text.includes("rash") ||
    text.includes("skin") ||
    text.includes("mole") ||
    text.includes("lesion") ||
    text.includes("itching") ||
    text.includes("acne") ||
    text.includes("eczema") ||
    text.includes("spot") ||
    text.includes("blister") ||
    text.includes("burn") ||
    text.includes("दाने") ||
    text.includes("त्वचा")
  ) {
    return {
      route: "skin-check",
      confidence: "high",
      urgent: false,
      extractedSymptoms: [input.slice(0, 50)],
      reasoning: "Dermatological or visible skin symptoms detected.",
    };
  }

  // Medicine Checker
  if (
    text.includes("medicine") ||
    text.includes("drug") ||
    text.includes("pill") ||
    text.includes("tablet") ||
    text.includes("dolo") ||
    text.includes("aspirin") ||
    text.includes("ibuprofen") ||
    text.includes("paracetamol") ||
    text.includes("metformin") ||
    text.includes("augmentin") ||
    text.includes("interaction") ||
    text.includes("side effect") ||
    text.includes("दवा")
  ) {
    return {
      route: "medicine-checker",
      confidence: "high",
      urgent: false,
      extractedSymptoms: [input.slice(0, 50)],
      reasoning: "Specific medication or drug interaction inquiry detected.",
    };
  }

  // Lab Report
  if (
    text.includes("lab") ||
    text.includes("report") ||
    text.includes("hba1c") ||
    text.includes("cholesterol") ||
    text.includes("tsh") ||
    text.includes("hemoglobin") ||
    text.includes("blood test") ||
    text.includes("wbc") ||
    text.includes("लैब")
  ) {
    return {
      route: "lab-report",
      confidence: "high",
      urgent: false,
      extractedSymptoms: [input.slice(0, 50)],
      reasoning: "Laboratory test results or report values detected.",
    };
  }

  // Diet Planner
  if (
    text.includes("diet") ||
    text.includes("nutrition") ||
    text.includes("calories") ||
    text.includes("meal") ||
    text.includes("weight loss") ||
    text.includes("weight gain") ||
    text.includes("डाइट")
  ) {
    return {
      route: "diet-planner",
      confidence: "high",
      urgent: false,
      extractedSymptoms: [input.slice(0, 50)],
      reasoning: "Dietary or nutritional goal inquiry detected.",
    };
  }

  // Basic Medicines (OTC)
  if (
    text.includes("otc") ||
    text.includes("cold") ||
    text.includes("cough") ||
    text.includes("sore throat") ||
    text.includes("acidity") ||
    text.includes("headache") ||
    text.includes("जुकाम") ||
    text.includes("खांसी")
  ) {
    return {
      route: "basic-medicines",
      confidence: "medium",
      urgent: false,
      extractedSymptoms: [input.slice(0, 50)],
      reasoning: "General OTC symptom relief inquiry detected.",
    };
  }

  // Health Check (Vitals)
  if (
    text.includes("fever") ||
    text.includes("bp") ||
    text.includes("blood pressure") ||
    text.includes("pulse") ||
    text.includes("sugar") ||
    text.includes("temperature") ||
    text.includes("बुखार") ||
    text.includes("बीपी")
  ) {
    return {
      route: "health-check",
      confidence: "high",
      urgent: false,
      extractedSymptoms: [input.slice(0, 50)],
      reasoning: "Vital signs and general health metrics detected.",
    };
  }

  // Default to AI Chatbot
  return {
    route: "ai-chatbot",
    confidence: "medium",
    urgent: false,
    extractedSymptoms: [input.slice(0, 50)],
    reasoning: "General health inquiry routed to AI Assistant.",
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      description?: string;
      language?: string;
    };

    const description = payload.description?.trim() || "";

    if (!description) {
      return NextResponse.json(
        { error: "Description string is required for triage classification." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim();

    if (!apiKey) {
      const fallback = getHeuristicFallback(description);
      return NextResponse.json(fallback);
    }

    const candidateModels = [
      process.env.GEMINI_MODEL?.trim(),
      process.env.AI_HEALTH_ASSISTANT_GEMINI_MODEL?.trim(),
      "gemini-3.6-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-2.0-flash-exp",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ].filter(Boolean) as string[];

    const modelsToTry = Array.from(new Set(candidateModels));

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: description }],
              },
            ],
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 512,
              responseMimeType: "application/json",
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let rawText = data.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text)
            .join("")
            ?.trim();

          if (rawText) {
            // Strip code fences if present
            rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

            try {
              const parsed = JSON.parse(rawText) as TriageResult;

              if (parsed.route && parsed.confidence !== undefined) {
                const validRoutes = [
                  "skin-check",
                  "health-check",
                  "medicine-checker",
                  "lab-report",
                  "emergency-guide",
                  "ai-chatbot",
                  "diet-planner",
                  "basic-medicines",
                ];

                const route = validRoutes.includes(parsed.route)
                  ? parsed.route
                  : "ai-chatbot";

                return NextResponse.json({
                  route,
                  confidence: parsed.confidence || "medium",
                  urgent: Boolean(parsed.urgent),
                  extractedSymptoms: Array.isArray(parsed.extractedSymptoms) && parsed.extractedSymptoms.length > 0
                    ? parsed.extractedSymptoms
                    : [description],
                  reasoning: parsed.reasoning || "Triage classification complete.",
                });
              }
            } catch (jsonErr) {
              console.warn(`Failed to parse JSON from model ${model}:`, jsonErr, rawText);
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini model ${model} triage attempt failed:`, err);
      }
    }

    // Heuristic Fallback
    const fallback = getHeuristicFallback(description);
    return NextResponse.json(fallback);
  } catch (error) {
    console.error("Triage API error:", error);
    return NextResponse.json(
      {
        error: "Failed to classify symptoms.",
      },
      { status: 500 }
    );
  }
}
