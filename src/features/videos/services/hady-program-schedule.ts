import { HADY_EPISODES, type HadyScriptedEpisode } from "../data/hady-episodes";
import { isoWeekKey } from "./layl-program-schedule";

export type LatestHadyEpisodeState = { episodeNumber: number; status: string; createdAt: string };

/**
 * Weekly on Thursdays (UTC). The next script is released only after the previous episode rendered
 * successfully and never twice in one ISO week.
 */
export function resolveNextScheduledHadyEpisode(
  now: Date,
  latest: LatestHadyEpisodeState | null,
  episodes: readonly HadyScriptedEpisode[] = HADY_EPISODES,
): HadyScriptedEpisode | null {
  if (now.getUTCDay() !== 4) return null;
  const currentWeek = isoWeekKey(now);
  if (!currentWeek) return null;
  if (!latest) return episodes[0] ?? null;
  if (latest.status !== "completed") return null;
  const previousWeek = isoWeekKey(new Date(latest.createdAt));
  if (!previousWeek || previousWeek === currentWeek) return null;
  return episodes.find((episode) => episode.week === latest.episodeNumber + 1) ?? null;
}
