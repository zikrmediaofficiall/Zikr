import type { OmnisIncident } from "@/features/admin/omnis/incidents";
import type { OmnisModuleDependencyStatus } from "@/features/admin/omnis/module-status";

export type OmnisIncidentLifecycleAction = "acknowledged" | "resolved";

export type OmnisIncidentLifecycleEvent = {
  id: string;
  incidentKey: string;
  action: OmnisIncidentLifecycleAction;
  note: string | null;
  actorUserId: string | null;
  createdAt: string;
};

export const OMNIS_INCIDENT_LIFECYCLE_LABELS: Record<
  OmnisIncident["lifecycleState"],
  string
> = {
  open: "بانتظار الإقرار",
  acknowledged: "تم الإقرار والاستلام",
  reopened: "مفتوحة مجددًا",
};

/**
 * Read only incident lifecycle audit actions, with stable ordering for equal timestamps.
 * Filtering in PostgREST prevents unrelated admin audit rows from consuming the history window.
 */
export function buildOmnisIncidentHistoryQuery(): string {
  return "/rest/v1/admin_audit_events?select=id,actor_user_id,action,resource_id,metadata,created_at"
    + "&resource_type=eq.omnis_incident"
    + "&action=in.(admin.omnis.incident.acknowledged,admin.omnis.incident.resolved)"
    + "&order=created_at.desc,id.desc&limit=50";
}

/** Apply the latest immutable audit event to each currently-live incident. */
export function applyOmnisIncidentLifecycle(
  incidents: readonly OmnisIncident[],
  events: readonly OmnisIncidentLifecycleEvent[],
): OmnisIncident[] {
  const latestByIncident = new Map<string, OmnisIncidentLifecycleEvent>();
  for (const event of events) {
    if (!latestByIncident.has(event.incidentKey)) {
      latestByIncident.set(event.incidentKey, event);
    }
  }

  return incidents.map((incident) => {
    const latest = latestByIncident.get(incident.incidentKey);
    return {
      ...incident,
      lifecycleState: latest?.action === "acknowledged"
        ? "acknowledged"
        : latest?.action === "resolved"
          ? "reopened"
          : "open",
    };
  });
}

/**
 * Resolution requires an explicit, recent, successful probe for every module
 * using this dependency. Missing/stale/unknown observations never count as
 * recovery evidence.
 */
export function canResolveOmnisIncident(
  dependencies: readonly Pick<
    OmnisModuleDependencyStatus,
    "state" | "freshness" | "checkedAt" | "source"
  >[],
): boolean {
  return dependencies.length > 0 && dependencies.every((dependency) =>
    dependency.state === "healthy"
    && dependency.freshness === "fresh"
    && Boolean(dependency.checkedAt)
    && Boolean(dependency.source),
  );
}
