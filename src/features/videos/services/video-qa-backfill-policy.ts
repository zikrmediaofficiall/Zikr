export type BackfillPatchResult = "updated" | "stale" | "unexpected";

/**
 * PostgREST PATCH with Prefer: return=representation must return exactly one
 * row before a backfill can report that it changed a request.
 */
export function classifyBackfillPatchResult(rows: unknown): BackfillPatchResult {
  if (!Array.isArray(rows)) return "unexpected";
  if (rows.length === 0) return "stale";
  if (rows.length === 1) return "updated";
  return "unexpected";
}
