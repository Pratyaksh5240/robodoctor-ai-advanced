import { existsSync, readFileSync } from "node:fs";
import type { GoogleAiProvider } from "./types";

export type VertexServiceAccount = {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
  projectId?: string;
};

export type GoogleAiConfig = {
  provider: Exclude<GoogleAiProvider, "fallback">;
  geminiApiKey?: string;
  geminiModel: string;
  vertexModel: string;
  vertexProject?: string;
  vertexLocation: string;
  vertexAccessToken?: string;
  serviceAccount: VertexServiceAccount | null;
};

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
}

function parseServiceAccount(): VertexServiceAccount | null {
  const inlineJson = process.env.GOOGLE_VERTEX_SERVICE_ACCOUNT_JSON?.trim();
  const filePath = process.env.GOOGLE_VERTEX_SERVICE_ACCOUNT_PATH?.trim();

  let source: string | null = null;

  if (inlineJson) {
    source = inlineJson;
  } else if (filePath && existsSync(filePath)) {
    source = readFileSync(filePath, "utf8");
  }

  if (!source) {
    const clientEmail = process.env.GOOGLE_VERTEX_CLIENT_EMAIL?.trim();
    const privateKey = process.env.GOOGLE_VERTEX_PRIVATE_KEY?.trim();

    if (!clientEmail || !privateKey) {
      return null;
    }

    return {
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
      tokenUri:
        process.env.GOOGLE_VERTEX_TOKEN_URI?.trim() ??
        "https://oauth2.googleapis.com/token",
      projectId: process.env.GOOGLE_CLOUD_PROJECT?.trim() || undefined,
    };
  }

  const parsed = JSON.parse(source) as {
    client_email?: string;
    private_key?: string;
    token_uri?: string;
    project_id?: string;
  };

  if (!parsed.client_email || !parsed.private_key) {
    return null;
  }

  return {
    clientEmail: parsed.client_email,
    privateKey: normalizePrivateKey(parsed.private_key),
    tokenUri: parsed.token_uri ?? "https://oauth2.googleapis.com/token",
    projectId: parsed.project_id,
  };
}

export function getGoogleAiConfig(): GoogleAiConfig {
  const providerPreference = process.env.AI_HEALTH_ASSISTANT_PROVIDER
    ?.trim()
    .toLowerCase();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const vertexProject = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const vertexLocation =
    process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1";
  const vertexAccessToken = process.env.VERTEX_AI_ACCESS_TOKEN?.trim();
  const serviceAccount = parseServiceAccount();

  const hasGemini = Boolean(geminiApiKey);
  const hasVertex = Boolean(
    vertexProject && (vertexAccessToken || serviceAccount)
  );

  let provider: Exclude<GoogleAiProvider, "fallback"> | null = null;

  if (providerPreference === "vertex" && hasVertex) {
    provider = "vertex";
  } else if (providerPreference === "gemini" && hasGemini) {
    provider = "gemini";
  } else if (hasVertex) {
    provider = "vertex";
  } else if (hasGemini) {
    provider = "gemini";
  }

  if (!provider) {
    throw new Error(
      "Missing Gemini or Vertex AI configuration. Set GEMINI_API_KEY or Vertex AI environment variables."
    );
  }

  return {
    provider,
    geminiApiKey,
    geminiModel:
      process.env.AI_HEALTH_ASSISTANT_GEMINI_MODEL?.trim() ||
      "gemini-2.0-flash",
    vertexModel:
      process.env.AI_HEALTH_ASSISTANT_VERTEX_MODEL?.trim() ||
      "gemini-2.0-flash",
    vertexProject,
    vertexLocation,
    vertexAccessToken,
    serviceAccount,
  };
}
