import { getGoogleAiConfig } from "./env";
import { generateWithGemini } from "./geminiClient";
import { generateWithVertex } from "./vertexClient";
import type { GenerateModelInput, GenerateModelResult } from "./types";

function stripCodeFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

export function parseStructuredJson<T>(rawText: string): T {
  const direct = rawText.trim();

  try {
    return JSON.parse(direct) as T;
  } catch {
    const fenceStripped = stripCodeFence(direct);

    try {
      return JSON.parse(fenceStripped) as T;
    } catch {
      const objectStart = fenceStripped.indexOf("{");
      const objectEnd = fenceStripped.lastIndexOf("}");
      const arrayStart = fenceStripped.indexOf("[");
      const arrayEnd = fenceStripped.lastIndexOf("]");

      if (objectStart !== -1 && objectEnd > objectStart) {
        return JSON.parse(
          fenceStripped.slice(objectStart, objectEnd + 1)
        ) as T;
      }

      if (arrayStart !== -1 && arrayEnd > arrayStart) {
        return JSON.parse(
          fenceStripped.slice(arrayStart, arrayEnd + 1)
        ) as T;
      }

      throw new Error("Model output was not valid JSON.");
    }
  }
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
