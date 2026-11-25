"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { enforceAdminRateLimit } from "@/features/admin/services/rate-limit";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { MANUAL_REVENUE_KEY, parseManualRevenue } from "@/features/admin/omnis/growth-report";

const BASE = "/admin/omnis/growth";
const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (kind: "ok" | "error", message: string): never => redirect(`${BASE}?${kind}=${encodeURIComponent(message)}`);

export async function saveRevenueMonthAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.growth.revenue", 20, 60);
  const month = field(formData, "month");
  const currency = field(formData, "currency").toUpperCase() || "USD";
  const parse = (k: string) => { const t = field(formData, k); return t === "" ? null : Number(t); };
  const entry = { actual: parse("actual"), estimated: parse("estimated"), currency };
  const candidate = parseManualRevenue({ months: { [month]: entry } });
  if (!candidate.length) back("error", "بيانات غير صالحة: شهر بصيغة YYYY-MM وقيمة رقمية موجبة واحدة على الأقل وعملة من 3 حروف.");
  const rows = await supabaseServerAdminRequest<Array<{ value?: unknown }>>(`/rest/v1/site_settings?key=eq.${MANUAL_REVENUE_KEY}&select=value&limit=1`, { method: "GET" });
  const months: Record<string, unknown> = {};
  for (const r of parseManualRevenue(rows?.[0]?.value)) months[r.month] = { actual: r.actual, estimated: r.estimated, currency: r.currency };
  months[candidate[0].month] = { actual: candidate[0].actual, estimated: candidate[0].estimated, currency: candidate[0].currency };
  await supabaseServerAdminRequest("/rest/v1/site_settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal", "Content-Type": "application/json" },
    body: JSON.stringify({ key: MANUAL_REVENUE_KEY, value: { months }, updated_at: new Date().toISOString() }),
  });
  runPostCommitAudit(() => recordAdminAuditEvent({ action: "omnis.growth.revenue.save", permission: "system.manage", resourceType: "site_settings", resourceId: MANUAL_REVENUE_KEY, metadata: { month } }), (e) => console.error("[omnis/growth] audit failed:", e));
  revalidatePath(BASE);
  back("ok", "حُفظ إيراد الشهر (مُدخل يدويًا).");
}
