import "server-only";

import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { campaignProblem, campaignTransitionProblem, type CampaignInput, type CampaignStatus } from "./push-campaign-policy";

export type PushCampaign = { id: string; title: string; body: string; link: string | null; audience: string; status: CampaignStatus; created_by: string; approved_by: string | null; approved_at: string | null; created_at: string };

const rest = <T>(path: string, init?: Parameters<typeof supabaseServerAdminRequest>[1]) => supabaseServerAdminRequest<T>(`/rest/v1/${path}`, init ?? { method: "GET" });
const enc = encodeURIComponent;

export const listCampaigns = () => rest<PushCampaign[]>("omnis_push_campaigns?select=id,title,body,link,audience,status,created_by,approved_by,approved_at,created_at&order=created_at.desc&limit=50");

/** Read-only audience sizing from active subscriptions, grouped by platform. Nothing is sent. */
export async function audienceSizes(): Promise<{ total: number; byPlatform: Record<string, number> }> {
  const rows = await rest<Array<{ platform: string | null }>>("push_subscriptions?select=platform&is_active=is.true&limit=5000");
  const byPlatform: Record<string, number> = {};
  for (const row of rows) byPlatform[row.platform ?? "unknown"] = (byPlatform[row.platform ?? "unknown"] ?? 0) + 1;
  return { total: rows.length, byPlatform };
}

export async function createCampaign(input: CampaignInput, actorId: string): Promise<{ ok: boolean; reason?: string }> {
  const problem = campaignProblem(input);
  if (problem) return { ok: false, reason: problem };
  await rest("omnis_push_campaigns", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ title: input.title.trim(), body: input.body.trim(), link: input.link.trim() || null, audience: input.audience, created_by: actorId }),
  });
  return { ok: true };
}

export async function transitionCampaign(id: string, to: CampaignStatus, actorId: string): Promise<{ ok: boolean; reason?: string }> {
  const rows = await rest<Array<{ id: string; status: CampaignStatus; created_by: string }>>(`omnis_push_campaigns?select=id,status,created_by&id=eq.${enc(id)}&limit=1`);
  const row = rows[0];
  if (!row) return { ok: false, reason: "الحملة غير موجودة." };
  const since = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
  const today = await rest<Array<{ id: string }>>(`omnis_push_campaigns?select=id&status=eq.approved&approved_at=gte.${enc(since)}&limit=50`);
  const problem = campaignTransitionProblem({ from: row.status, to, createdBy: row.created_by, actorId, approvedToday: today.length });
  if (problem) return { ok: false, reason: problem };
  const updated = await rest<Array<{ id: string }>>(`omnis_push_campaigns?id=eq.${enc(id)}&status=eq.${row.status}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(to === "approved" ? { status: to, approved_by: actorId, approved_at: new Date().toISOString() } : { status: to }),
  });
  return updated.length ? { ok: true } : { ok: false, reason: "تغيّرت الحملة أثناء المعالجة." };
}
