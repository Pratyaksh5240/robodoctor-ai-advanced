import { getGoogleAiConfig } from "./env";
import { generateWithGemini } from "./geminiClient";
import { generateWithVertex } from "./vertexClient";
import type { GenerateModelInput, GenerateModelResult } from "./types";

function cleanModelText(text: string): string {
  return text
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
}

export function parseStructuredJson<T>(rawText: string): T {
  const direct = rawText.trim();

  // Try direct parse
  try {
    return JSON.parse(direct) as T;
  } catch {}

  const cleaned = cleanModelText(direct);

  // Try cleaned parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // Try finding bounding braces
  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");

  if (objectStart !== -1 && objectEnd > objectStart) {
    const jsonCandidate = cleaned.slice(objectStart, objectEnd + 1);
    try {
      return JSON.parse(jsonCandidate) as T;
    } catch {
      // Fix common trailing comma issues
      try {
        const withoutTrailingCommas = jsonCandidate.replace(/,\s*([\]}])/g, "$1");
        return JSON.parse(withoutTrailingCommas) as T;
      } catch {}
    }
  }

  // Graceful fallback for plain text model responses
  if (cleaned.length > 0) {
    return {
      reply: cleaned,
      followUpQuestions: [
        "How long have you been experiencing these symptoms?",
        "Do you have any other associated readings or conditions?"
      ],
      aiUrgency: "low",
      redFlags: [],
      nextStep: "Monitor symptoms and discuss with your doctor if they persist.",
      conciseAssessment: "Educational health guidance based on your query."
    } as unknown as T;
  }

  throw new Error("Model output was completely empty.");
}

export async function generateContent(
  input: GenerateModelInput
): Promise<GenerateModelResult> {
  const config = getGoogleAiConfig();

  return config.provider === "vertex"
    ? generateWithVertex(input)
    : generateWithGemini(input);
}

export async function generateStructuredJson<T>(
  input: GenerateModelInput
): Promise<{ data: T; meta: GenerateModelResult }> {
  const meta = await generateContent({
    ...input,
    responseMimeType: input.responseMimeType ?? "application/json",
  });

  return {
    data: parseStructuredJson<T>(meta.text),
    meta,
  };
}
