import "server-only";

import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { authorizeAgentCall, getAgent, isOmnisAgentsEnabled, proposalProblem, type AgentTool } from "./agents";

export type StoredProposal = { id: string; agent_key: string; title: string; target: string; diff: string; status: "pending" | "approved" | "rejected" | "applied"; reviewed_by: string | null; reviewed_at: string | null; created_at: string };

const rest = <T>(path: string, init?: Parameters<typeof supabaseServerAdminRequest>[1]) => supabaseServerAdminRequest<T>(`/rest/v1/${path}`, init ?? { method: "GET" });
const enc = encodeURIComponent;

export async function listProposals(limit = 60): Promise<StoredProposal[]> {
  return rest<StoredProposal[]>(`omnis_agent_proposals?select=id,agent_key,title,target,diff,status,reviewed_by,reviewed_at,created_at&order=created_at.desc&limit=${limit}`);
}

async function usageToday(agent: string) {
  const since = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
  const runs = await rest<Array<{ tokens: number }>>(`omnis_agent_runs?select=tokens&agent_key=eq.${enc(agent)}&allowed=is.true&created_at=gte.${enc(since)}&limit=1000`);
  const proposals = await rest<Array<{ id: string }>>(`omnis_agent_proposals?select=id&agent_key=eq.${enc(agent)}&created_at=gte.${enc(since)}&limit=1000`);
  return { tokensToday: runs.reduce((sum, r) => sum + (r.tokens ?? 0), 0), proposalsToday: proposals.length };
}

/** Intake for an agent's draft: authorized against the agent's scopes and budgets, logged, and stored as pending only. */
export async function submitAgentProposal(input: { agent: string; title: string; target: string; diff: string; tokens?: number }): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const problem = proposalProblem({ agent: input.agent, title: input.title, target: input.target, diff: input.diff, applied: false });
  if (problem) return { ok: false, reason: problem };
  const call = { agent: input.agent, tool: "draft_proposal" as AgentTool, tokens: input.tokens ?? 0 };
  const decision = authorizeAgentCall(call, await usageToday(input.agent), isOmnisAgentsEnabled());
  await rest("omnis_agent_runs", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ agent_key: input.agent, tool: call.tool, tokens: call.tokens, allowed: decision.allowed, deny_reason: decision.allowed ? null : decision.reason }),
  });
  if (!decision.allowed) return { ok: false, reason: decision.reason };
  const created = await rest<Array<{ id: string }>>("omnis_agent_proposals", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ agent_key: input.agent, title: input.title.slice(0, 200), target: input.target.slice(0, 200), diff: input.diff.slice(0, 20000) }),
  });
  return { ok: true, id: created[0]?.id ?? "" };
}

const NEXT: Record<string, readonly string[]> = { approved: ["pending"], rejected: ["pending"], applied: ["approved"] };

/** Human review step. Only legal transitions; applied can only follow approved, and "applied" is the human's statement that they applied it. */
export async function reviewProposal(id: string, to: "approved" | "rejected" | "applied", reviewerId: string): Promise<{ ok: boolean; reason?: string }> {
  const rows = await rest<StoredProposal[]>(`omnis_agent_proposals?select=id,agent_key,status&id=eq.${enc(id)}&limit=1`);
  const row = rows[0];
  if (!row) return { ok: false, reason: "not_found" };
  if (!getAgent(row.agent_key)) return { ok: false, reason: "unknown_agent" };
  if (!NEXT[to].includes(row.status)) return { ok: false, reason: "illegal_transition" };
  const updated = await rest<Array<{ id: string }>>(`omnis_agent_proposals?id=eq.${enc(id)}&status=eq.${row.status}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: to, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() }),
  });
  return updated.length ? { ok: true } : { ok: false, reason: "changed_concurrently" };
}
