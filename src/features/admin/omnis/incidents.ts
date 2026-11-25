import type { OmnisDependencyDefinition, OmnisModuleStatus } from "@/features/admin/omnis/module-status";

export type OmnisIncidentSeverity = "critical" | "warning" | "info";

export type OmnisIncident = {
  incidentKey: string;
  dependencyId: string;
  title: string;
  severity: OmnisIncidentSeverity;
  state: "open" | "monitoring" | "unverified";
  owner: string;
  summary: string;
  source: string | null;
  checkedAt: string | null;
  freshness: "fresh" | "stale" | "missing";
  affectedModules: string[];
};

const MODULE_LABELS: Record<string, string> = {
  "global-command": "القيادة والتحكم",
  "project-explorer": "مستكشف المشروع",
  "universal-control": "التحكم الموحد",
  "configuration-studio": "استوديو الإعدادات",
  "website-experience": "تجربة الموقع",
  "component-builder": "منشئ المكونات",
  "mobile-application": "تطبيق Android",
  "journey-analytics": "رحلة المستخدم",
  "content-os": "نظام المحتوى",
  "knowledge-verification": "التحقق المعرفي",
  "ai-model-center": "مركز الذكاء الاصطناعي",
  "video-production": "مصنع الفيديو",
  "media-assets": "الأصول والوسائط",
  "audio-voice": "الصوت والراديو",
  "omnichannel-publishing": "النشر متعدد القنوات",
  "growth-campaigns": "النمو والحملات",
  "audience-intelligence": "ذكاء الجمهور",
  "seo-search": "SEO والبحث",
  "business-intelligence": "ذكاء الأعمال",
  monetization: "الإيرادات",
  "identity-access": "الهوية والصلاحيات",
  community: "المجتمع والإشراف",
  notifications: "الإشعارات",
  "kids-learning": "تعلم الأطفال",
  "cloud-infrastructure": "البنية السحابية",
  "database-studio": "قاعدة البيانات",
  "api-integrations": "التكاملات وAPI",
  "software-development": "التطوير البرمجي",
  "release-deployment": "الإصدارات والنشر",
  "security-recovery": "الأمن والتعافي",
};

/**
 * Turns non-healthy, measured probes into a deduplicated live incident list.
 * Missing probes are intentionally excluded: an unwired integration is not
 * an outage. Stale observations are surfaced as informational/unverified.
 * This is a live view, not a persisted acknowledgement or incident history.
 */
export function buildOmnisIncidents(input: {
  modules: readonly OmnisModuleStatus[];
  definitions: readonly OmnisDependencyDefinition[];
}): OmnisIncident[] {
  const definitions = new Map(input.definitions.map((item) => [item.id, item]));
  const grouped = new Map<string, OmnisIncident>();

  for (const module of input.modules) {
    for (const dependency of module.dependencies) {
      if (dependency.freshness === "missing" || dependency.state === "healthy") continue;
      const definition = definitions.get(dependency.dependencyId);
      if (!definition) continue;

      const severity: OmnisIncidentSeverity = dependency.state === "unavailable"
        ? "critical"
        : dependency.state === "degraded"
          ? "warning"
          : "info";
      const state: OmnisIncident["state"] = dependency.state === "maintenance"
        ? "monitoring"
        : dependency.state === "unknown"
          ? "unverified"
          : "open";
      const incidentKey = `omnis:${dependency.dependencyId}:${dependency.state}:${dependency.freshness}`;
      const existing = grouped.get(incidentKey);
      if (existing) {
        if (!existing.affectedModules.includes(module.moduleId)) {
          existing.affectedModules.push(module.moduleId);
        }
        continue;
      }
      grouped.set(incidentKey, {
        incidentKey,
        dependencyId: dependency.dependencyId,
        title: definition.label,
        severity,
        state,
        owner: definition.owner,
        summary: dependency.summary,
        source: dependency.source,
        checkedAt: dependency.checkedAt,
        freshness: dependency.freshness,
        affectedModules: [module.moduleId],
      });
    }
  }

  const severityOrder: Record<OmnisIncidentSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return [...grouped.values()]
    .map((incident) => ({
      ...incident,
      affectedModules: incident.affectedModules
        .sort((a, b) => (MODULE_LABELS[a] ?? a).localeCompare(MODULE_LABELS[b] ?? b, "ar")),
    }))
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      || (Date.parse(b.checkedAt ?? "") || 0) - (Date.parse(a.checkedAt ?? "") || 0));
}

export const OMNIS_INCIDENT_SEVERITY_LABELS: Record<OmnisIncidentSeverity, string> = {
  critical: "حرج",
  warning: "تحذير",
  info: "معلومة",
};

export const OMNIS_INCIDENT_STATE_LABELS: Record<OmnisIncident["state"], string> = {
  open: "مفتوحة",
  monitoring: "تحت المراقبة",
  unverified: "غير مؤكدة",
};

export function getOmnisModuleLabel(moduleId: string): string {
  return MODULE_LABELS[moduleId] ?? moduleId;
}
