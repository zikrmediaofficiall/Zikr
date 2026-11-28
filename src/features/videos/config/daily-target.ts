/**
 * Single source of truth for the daily video target. The template worker never plans more than
 * MAX_VIDEO_DAILY_TARGET videos per day (pilot policy), so Admin must not accept or show a larger target.
 * Raising it is an explicit decision: change this constant, the workflow DAILY_VIDEO_TARGET and the docs together.
 */
export const MAX_VIDEO_DAILY_TARGET = 2;
export const DEFAULT_VIDEO_DAILY_TARGET = 2;

export function effectiveVideoDailyTarget(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_VIDEO_DAILY_TARGET;
  return Math.max(1, Math.min(MAX_VIDEO_DAILY_TARGET, Math.trunc(n)));
}
