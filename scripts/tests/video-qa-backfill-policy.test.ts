import assert from "node:assert/strict";
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
