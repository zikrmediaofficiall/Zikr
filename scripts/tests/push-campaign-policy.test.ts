import assert from "node:assert/strict";
import { campaignProblem, campaignTransitionProblem } from "../../src/features/notifications/services/push-campaign-policy";

const ok = { title: "تذكير", body: "نص", link: "/quran", audience: "all" };
assert.equal(campaignProblem(ok), null);
assert.equal(campaignProblem({ ...ok, link: "" }), null);
assert.ok(campaignProblem({ ...ok, title: "" }));
assert.ok(campaignProblem({ ...ok, body: "x".repeat(241) }));
assert.ok(campaignProblem({ ...ok, link: "https://evil.example" }));
assert.ok(campaignProblem({ ...ok, link: "//evil.example" }));
assert.ok(campaignProblem({ ...ok, audience: "kids" }));
assert.ok(campaignProblem({ ...ok, body: "<script>" }));
const t = { from: "draft" as const, to: "approved" as const, createdBy: "a", actorId: "b", approvedToday: 0 };
assert.equal(campaignTransitionProblem(t), null);
assert.ok(campaignTransitionProblem({ ...t, actorId: "a" }), "creator cannot approve");
assert.ok(campaignTransitionProblem({ ...t, approvedToday: 2 }), "daily limit");
assert.ok(campaignTransitionProblem({ ...t, from: "rejected" }), "terminal state");
assert.ok(campaignTransitionProblem({ ...t, from: "approved", to: "approved" }));
console.log("push-campaign-policy tests passed");
