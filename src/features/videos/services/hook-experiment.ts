import type { VideoHookStyle } from "./video-creative-variation";

export const EXPERIMENT_HOOK_STYLES = ["question", "reflection", "action"] as const satisfies readonly VideoHookStyle[];
export type ExperimentHookStyle = (typeof EXPERIMENT_HOOK_STYLES)[number];
export type HookStyleStats = Record<ExperimentHookStyle, { videos: number; totalViews: number }>;

export function isHookExperimentEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.VIDEO_HOOK_EXPERIMENT_ENABLED === "true";
}

function stableUnit(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

/**
 * Epsilon-greedy choice of hook style for one video. Until every style has
 * `minSamples` measured videos it rotates evenly so data accumulates; after
 * that it exploits the style with the best average views, exploring `explore`
 * of the time. Deterministic per seed, so retries never change the style.
 * Kids videos always get "balanced" (no experiment on child-directed content).
 */
export function chooseHookStyle(input: {
  seed: string;
  audience?: unknown;
  stats: HookStyleStats;
  minSamples?: number;
  explore?: number;
}): VideoHookStyle {
  if (input.audience === "kids") return "balanced";
  const minSamples = input.minSamples ?? 20;
  const explore = Math.min(1, Math.max(0, input.explore ?? 0.2));
  const styles = EXPERIMENT_HOOK_STYLES;
  const undersampled = styles.filter((s) => input.stats[s].videos < minSamples);
  if (undersampled.length) return undersampled[Math.floor(stableUnit(input.seed + ":rotate") * undersampled.length)];
  if (stableUnit(input.seed + ":explore") < explore) return styles[Math.floor(stableUnit(input.seed + ":pick") * styles.length)];
  const avg = (s: ExperimentHookStyle) => input.stats[s].totalViews / Math.max(1, input.stats[s].videos);
  return [...styles].sort((a, b) => avg(b) - avg(a))[0];
}
