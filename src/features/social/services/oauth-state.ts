import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type SocialOAuthProvider = "facebook" | "youtube";

const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 30 * 1000;

function getSigningSecret() {
  const secret = process.env.OAUTH_STATE_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("OAuth state signing secret is not configured.");
  }
  return secret;
}

function signatureFor(payload: string, secret: string) {
  return createHmac("sha256", secret)
    .update("zikr-social-oauth-state:v1:")
    .update(payload)
    .digest();
}

export function createSignedOAuthState(
  profileId: string,
  provider: SocialOAuthProvider,
  now = Date.now(),
) {
  if (!profileId.trim() || profileId.length > 128 || !Number.isFinite(now)) {
    throw new Error("Invalid OAuth state context.");
  }
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    profileId,
    provider,
    issuedAt: now,
    nonce: randomBytes(32).toString("hex"),
  })).toString("base64url");
  const signature = signatureFor(payload, getSigningSecret()).toString("base64url");
  return `${payload}.${signature}`;
}

export function verifySignedOAuthState(
  token: string,
  expectedProfileId: string,
  expectedProvider: SocialOAuthProvider,
  now = Date.now(),
) {
  if (!token || token.length > 1024 || !expectedProfileId || !Number.isFinite(now)) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  try {
    const expectedSignature = signatureFor(parts[0], getSigningSecret());
    const suppliedSignature = Buffer.from(parts[1], "base64url");
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) return false;

    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as {
      version?: unknown;
      profileId?: unknown;
      provider?: unknown;
      issuedAt?: unknown;
      nonce?: unknown;
    };
    if (
      payload.version !== 1 ||
      payload.profileId !== expectedProfileId ||
      payload.provider !== expectedProvider ||
      typeof payload.issuedAt !== "number" ||
      !Number.isFinite(payload.issuedAt) ||
      payload.issuedAt > now + MAX_FUTURE_CLOCK_SKEW_MS ||
      now - payload.issuedAt > STATE_TTL_MS ||
      typeof payload.nonce !== "string" ||
      !/^[a-f0-9]{64}$/.test(payload.nonce)
    ) return false;

    return true;
  } catch {
    return false;
  }
}
