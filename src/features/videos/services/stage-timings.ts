/** Per-stage wall-clock timings (P11). Pure helper; stored in request content, no schema change. */
export type StageTimings = Record<string, number>;

export function createStageTimer(now: () => number = Date.now) {
  const started = now();
  let last = started;
  const stages: StageTimings = {};
  return {
    /** Record the time since the previous mark under `name`. Repeated names add up. */
    mark(name: string): number {
      const t = now();
      const elapsed = Math.max(0, t - last);
      stages[name] = (stages[name] ?? 0) + elapsed;
      last = t;
      return elapsed;
    },
    snapshot(): StageTimings & { totalMs: number } {
      return { ...stages, totalMs: Math.max(0, now() - started) };
    },
  };
}

/** Slowest stage name, ignoring the total. Null when nothing was recorded. */
export function slowestStage(timings: StageTimings | null | undefined): string | null {
  if (!timings) return null;
  const entries = Object.entries(timings).filter(([k, v]) => k !== "totalMs" && Number.isFinite(v));
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}
