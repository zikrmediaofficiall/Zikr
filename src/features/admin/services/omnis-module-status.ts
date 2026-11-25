import "server-only";

import { getAdminHealth } from "@/features/admin/services/platform";
import { OMNIS_CENTERS } from "@/features/admin/omnis/registry";
import {
  buildOmnisModuleStatuses,
  type OmnisDependencyObservation,
  type OmnisOperationalState,
} from "@/features/admin/omnis/module-status";
import {
  OMNIS_DEPENDENCY_DEFINITIONS,
  OMNIS_MODULE_DEPENDENCIES,
} from "@/features/admin/omnis/module-dependencies";

export type OmnisModuleStatusSnapshot = {
  available: boolean;
  checkedAt: string;
  modules: ReturnType<typeof buildOmnisModuleStatuses>;
  counts: Record<OmnisOperationalState, number>;
  error: string | null;
};

function githubCommitState(state: string | null): OmnisOperationalState {
  switch (state) {
    case "success":
      return "healthy";
    case "failure":
    case "error":
    case "pending":
      return "degraded";
    default:
      return "unknown";
  }
}

function githubWorkflowState(
  workflows: Awaited<ReturnType<typeof getAdminHealth>>["github"]["workflows"],
): OmnisOperationalState {
  if (workflows.length === 0) return "unknown";
  if (workflows.some((item) => item.status === "completed" && item.conclusion && item.conclusion !== "success")) {
    return "degraded";
  }
  if (workflows.some((item) => item.status !== "completed" || !item.conclusion)) {
    return "degraded";
  }
  return workflows.every((item) => item.conclusion === "success") ? "healthy" : "unknown";
}

export async function getOmnisModuleStatusSnapshot(): Promise<OmnisModuleStatusSnapshot> {
  const checkedAt = new Date().toISOString();
  let available = true;
  let error: string | null = null;
  let observations: OmnisDependencyObservation[] = [];

  try {
    const health = await getAdminHealth();
    const timestamp = health.generatedAt || checkedAt;
    observations = [
      {
        dependencyId: "supabase-database",
        state: health.database === "healthy" && health.tables.every((table) => table.state !== "unavailable")
          ? "healthy"
          : "degraded",
        source: "Supabase server-side connection and table probes",
        summary: health.database === "healthy"
          ? health.tables.some((table) => table.state === "unavailable")
            ? "الاتصال بقاعدة البيانات يعمل لكن فحص جدول أو أكثر غير متاح."
            : "اتصال قاعدة البيانات وجداول المراقبة نجحا في فحص الخادم."
          : "فحص اتصال قاعدة البيانات أرجع حالة متدهورة.",
        checkedAt: timestamp,
        latencyMs: null,
      },
      {
        dependencyId: "github-status",
        state: health.github.statusesAvailable
          ? githubCommitState(health.github.overall)
          : "unknown",
        source: "GitHub commit status API (main)",
        summary: health.github.statusesAvailable
          ? `حالة GitHub الحالية: ${health.github.overall ?? "غير محددة"}؛ عدد الفحوص: ${health.github.statuses.length}.`
          : "مصدر حالة GitHub غير متاح في هذا الفحص.",
        checkedAt: timestamp,
        latencyMs: null,
      },
      {
        dependencyId: "github-workflows",
        state: health.github.workflowsAvailable
          ? githubWorkflowState(health.github.workflows)
          : "unknown",
        source: "GitHub Actions workflow runs (main)",
        summary: health.github.workflowsAvailable
          ? `تمت قراءة ${health.github.workflows.length} مسار عمل مراقب.`
          : "مصدر GitHub Actions غير متاح في هذا الفحص.",
        checkedAt: timestamp,
        latencyMs: null,
      },
      {
        dependencyId: "video-generation-queue",
        state: health.queuesAvailable.video
          ? health.queues.videoFailed > 0
            ? "degraded"
            : "healthy"
          : "unknown",
        source: "Supabase video_generation_requests",
        summary: health.queuesAvailable.video
          ? `الطابور مقروء؛ طلبات فاشلة: ${health.queues.videoFailed}.`
          : "تعذر التحقق من قراءة طابور الفيديو؛ لا يتم تحويل الفشل إلى صفر.",
        checkedAt: timestamp,
        latencyMs: null,
      },
    ];
  } catch (cause) {
    available = false;
    error = "تعذر جمع فحوص الاعتماديات الحالية؛ تم إبقاء الحالات غير المقاسة كغير معروفة.";
    console.error("[admin/omnis] module dependency probes failed", cause);
  }

  const modules = buildOmnisModuleStatuses({
    moduleIds: OMNIS_CENTERS.map((center) => center.id),
    definitions: OMNIS_DEPENDENCY_DEFINITIONS,
    relations: OMNIS_MODULE_DEPENDENCIES,
    observations,
    now: new Date(checkedAt),
  });
  const counts: Record<OmnisOperationalState, number> = {
    healthy: 0,
    degraded: 0,
    unavailable: 0,
    unknown: 0,
    maintenance: 0,
  };
  for (const module of modules) counts[module.state] += 1;

  return { available, checkedAt, modules, counts, error };
}
