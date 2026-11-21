"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { requireAdminStepUp } from "@/features/admin/services/security";
import {
  dispatchPreparedAndroidReleaseTagSigning,
  getAndroidReleaseSigningPreflightStatus,
  prepareAndroidRelease,
  recreateStuckAndroidRelease,
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
  if (state.status === "signing_dispatch_failed") {
    throw new Error("توجد عملية إصدار مجهزة لم يُرسل توقيعها بعد؛ استخدم زر إعادة المحاولة بدل بدء إصدار جديد.");
  }
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

  let preflight: Awaited<ReturnType<typeof getAndroidReleaseSigningPreflightStatus>>;
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

  let prepared: Awaited<ReturnType<typeof prepareAndroidRelease>>;
  try {
    prepared = await prepareAndroidRelease();
  } catch (error) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent(errorMessage(error)));
  }

  const startedAt = new Date().toISOString();
  let signingDispatchError: string | null = null;
  try {
    await dispatchPreparedAndroidReleaseTagSigning(prepared.tag, prepared.commitSha);
  } catch (error) {
    signingDispatchError = errorMessage(error);
  }

  await persistReleaseOperation({
    status: signingDispatchError ? "signing_dispatch_failed" : "signing",
    tag: prepared.tag,
    version: prepared.version,
    versionCode: prepared.versionCode,
    commitSha: prepared.commitSha,
    releaseId: null,
    releaseUrl: prepared.releaseUrl,
    startedAt,
    startedBy: null,
    signingDispatchError,
    note: signingDispatchError
      ? "تم إنشاء commit الإصدار لكن تعذر إرسال عملية التوقيع. أعد إرسال نفس tag ونفس commit من زر إعادة المحاولة."
      : "تم تجهيز بيانات الإصدار على main وإرسال الـcommit نفسه إلى Runner التوقيع المحمي. لن يبدأ بناء Android حتى يؤكد GitHub صحة التوقيع.",
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
  if (signingDispatchError) {
    redirect(
      "/admin/release?android_release_error=" +
        encodeURIComponent("تم تجهيز الإصدار، لكن تعذر إرسال طلب التوقيع: " + signingDispatchError),
    );
  }
  redirect(
    "/admin/release?android_release_started=" +
      encodeURIComponent(prepared.tag) +
      "&commit_sha=" +
      encodeURIComponent(prepared.commitSha),
  );
}

export async function retryAndroidReleaseSigningAction() {
  await requireAdminPermission("release.manage");
  await requireAdminStepUp("release.manage", "/admin/release");

  let rows: Array<{ value?: unknown }>;
  try {
    rows = await supabaseServerAdminRequest<Array<{ value?: unknown }>>(
      "/rest/v1/admin_settings?key=eq.android_release_operation&select=value&limit=1",
      { method: "GET" },
    );
  } catch {
    redirect("/admin/release?android_release_error=" + encodeURIComponent("تعذر قراءة عملية الإصدار من Supabase."));
  }

  const value = rows?.[0]?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent("لا توجد عملية إصدار قابلة لإعادة الإرسال."));
  }
  const operation = value as {
    status?: string; tag?: string; commitSha?: string; version?: string; versionCode?: number;
  };
  if (operation.status !== "signing_dispatch_failed" || !operation.tag || !operation.commitSha) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent("لا توجد عملية توقيع فاشلة قابلة لإعادة المحاولة."));
  }

  try {
    await dispatchPreparedAndroidReleaseTagSigning(operation.tag, operation.commitSha);
  } catch (error) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent(errorMessage(error)));
  }

  const retriedAt = new Date().toISOString();
  await persistReleaseOperation({
    ...operation,
    status: "signing",
    startedAt: retriedAt,
    signingDispatchError: null,
    note: "أُعيد إرسال نفس tag ونفس commit إلى Runner التوقيع المحمي. لن يُنشأ إصدار أو commit جديد.",
  });

  await recordAdminAuditEventSafely({
    action: "android.release.signing.retry",
    permission: "release.manage",
    resourceType: "android_release_operation",
    resourceId: operation.tag,
    metadata: { tag: operation.tag, commitSha: operation.commitSha, retry: true },
  });

  revalidatePath("/admin/release");
  redirect(
    "/admin/release?android_release_started=" +
      encodeURIComponent(operation.tag) +
      "&commit_sha=" +
      encodeURIComponent(operation.commitSha),
  );
}


/**
 * Delete only the unpublished draft/tag belonging to a stale recorded release,
 * then recreate the same signed tag and retry the existing release pipeline.
 */
export async function recreateStuckAndroidReleaseAction(formData: FormData) {
  await requireAdminPermission("release.manage");
  await requireAdminStepUp("release.manage", "/admin/release");

  if (formData.get("confirmCleanup") !== "yes") {
    redirect("/admin/release?android_release_error=" + encodeURIComponent("أكد اختيارك قبل حذف مسودة الإصدار والوسم العالقين."));
  }

  let rows: Array<{ value?: unknown }>;
  try {
    rows = await supabaseServerAdminRequest<Array<{ value?: unknown }>>(
      "/rest/v1/admin_settings?key=eq.android_release_operation&select=value&limit=1",
      { method: "GET" },
    );
  } catch {
    redirect("/admin/release?android_release_error=" + encodeURIComponent("تعذر قراءة عملية الإصدار من Supabase؛ لم يتم حذف أي شيء."));
  }

  const value = rows?.[0]?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent("لا توجد عملية إصدار مسجلة قابلة للاسترداد."));
  }

  const operation = value as {
    status?: string;
    tag?: string;
    commitSha?: string;
    startedAt?: string;
    [key: string]: unknown;
  };
  const startedAt = Date.parse(operation.startedAt ?? "");
  const isKnownDispatchFailure = operation.status === "signing_dispatch_failed";
  const isStaleOperation =
    (operation.status === "signing" || operation.status === "building") &&
    (!Number.isFinite(startedAt) || Date.now() - startedAt >= 6 * 60 * 60 * 1000);

  if (!isKnownDispatchFailure && !isStaleOperation) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent("لا يمكن حذف الإصدار أثناء وجود عملية حديثة أو غير معروفة الحالة. انتظر انتهاء مهلة الست ساعات أو راجع سجل العملية."));
  }
  if (!operation.tag || !operation.commitSha) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent("بيانات Tag أو commit غير مكتملة؛ لم يتم حذف أي شيء."));
  }

  let recovery: Awaited<ReturnType<typeof recreateStuckAndroidRelease>>;
  try {
    recovery = await recreateStuckAndroidRelease(operation.tag, operation.commitSha);
  } catch (error) {
    redirect("/admin/release?android_release_error=" + encodeURIComponent(errorMessage(error)));
  }

  const retriedAt = new Date().toISOString();
  await persistReleaseOperation({
    ...operation,
    status: recovery.dispatchError ? "signing_dispatch_failed" : "signing",
    tag: recovery.tag,
    commitSha: recovery.commitSha,
    releaseId: null,
    releaseUrl: recovery.workflowUrl,
    startedAt: retriedAt,
    signingDispatchError: recovery.dispatchError,
    note: recovery.dispatchError
      ? "تم تنظيف مسودة الإصدار والوسم العالقين، لكن فشل إرسال مهمة التوقيع. أعد المحاولة مرة أخرى لنفس الوسم والـcommit."
      : "تم تنظيف Draft Release والـTag العالقين، وإعادة إنشاء نفس الوسم الموقّع وإرسال الإصدار إلى مسار بناء Android من نفس commit.",
  });

  await recordAdminAuditEventSafely({
    action: "android.release.recreate.retry",
    permission: "release.manage",
    resourceType: "android_release_operation",
    resourceId: recovery.tag,
    metadata: {
      tag: recovery.tag,
      commitSha: recovery.commitSha,
      deletedDraftRelease: recovery.deletedRelease,
      deletedTag: recovery.deletedTag,
      dispatchError: recovery.dispatchError,
      retry: true,
    },
  });

  revalidatePath("/admin/release");
  if (recovery.dispatchError) {
    redirect(
      "/admin/release?android_release_error=" +
        encodeURIComponent("تم تنظيف الإصدار العالق، لكن تعذر إعادة تشغيل التوقيع: " + recovery.dispatchError),
    );
  }
  redirect(
    "/admin/release?android_release_recreated=" +
      encodeURIComponent(recovery.tag) +
      "&commit_sha=" +
      encodeURIComponent(recovery.commitSha),
  );
}
