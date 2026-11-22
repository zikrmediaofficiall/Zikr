import { LAYL_EPISODES, type LaylEpisode } from "@/features/videos/data/layl-program";

export type LatestLaylEpisodeState = {
  episodeNumber: number;
  status: string;
  createdAt: string;
};

export function isoWeekKey(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const thursday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return String(thursday.getUTCFullYear()) + "-W" + String(week).padStart(2, "0");
}

/**
 * The weekly series advances only on Sunday and only after the previous
 * episode has rendered successfully. A generation failure or same-week run
 * cannot silently skip an episode or create a duplicate.
 */
export function resolveNextScheduledLaylEpisode(
  now: Date,
  latest: LatestLaylEpisodeState | null,
): LaylEpisode | null {
  if (now.getUTCDay() !== 0) return null;
  const currentWeek = isoWeekKey(now);
  if (!currentWeek) return null;

  if (!latest) return LAYL_EPISODES[0] ?? null;
  if (latest.status !== "completed") return null;

  const previousCreatedAt = isoWeekKey(new Date(latest.createdAt));
  if (!previousCreatedAt || previousCreatedAt === currentWeek) return null;

  const nextNumber = latest.episodeNumber + 1;
  return LAYL_EPISODES.find((episode) => episode.number === nextNumber) ?? null;
}
