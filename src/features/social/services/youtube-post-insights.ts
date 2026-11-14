import { getServerEnv } from "@/lib/env";
import { supabaseServerAdminRequest } from "@/lib/supabase/admin-rest";
import { requireSocialQueueRows } from "@/features/social/services/social-queue-selection";
import { resolveSocialPublishCutoff } from "@/features/social/services/facebook-queue-recovery-policy";
import {
  buildSocialInsightsQueueCursorFilter,
  readSocialInsightsScanCursor,
  writeSocialInsightsScanCursor,
  type SocialInsightsScanCursor,
} from "@/features/social/services/social-insights-scan-cursor";

type QueueRow = {
  id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ExistingInsightRow = { queue_id: string; captured_at: string };
type YoutubeStatistics = {
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
};
type YoutubeVideo = { id: string; statistics?: YoutubeStatistics };
type YoutubeVideosResponse = { items?: YoutubeVideo[]; error?: { message?: string } };
type InsightUpsert = {
  queue_id: string;
  platform: "youtube";
  video_id: string;
  metrics: { views: number | null; likes: number | null; comments: number | null };
  captured_at: string;
  source: "youtube-data-api-v3";
  scope: "public-statistics";
  updated_at: string;
};

export type YoutubePostInsightsSyncResult = {
  configured: boolean;
  candidates: number;
  fetched: number;
  updated: number;
  failed: number;
};

const INSIGHTS_REFRESH_MS = 6 * 60 * 60 * 1000;
const MAX_INSIGHTS_BATCH = 50;
const INSIGHTS_PAGE_SIZE = 250;
const MAX_SCAN_PAGES = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asCount(value: string | undefined): number | null {
  if (value == null || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function remoteYoutubeId(metadata: Record<string, unknown> | null): string | null {
  const platformResults = metadata?.platformResults;
  if (!isRecord(platformResults)) return null;
  const youtube = platformResults.youtube;
  if (!isRecord(youtube) || youtube.ok !== true || typeof youtube.remoteId !== "string") return null;
  const id = youtube.remoteId.trim();
  return /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
}

function shouldRefresh(capturedAt: string | null | undefined, now: number): boolean {
  if (!capturedAt) return true;
  const timestamp = Date.parse(capturedAt);
  return !Number.isFinite(timestamp) || now - timestamp >= INSIGHTS_REFRESH_MS;
}

async function getCandidates(limit: number): Promise<{
  candidates: Array<{ queueId: string; videoId: string }>;
  nextCursor: SocialInsightsScanCursor | null;
}> {
  const candidates: Array<{ queueId: string; videoId: string }> = [];
  const now = Date.now();
  const pageSize = INSIGHTS_PAGE_SIZE;
  const maxRows = MAX_SCAN_PAGES * INSIGHTS_PAGE_SIZE;
  const publishAfter = resolveSocialPublishCutoff(process.env.SOCIAL_PUBLISH_AFTER);
  const startCursor = await readSocialInsightsScanCursor("youtube");
  let queryCursor = startCursor;
  let nextCursor = startCursor;
  let wrapped = false;
  let scannedRows = 0;

  while (scannedRows < maxRows && candidates.length < limit) {
    const cursorFilter = buildSocialInsightsQueueCursorFilter(queryCursor);
    const rows = await supabaseServerAdminRequest<QueueRow[]>(
      "/rest/v1/social_publish_queue?content_type=like.*_video&created_at=gte." +
        encodeURIComponent(publishAfter) +
        "&select=id,metadata,created_at&order=created_at.asc,id.asc&limit=" +
        pageSize + cursorFilter,
    );
    const batch = requireSocialQueueRows<QueueRow>(rows, "YouTube insights queue candidate query");
    if (batch.length === 0) {
      if (startCursor && !wrapped) {
        queryCursor = null;
        wrapped = true;
        continue;
      }
      break;
    }
    for (const row of batch) {
      if (
        !row ||
        typeof row.id !== "string" ||
        !row.id.trim() ||
        typeof row.created_at !== "string" ||
        !Number.isFinite(Date.parse(row.created_at))
      ) {
        throw new Error("YouTube insights queue candidate page contains an invalid cursor row.");
      }
    }

    const withVideoIds = batch.flatMap((row) => {
      const videoId = remoteYoutubeId(row.metadata);
      return videoId ? [{ row, videoId }] : [];
    });
    const existing = withVideoIds.length > 0
      ? await supabaseServerAdminRequest<ExistingInsightRow[]>(
          "/rest/v1/social_post_insights?platform=eq.youtube&queue_id=in.(" +
            withVideoIds.map((item) => item.row.id).join(",") +
            ")&select=queue_id,captured_at",
        )
      : [];
    const validatedExisting = requireSocialQueueRows<ExistingInsightRow>(
      existing,
      "YouTube insights freshness query",
    );
    const capturedAtByQueueId = new Map(
      validatedExisting.map((row) => [row.queue_id, row.captured_at]),
    );
    const videoIdByQueueId = new Map(
      withVideoIds.map((item) => [item.row.id, item.videoId]),
    );

    for (const row of batch) {
      const rowCursor = { createdAt: row.created_at, id: row.id };
      if (
        wrapped &&
        startCursor &&
        rowCursor.createdAt === startCursor.createdAt &&
        rowCursor.id === startCursor.id
      ) {
        return { candidates, nextCursor };
      }
      scannedRows += 1;
      nextCursor = rowCursor;
      const videoId = videoIdByQueueId.get(row.id);
      if (!videoId) continue;
      if (!shouldRefresh(capturedAtByQueueId.get(row.id), now)) continue;
      candidates.push({ queueId: row.id, videoId });
      if (candidates.length >= limit || scannedRows >= maxRows) {
        return { candidates, nextCursor };
      }
    }

    if (batch.length < pageSize) {
      if (startCursor && !wrapped) {
        queryCursor = null;
        wrapped = true;
        continue;
      }
      break;
    }
    const last = batch[batch.length - 1];
    queryCursor = { createdAt: last.created_at, id: last.id };
  }

  return { candidates, nextCursor };
}

/**
 * Reads public statistics for ZIKR's own published YouTube videos.
 * Insights are stored in a private analytics table; social_publish_queue is read-only.
 * Retention, watch-time and private audience metrics are never inferred or fabricated.
 */
export async function syncYoutubePublishedPostInsights(
  limit = MAX_INSIGHTS_BATCH,
): Promise<YoutubePostInsightsSyncResult> {
  const apiKey = getServerEnv().YOUTUBE_API_KEY?.trim();
  if (!apiKey) return { configured: false, candidates: 0, fetched: 0, updated: 0, failed: 0 };

  const boundedLimit = Math.max(1, Math.min(250, Math.floor(limit) || 1));
  const scan = await getCandidates(boundedLimit);
  const { candidates, nextCursor } = scan;
  if (candidates.length === 0) {
    await writeSocialInsightsScanCursor("youtube", nextCursor);
    return { configured: true, candidates: 0, fetched: 0, updated: 0, failed: 0 };
  }

  let fetched = 0;
  let updated = 0;

  for (let index = 0; index < candidates.length; index += MAX_INSIGHTS_BATCH) {
    const group = candidates.slice(index, index + MAX_INSIGHTS_BATCH);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics");
    url.searchParams.set("id", group.map((item) => item.videoId).join(","));
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error("YouTube public statistics request failed (HTTP " + response.status + ").");
    }
    const payload = (await response.json()) as YoutubeVideosResponse;
    if (payload.error) throw new Error("YouTube public statistics endpoint returned an API error.");

    const byId = new Map<string, YoutubeVideo>(
      (payload.items ?? []).map((video): [string, YoutubeVideo] => [video.id, video]),
    );
    fetched += byId.size;
    const capturedAt = new Date().toISOString();
    const upserts: InsightUpsert[] = [];

    for (const candidate of group) {
      const video = byId.get(candidate.videoId);
      if (!video?.statistics) continue;
      upserts.push({
        queue_id: candidate.queueId,
        platform: "youtube",
        video_id: candidate.videoId,
        metrics: {
          views: asCount(video.statistics.viewCount),
          likes: asCount(video.statistics.likeCount),
          comments: asCount(video.statistics.commentCount),
        },
        captured_at: capturedAt,
        source: "youtube-data-api-v3",
        scope: "public-statistics",
        updated_at: capturedAt,
      });
    }

    if (upserts.length > 0) {
      await supabaseServerAdminRequest(
        "/rest/v1/social_post_insights?on_conflict=queue_id,platform",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(upserts),
        },
      );
      updated += upserts.length;
    }
  }

  await writeSocialInsightsScanCursor("youtube", nextCursor);
  return { configured: true, candidates: candidates.length, fetched, updated, failed: 0 };
}
