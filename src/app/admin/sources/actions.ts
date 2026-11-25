"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { enforceAdminRateLimit } from "@/features/admin/services/rate-limit";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { sourceVerificationProblem, type VerifiableSource } from "@/features/editorial/source-verification";

function sourceError(message: string): never {
  redirect(`/admin/sources?error=${encodeURIComponent(message)}`);
}

export async function setSourceVerifiedAction(formData: FormData) {
  const admin = await requireAdminStepUp("sources.manage", "/admin/sources");
  await enforceAdminRateLimit(admin, "sources.verify", 30, 60);
  const id = String(formData.get("id") ?? "").trim();
  const verified = String(formData.get("verified") ?? "") === "true";
  if (!id) sourceError("معرّف المصدر مطلوب.");

  const rows = await supabaseServerAdminRequest<Array<VerifiableSource & { id: string; verified: boolean | null }>>(
    `/rest/v1/content_sources?select=id,url,license,attribution,authority_level,verified&id=eq.${encodeURIComponent(id)}&limit=1`,
    { method: "GET" },
  );
  const source = rows[0];
  if (!source) sourceError("المصدر غير موجود.");
  if (verified) {
    const problem = sourceVerificationProblem(source);
    if (problem) sourceError(problem);
  }
  if ((source.verified === true) === verified) sourceError("حالة التوثيق لم تتغير.");

  await supabaseServerAdminRequest(`/rest/v1/content_sources?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ verified, updated_at: new Date().toISOString() }),
  });

  await runPostCommitAudit(
    () =>
      recordAdminAuditEvent({
        action: verified ? "sources.verify" : "sources.unverify",
        permission: "sources.manage",
        resourceType: "content_sources",
        resourceId: id,
      }),
    (error) => console.error("[admin/sources] audit event failed after committed mutation:", error),
  );
  revalidatePath("/admin/sources");
}
