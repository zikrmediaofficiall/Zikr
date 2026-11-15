import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  assertBackfillApplyConfirmation,
  assertBackfillTargetProject,
  classifyBackfillPatchResult,
  EXPECTED_VIDEO_QA_BACKFILL_PROJECT_REF,
  VIDEO_QA_BACKFILL_CONFIRMATION,
} from "../../src/features/videos/services/video-qa-backfill-policy";

test("one returned row confirms the QA backfill update", () => {
  assert.equal(classifyBackfillPatchResult([{ id: "request-1", updated_at: "2026-11-14T00:00:00Z" }]), "updated");
});

test("zero returned rows is a stale compare-and-set, not a successful write", () => {
  assert.equal(classifyBackfillPatchResult([]), "stale");
});

test("missing or multiple returned rows fail closed", () => {
  assert.equal(classifyBackfillPatchResult(undefined), "unexpected");
  assert.equal(classifyBackfillPatchResult(null), "unexpected");
  assert.equal(classifyBackfillPatchResult([{ id: "one" }, { id: "two" }]), "unexpected");
});

test("legacy backfill selects system-approved Kids requests missing Kids-specific QA without overwriting human review", () => {
  const source = readFileSync("scripts/jobs/backfill-legacy-video-qa.ts", "utf8");
  assert.match(source, /isKidsQaRevalidation/);
  assert.match(source, /content->>kidsVideoQaStatus=is\.null/);
  assert.match(source, /content->>approvalReviewerId=eq\.system%3Azikr-video-factory/);
  assert.match(source, /Existing human review is preserved/);
  assert.match(source, /normalizeVideoAudience\(validatedContent\.audience, false\)/);
});


test("legacy QA backfill is pinned to the canonical production Supabase project", () => {
  assert.equal(
    assertBackfillTargetProject(
      "https://zqtssvlvmkzeeyqghqfk.supabase.co",
      EXPECTED_VIDEO_QA_BACKFILL_PROJECT_REF,
    ),
    EXPECTED_VIDEO_QA_BACKFILL_PROJECT_REF,
  );
  assert.throws(
    () => assertBackfillTargetProject("https://other-project.supabase.co", EXPECTED_VIDEO_QA_BACKFILL_PROJECT_REF),
    /unexpected Supabase project URL/,
  );
  assert.throws(
    () => assertBackfillTargetProject("http://zqtssvlvmkzeeyqghqfk.supabase.co", EXPECTED_VIDEO_QA_BACKFILL_PROJECT_REF),
    /unexpected Supabase project URL/,
  );
  assert.throws(
    () => assertBackfillTargetProject("https://zqtssvlvmkzeeyqghqfk.supabase.co/rest/v1", EXPECTED_VIDEO_QA_BACKFILL_PROJECT_REF),
    /unexpected Supabase project URL/,
  );
  assert.throws(
    () => assertBackfillTargetProject("https://zqtssvlvmkzeeyqghqfk.supabase.co", "wrong-project-ref"),
    /canonical EXPECTED_PROJECT_REF/,
  );
});

test("legacy QA backfill apply requires the typed manual confirmation", () => {
  assert.doesNotThrow(() => assertBackfillApplyConfirmation(false, undefined, ""));
  assert.throws(
    () => assertBackfillApplyConfirmation(true, "false", VIDEO_QA_BACKFILL_CONFIRMATION),
    /BACKFILL_APPLY=true/,
  );
  assert.throws(
    () => assertBackfillApplyConfirmation(true, "true", "wrong-confirmation"),
    /BACKFILL_CONFIRMATION=APPLY_QA_BACKFILL/,
  );
  assert.doesNotThrow(() =>
    assertBackfillApplyConfirmation(true, "true", VIDEO_QA_BACKFILL_CONFIRMATION),
  );
});

test("legacy QA backfill validates its target and apply confirmation before reading production rows", () => {
  const source = readFileSync("scripts/jobs/backfill-legacy-video-qa.ts", "utf8");
  const targetGuardIndex = source.indexOf("assertBackfillTargetProject(");
  const applyGuardIndex = source.indexOf("assertBackfillApplyConfirmation(");
  const inventoryReadIndex = source.indexOf("await listLegacyRequests()");
  assert.ok(targetGuardIndex >= 0 && targetGuardIndex < inventoryReadIndex);
  assert.ok(applyGuardIndex >= 0 && applyGuardIndex < inventoryReadIndex);
});
