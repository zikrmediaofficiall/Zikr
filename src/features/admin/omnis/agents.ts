/**
 * OMNIS P13: specialist agent registry and guardrails. Pure and side-effect
 * free. Agents only READ with their granted scopes and PROPOSE changes; a human
 * applies a proposal with their own permission. The feature is off unless
 * OMNIS_AGENTS_ENABLED=true.
 */
import type { AdminPermission } from "@/features/admin/services/permissions";

export type AgentKey = "system" | "code" | "data" | "security" | "content" | "production" | "growth";
export type AgentTool = "read_status" | "read_logs" | "read_table" | "read_repo" | "read_analytics" | "draft_proposal";

export type OmnisAgent = {
  key: AgentKey;
  label: string;
  /** Admin permission the human needs to use or approve this agent's work. */
  permission: AdminPermission;
  tools: readonly AgentTool[];
  /** Tables an agent may read. Never includes secrets, auth, or private user data. */
  readTables: readonly string[];
  dailyTokenBudget: number;
  maxProposalsPerDay: number;
};

export const OMNIS_AGENTS: readonly OmnisAgent[] = [
  { key: "system", label: "وكيل النظام", permission: "system.manage", tools: ["read_status", "read_logs", "draft_proposal"], readTables: ["admin_audit_events"], dailyTokenBudget: 50_000, maxProposalsPerDay: 10 },
  { key: "code", label: "وكيل الكود", permission: "release.manage", tools: ["read_repo", "read_status", "draft_proposal"], readTables: [], dailyTokenBudget: 100_000, maxProposalsPerDay: 5 },
  { key: "data", label: "وكيل البيانات", permission: "settings.manage", tools: ["read_table", "read_status", "draft_proposal"], readTables: ["content_library", "content_sources", "articles", "quran_reciters"], dailyTokenBudget: 60_000, maxProposalsPerDay: 10 },
  { key: "security", label: "وكيل الأمان", permission: "security.manage", tools: ["read_logs", "read_status", "draft_proposal"], readTables: ["admin_audit_events"], dailyTokenBudget: 40_000, maxProposalsPerDay: 10 },
  { key: "content", label: "وكيل المحتوى", permission: "content.manage", tools: ["read_table", "draft_proposal"], readTables: ["content_library", "content_sources", "articles"], dailyTokenBudget: 80_000, maxProposalsPerDay: 20 },
  { key: "production", label: "وكيل الإنتاج", permission: "video.manage", tools: ["read_status", "read_table", "draft_proposal"], readTables: ["video_generation_requests"], dailyTokenBudget: 60_000, maxProposalsPerDay: 10 },
  { key: "growth", label: "وكيل النمو", permission: "analytics.read", tools: ["read_analytics", "draft_proposal"], readTables: ["admin_page_views"], dailyTokenBudget: 40_000, maxProposalsPerDay: 10 },
];

/** Tables no agent may ever read, whatever its registry entry says. */
export const AGENT_FORBIDDEN_TABLES = ["profiles", "admin_users", "push_subscriptions", "kids_profiles", "auth.users", "vault.secrets"] as const;

export function isOmnisAgentsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.OMNIS_AGENTS_ENABLED === "true";
}

export function getAgent(key: string): OmnisAgent | undefined {
  return OMNIS_AGENTS.find((a) => a.key === key);
}

export type AgentUsage = { tokensToday: number; proposalsToday: number };
export type AgentCall = { agent: string; tool: AgentTool; table?: string; tokens?: number };
export type AgentDecision = { allowed: true } | { allowed: false; reason: "disabled" | "unknown_agent" | "tool_not_granted" | "table_not_granted" | "table_forbidden" | "budget_exceeded" | "proposal_limit" };

export function authorizeAgentCall(call: AgentCall, usage: AgentUsage, enabled: boolean): AgentDecision {
  if (!enabled) return { allowed: false, reason: "disabled" };
  const agent = getAgent(call.agent);
  if (!agent) return { allowed: false, reason: "unknown_agent" };
  if (!agent.tools.includes(call.tool)) return { allowed: false, reason: "tool_not_granted" };
  if (call.tool === "read_table") {
    const table = (call.table ?? "").toLowerCase();
    if ((AGENT_FORBIDDEN_TABLES as readonly string[]).includes(table)) return { allowed: false, reason: "table_forbidden" };
    if (!agent.readTables.includes(table)) return { allowed: false, reason: "table_not_granted" };
  }
  if (usage.tokensToday + Math.max(0, call.tokens ?? 0) > agent.dailyTokenBudget) return { allowed: false, reason: "budget_exceeded" };
  if (call.tool === "draft_proposal" && usage.proposalsToday >= agent.maxProposalsPerDay) return { allowed: false, reason: "proposal_limit" };
  return { allowed: true };
}

export type AgentProposal = { agent: string; title: string; target: string; diff: string; applied: boolean };

/** A proposal is reviewable only when it names a target and carries a diff; agents can never mark it applied. */
export function proposalProblem(p: AgentProposal): string | null {
  if (!getAgent(p.agent)) return "unknown agent";
  if (!p.title.trim() || !p.target.trim()) return "title and target are required";
  if (!p.diff.trim()) return "a reviewable diff is required";
  if (p.applied) return "agents cannot create already-applied proposals";
  return null;
}

/** Only a human with the agent's permission may approve; the proposer cannot approve its own work. */
export function canApproveProposal(input: { approverPermissions: readonly string[]; agent: string; approverIsAgent: boolean }): boolean {
  const agent = getAgent(input.agent);
  return Boolean(agent) && !input.approverIsAgent && input.approverPermissions.includes(agent!.permission);
}
