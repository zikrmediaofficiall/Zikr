import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getContactRateLimitActorId } from "@/features/contact/rate-limit-identity";

const CLIENT_BUCKET = "public_reverse_geocode_client";
const GLOBAL_BUCKET = "public_reverse_geocode_global_min_interval";
const CLIENT_LIMIT = 10;
const CLIENT_WINDOW_SECONDS = 60;
const GLOBAL_INTERVAL_MS = 1000;

async function consumeRateLimit(
  identifier: string,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const actorId = getContactRateLimitActorId(identifier, secret);
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_admin_rate_limit", {
    p_actor: actorId,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error || typeof data !== "boolean") {
    console.error("[reverse geocode rate limit] RPC failed", error?.code ?? "invalid_result");
    throw new Error("Shared reverse-geocode rate limit is unavailable");
  }

  return data;
}

export function consumeReverseGeocodeClientRateLimit(clientIdentifier: string): Promise<boolean> {
  return consumeRateLimit(clientIdentifier, CLIENT_BUCKET, CLIENT_LIMIT, CLIENT_WINDOW_SECONDS);
}

/**
 * Nominatim's public endpoint allows at most one request per second for the
 * whole application, not one per serverless instance or end user. This token
 * is consumed inside the shared cache callback, so cache hits do not consume it.
 */
export async function consumeNominatimGlobalRateLimit(): Promise<boolean> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const actorId = getContactRateLimitActorId("nominatim-global", secret);
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_min_interval_rate_limit", {
    p_actor: actorId,
    p_bucket: GLOBAL_BUCKET,
    p_interval_ms: GLOBAL_INTERVAL_MS,
  });

  if (error || typeof data !== "boolean") {
    console.error("[reverse geocode rate limit] minimum-interval RPC failed", error?.code ?? "invalid_result");
    throw new Error("Shared reverse-geocode minimum-interval limit is unavailable");
  }

  return data;
}
