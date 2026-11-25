import "server-only";

import { getAdminHealth } from "@/features/admin/services/platform";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import {
  applyOmnisIncidentLifecycle,
  buildOmnisIncidentHistoryQuery,
  type OmnisIncidentLifecycleEvent,
} from "@/features/admin/omnis/incident-lifecycle";
import { buildOmnisIncidents, type OmnisIncident } from "@/features/admin/omnis/incidents";
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
  incidents: OmnisIncident[];
  incidentEvents: OmnisIncidentLifecycleEvent[];
  incidentHistoryAvailable: boolean;
  incidentHistoryError: string | null;
  incidentCounts: { critical: number; warning: number; info: number };
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

function vercelDeploymentState(
  statusesAvailable: boolean,
  statuses: Awaited<ReturnType<typeof getAdminHealth>>["github"]["statuses"],
): { state: OmnisOperationalState; source: string; summary: string } {
  const vercelStatuses = statuses.filter((item) => /vercel/i.test(item.context));
  if (!statusesAvailable || vercelStatuses.length === 0) {
    return {
      state: "unknown",
      source: "GitHub Commit Status API (Vercel context)",
      summary: "لا توجد حالة Vercel موثقة في آخر فحص؛ لا يتم استنتاج نجاح النشر من حالة GitHub العامة.",
    };
  }

  const states = vercelStatuses.map((item) => item.state.toLowerCase());
  const state = states.some((item) => ["failure", "error", "pending"].includes(item))
    ? "degraded"
    : states.every((item) => item === "success")
      ? "healthy"
      : "unknown";
  const details = vercelStatuses
    .map((item) => `${item.context}: ${item.state}${item.updatedAt ? ` (آخر تحديث ${item.updatedAt})` : ""}`)
    .join("؛ ");

  return {
    state,
    source: `GitHub Commit Status API → ${vercelStatuses.map((item) => item.context).join(", ")}`,
    summary: `حالات Vercel المرتبطة بآخر Commit على main: ${details}.`,
  };
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


type AdminIncidentAuditRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_id: string | null;
  metadata: unknown;
  created_at: string;
};

async function getOmnisIncidentHistory(): Promise<{
  available: boolean;
  events: OmnisIncidentLifecycleEvent[];
  error: string | null;
}> {
  try {
    const rows = await supabaseServerAdminRequest<AdminIncidentAuditRow[]>(
      buildOmnisIncidentHistoryQuery(),
      { method: "GET" },
    );
    const events = (rows ?? []).flatMap((row): OmnisIncidentLifecycleEvent[] => {
      const action = row.action === "admin.omnis.incident.acknowledged"
        ? "acknowledged"
        : row.action === "admin.omnis.incident.resolved"
          ? "resolved"
          : null;
      if (
        !action
        || typeof row.resource_id !== "string"
        || !/^omnis:[a-z0-9-]{2,80}$/.test(row.resource_id)
        || typeof row.created_at !== "string"
      ) return [];
      const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown>
        : {};
      return [{
        id: row.id,
        incidentKey: row.resource_id,
        action,
        note: typeof metadata.note === "string" ? metadata.note : null,
        actorUserId: row.actor_user_id,
        createdAt: row.created_at,
      }];
    });
    return { available: true, events, error: null };
  } catch (cause) {
    console.error("[admin/omnis] incident audit history unavailable", cause);
    return {
      available: false,
      events: [],
      error: "تعذر قراءة سجل الحوادث من سجل الإدارة؛ تم تعطيل الإقرار والإغلاق حتى تعود القراءة.",
    };
  }
}

export async function getOmnisModuleStatusSnapshot(): Promise<OmnisModuleStatusSnapshot> {
  const probeStartedAt = new Date().toISOString();
  let available = true;
  let error: string | null = null;
  let observations: OmnisDependencyObservation[] = [];

  try {
    const health = await getAdminHealth();
    const timestamp = health.generatedAt || probeStartedAt;
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
          ? health.queues.videoFailed > 0 || health.queues.videoRetryWait > 0
            ? "degraded"
            : "healthy"
          : "unknown",
        source: "Supabase video_generation_requests (exact status counts)",
        summary: health.queuesAvailable.video
          ? `الطابور مقروء؛ انتظار: ${health.queues.videoPending}، قيد التنفيذ: ${health.queues.videoProcessing}، إعادة المحاولة: ${health.queues.videoRetryWait}، فشل: ${health.queues.videoFailed}.`
          : "تعذر التحقق من قراءة طابور الفيديو؛ لا يتم تحويل الفشل إلى صفر.",
        checkedAt: timestamp,
        latencyMs: null,
      },
      {
        dependencyId: "vercel-deployment",
        ...vercelDeploymentState(health.github.statusesAvailable, health.github.statuses),
        checkedAt: timestamp,
        latencyMs: null,
      },
    ];
  } catch (cause) {
    available = false;
    error = "تعذر جمع فحوص الاعتماديات الحالية؛ تم إبقاء الحالات غير المقاسة كغير معروفة.";
    console.error("[admin/omnis] module dependency probes failed", cause);
  }

  // Evaluate freshness after all asynchronous probes have finished; timestamps produced
  // by a probe during the current request must not be treated as future-dated.
  const evaluatedAt = new Date();
  const modules = buildOmnisModuleStatuses({
    moduleIds: OMNIS_CENTERS.map((center) => center.id),
    definitions: OMNIS_DEPENDENCY_DEFINITIONS,
    relations: OMNIS_MODULE_DEPENDENCIES,
    observations,
    now: evaluatedAt,
  });
  const counts: Record<OmnisOperationalState, number> = {
    healthy: 0,
    degraded: 0,
    unavailable: 0,
    unknown: 0,
    maintenance: 0,
  };
  for (const moduleStatus of modules) counts[moduleStatus.state] += 1;

  const incidentHistory = await getOmnisIncidentHistory();
  const incidents = applyOmnisIncidentLifecycle(
    buildOmnisIncidents({ modules, definitions: OMNIS_DEPENDENCY_DEFINITIONS }),
    incidentHistory.events,
  );
  const incidentCounts = {
    critical: incidents.filter((item) => item.severity === "critical").length,
    warning: incidents.filter((item) => item.severity === "warning").length,
    info: incidents.filter((item) => item.severity === "info").length,
  };

  return {
    available,
    checkedAt: evaluatedAt.toISOString(),
    modules,
    counts,
    error,
    incidents,
    incidentEvents: incidentHistory.events,
    incidentHistoryAvailable: incidentHistory.available,
    incidentHistoryError: incidentHistory.error,
    incidentCounts,
  };
}
