import { NextRequest, NextResponse } from "next/server";
import { translateUi, Language } from "@/lib/uiI18n";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const SYSTEM_INSTRUCTION = `
You are RoboDoctor AI's primary health chat assistant.
Provide clear, cautious, educational health information and practical next-step guidance.

STRICT MEDICAL SAFETY & COMMUNICATION RULES:
1. Provide educational health information only. Do NOT claim certainty or pretend to be a doctor giving a formal diagnosis.
2. Use phrases like: "Based on what you've shared...", "Possible explanations include...", "Consider discussing this with a healthcare professional...".
3. NEVER say "You definitely have...", "You are diagnosed with...", or prescribe restricted medications.
4. URGENT SAFETY: If the user describes emergency symptoms (such as severe chest pain, difficulty breathing/shortness of breath, fainting, severe neurological symptoms, or heavy bleeding), prioritize an urgent safety message advising immediate emergency medical care.
5. LANGUAGE: Respond in the exact language requested by the user or specified in the language system prompt parameter.
6. CONTEXT: Consider the prior conversation history to answer follow-up questions accurately.
`.trim();

function getEnhancedBotFallback(input: string, language: string): string {
  const text = input.toLowerCase();
  const lang = (language || "en") as Language;
  const localize = (en: string, hi: string) =>
    lang === "hi" ? hi : translateUi(en, lang);

  if (text.includes("chest pain") || text.includes("सीने")) {
    return localize(
      "If chest pain comes with breathlessness, sweating, weakness, or dizziness, seek emergency help now. Even mild repeated chest pain should be reviewed by a doctor.",
      "सीने में दर्द के साथ सांस फूलना, पसीना, कमजोरी या चक्कर हो तो तुरंत इमरजेंसी सहायता लें। हल्का दर्द भी बार-बार हो तो डॉक्टर को दिखाएं।"
    );
  }

  if (text.includes("fever") || text.includes("बुखार")) {
    return localize(
      "With fever, rest, hydrate, and monitor temperature. If there is very high fever, breathing trouble, repeated vomiting, or symptoms beyond 3 days, see a doctor.",
      "बुखार के साथ आराम करें, पानी पिएं, और तापमान देखें। अगर बहुत तेज बुखार, सांस की तकलीफ, लगातार उल्टी, या 3 दिन से ज्यादा समस्या रहे तो डॉक्टर से मिलें।"
    );
  }

  if (text.includes("bp") || text.includes("blood pressure") || text.includes("ब्लड प्रेशर")) {
    return localize(
      "For BP, take a proper reading after resting 5 minutes with a digital machine. Repeated readings above 140/90 should be reviewed by a doctor.",
      "BP के लिए सही रीडिंग लें: 5 मिनट आराम करके डिजिटल मशीन से जांच करें। 140/90 से ऊपर की रीडिंग बार-बार आए तो डॉक्टर को दिखाएं।"
    );
  }

  return localize(
    "I can provide general health information and guidance, but this is not a medical diagnosis. Ask about symptoms, vitals, or health concerns.",
    "मैं सामान्य स्वास्थ्य मार्गदर्शन दे सकता हूं, लेकिन यह चिकित्सा निदान नहीं है। अपने लक्षणों या स्वास्थ्य संबंधी प्रश्नों के बारे में पूछें।"
  );
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      messages?: ChatMessage[];
      language?: string;
    };

    const messages = payload.messages ?? [];
    const language = payload.language ?? "en";

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "At least one chat message is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    
    // Candidate Gemini models to attempt in sequence
    const candidateModels = [
      "gemini-3.6-flash",
      process.env.GEMINI_MODEL?.trim(),
      process.env.AI_HEALTH_ASSISTANT_GEMINI_MODEL?.trim(),
      "gemini-2.5-flash",
      "gemini-1.5-flash"
    ].filter(Boolean) as string[];

    const modelsToTry = Array.from(new Set(candidateModels));

    if (!apiKey) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.text || "";
      const fallbackReply = getEnhancedBotFallback(lastUserMsg, language);
      return NextResponse.json({
        reply: fallbackReply,
        provider: "fallback-rules",
        model: "rule-based",
        fallbackUsed: true,
      });
    }

    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.text }],
    }));

    let lastError: string | null = null;

    for (const model of modelsToTry) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: SYSTEM_INSTRUCTION }],
            },
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text)
            .join("\n")
            ?.trim();

          if (replyText) {
            return NextResponse.json({
              reply: replyText,
              provider: "gemini",
              model,
              fallbackUsed: false,
            });
          }
        } else {
          lastError = `Gemini API model ${model} returned ${response.status}: ${await response.text()}`;
          console.warn(lastError);
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Fetch error";
        console.warn(`Attempt with model ${model} failed:`, lastError);
      }
    }

    // Fallback if all models failed
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.text || "";
    const fallbackReply = getEnhancedBotFallback(lastUserMsg, language);
    return NextResponse.json({
      reply: fallbackReply,
      provider: "fallback-rules",
      model: "rule-based",
      fallbackUsed: true,
    });
  } catch (error) {
    console.error("Chatbot API error:", error);
    return NextResponse.json(
      {
        error: "RoboDoctor is temporarily unable to connect to the AI service. Please try again.",
      },
      { status: 500 }
    );
  }
}
