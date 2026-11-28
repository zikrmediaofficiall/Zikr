import registryJson from "../../../config/free-tier-budget.json";

/**
 * Free-tier budget for the app surface.
 *
 * The canonical registry is config/free-tier-budget.json, which the CLI
 * (scripts/free-tier-budget.mjs) reads for reports and CI. This module is the
 * typed view of the same file for server components: it holds no second copy of
 * any limit, only the arithmetic that turns usage into a state.
 *
 * Rules of the house:
 * - A service with no recorded usage is "unknown", never zero.
 * - The number a pipeline respects is our own cap when one is set.
 * - A limit of 0 is a guard: any usage at all is a breach.
 */

export type FreeTierWindow = "second" | "day" | "week" | "month" | "instant";

export type FreeTierService = {
  id: string;
  name: string;
  labelAr?: string;
  provider: string;
  plan: string;
  metric: string;
  unit: string;
  limit: number;
  window: FreeTierWindow;
  selfCap?: number;
  resetNote?: string;
  usageSource?: string;
  fallback?: string;
  source: string;
  notes?: string;
  status?: string;
};

export type FreeTierRegistry = {
  version: number;
  verifiedAt: string;
  alertThresholdPercent: number;
  timezone: string;
  services: FreeTierService[];
  rules?: Record<string, Record<string, unknown>>;
};

export type FreeTierState = "ok" | "warn" | "critical" | "unknown";

export type FreeTierRow = {
  service: FreeTierService;
  used: number | null;
  limit: number;
  percent: number | null;
  remaining: number | null;
  state: FreeTierState;
};

export const freeTierRegistry = registryJson as unknown as FreeTierRegistry;

export function effectiveLimit(service: FreeTierService): number {
  return typeof service.selfCap === "number" ? service.selfCap : service.limit;
}

export function computeFreeTierState(
  used: number | null,
  limit: number,
  alertThresholdPercent = 80,
): { state: FreeTierState; percent: number | null; remaining: number | null } {
  if (used === null || !Number.isFinite(used) || used < 0) {
    return { state: "unknown", percent: null, remaining: null };
  }
  if (limit === 0) {
    return used > 0
      ? { state: "critical", percent: 100, remaining: 0 }
      : { state: "ok", percent: 0, remaining: 0 };
  }
  const percent = (used / limit) * 100;
  const remaining = Math.max(limit - used, 0);
  if (percent >= 100) return { state: "critical", percent, remaining };
  if (percent >= alertThresholdPercent) return { state: "warn", percent, remaining };
  return { state: "ok", percent, remaining };
}

/**
 * Reads a usage map from the admin settings value. It accepts either an object
 * or a JSON string, and either {serviceId: number} or {serviceId: {used}}.
 * Anything unreadable becomes null so the page says "not recorded" instead of
 * showing a false zero.
 */
export function readUsageMap(value: unknown): Record<string, number> {
  let parsed: unknown = value;

  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return {};
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== "object") return {};
  const source = parsed as Record<string, unknown>;
  const container = (source.services && typeof source.services === "object" ? source.services : source) as Record<string, unknown>;

  const usage: Record<string, number> = {};
  for (const [key, entry] of Object.entries(container)) {
    const candidate =
      typeof entry === "number"
        ? entry
        : entry && typeof entry === "object" && typeof (entry as { used?: unknown }).used === "number"
          ? (entry as { used: number }).used
          : null;
    if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0) {
      usage[key] = candidate;
    }
  }
  return usage;
}

export function buildFreeTierRows(usage: Record<string, number>): FreeTierRow[] {
  const threshold = freeTierRegistry.alertThresholdPercent ?? 80;
  return freeTierRegistry.services.map((service) => {
    const used = Object.prototype.hasOwnProperty.call(usage, service.id) ? usage[service.id] : null;
    const limit = effectiveLimit(service);
    const { state, percent, remaining } = computeFreeTierState(used, limit, threshold);
    return { service, used, limit, percent, remaining, state };
  });
}

export function summarizeFreeTierRows(rows: FreeTierRow[]) {
  return rows.reduce(
    (totals, row) => {
      totals[row.state] += 1;
      return totals;
    },
    { ok: 0, warn: 0, critical: 0, unknown: 0 } as Record<FreeTierState, number>,
  );
}
