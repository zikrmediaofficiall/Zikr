"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { dispatchGitHubWorkflow } from "@/lib/github/dispatch-workflow";
import { buildRunNowRequestValueFilter } from "@/features/videos/services/background-job-outcome";
import { isVideoAutomationEnabled, isVideoPurgeLockResponseActive } from "@/features/videos/services/background-job-settings";
import { getEditableAdminSettingDefinition, validateAdminSettingValue } from "@/features/admin/config/settings-registry";

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}


type AdminAuditEvent = Parameters<typeof recordAdminAuditEvent>[0];
async function recordAdminAuditEventSafely(event: AdminAuditEvent): Promise<boolean> {
  return runPostCommitAudit(
    () => recordAdminAuditEvent(event),
    (error) => console.error("[admin/system] audit event failed after committed mutation:", error),
  );
}

export async function saveAdminSettingAction(formData: FormData) {
  const key = formValue(formData, "key");
  if (!key) throw new Error("مفتاح الإعداد مطلوب.");
  const definition = getEditableAdminSettingDefinition(key);
  if (!definition || definition.category === "video") {
    throw new Error("إعداد الإدارة غير معروف أو غير مسموح به في هذا النموذج.");
  }

  const profile = definition.stepUpPolicy === "always"
    ? await requireAdminStepUp(definition.permission, "/admin/settings", true)
    : definition.stepUpPolicy === "policy"
      ? await requireAdminStepUp(definition.permission, "/admin/settings")
      : await requireAdminPermission(definition.permission);
  const rawValue = formData.getAll("value").map((value) => String(value).trim()).at(-1) ?? "";
  const validation = validateAdminSettingValue(key, rawValue);
  if (!validation.ok) throw new Error(validation.error);
  const value = validation.value;

  await supabaseServerAdminRequest("/rest/v1/admin_settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key, value, updated_by: profile.id, updated_at: new Date().toISOString() }),
  });

  await recordAdminAuditEventSafely({
    action: "admin.settings.update",
    permission: definition.permission,
    resourceType: "admin_settings",
    resourceId: key,
    metadata: { value },
  });

  for (const path of definition.revalidatePaths) revalidatePath(path);
}

export async function saveVideoAutomationSettingAction(formData: FormData) {
  const key = formValue(formData, "key");
  const definition = getEditableAdminSettingDefinition(key);
  if (!definition || definition.category !== "video") {
    throw new Error("إعداد أتمتة الفيديو غير معروف أو غير قابل للتحرير.");
  }
  const profile = await requireAdminStepUp(definition.permission, "/admin/automation", true);

  if (key === "video_automation_enabled") {
    const purgeRows = await supabaseServerAdminRequest<Array<{ value: unknown }>>(
      "/rest/v1/admin_settings?key=eq.video_purge_in_progress&select=value&limit=1",
    );
    if (isVideoPurgeLockResponseActive(purgeRows)) {
      throw new Error("لا يمكن تغيير تشغيل أتمتة الفيديو أثناء تنظيف ملفات التوليد.");
    }
  }

  const rawValue = formData.getAll("value").map((value) => String(value).trim()).at(-1) ?? "";
  const validation = validateAdminSettingValue(key, rawValue);
  if (!validation.ok) throw new Error(validation.error);
  const value = validation.value;

  await supabaseServerAdminRequest("/rest/v1/admin_settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      key,
      value,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }),
  });

  await recordAdminAuditEventSafely({
    action: "admin.video_automation.setting_update",
    permission: definition.permission,
    resourceType: "admin_settings",
    resourceId: key,
    metadata: { value },
  });

  for (const path of definition.revalidatePaths) revalidatePath(path);
}

export async function requestVideoAutomationRunAction() {
  const profile = await requireAdminStepUp("system.manage", "/admin/automation");
  const batchRows = await supabaseServerAdminRequest<Array<{ value: unknown }>>(
    "/rest/v1/admin_settings?key=eq.video_automation_batch_size&select=value&limit=1",
  ).catch(() => []);
  const rawBatch = Number(batchRows?.[0]?.value ?? 3);
  const batchSize = Number.isInteger(rawBatch) ? Math.min(10, Math.max(1, rawBatch)) : 3;
  const enabledRows = await supabaseServerAdminRequest<Array<{ value: unknown }>>(
    "/rest/v1/admin_settings?key=eq.video_automation_enabled&select=value&limit=1",
  );
  const configuredEnabled = enabledRows?.[0]?.value;
  if (!isVideoAutomationEnabled(configuredEnabled)) {
    throw new Error("أتمتة الفيديو متوقفة. فعّل «التشغيل التلقائي» أولاً ثم أعد طلب التشغيل.");
  }
  const key = "video_automation_run_now";
  const requestedAt = new Date().toISOString();
  const request = { requestId: randomUUID(), requestedAt, requestedBy: profile.id, dispatchedAt: null as string | null, failedAt: null as string | null, error: null as string | null };
  const requestFilter = buildRunNowRequestValueFilter(request);
  if (!requestFilter) throw new Error("تعذر إنشاء شرط آمن لطلب التشغيل الفوري.");

  try {
    await supabaseServerAdminRequest("/rest/v1/admin_settings?on_conflict=key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key, value: request, updated_by: profile.id, updated_at: requestedAt }),
    });

    await dispatchGitHubWorkflow("generate-ai-video.yml", {
      batch_size: String(batchSize),
      urgent: "true",
    });

    const dispatchedAt = new Date().toISOString();
    await supabaseServerAdminRequest("/rest/v1/admin_settings?" + requestFilter, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ value: { ...request, dispatchedAt }, updated_at: dispatchedAt }),
    });

    await recordAdminAuditEventSafely({
      action: "admin.video_automation.run_requested",
      permission: "system.manage",
      resourceType: "admin_settings",
      resourceId: key,
      metadata: { requestedAt, batchSize, priority: "urgent", dispatchedDirectly: true },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "GitHub workflow dispatch token is not configured.") {
      // Keep the request in the same database queue consumed by the scheduled
      // worker instead of falsely marking it failed when Vercel has no dispatch PAT.
      const queuedAt = new Date().toISOString();
      const queuedRequest = {
        ...request,
        dispatchPending: true,
        queuedForScheduledWorker: true,
        fallbackMessage: "تم حفظ الطلب. سيعالجه عامل الفيديو عند دورة GitHub Actions المجدولة التالية؛ التشغيل الفوري يحتاج ضبط GITHUB_DISPATCH_TOKEN في Vercel.",
      };
      await supabaseServerAdminRequest("/rest/v1/admin_settings?" + requestFilter, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ value: queuedRequest, updated_at: queuedAt }),
      });
      await recordAdminAuditEventSafely({
        action: "admin.video_automation.run_requested_queued",
        permission: "system.manage",
        resourceType: "admin_settings",
        resourceId: key,
        metadata: { requestedAt, batchSize, directDispatch: false, fallback: "scheduled-worker" },
      });
      revalidatePath("/admin/automation");
      return;
    }

    const failedAt = new Date().toISOString();
    await supabaseServerAdminRequest("/rest/v1/admin_settings?" + requestFilter, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ value: { ...request, failedAt, error: message.slice(0, 500) }, updated_at: failedAt }),
    }).catch(() => {});
    await recordAdminAuditEventSafely({
      action: "admin.video_automation.run_requested_failed",
      permission: "system.manage",
      resourceType: "admin_settings",
      resourceId: key,
      outcome: "failed",
      metadata: { requestedAt, batchSize, error: message.slice(0, 500) },
    }).catch(() => {});
    throw error;
  }

  revalidatePath("/admin/automation");
}

export async function createAdminNotificationAction(formData: FormData) {
  const profile = await requireAdminStepUp("notifications.manage", "/admin/notifications");
  const title = formValue(formData, "title");
  const body = formValue(formData, "body");
  const link = formValue(formData, "link") || null;
  const type = formValue(formData, "type") || "admin";
  if (!title || !body) throw new Error("العنوان والنص مطلوبان.");

  await supabaseServerAdminRequest("/rest/v1/notifications", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: null,
      title,
      body,
      type,
      read: false,
      metadata: link ? { link } : {},
    }),
  });

  await recordAdminAuditEventSafely({
    action: "admin.notification.create",
    permission: "notifications.manage",
    resourceType: "notifications",
    metadata: { actor: profile.id, type, link },
  });

  revalidatePath("/admin/notifications");
}

export async function markAdminNotificationsReadAction() {
  await requireAdminPermission("notifications.manage");
  await supabaseServerAdminRequest("/rest/v1/notifications?user_id=is.null&read=eq.false", {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ read: true }),
  });
  await recordAdminAuditEventSafely({
    action: "admin.notification.mark_all_read",
    permission: "notifications.manage",
    resourceType: "notifications",
  });
  revalidatePath("/admin/notifications");
}


export async function saveCustomVideoSpacesAction(formData: FormData) {
  const profile = await requireAdminStepUp("system.manage", "/admin/video/visuals");
  const entries: Array<{ space: string; variant: "wan2_2_fast" | "ltx_fast"; enabled: true }> = [];
  const seen = new Set<string>();

  for (let index = 1; index <= 5; index += 1) {
    const enabled = formData.get("enabled_" + index) === "true";
    const space = String(formData.get("space_" + index) ?? "").trim();
    const variant = String(formData.get("variant_" + index) ?? "wan2_2_fast").trim();
    if (!enabled) continue;
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(space)) {
      throw new Error("معرّف Hugging Face Space يجب أن يكون بالشكل owner/space.");
    }
    if (variant !== "wan2_2_fast" && variant !== "ltx_fast") {
      throw new Error("نوع محول الفيديو غير مدعوم.");
    }
    if (seen.has(space.toLowerCase())) {
      throw new Error("لا يمكن إضافة Space نفسها أكثر من مرة.");
    }
    seen.add(space.toLowerCase());
    entries.push({ space, variant, enabled: true });
  }

  await supabaseServerAdminRequest("/rest/v1/admin_settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      key: "video_custom_spaces",
      value: entries,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    }),
  });

  await recordAdminAuditEventSafely({
    action: "admin.video_custom_spaces.update",
    permission: "system.manage",
    resourceType: "admin_settings",
    resourceId: "video_custom_spaces",
    metadata: {
      enabledCount: entries.length,
      providers: entries.map(({ space, variant }) => ({ space, variant })),
    },
  });

  revalidatePath("/admin/video/visuals");
}
