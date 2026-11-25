/**
 * OMNIS P05-03: rules for push broadcast campaigns. Pure. A campaign needs a second admin's approval
 * and respects length, link, audience and daily-limit rules. Nothing here sends anything.
 */
export type CampaignAudience = "all" | "android" | "web";
export type CampaignStatus = "draft" | "approved" | "rejected" | "cancelled";
export type CampaignInput = { title: string; body: string; link: string; audience: string };

export const CAMPAIGN_LIMITS = { title: 80, body: 240, approvedPerDay: 2 } as const;
const AUDIENCES: readonly string[] = ["all", "android", "web"];

export function campaignProblem(input: CampaignInput): string | null {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || title.length > CAMPAIGN_LIMITS.title) return "عنوان الإشعار مطلوب (حتى 80 حرفًا).";
  if (!body || body.length > CAMPAIGN_LIMITS.body) return "نص الإشعار مطلوب (حتى 240 حرفًا).";
  if (!AUDIENCES.includes(input.audience)) return "الجمهور غير صالح.";
  const link = input.link.trim();
  if (link && (!/^\/[A-Za-z0-9/_\-?=&%.]{0,200}$/.test(link) || link.startsWith("//"))) return "الرابط يجب أن يكون مسارًا داخليًا يبدأ بـ /.";
  if (/[<>]/.test(title + body)) return "لا يسمح بوسوم HTML في الإشعار.";
  return null;
}

const NEXT: Record<CampaignStatus, readonly CampaignStatus[]> = { draft: ["approved", "rejected", "cancelled"], approved: ["cancelled"], rejected: [], cancelled: [] };

export function campaignTransitionProblem(input: { from: CampaignStatus; to: CampaignStatus; createdBy: string; actorId: string; approvedToday: number }): string | null {
  if (!NEXT[input.from].includes(input.to)) return "انتقال حالة غير مسموح.";
  if (input.to === "approved") {
    if (input.actorId === input.createdBy) return "يجب أن يعتمد الحملة مشرف آخر غير منشئها.";
    if (input.approvedToday >= CAMPAIGN_LIMITS.approvedPerDay) return "بلغت الحد اليومي للحملات المعتمدة.";
  }
  return null;
}
