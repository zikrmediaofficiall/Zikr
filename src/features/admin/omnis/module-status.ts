export type OmnisOperationalState =
  | "healthy"
  | "degraded"
  | "unavailable"
  | "unknown"
  | "maintenance";

export type OmnisProbeFreshness = "fresh" | "stale" | "missing";

export type OmnisDependencyDefinition = {
  id: string;
  label: string;
  description: string;
  owner: string;
  staleAfterSeconds: number;
};

export type OmnisModuleDependency = {
  moduleId: string;
  dependencyIds: readonly string[];
};

export type OmnisDependencyObservation = {
  dependencyId: string;
  state: OmnisOperationalState;
  source: string;
  summary: string;
  checkedAt: string;
  latencyMs: number | null;
  errorCode?: string | null;
};

export type OmnisModuleDependencyStatus = {
  dependencyId: string;
  label: string;
  state: OmnisOperationalState;
  freshness: OmnisProbeFreshness;
  source: string | null;
  summary: string;
  checkedAt: string | null;
  latencyMs: number | null;
  errorCode: string | null;
};

export type OmnisModuleStatus = {
  moduleId: string;
  state: OmnisOperationalState;
  checkedAt: string | null;
  healthyDependencies: number;
  degradedDependencies: number;
  unavailableDependencies: number;
  unknownDependencies: number;
  dependencies: readonly OmnisModuleDependencyStatus[];
  summary: string;
};

export const OMNIS_OPERATIONAL_STATE_LABELS: Record<OmnisOperationalState, string> = {
  healthy: "سليم",
  degraded: "متأثر",
  unavailable: "غير متاح",
  unknown: "غير معروف",
  maintenance: "صيانة",
};

export const OMNIS_OPERATIONAL_STATE_STYLES: Record<OmnisOperationalState, string> = {
  healthy: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  degraded: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  unavailable: "border-red-400/20 bg-red-400/10 text-red-200",
  unknown: "border-slate-400/20 bg-slate-400/10 text-slate-200",
  maintenance: "border-sky-400/20 bg-sky-400/10 text-sky-200",
};

const KNOWN_STATES = new Set<OmnisOperationalState>([
  "healthy",
  "degraded",
  "unavailable",
  "unknown",
  "maintenance",
]);

function effectiveState(
  observation: OmnisDependencyObservation | undefined,
  definition: OmnisDependencyDefinition | undefined,
  nowMs: number,
): { state: OmnisOperationalState; freshness: OmnisProbeFreshness } {
  if (!observation || !definition || !KNOWN_STATES.has(observation.state)) {
    return { state: "unknown", freshness: "missing" };
  }
  const checkedAtMs = Date.parse(observation.checkedAt);
  if (!Number.isFinite(checkedAtMs) || checkedAtMs > nowMs) {
    return { state: "unknown", freshness: "stale" };
  }
  const ageMs = nowMs - checkedAtMs;
  if (ageMs > definition.staleAfterSeconds * 1000) {
    return { state: "unknown", freshness: "stale" };
  }
  return { state: observation.state, freshness: "fresh" };
}

function aggregateState(states: readonly OmnisOperationalState[]): OmnisOperationalState {
  if (states.length === 0) return "unknown";
  if (states.includes("unavailable")) return "unavailable";
  if (states.includes("degraded")) return "degraded";
  if (states.includes("maintenance")) return "maintenance";
  if (states.includes("unknown")) return "unknown";
  return "healthy";
}

/**
 * Builds a consistent module/dependency status snapshot.
 * Missing or stale probes are explicitly unknown; they are never treated as healthy.
 */
export function buildOmnisModuleStatuses(input: {
  moduleIds: readonly string[];
  definitions: readonly OmnisDependencyDefinition[];
  relations: readonly OmnisModuleDependency[];
  observations: readonly OmnisDependencyObservation[];
  now?: Date;
}): OmnisModuleStatus[] {
  const nowMs = (input.now ?? new Date()).getTime();
  const definitions = new Map(input.definitions.map((item) => [item.id, item]));
  const observations = new Map(input.observations.map((item) => [item.dependencyId, item]));
  const relations = new Map(input.relations.map((item) => [item.moduleId, item.dependencyIds]));

  return input.moduleIds.map((moduleId) => {
    const dependencyIds = relations.get(moduleId) ?? [];
    const dependencies = dependencyIds.map((dependencyId): OmnisModuleDependencyStatus => {
      const definition = definitions.get(dependencyId);
      const observation = observations.get(dependencyId);
      const effective = effectiveState(observation, definition, nowMs);
      return {
        dependencyId,
        label: definition?.label ?? dependencyId,
        state: effective.state,
        freshness: effective.freshness,
        source: effective.freshness === "fresh" ? observation?.source ?? null : null,
        summary:
          effective.freshness === "missing"
            ? "لم يتم توصيل فحص موثوق لهذا الاعتماد بعد."
            : effective.freshness === "stale"
              ? "نتيجة الفحص قديمة أو غير صالحة؛ يلزم فحص جديد."
              : observation?.summary ?? "لا توجد تفاصيل للفحص.",
        checkedAt: effective.freshness === "fresh" ? observation?.checkedAt ?? null : null,
        latencyMs: effective.freshness === "fresh" ? observation?.latencyMs ?? null : null,
        errorCode: effective.freshness === "fresh" ? observation?.errorCode ?? null : null,
      };
    });
    const states = dependencies.map((item) => item.state);
    const state = aggregateState(states);
    const healthyDependencies = dependencies.filter((item) => item.state === "healthy").length;
    const degradedDependencies = dependencies.filter((item) => item.state === "degraded").length;
    const unavailableDependencies = dependencies.filter((item) => item.state === "unavailable").length;
    const unknownDependencies = dependencies.filter((item) => item.state === "unknown").length;
    const knownTimes = dependencies
      .map((item) => item.checkedAt)
      .filter((value): value is string => value !== null)
      .sort((a, b) => Date.parse(b) - Date.parse(a));

    return {
      moduleId,
      state,
      checkedAt: knownTimes[0] ?? null,
      healthyDependencies,
      degradedDependencies,
      unavailableDependencies,
      unknownDependencies,
      dependencies,
      summary:
        dependencies.length === 0
          ? "لم تُعرّف اعتمادات تشغيلية لهذا المركز بعد."
          : `تم فحص ${dependencies.filter((item) => item.freshness === "fresh").length} من ${dependencies.length} اعتمادًا؛ غير المعروف ${unknownDependencies}.`,
    };
  });
}
