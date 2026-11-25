/**
 * OMNIS P07-01: per-model request and output-token budgets.
 * Config (optional, JSON in AI_PROVIDER_BUDGETS): {"gemini-3.1-flash-lite":{"dailyRequests":500,"dailyOutputTokens":400000}}
 * With no config nothing is limited. Usage is counted per UTC day in this process only, so on
 * serverless it is a per-instance guard, not a global billing cap; the provider's own quota stays the hard limit.
 */
export type ModelBudget = { dailyRequests?: number; dailyOutputTokens?: number };
export type BudgetConfig = Record<string, ModelBudget>;
type Usage = { day: string; requests: number; outputTokens: number };

export function parseBudgetConfig(raw: string | undefined | null): BudgetConfig {
  if (!raw?.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: BudgetConfig = {};
    for (const [model, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== "object") continue;
      const v = value as Record<string, unknown>;
      const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x >= 0 ? Math.floor(x) : undefined);
      out[model.trim().toLowerCase()] = { dailyRequests: num(v.dailyRequests), dailyOutputTokens: num(v.dailyOutputTokens) };
    }
    return out;
  } catch {
    return {};
  }
}

const utcDay = (now: Date) => now.toISOString().slice(0, 10);

export function createBudgetTracker(now: () => Date = () => new Date()) {
  const usage = new Map<string, Usage>();
  const current = (model: string): Usage => {
    const day = utcDay(now());
    const existing = usage.get(model);
    if (existing && existing.day === day) return existing;
    const fresh = { day, requests: 0, outputTokens: 0 };
    usage.set(model, fresh);
    return fresh;
  };
  return {
    isExhausted(model: string, config: BudgetConfig): boolean {
      const budget = config[model];
      if (!budget) return false;
      const u = current(model);
      return (budget.dailyRequests !== undefined && u.requests >= budget.dailyRequests) ||
        (budget.dailyOutputTokens !== undefined && u.outputTokens >= budget.dailyOutputTokens);
    },
    record(model: string, outputTokens = 0) {
      const u = current(model);
      u.requests += 1;
      u.outputTokens += Math.max(0, Math.floor(outputTokens));
    },
    snapshot(model: string): Usage {
      return { ...current(model) };
    },
  };
}

/** Drops models whose budget is spent. An empty result means every route is exhausted and the caller must not call the provider. */
export function applyBudgets(route: readonly string[], config: BudgetConfig, tracker: ReturnType<typeof createBudgetTracker>): string[] {
  return route.filter((model) => !tracker.isExhausted(model, config));
}
