import { syncYoutubePublishedPostInsights } from "../../src/features/social/services/youtube-post-insights";
import { supabaseServerAdminRequest } from "../../src/lib/supabase/admin-rest";
import { syncFacebookReelsInsights } from "../../src/features/social/services/facebook-reels-insights";
import { getFacebookPageProfile } from "../../src/features/social/integrations/facebook";
import { getEnabledSocialPlatforms } from "../../src/features/social/services/platform-availability";
import { isKidsCatalogReconciliationEnabled } from "../../src/features/social/services/kids-social-catalog-reconciliation";
import { getFacebookProfileSyncFailureCount } from "../../src/features/social/services/social-insights-sync-status";
import { isVideoPurgeLockResponseActive } from "../../src/features/videos/services/background-job-settings";
import { recoverPendingVideoSocialQueueEnqueues } from "./template-video-automation";
import {
  resolveNextVideoPublishAt,
  type VideoPublishScheduleRow,
} from "../../src/features/social/services/video-publishing-schedule";
import {
  claimPendingSocialPublishItems,
  processSocialPublishItem,
  retryPendingPublishedVideoCleanup,
  reconcilePublishedKidsVideoCatalog,
} from "../../src/features/social/services/social-publishing";

async function isVideoPurgeInProgress(): Promise<boolean> {
  try {
    const rows = await supabaseServerAdminRequest<Array<{ value: unknown }>>(
      "/rest/v1/admin_settings?key=eq.video_purge_in_progress&select=value&limit=1",
    );
    return isVideoPurgeLockResponseActive(rows);
  } catch (error) {
    console.error("[social-worker] Could not verify the video purge lock; failing closed:", error);
    return true;
  }
}

export async function reconcileKidsCatalogMetadata() {
  if (!isKidsCatalogReconciliationEnabled(process.env)) {
    return { enabled: false, scanned: 0, candidates: 0, synced: 0, pending: 0, held: 0, failed: 0, truncated: false };
  }
  if (await isVideoPurgeInProgress()) {
    return { enabled: true, scanned: 0, candidates: 0, synced: 0, pending: 0, held: 0, failed: 0, truncated: false, purgeLocked: true };
  }
  try {
    return await reconcilePublishedKidsVideoCatalog();
  } catch (error) {
    console.error("[social-worker] Kids catalog reconciliation unavailable:", error);
    return { enabled: true, scanned: 0, candidates: 0, synced: 0, pending: 0, held: 0, failed: 1, truncated: false };
  }
}

export async function syncSocialInsights() {
  let facebookProfileLookupFailed = false;
  const facebookProfile = await getFacebookPageProfile().catch((error: unknown) => {
    facebookProfileLookupFailed = true;
    console.error(
      "[social-worker] Facebook Page profile refresh unavailable:",
      error instanceof Error ? error.message : "Unknown Facebook profile error",
    );
    return null;
  });
  const facebookProfileSync = {
    configured: facebookProfile?.configured ?? false,
    stale: facebookProfile?.stale ?? true,
    syncedAt: facebookProfile?.syncedAt ?? null,
    hasLikesCount: facebookProfile?.likesCount !== null && facebookProfile?.likesCount !== undefined,
    hasFollowersCount: facebookProfile?.followersCount !== null && facebookProfile?.followersCount !== undefined,
    error: facebookProfile?.error ?? null,
  };
  console.log("[social-worker] Facebook Page profile sync:", JSON.stringify(facebookProfileSync));

  const facebookInsights = await syncFacebookReelsInsights(25).catch((error: unknown) => {
    console.error(
      "[social-worker] Facebook Reels insights sync unavailable:",
      error instanceof Error ? error.message : "Unknown Meta insights error",
    );
    return { configured: false, candidates: 0, fetched: 0, updated: 0, failed: 1 };
  });
  if (!facebookInsights.configured || facebookInsights.updated > 0 || facebookInsights.failed > 0) {
    console.log("[social-worker] Facebook Reels insights sync:", JSON.stringify(facebookInsights));
  }

  const insights = await syncYoutubePublishedPostInsights(100).catch((error: unknown) => {
    console.error(
      "[social-worker] YouTube public insights sync unavailable:",
      error instanceof Error ? error.message : "Unknown YouTube insights error",
    );
    return { configured: false, candidates: 0, fetched: 0, updated: 0, failed: 1 };
  });

  if (insights.updated > 0) {
    console.log("[social-worker] YouTube public post statistics synced:", JSON.stringify(insights));
  }

  const facebookProfileFailed = getFacebookProfileSyncFailureCount({
    configured: facebookProfileSync.configured,
    stale: facebookProfileSync.stale,
    lookupFailed: facebookProfileLookupFailed,
  });
  return {
    facebookProfileSync,
    facebookInsights,
    youtubeInsights: insights,
    failed: facebookProfileFailed + Number(facebookInsights.failed ?? 0) + Number(insights.failed ?? 0),
  };
}

type DueVideoPublishQueueRow = VideoPublishScheduleRow & {
  id: string;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
};

function completedVideoPublishPlatforms(metadata: Record<string, unknown> | null): string[] {
  const results = metadata?.platformResults;
  if (!results || typeof results !== "object" || Array.isArray(results)) return [];
  return Object.entries(results as Record<string, unknown>)
    .filter(([platform, value]) => {
      if (!["youtube", "facebook_reels", "facebook"].includes(platform)) return false;
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const result = value as Record<string, unknown>;
      return result.ok === true && typeof result.remoteId === "string" && result.remoteId.trim().length > 0;
    })
    .map(([platform]) => platform);
}

async function rebalanceDueVideoPublishBacklog(): Promise<{ rescheduled: number; failed: number }> {
  const now = new Date();
  const cutoff = encodeURIComponent(new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString());
  const rows = await supabaseServerAdminRequest<DueVideoPublishQueueRow[]>(
    "/rest/v1/social_publish_queue?content_type=like.*_video&status=in.(queued,partial,processing,published)&created_at=gte." +
      cutoff +
      "&select=id,status,target_platforms,scheduled_at,published_at,created_at,updated_at,metadata&order=created_at.asc,id.asc&limit=1000",
  );
  const occupiedRows: DueVideoPublishQueueRow[] = (rows ?? []).map((row) => ({
    ...row,
    completed_platforms: completedVideoPublishPlatforms(row.metadata),
  }));
  const dueRows = occupiedRows.filter((row) =>
    (row.status === "queued" || row.status === "partial") &&
    (!row.scheduled_at || Date.parse(row.scheduled_at) <= now.getTime()) &&
    (row.target_platforms ?? []).some((platform) => !(row.completed_platforms ?? []).includes(platform)),
  );
  let rescheduled = 0;
  let failed = 0;

  for (const row of dueRows) {
    const nextScheduledAt = resolveNextVideoPublishAt({
      now,
      rows: occupiedRows.filter((candidate) => candidate.id !== row.id),
      targetPlatforms: (row.target_platforms ?? []).filter((platform) => !(row.completed_platforms ?? []).includes(platform)),
      minimumLeadMinutes: 15,
      searchDays: 60,
    });
    if (!nextScheduledAt) {
      failed += 1;
      continue;
    }
    const nextUpdatedAt = new Date().toISOString();
    const expectedVersion = row.updated_at
      ? "eq." + encodeURIComponent(row.updated_at)
      : "is.null";
    const updated = await supabaseServerAdminRequest<Array<{ id: string }>>(
      "/rest/v1/social_publish_queue?id=eq." + encodeURIComponent(row.id) +
        "&status=eq." + encodeURIComponent(row.status) +
        "&updated_at=" + expectedVersion,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ scheduled_at: nextScheduledAt, updated_at: nextUpdatedAt }),
      },
    );
    if (!updated?.[0]?.id) {
      // A different worker may have claimed or edited this row. Do not claim
      // any more due video rows until the next poll has reconciled that race.
      failed += 1;
      continue;
    }
    const replacement = { ...row, scheduled_at: nextScheduledAt, updated_at: nextUpdatedAt };
    const index = occupiedRows.findIndex((candidate) => candidate.id === row.id);
    if (index >= 0) occupiedRows[index] = replacement;
    rescheduled += 1;
  }
  return { rescheduled, failed };
}

export async function processSocialPublishQueue(limit = 10) {
  if (await isVideoPurgeInProgress()) {
    console.log("[social-worker] Video purge lock is active; no social queue item will be claimed.");
    return { processed: 0, succeeded: 0, deferred: 0, authBlocked: 0, approvalBlocked: 0, failed: 0, purgeLocked: true };
  }
  // A completed render can outlive the generation toggle. Recover its durable
  // social handoff here as well as in the video worker so the separate social
  // workflow can finish it while new video generation is paused.
  try {
    const handoffRecovery = await recoverPendingVideoSocialQueueEnqueues(Math.max(1, Math.min(10, limit)));
    if (handoffRecovery.recovered > 0 || handoffRecovery.deferred > 0) {
      console.log("[social-worker] Video social handoff recovery:", JSON.stringify(handoffRecovery));
    }
  } catch (error) {
    console.error("[social-worker] Video social handoff recovery is unavailable; continuing existing queue processing:", error);
  }
  // Re-slot old due video rows before claiming them. This prevents historical
  // null/past-due rows from bypassing the new per-platform Cairo cadence.
  try {
    const backlogSchedule = await rebalanceDueVideoPublishBacklog();
    if (backlogSchedule.rescheduled > 0 || backlogSchedule.failed > 0) {
      console.log("[social-worker] Video publishing backlog schedule:", JSON.stringify(backlogSchedule));
    }
    if (backlogSchedule.failed > 0) {
      return { processed: 0, succeeded: 0, deferred: 0, authBlocked: 0, approvalBlocked: 0, failed: backlogSchedule.failed, backlogScheduleBlocked: true };
    }
  } catch (error) {
    console.error("[social-worker] Could not safely schedule the video backlog; no queue rows will be claimed:", error);
    return { processed: 0, succeeded: 0, deferred: 0, authBlocked: 0, approvalBlocked: 0, failed: 1, backlogScheduleBlocked: true };
  }
  // Reconcile deferred staging-cleanup metadata for posts already confirmed
  // on every target. The 48-hour retention worker removes only the redundant
  // Supabase staging copy; the public Cloudinary playback master is never deleted.
  const retentionMarkers = await retryPendingPublishedVideoCleanup(Math.max(25, Math.min(100, limit * 2)));
  if (retentionMarkers.attempted > 0) {
    console.log("[social-worker] Published video staging-retention markers refreshed:", JSON.stringify(retentionMarkers));
  }
  const enabledPlatforms = getEnabledSocialPlatforms(process.env);
  const items = enabledPlatforms.length > 0
    ? await claimPendingSocialPublishItems(limit, enabledPlatforms)
    : [];
  let succeeded = 0;
  let deferred = 0;
  let authBlocked = 0;
  let approvalBlocked = 0;
  let failed = 0;

  for (const item of items) {
    const outcome = await processSocialPublishItem(item, { alreadyClaimed: true, enabledPlatforms });
    if (outcome === "published") succeeded += 1;
    else if (outcome === "deferred") deferred += 1;
    else if (outcome === "auth_blocked") authBlocked += 1;
    else if (outcome === "approval_blocked") approvalBlocked += 1;
    else failed += 1;
  }

  return { processed: items.length, succeeded, deferred, authBlocked, approvalBlocked, failed, enabledPlatforms };
}
