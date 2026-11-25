import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ADMIN_PERMISSIONS } from "../../src/features/admin/services/permissions";
import {
  AGENT_FORBIDDEN_TABLES, OMNIS_AGENTS, authorizeAgentCall, canApproveProposal, isOmnisAgentsEnabled, proposalProblem,
} from "../../src/features/admin/omnis/agents";

assert.equal(OMNIS_AGENTS.length, 7);
assert.equal(new Set(OMNIS_AGENTS.map((a) => a.key)).size, 7);
for (const a of OMNIS_AGENTS) {
  assert.ok(a.permission in ADMIN_PERMISSIONS, `${a.key}: permission must exist`);
  for (const t of a.readTables) assert.equal((AGENT_FORBIDDEN_TABLES as readonly string[]).includes(t), false, `${a.key} must not read ${t}`);
  assert.ok(a.dailyTokenBudget > 0 && a.maxProposalsPerDay > 0);
  assert.equal(a.tools.some((t) => (t as string).startsWith("write") || (t as string).startsWith("apply")), false, "agents have no write tools");
}
const none = { tokensToday: 0, proposalsToday: 0 };
assert.deepEqual(authorizeAgentCall({ agent: "data", tool: "read_status" }, none, false), { allowed: false, reason: "disabled" });
assert.equal(isOmnisAgentsEnabled({}), false, "off by default");
assert.equal(isOmnisAgentsEnabled({ OMNIS_AGENTS_ENABLED: "true" }), true);
assert.deepEqual(authorizeAgentCall({ agent: "nope", tool: "read_status" }, none, true), { allowed: false, reason: "unknown_agent" });
assert.deepEqual(authorizeAgentCall({ agent: "growth", tool: "read_table", table: "content_library" }, none, true), { allowed: false, reason: "tool_not_granted" });
assert.deepEqual(authorizeAgentCall({ agent: "data", tool: "read_table", table: "profiles" }, none, true), { allowed: false, reason: "table_forbidden" });
assert.deepEqual(authorizeAgentCall({ agent: "data", tool: "read_table", table: "video_generation_requests" }, none, true), { allowed: false, reason: "table_not_granted" });
assert.deepEqual(authorizeAgentCall({ agent: "data", tool: "read_table", table: "content_library", tokens: 100 }, none, true), { allowed: true });
assert.deepEqual(authorizeAgentCall({ agent: "data", tool: "read_status", tokens: 60_001 }, none, true), { allowed: false, reason: "budget_exceeded" });
assert.deepEqual(authorizeAgentCall({ agent: "data", tool: "draft_proposal" }, { tokensToday: 0, proposalsToday: 10 }, true), { allowed: false, reason: "proposal_limit" });

const good = { agent: "content", title: "Fix typo", target: "content_library:1", diff: "- a\n+ b", applied: false };
assert.equal(proposalProblem(good), null);
assert.ok(proposalProblem({ ...good, diff: " " }));
assert.ok(proposalProblem({ ...good, applied: true }), "agents cannot self-apply");
assert.ok(proposalProblem({ ...good, agent: "x" }));
assert.equal(canApproveProposal({ approverPermissions: ["content.manage"], agent: "content", approverIsAgent: false }), true);
assert.equal(canApproveProposal({ approverPermissions: ["content.manage"], agent: "content", approverIsAgent: true }), false);
assert.equal(canApproveProposal({ approverPermissions: ["analytics.read"], agent: "content", approverIsAgent: false }), false);

const sql = readFileSync("supabase/migrations/20261125190000_omnis_agents.sql", "utf8");
for (const t of ["omnis_agent_runs", "omnis_agent_proposals"]) assert.ok(sql.includes(`alter table public.${t} enable row level security`));
assert.equal(/create policy/i.test(sql), false);
console.log("OMNIS agent guardrail contracts passed.");
