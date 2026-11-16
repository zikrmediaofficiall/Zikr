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


export const EXPECTED_VIDEO_QA_BACKFILL_PROJECT_REF = "zqtssvlvmkzeeyqghqfk";
export const VIDEO_QA_BACKFILL_CONFIRMATION = "APPLY_QA_BACKFILL";

/** Restrict this one-off production data repair to the canonical Supabase project. */
export function assertBackfillTargetProject(supabaseUrl: unknown, expectedProjectRef: unknown): string {
  const expected = typeof expectedProjectRef === "string" ? expectedProjectRef.trim().toLowerCase() : "";
  if (expected !== EXPECTED_VIDEO_QA_BACKFILL_PROJECT_REF) {
    throw new Error("Legacy Video QA backfill requires the canonical EXPECTED_PROJECT_REF.");
  }

  let parsed: URL;
  try {
    parsed = new URL(typeof supabaseUrl === "string" ? supabaseUrl : "");
  } catch {
    throw new Error("Legacy Video QA backfill requires a valid canonical Supabase URL.");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname.toLowerCase() !== expected + ".supabase.co" ||
    parsed.port ||
    parsed.username ||
    parsed.password ||
    (parsed.pathname !== "" && parsed.pathname !== "/") ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Refusing legacy Video QA backfill for an unexpected Supabase project URL.");
  }

  return expected;
}

/** The CLI flag alone is insufficient: manual apply must carry both workflow confirmations. */
export function assertBackfillApplyConfirmation(
  apply: boolean,
  backfillApply: unknown,
  confirmation: unknown,
): void {
  if (!apply) return;
  if (
    backfillApply !== "true" ||
    confirmation !== VIDEO_QA_BACKFILL_CONFIRMATION
  ) {
    throw new Error(
      "Refusing production Video QA backfill apply without BACKFILL_APPLY=true and BACKFILL_CONFIRMATION=APPLY_QA_BACKFILL.",
    );
  }
}
