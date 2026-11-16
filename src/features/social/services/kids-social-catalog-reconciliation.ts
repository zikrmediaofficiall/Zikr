import { isVideoContentType } from "../../videos/services/video-publish-approval";
import { getManualReconciliationPlatforms, normalizeSocialPlatformResults, type SocialPlatform } from "./platform-availability";
import { resolveKidsVideoSocialPublication } from "./kids-video-social-visibility";
import { validateStoredSocialTargetPlatforms } from "./social-queue-selection";

export const KIDS_SOCIAL_CATALOG_RECONCILIATION_PAGE_SIZE = 25;
export const KIDS_SOCIAL_CATALOG_RECONCILIATION_MAX_ROWS = 100;
export const KIDS_SOCIAL_CATALOG_RECONCILIATION_MAX_ATTEMPTS = 8;

export type KidsSocialCatalogQueueItem = {
  id: string;
  content_type: string;
  content_id: string | null;
  video_url: string | null;
  target_platforms: unknown;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
};

export type KidsSocialCatalogPublicationSnapshot = {
  status: "published" | "partial";
  platforms: SocialPlatform[];
};

export function isKidsCatalogReconciliationEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return env.SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED?.trim().toLowerCase() === "true";
}

/** Read only published or partially published Kids rows whose catalog synchronization is absent or pending. */
export function buildKidsSocialCatalogReconciliationQuery(
  cutoff: string,
  offset: number,
  limit: number,
): string {
  if (!Number.isFinite(Date.parse(cutoff))) {
    throw new Error("Kids catalog reconciliation requires a valid reconciliation cutoff.");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > KIDS_SOCIAL_CATALOG_RECONCILIATION_PAGE_SIZE) {
    throw new Error("Kids catalog reconciliation page size is outside its bounded scan.");
  }
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > KIDS_SOCIAL_CATALOG_RECONCILIATION_MAX_ROWS - limit) {
    throw new Error("Kids catalog reconciliation offset is outside its bounded scan.");
  }
  const select = "id,content_type,content_id,title,body,image_url,video_url,target_platforms,status,scheduled_at,published_at,error_message,metadata,created_at,updated_at";
  return [
    "status=in.(published,partial)",
    "metadata->>audience=eq.kids",
    "metadata->>kidsContentQaStatus=eq.passed",
    "or=(metadata->>kidsCatalogSyncStatus.is.null,metadata->>kidsCatalogSyncStatus.eq.pending)",
    "updated_at=gte." + encodeURIComponent(cutoff),
    "select=" + select,
    "order=updated_at.asc,id.asc",
    "limit=" + limit,
    "offset=" + offset,
  ].join("&");
}

/** Return only complete, confirmed provider results from a published Kids video queue row. */
export function resolveKidsSocialCatalogPublicationSnapshot(
  item: KidsSocialCatalogQueueItem,
): KidsSocialCatalogPublicationSnapshot | null {
  if (
    !["processing", "queued", "partial", "failed", "published"].includes(item.status) ||
    !isVideoContentType(item.content_type) ||
    !item.content_id?.trim() ||
    !item.video_url?.trim() ||
    item.metadata?.audience !== "kids" ||
    item.metadata?.kidsContentQaStatus !== "passed" ||
    item.metadata?.kidsCatalogSyncManualReconciliationRequired === true ||
    getManualReconciliationPlatforms(item.metadata).length > 0
  ) {
    return null;
  }

  const targetValidation = validateStoredSocialTargetPlatforms(item.target_platforms);
  if (!targetValidation.ok) return null;

  const publicationAt = typeof item.published_at === "string" && Number.isFinite(Date.parse(item.published_at))
    ? item.published_at
    : item.updated_at;
  if (!Number.isFinite(Date.parse(publicationAt))) return null;
  const resolved = resolveKidsVideoSocialPublication(
    [{ ...item, status: "partial", published_at: publicationAt }],
    null,
    true,
    false,
  );
  if (!resolved) return null;

  const platforms = targetValidation.platforms.filter((platform) => resolved.platforms.includes(platform));
  if (platforms.length === 0) return null;

  const missingPlatforms = targetValidation.platforms.filter((platform) => !platforms.includes(platform));
  if (item.status === "published" && missingPlatforms.length > 0) {
    const results = normalizeSocialPlatformResults(item.metadata?.platformResults);
    const deletions = asRecord(item.metadata?.platformDeletions);
    const manualReconciliationPlatforms = getManualReconciliationPlatforms(item.metadata);
    const everyMissingPlatformWasDeleted = missingPlatforms.every((platform) => {
      const result = asRecord(results[platform]);
      const deletion = asRecord(deletions[platform]);
      const remoteId = typeof result.remoteId === "string" ? result.remoteId.trim() : "";
      return !manualReconciliationPlatforms.includes(platform) &&
        deletion.status === "deleted" &&
        remoteId.length > 0 &&
        typeof deletion.remoteId === "string" &&
        deletion.remoteId.trim() === remoteId;
    });
    if (!everyMissingPlatformWasDeleted) return null;
  }

  return {
    status: platforms.length === targetValidation.platforms.length ? "published" : "partial",
    platforms,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * Reopen the best-effort catalog mirror after a confirmed remote deletion.
 * Manual holds are preserved; only a new, verified deletion can reset a normal
 * pending/synced marker for a Kids video.
 */
export function buildKidsCatalogDeletionSyncPatch(
  contentType: unknown,
  metadata: Record<string, unknown> | null | undefined,
  deletion: unknown,
): Record<string, unknown> {
  if (
    typeof contentType !== "string" ||
    !isVideoContentType(contentType) ||
    metadata?.audience !== "kids" ||
    asRecord(deletion).status !== "deleted"
  ) {
    return {};
  }

  if (
    metadata.kidsCatalogSyncManualReconciliationRequired === true ||
    getManualReconciliationPlatforms(metadata).length > 0
  ) return {};

  const currentStatus = metadata.kidsCatalogSyncStatus;
  if (
    currentStatus === "held" ||
    (currentStatus !== null &&
      currentStatus !== undefined &&
      currentStatus !== "pending" &&
      currentStatus !== "synced")
  ) {
    return {};
  }

  return {
    kidsCatalogSyncStatus: "pending",
    kidsCatalogSyncAttempts: 0,
    kidsCatalogSyncLastAttemptAt: null,
    kidsCatalogSyncLastError: null,
    kidsCatalogSyncSyncedAt: null,
  };
}

export function isKidsSocialCatalogPublicationInSync(
  catalogMetadata: Record<string, unknown> | null | undefined,
  snapshot: KidsSocialCatalogPublicationSnapshot,
): boolean {
  const publication = catalogMetadata?.socialPublication;
  if (!publication || typeof publication !== "object" || Array.isArray(publication)) return false;
  const record = publication as Record<string, unknown>;
  if (
    record.status !== snapshot.status ||
    typeof record.publishedAt !== "string" ||
    !Number.isFinite(Date.parse(record.publishedAt)) ||
    !Array.isArray(record.platforms)
  ) {
    return false;
  }
  const existing = record.platforms.filter((platform): platform is string => typeof platform === "string").sort();
  const expected = [...snapshot.platforms].sort();
  return existing.length === expected.length && existing.every((platform, index) => platform === expected[index]);
}

export function shouldResetKidsCatalogSyncAfterPublicationChange(
  currentSyncStatus: unknown,
  previousSnapshot: KidsSocialCatalogPublicationSnapshot | null,
  nextSnapshot: KidsSocialCatalogPublicationSnapshot | null,
): boolean {
  if (currentSyncStatus !== "synced" || !nextSnapshot) return false;
  if (!previousSnapshot) return true;
  if (previousSnapshot.status !== nextSnapshot.status) return true;
  const previousPlatforms = [...previousSnapshot.platforms].sort();
  const nextPlatforms = [...nextSnapshot.platforms].sort();
  return previousPlatforms.length !== nextPlatforms.length ||
    previousPlatforms.some((platform, index) => platform !== nextPlatforms[index]);
}

export function buildKidsCatalogSyncFailureState(
  metadata: Record<string, unknown> | null | undefined,
  reason: string,
  attemptedAt: string,
): {
  status: "pending" | "held";
  attempts: number;
  lastAttemptAt: string;
  lastError: string;
  manualReconciliationRequired: boolean;
} {
  if (!Number.isFinite(Date.parse(attemptedAt))) {
    throw new Error("Kids catalog sync failure requires a valid attempt timestamp.");
  }
  const previous = Number(metadata?.kidsCatalogSyncAttempts ?? 0);
  const previousAttempts = Number.isSafeInteger(previous) && previous >= 0 ? previous : 0;
  const attempts = previousAttempts + 1;
  const status = attempts >= KIDS_SOCIAL_CATALOG_RECONCILIATION_MAX_ATTEMPTS ? "held" : "pending";
  return {
    status,
    attempts,
    lastAttemptAt: attemptedAt,
    lastError: reason.trim().slice(0, 500) || "Unknown catalog synchronization failure.",
    manualReconciliationRequired: status === "held",
  };
}
