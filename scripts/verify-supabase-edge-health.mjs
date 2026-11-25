import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function verifySupabaseEdgeHealth({
  supabaseUrl,
  expectedOrigin,
  fetchImpl = fetch,
  timeoutMs = 10_000,
}) {
  if (!supabaseUrl || !expectedOrigin) {
    throw new Error("SUPABASE_URL and SITE_URL are required.");
  }

  const baseUrl = new URL(supabaseUrl);
  if (baseUrl.protocol !== "https:" || !baseUrl.hostname.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL must be an HTTPS Supabase project URL.");
  }
  const originUrl = new URL(expectedOrigin);
  if (originUrl.protocol !== "https:") {
    throw new Error("SITE_URL must be an HTTPS production origin.");
  }

  const healthUrl = new URL("/functions/v1/health", baseUrl);
  const response = await fetchImpl(healthUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Origin: originUrl.origin,
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Supabase health Edge Function returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  if (
    payload?.status !== "ok" ||
    payload?.service !== "zikr-edge-functions" ||
    typeof payload?.version !== "string" ||
    !payload.version.trim()
  ) {
    throw new Error("Supabase health Edge Function returned an unexpected health contract.");
  }

  const allowedOrigin = response.headers.get("access-control-allow-origin");
  if (allowedOrigin !== originUrl.origin) {
    throw new Error("Supabase health Edge Function did not allow the canonical production origin.");
  }
  if (!/\bno-store\b/i.test(response.headers.get("cache-control") ?? "")) {
    throw new Error("Supabase health Edge Function response must be non-cacheable.");
  }

  return payload;
}

async function main() {
  await verifySupabaseEdgeHealth({
    supabaseUrl: process.env.SUPABASE_URL,
    expectedOrigin: process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  });
  console.log("PASS: Supabase health Edge Function is live, CORS-scoped, and non-cacheable.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
