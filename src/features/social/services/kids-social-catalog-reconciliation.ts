import { isVideoContentType } from "../../videos/services/video-publish-approval";
import { normalizeSocialPlatformResults, type SocialPlatform } from "./platform-availability";
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
  status: "published";
  platforms: SocialPlatform[];
};

export function isKidsCatalogReconciliationEnabled(
  env: Record<string, string | undefined>,
): boolean {
  return env.SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED?.trim().toLowerCase() === "true";
}

/** Read only published Kids rows whose catalog synchronization is absent or pending. */
export function buildKidsSocialCatalogReconciliationQuery(
  cutoff: string,
  offset: number,
  limit: number,
): string {
  if (!Number.isFinite(Date.parse(cutoff))) {
    throw new Error("Kids catalog reconciliation requires a valid social-publish cutoff.");
  }
  if (!Number.isSafeInteger(offset) || offset < 0 || offset >= KIDS_SOCIAL_CATALOG_RECONCILIATION_MAX_ROWS) {
    throw new Error("Kids catalog reconciliation offset is outside its bounded scan.");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > KIDS_SOCIAL_CATALOG_RECONCILIATION_PAGE_SIZE) {
    throw new Error("Kids catalog reconciliation page size is outside its bounded scan.");
  }
  const select = "id,content_type,content_id,title,body,image_url,video_url,target_platforms,status,scheduled_at,published_at,error_message,metadata,created_at,updated_at";
  return [
    "status=eq.published",
    "metadata->>audience=eq.kids",
    "metadata->>kidsContentQaStatus=eq.passed",
    "or=(metadata->>kidsCatalogSyncStatus.is.null,metadata->>kidsCatalogSyncStatus.eq.pending)",
    "created_at=gte." + encodeURIComponent(cutoff),
    "select=" + select,
    "order=created_at.asc,id.asc",
    "limit=" + limit,
    "offset=" + offset,
  ].join("&");
}

/** Return only complete, confirmed provider results from a published Kids video queue row. */
export function resolveKidsSocialCatalogPublicationSnapshot(
  item: KidsSocialCatalogQueueItem,
): KidsSocialCatalogPublicationSnapshot | null {
  if (
    item.status !== "published" ||
    !isVideoContentType(item.content_type) ||
    !item.content_id?.trim() ||
    !item.video_url?.trim() ||
    item.metadata?.audience !== "kids" ||
    item.metadata?.kidsContentQaStatus !== "passed"
  ) {
    return null;
  }

  const targetValidation = validateStoredSocialTargetPlatforms(item.target_platforms);
  if (!targetValidation.ok) return null;
  const results = normalizeSocialPlatformResults(item.metadata?.platformResults);
  const platforms = targetValidation.platforms.filter((platform) => {
    const result = results[platform];
    if (!result || typeof result !== "object" || Array.isArray(result)) return false;
    const row = result as { ok?: unknown; remoteId?: unknown };
    return row.ok === true && typeof row.remoteId === "string" && row.remoteId.trim().length > 0;
  });
  if (platforms.length !== targetValidation.platforms.length) return null;
  return { status: "published", platforms };
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
