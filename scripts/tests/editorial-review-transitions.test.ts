import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  REVIEW_STATES,
  allowedReviewTransitions,
  canTransitionReview,
  isReviewState,
} from "../../src/features/editorial/review-transitions";

assert.equal(canTransitionReview("draft", "approved"), false, "draft cannot skip review");
assert.equal(canTransitionReview("editorial_review", "approved"), false, "approval needs scholarly review");
assert.equal(canTransitionReview("rejected", "approved"), false);
assert.equal(canTransitionReview("draft", "editorial_review"), true);
assert.equal(canTransitionReview("scholarly_review", "approved"), true);
assert.equal(canTransitionReview("approved", "draft"), true, "approved content can be reopened");
assert.equal(canTransitionReview("approved", "approved"), false, "same state is not a transition");
assert.equal(canTransitionReview("unknown", "draft"), false);
assert.equal(canTransitionReview("draft", "published"), false);
assert.deepEqual(allowedReviewTransitions("nope"), []);
for (const state of REVIEW_STATES) {
  assert.ok(isReviewState(state));
  assert.ok(!allowedReviewTransitions(state).includes(state), `${state} must not self-transition`);
}
// Every non-draft state must be able to reach draft eventually (no dead ends).
for (const state of REVIEW_STATES) {
  const seen = new Set<string>([state]);
  const queue: string[] = [state];
  while (queue.length) {
    for (const next of allowedReviewTransitions(queue.shift()!)) {
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  assert.ok(seen.has("draft"), `${state} must be able to return to draft`);
}

const actions = readFileSync("src/app/admin/editorial-actions.ts", "utf8");
assert.ok(actions.includes("canTransitionReview(current[0].review_status, status)"), "server action must enforce transitions");
assert.ok(actions.includes("unpublishContentAction"), "rollback action must exist");
assert.ok(actions.includes('action: "editorial.unpublish"'), "rollback must be audited");
assert.ok(actions.includes('requireAdminStepUp("content.publish"'));

console.log("Editorial review transition and rollback contracts passed.");
