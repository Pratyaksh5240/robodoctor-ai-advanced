import { getGoogleAiConfig } from "./env";
import type {
  GenerateModelInput,
  GenerateModelResult,
  ModelMessage,
  ModelPart,
} from "./types";

function mapRole(role: ModelMessage["role"]) {
  return role === "assistant" ? "model" : "user";
}

function mapPart(part: ModelPart) {
  if (part.kind === "text") {
    return {
      text: part.text,
    };
  }

  return {
    inlineData: {
      mimeType: part.mimeType,
      data: part.data,
    },
  };
}

function extractTextFromResponse(raw: unknown) {
  const payload = raw as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const parts =
    payload.candidates?.flatMap(
      (candidate) =>
        candidate.content?.parts
          ?.map((part) => part.text?.trim())
          .filter((part): part is string => Boolean(part)) ?? []
    ) ?? [];

  return parts.join("\n").trim();
}

export async function generateWithGemini(
  input: GenerateModelInput
): Promise<GenerateModelResult> {
  const config = getGoogleAiConfig();

  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const candidateModels = Array.from(
    new Set(
      [
        input.model,
        config.geminiModel,
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-flash-latest",
      ].filter(Boolean) as string[]
    )
  );

  const body = {
    contents: input.messages.map((message) => ({
      role: mapRole(message.role),
      parts: message.parts.map(mapPart),
    })),
    systemInstruction: input.systemInstruction
      ? {
          parts: [{ text: input.systemInstruction }],
        }
      : undefined,
    generationConfig: {
      temperature: input.temperature ?? 0.2,
      maxOutputTokens: input.maxOutputTokens ?? 1024,
      responseMimeType: input.responseMimeType ?? "application/json",
    },
  };

  let lastError = "";

  for (const model of candidateModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        lastError = `Gemini model ${model} returned (${response.status}): ${await response.text()}`;
        // If 401 unauthenticated, further model retries with the same key won't help
        if (response.status === 401 || response.status === 403) {
          break;
        }
        continue;
      }

      const raw = await response.json();
      const text = extractTextFromResponse(raw);

      if (text) {
        return {
          provider: "gemini",
          model,
          text,
          raw,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error";
    }
  }

  throw new Error(`Gemini request failed: ${lastError || "All models failed"}`);
}
