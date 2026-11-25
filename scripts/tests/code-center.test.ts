import assert from "node:assert/strict";
import { reviewState, summarizeBranches, summarizePulls } from "../../src/features/admin/omnis/code-center";

const pulls = summarizePulls([
  { number: 486, title: "OMNIS", html_url: "https://github.com/o/r/pull/486", draft: true, user: { login: "a" }, head: { ref: "feat/x", sha: "abcdef123456" }, base: { ref: "main" }, updated_at: "2026-11-25T00:00:00Z", requested_reviewers: [] },
  { number: 2, title: "evil", html_url: "javascript:alert(1)" },
  { number: "x", html_url: "https://github.com/o/r/pull/3" },
  { number: 5, title: "t", html_url: "https://github.com/o/r/pull/5", requested_reviewers: [{}], base: { ref: "dev" } },
]);
assert.equal(pulls.length, 2, "non-github links and malformed rows are dropped");
assert.equal(pulls[0].headSha, "abcdef1");
assert.equal(pulls[0].targetsMain, true);
assert.equal(reviewState(pulls[0]), "draft");
assert.equal(reviewState(pulls[1]), "in_review");
assert.deepEqual(summarizePulls(null), []);
assert.deepEqual(summarizeBranches([{ name: "main", protected: true }, { nope: 1 }, { name: "x" }]), [{ name: "main", protectedBranch: true }, { name: "x", protectedBranch: false }]);
console.log("code-center tests passed");
