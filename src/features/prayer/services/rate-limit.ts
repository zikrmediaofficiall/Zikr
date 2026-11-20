import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { getContactRateLimitActorId } from "@/features/contact/rate-limit-identity";

const RATE_LIMIT_BUCKET = "public_prayer_times_lookup";
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_SECONDS = 60;

/**
 * Keep the public Aladhan proxy bounded across all serverless instances.
 * The raw client address is HMAC-derived before it reaches the database.
 * Fail closed so a limiter outage cannot turn this endpoint into an
 * unrestricted upstream proxy.
 */
export async function consumePrayerTimesRateLimit(clientIdentifier: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_admin_rate_limit", {
    p_actor: getContactRateLimitActorId(
      clientIdentifier,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    ),
    p_bucket: RATE_LIMIT_BUCKET,
    p_limit: RATE_LIMIT_MAX_REQUESTS,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
  });

  if (error || typeof data !== "boolean") {
    console.error("[prayer-times rate limit] RPC failed", error?.code ?? "invalid_result");
    throw new Error("Shared prayer-times rate limit is unavailable");
  }

  return data;
}
