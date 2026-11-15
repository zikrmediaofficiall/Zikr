const EXPECTED_SUPABASE_PROJECT_REF = "zqtssvlvmkzeeyqghqfk";
const EXPECTED_SUPABASE_HOST = `${EXPECTED_SUPABASE_PROJECT_REF}.supabase.co`;

export function assertCanonicalSupabaseProjectUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("SUPABASE_URL is required.");
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("SUPABASE_URL must be a valid HTTPS URL for the canonical ZIKR production project.");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== EXPECTED_SUPABASE_HOST ||
    parsed.port ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("SUPABASE_URL must point only to the canonical ZIKR production Supabase project.");
  }

  return parsed.origin;
}
