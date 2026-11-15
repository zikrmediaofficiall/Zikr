import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { classifyBackfillPatchResult } from "../../src/features/videos/services/video-qa-backfill-policy";

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
