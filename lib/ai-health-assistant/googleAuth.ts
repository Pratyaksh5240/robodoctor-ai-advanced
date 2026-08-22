import { createSign } from "node:crypto";
import type { VertexServiceAccount } from "./env";

const TOKEN_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

const accessTokenCache = new Map<
  string,
  { token: string; expiresAt: number }
>();

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(payload: Record<string, string | number>, privateKey: string) {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function getVertexAccessToken(
  serviceAccount: VertexServiceAccount
): Promise<string> {
  const cachedToken = accessTokenCache.get(serviceAccount.clientEmail);

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const assertion = signJwt(
    {
      iss: serviceAccount.clientEmail,
      sub: serviceAccount.clientEmail,
      aud: serviceAccount.tokenUri,
      scope: TOKEN_SCOPE,
      iat: issuedAt,
      exp: expiresAt,
    },
    serviceAccount.privateKey
  );

  const response = await fetch(serviceAccount.tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Unable to fetch Vertex AI access token (${response.status}).`
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("Vertex AI token response did not include an access token.");
  }

  accessTokenCache.set(serviceAccount.clientEmail, {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
  });

  return payload.access_token;
}
