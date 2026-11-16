/**
 * Local OAuth redirects are explicitly allow-listed in Supabase configuration.
 * Keep this list aligned with getCanonicalAuthBaseUrl and the auth config.
 */
export function isLocalDevelopmentOAuthHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  const host = normalized.startsWith("[") && normalized.endsWith("]")
    ? normalized.slice(1, -1)
    : normalized;
  return ["localhost", "127.0.0.1", "::1"].includes(host);
}
