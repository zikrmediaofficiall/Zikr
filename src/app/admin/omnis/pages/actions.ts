"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { enforceAdminRateLimit } from "@/features/admin/services/rate-limit";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import {
  PAGE_LIMITS,
  nextVersion,
  parseBlocksText,
  publishProblem,
  slugProblem,
  validateBlocks,
} from "@/features/site-content/pages/page-blocks";

const BASE = "/admin/omnis/pages";
const field = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const fail = (message: string, id?: string): never =>
  redirect(`${BASE}?${id ? `id=${encodeURIComponent(id)}&` : ""}error=${encodeURIComponent(message)}`);
const done = (message: string, id: string): never =>
  redirect(`${BASE}?id=${encodeURIComponent(id)}&ok=${encodeURIComponent(message)}`);

async function audit(event: Parameters<typeof recordAdminAuditEvent>[0]) {
  await runPostCommitAudit(
    () => recordAdminAuditEvent(event),
    (error) => console.error("[admin/omnis/pages] audit event failed after committed mutation:", error),
  );
}

async function versionsOf(pageId: string) {
  return supabaseServerAdminRequest<Array<{ version: number }>>(
    `/rest/v1/omnis_custom_page_versions?select=version&page_id=eq.${encodeURIComponent(pageId)}&order=version.desc&limit=200`,
    { method: "GET" },
  );
}

async function appendVersion(pageId: string, content: string, actorId: string): Promise<number> {
  const checked = validateBlocks(parseBlocksText(content));
  if (!checked.ok) fail("محتوى الصفحة غير صالح: " + checked.errors.slice(0, 3).join(" | "), pageId);
  const blocks = checked.ok ? checked.blocks : [];
  const version = nextVersion(await versionsOf(pageId));
  await supabaseServerAdminRequest("/rest/v1/omnis_custom_page_versions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ page_id: pageId, version, blocks, created_by: actorId }),
  });
  return version;
}

export async function createCustomPageAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.pages.create", 20, 60);
  const slug = field(formData, "slug").toLowerCase();
  const title = field(formData, "title");
  const problem = slugProblem(slug);
  if (problem) fail(problem);
  if (!title || title.length > PAGE_LIMITS.title) fail("عنوان الصفحة مطلوب (حتى 120 حرفًا).");
  const existing = await supabaseServerAdminRequest<Array<{ id: string }>>(
    `/rest/v1/omnis_custom_pages?select=id&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { method: "GET" },
  );
  if (existing.length) fail("الرابط المختصر مستخدم بالفعل.");
  const created = await supabaseServerAdminRequest<Array<{ id: string }>>("/rest/v1/omnis_custom_pages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ slug, title, created_by: admin.id }),
  });
  const id = created[0]?.id;
  if (!id) fail("تعذر إنشاء الصفحة.");
  const version = await appendVersion(id, field(formData, "content"), admin.id);
  await audit({ action: "omnis.page.create", permission: "system.manage", resourceType: "omnis_custom_page", resourceId: id, metadata: { slug, version } });
  revalidatePath(BASE);
  done("أُنشئت الصفحة كمسودة.", id);
}

export async function saveCustomPageVersionAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.pages.save", 60, 60);
  const id = field(formData, "id");
  if (!id) fail("معرّف الصفحة مطلوب.");
  const version = await appendVersion(id, field(formData, "content"), admin.id);
  await supabaseServerAdminRequest(`/rest/v1/omnis_custom_pages?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  });
  await audit({ action: "omnis.page.version.save", permission: "system.manage", resourceType: "omnis_custom_page", resourceId: id, metadata: { version } });
  revalidatePath(BASE);
  done(`حُفظت النسخة ${version}. لم تُنشر بعد.`, id);
}

export async function publishCustomPageVersionAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.pages.publish", 20, 60);
  const id = field(formData, "id");
  const version = Number(field(formData, "version"));
  if (!id || !Number.isInteger(version)) fail("بيانات النشر غير صالحة.", id || undefined);
  const problem = publishProblem(await versionsOf(id), version);
  if (problem) fail(problem, id);
  const rows = await supabaseServerAdminRequest<Array<{ id: string; slug: string; published_version: number | null }>>(
    `/rest/v1/omnis_custom_pages?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ published_version: version, updated_at: new Date().toISOString() }),
    },
  );
  if (!rows[0]) fail("الصفحة غير موجودة.", id);
  await audit({ action: "omnis.page.publish", permission: "system.manage", resourceType: "omnis_custom_page", resourceId: id, metadata: { version, slug: rows[0].slug } });
  revalidatePath(BASE);
  revalidatePath(`/p/${rows[0].slug}`);
  done(`نُشرت النسخة ${version}.`, id);
}

export async function unpublishCustomPageAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.pages.unpublish", 20, 60);
  const id = field(formData, "id");
  if (!id) fail("معرّف الصفحة مطلوب.");
  const rows = await supabaseServerAdminRequest<Array<{ slug: string }>>(
    `/rest/v1/omnis_custom_pages?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ published_version: null, updated_at: new Date().toISOString() }),
    },
  );
  if (!rows[0]) fail("الصفحة غير موجودة.", id);
  await audit({ action: "omnis.page.unpublish", permission: "system.manage", resourceType: "omnis_custom_page", resourceId: id, metadata: { slug: rows[0].slug } });
  revalidatePath(BASE);
  revalidatePath(`/p/${rows[0].slug}`);
  done("أُلغي نشر الصفحة.", id);
}
