"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { requireAdminStepUp } from "@/features/admin/services/security";
import {
  getAndroidReleaseSigningPreflightStatus,
  prepareAndroidRelease,
  requestAndroidReleaseSigningPreflight,
} from "@/features/releases/services/github-release-manager";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";

type AdminAuditEvent = Parameters<typeof recordAdminAuditEvent>[0];

async function recordAdminAuditEventSafely(event: AdminAuditEvent): Promise<boolean> {
  return runPostCommitAudit(
    () => recordAdminAuditEvent(event),
    (error) => console.error("[admin/release] audit event failed after committed release preparation:", error),
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 300) : "تعذر تنفيذ عملية الإصدار.";
}

async function assertNoActiveReleaseOperation() {
  let rows: Array<{ value?: unknown }>;
  try {
    rows = await supabaseServerAdminRequest<Array<{ value?: unknown }>>(
      "/rest/v1/admin_settings?key=eq.android_release_operation&select=value&limit=1",
      { method: "GET" },
    );
  } catch {
    throw new Error("تعذر التحقق من حالة الإصدار الحالية من Supabase؛ لم يتم إنشاء أي commit أو tag.");
  }

  const value = rows?.[0]?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const state = value as { status?: string; startedAt?: string; tag?: string };
  if (state.status !== "signing" && state.status !== "building") return;
  const startedAt = Date.parse(state.startedAt ?? "");
  if (!Number.isFinite(startedAt)) {
    throw new Error("توجد عملية إصدار سابقة غير واضحة الحالة. راجع سجلها قبل بدء إصدار آخر.");
  }
  if (Date.now() - startedAt < 6 * 60 * 60 * 1000) {
    throw new Error("توجد عملية إصدار نشطة بالفعل: " + (state.tag ?? "Android") + ". انتظر نتيجتها قبل التكرار.");
  }
}

async function persistReleaseOperation(value: Record<string, unknown>) {
  try {
    await supabaseServerAdminRequest("/rest/v1/admin_settings?on_conflict=key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        key: "android_release_operation",
        value,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("[admin/release] could not persist release operation state:", error);
  }
}

/** Read-only protected-environment preflight. No release metadata is changed. */
export async function runAndroidReleaseSigningPreflightAction() {
  await requireAdminPermission("release.manage");
  await requireAdminStepUp("release.manage", "/admin/release");
  let result: { mainSha: string; workflowUrl: string };
  try {
    result = await requestAndroidReleaseSigningPreflight();
  } catch (error) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent(errorMessage(error)));
  }
  redirect(
    "/admin/release?android_signing_preflight=started&main_sha=" +
      encodeURIComponent(result.mainSha),
  );
}

export async function createAndroidReleaseAction() {
  await requireAdminPermission("release.manage");
  await requireAdminStepUp("release.manage", "/admin/release");
  await assertNoActiveReleaseOperation();

  let preflight;
  try {
    preflight = await getAndroidReleaseSigningPreflightStatus();
  } catch (error) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent(errorMessage(error)));
  }

  // First click triggers a no-mutation signing preflight. The next click can
  // create version metadata only after GPG readiness passed for exact main SHA.
  if (!preflight.ready) {
    let result: { mainSha: string; workflowUrl: string };
    try {
      result = await requestAndroidReleaseSigningPreflight();
    } catch (error) {
      redirect("/admin/release?android_release_error=" + encodeURIComponent(errorMessage(error)));
    }
    redirect(
      "/admin/release?android_signing_preflight=started&main_sha=" +
        encodeURIComponent(result.mainSha),
    );
  }

  let prepared;
  try {
    prepared = await prepareAndroidRelease();
  } catch (error) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent(errorMessage(error)));
  }

  const startedAt = new Date().toISOString();
  await persistReleaseOperation({
    status: "signing",
    tag: prepared.tag,
    version: prepared.version,
    versionCode: prepared.versionCode,
    commitSha: prepared.commitSha,
    releaseId: null,
    releaseUrl: prepared.releaseUrl,
    startedAt,
    startedBy: null,
    note: "تم تجهيز بيانات الإصدار على main وإرسال الـcommit نفسه إلى Runner التوقيع المحمي. لن يبدأ بناء Android حتى يؤكد GitHub صحة التوقيع.",
  });

  await recordAdminAuditEventSafely({
    action: "android.release.prepare",
    permission: "release.manage",
    resourceType: "android_release_operation",
    resourceId: prepared.tag,
    metadata: {
      tag: prepared.tag,
      version: prepared.version,
      versionCode: prepared.versionCode,
      commitSha: prepared.commitSha,
      signingWorkflow: prepared.releaseUrl,
    },
  });

  revalidatePath("/admin/release");
  redirect(
    "/admin/release?android_release_started=" +
      encodeURIComponent(prepared.tag) +
      "&commit_sha=" +
      encodeURIComponent(prepared.commitSha),
  );
}
