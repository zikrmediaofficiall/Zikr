/**
 * Supabase/PostgREST collection reads must return JSON arrays. The REST wrapper
 * returns undefined for an empty HTTP body, which is not the same as a valid
 * empty result set and must not silently become a successful empty feed.
 */
export function requireSupabaseRows<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) {
    const source = label.trim() || "Supabase query";
    throw new Error(
      `${source} returned a non-array response; refusing to treat it as an empty result.`,
    );
  }
  return value as T[];
}
