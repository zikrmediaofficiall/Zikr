import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync(new URL("../jobs/social-publishing.ts", import.meta.url), "utf8");
const rebalanceAt = worker.indexOf("await rebalanceDueVideoPublishBacklog()");
const claimAt = worker.indexOf("claimPendingSocialPublishItems(limit");
assert.ok(rebalanceAt >= 0 && claimAt > rebalanceAt, "Backlog must be scheduled before the publisher claims rows.");
assert.ok(worker.includes("content_type=like.*_video"));
assert.ok(worker.includes("status=in.(queued,partial,processing,published)"));
assert.ok(worker.includes("scheduled_at: nextScheduledAt"));
assert.ok(worker.includes('Prefer: "return=representation"'));
assert.ok(worker.includes("backlogScheduleBlocked: true"), "Worker must fail closed when backlog scheduling fails.");
console.log("Video publishing backlog contract tests passed.");
