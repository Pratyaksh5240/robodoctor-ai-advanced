import { getGoogleAiConfig } from "./env";
import { getVertexAccessToken } from "./googleAuth";
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

async function resolveVertexToken() {
  const config = getGoogleAiConfig();

  if (config.vertexAccessToken) {
    return config.vertexAccessToken;
  }

  if (!config.serviceAccount) {
    throw new Error(
      "Vertex AI requires VERTEX_AI_ACCESS_TOKEN or Google service account credentials."
    );
  }

  return getVertexAccessToken(config.serviceAccount);
}

export async function generateWithVertex(
  input: GenerateModelInput
): Promise<GenerateModelResult> {
  const config = getGoogleAiConfig();

  if (!config.vertexProject) {
    throw new Error("GOOGLE_CLOUD_PROJECT is missing for Vertex AI.");
  }

  const model = input.model ?? config.vertexModel;
  const token = await resolveVertexToken();
  const endpoint = `https://${config.vertexLocation}-aiplatform.googleapis.com/v1/projects/${config.vertexProject}/locations/${config.vertexLocation}/publishers/google/models/${model}:generateContent`;

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

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Vertex AI request failed (${response.status}): ${await response.text()}`
    );
  }

  const raw = await response.json();
  const text = extractTextFromResponse(raw);

  if (!text) {
    throw new Error("Vertex AI did not return any text output.");
  }

  return {
    provider: "vertex",
    model,
    text,
    raw,
  };
}
