import { isInAppUserAgent } from "@/lib/native-app";

const DEFAULT_CLIENT = "ca-pub-2457467624248791";

/** Accepts "ca-pub-123", "pub-123" or a bare id from the environment; falls back to the default account. */
function normalizeClient(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (/^ca-pub-\d{8,}$/.test(value)) return value;
  if (/^pub-\d{8,}$/.test(value)) return `ca-${value}`;
  if (/^\d{8,}$/.test(value)) return `ca-pub-${value}`;
  return DEFAULT_CLIENT;
}

const CLIENT = normalizeClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

/**
 * Server-rendered AdSense account meta, so Google's verification crawler sees it without
 * running JavaScript. Emitted only for the canonical production host and never inside the
 * Android app WebView or on preview deployments (ad scripts still load only via the web runtime).
 */
export function adsenseAccountMeta(input: { host: string | null; userAgent: string | null; canonicalUrl: string }): Record<string, string> | undefined {
  if (!/^ca-pub-\d{8,}$/.test(CLIENT)) return undefined;
  if (isInAppUserAgent(input.userAgent)) return undefined;
  let canonicalHost = "";
  try { canonicalHost = new URL(input.canonicalUrl).host.toLowerCase(); } catch { return undefined; }
  if (!input.host || input.host.toLowerCase() !== canonicalHost) return undefined;
  return { "google-adsense-account": CLIENT };
}
