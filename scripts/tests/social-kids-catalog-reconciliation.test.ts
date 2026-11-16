import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildKidsCatalogSyncFailureState,
  buildKidsSocialCatalogReconciliationQuery,
  isKidsCatalogReconciliationEnabled,
  isKidsSocialCatalogPublicationInSync,
  resolveKidsSocialCatalogPublicationSnapshot,
} from "../../src/features/social/services/kids-social-catalog-reconciliation";

const queueItem = {
  id: "50000000-0000-4000-8000-000000000001",
  content_type: "kids_story_video",
  content_id: "60000000-0000-4000-8000-000000000001",
  video_url: "https://res.cloudinary.com/example/video/upload/kids.mp4",
  target_platforms: ["facebook", "youtube"],
  status: "published",
  published_at: "2026-11-15T10:00:00.000Z",
  created_at: "2026-11-15T09:00:00.000Z",
  updated_at: "2026-11-15T10:00:00.000Z",
  metadata: {
    audience: "kids",
    kidsContentQaStatus: "passed",
    platformResults: {
      facebook: { ok: true, remoteId: "facebook-post-123" },
      youtube: { ok: true, remoteId: "youtube-video-123" },
    },
  },
};

assert.equal(isKidsCatalogReconciliationEnabled({}), false);
assert.equal(isKidsCatalogReconciliationEnabled({ SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED: "false" }), false);
assert.equal(isKidsCatalogReconciliationEnabled({ SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED: " true " }), true);

const query = buildKidsSocialCatalogReconciliationQuery("2026-11-01T00:00:00.000Z", 25, 25);
assert.match(query, /^status=in\.\(published,partial\)&/);
assert.ok(query.includes("metadata->>audience=eq.kids"));
assert.ok(query.includes("metadata->>kidsContentQaStatus=eq.passed"));
assert.ok(query.includes("metadata->>kidsCatalogSyncStatus.is.null"));
assert.ok(query.includes("metadata->>kidsCatalogSyncStatus.eq.pending"));
assert.ok(query.includes("created_at=gte.2026-11-01T00%3A00%3A00.000Z"));
assert.ok(query.includes("order=created_at.asc,id.asc&limit=25&offset=25"));
assert.throws(() => buildKidsSocialCatalogReconciliationQuery("invalid", 0, 25), /valid social-publish cutoff/);
assert.throws(() => buildKidsSocialCatalogReconciliationQuery("2026-11-01T00:00:00Z", 100, 25), /bounded scan/);
assert.throws(() => buildKidsSocialCatalogReconciliationQuery("2026-11-01T00:00:00Z", 0, 26), /page size/);

const snapshot = resolveKidsSocialCatalogPublicationSnapshot(queueItem);
assert.deepEqual(snapshot, { status: "published", platforms: ["facebook", "youtube"] });
const partialQueueItem = {
  ...queueItem,
  status: "partial",
  metadata: {
    ...queueItem.metadata,
    platformResults: {
      facebook: { ok: true, remoteId: "facebook-post-123" },
      youtube: { ok: false, error: "temporary provider failure" },
    },
  },
};
assert.deepEqual(
  resolveKidsSocialCatalogPublicationSnapshot(partialQueueItem),
  { status: "partial", platforms: ["facebook"] },
  "partial queue rows with a confirmed provider ID must remain eligible for catalog reconciliation",
);
assert.deepEqual(
  resolveKidsSocialCatalogPublicationSnapshot({ ...queueItem, status: "processing" }),
  { status: "published", platforms: ["facebook", "youtube"] },
  "the live in-flight row must resolve to a published snapshot after every target has a confirmed remote ID",
);
assert.deepEqual(
  resolveKidsSocialCatalogPublicationSnapshot({
    ...queueItem,
    status: "processing",
    metadata: {
      ...queueItem.metadata,
      platformResults: {
        facebook: { ok: true, remoteId: "facebook-post-123" },
        youtube: { ok: false, error: "temporary provider failure" },
      },
    },
  }),
  { status: "partial", platforms: ["facebook"] },
  "the live publishing path must persist confirmed partial successes without waiting for the scheduled reconciler",
);
assert.equal(
  resolveKidsSocialCatalogPublicationSnapshot({ ...queueItem, metadata: { ...queueItem.metadata, audience: "general" } }),
  null,
  "general-audience videos do not enter the Kids catalog reconciler",
);
assert.equal(
  resolveKidsSocialCatalogPublicationSnapshot({ ...queueItem, metadata: { ...queueItem.metadata, kidsContentQaStatus: "pending" } }),
  null,
  "Kids rows without a current QA pass must not be reconciled",
);
assert.equal(
  resolveKidsSocialCatalogPublicationSnapshot({
    ...queueItem,
    metadata: { ...queueItem.metadata, platformResults: { facebook: { ok: true, remoteId: "facebook-post-123" } } },
  }),
  null,
  "a published row with a missing target result is inconsistent and must be held",
);
assert.deepEqual(
  resolveKidsSocialCatalogPublicationSnapshot({
    ...queueItem,
    status: "processing",
    metadata: {
      ...queueItem.metadata,
      platformResults: { facebook: { ok: true, remoteId: "facebook-post-123" } },
    },
  }),
  { status: "partial", platforms: ["facebook"] },
  "the in-flight processing row must still sync a confirmed partial provider result after queue finalization",
);
assert.equal(
  resolveKidsSocialCatalogPublicationSnapshot({
    ...queueItem,
    target_platforms: ["facebook", "facebook"],
  }),
  null,
  "duplicate provider targets must not be treated as a complete publication",
);

const matchingMetadata = {
  socialPublication: {
    status: "published",
    platforms: ["youtube", "facebook"],
    publishedAt: "2026-11-15T10:00:00.000Z",
  },
};
assert.equal(isKidsSocialCatalogPublicationInSync(matchingMetadata, snapshot!), true);
assert.equal(
  isKidsSocialCatalogPublicationInSync({
    socialPublication: { status: "partial", platforms: ["facebook"], publishedAt: "2026-11-15T10:00:00.000Z" },
  }, snapshot!),
  false,
);
assert.equal(
  isKidsSocialCatalogPublicationInSync({
    socialPublication: { status: "published", platforms: ["facebook", "youtube"], publishedAt: "invalid" },
  }, snapshot!),
  false,
);

const firstFailure = buildKidsCatalogSyncFailureState({}, "CAS conflict", "2026-11-15T10:00:00.000Z");
assert.deepEqual(firstFailure, {
  status: "pending",
  attempts: 1,
  lastAttemptAt: "2026-11-15T10:00:00.000Z",
  lastError: "CAS conflict",
  manualReconciliationRequired: false,
});
const finalFailure = buildKidsCatalogSyncFailureState(
  { kidsCatalogSyncAttempts: 7 },
  "Catalog row changed",
  "2026-11-15T11:00:00.000Z",
);
assert.equal(finalFailure.status, "held");
assert.equal(finalFailure.attempts, 8);
assert.equal(finalFailure.manualReconciliationRequired, true);

const service = readFileSync("src/features/social/services/social-publishing.ts", "utf8");
const reconcilerStart = service.indexOf("export async function reconcilePublishedKidsVideoCatalog");
const reconcilerEnd = service.indexOf("\nasync function syncYouTubeVideoReferenceToCatalog", reconcilerStart);
assert.ok(reconcilerStart >= 0 && reconcilerEnd > reconcilerStart, "the catalog reconciler must be present as an isolated service path");
const reconciler = service.slice(reconcilerStart, reconcilerEnd);
assert.ok(reconciler.includes("checkVideoCatalogPublication(item)"), "the reconciler must revalidate the current request and human approval");
assert.ok(reconciler.includes("syncKidsSocialPublicationToCatalog(item, item.metadata ?? {})"));
assert.ok(reconciler.includes("markKidsCatalogSyncState"));
assert.ok(reconciler.includes("hasEnoughCandidates: () => false"), "the bounded inventory must be read before row writes");
assert.doesNotMatch(reconciler, /publishFacebook|publishToFacebook|publishToYoutube/, "catalog reconciliation must not call external providers");

const workflow = readFileSync(".github/workflows/publish-social.yml", "utf8");
assert.match(
  workflow,
  /SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED:\s*\$\{\{\s*vars\.SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED\s*\|\|\s*'false'\s*\}\}/,
  "the production publisher must pass through the opt-in catalog-only reconciliation flag and keep it disabled by default",
);

const environmentDocs = readFileSync("docs/environment-variables.md", "utf8");
assert.ok(
  environmentDocs.includes("reconciliation pauses whenever either publishing gate is off"),
  "the catalog-only switch must document that the current runner still requires the Admin auto-publish and SOCIAL_PUBLISH_ENABLED gates",
);

const worker = readFileSync("scripts/jobs/social-publishing.ts", "utf8");
assert.ok(worker.includes("reconcilePublishedKidsVideoCatalog()"), "the scheduled worker must run the opt-in reconciler");
const operations = readFileSync("docs/admin/SOCIAL_PUBLISHING_OPERATIONS.md", "utf8");
assert.ok(operations.includes("SOCIAL_KIDS_CATALOG_RECONCILIATION_ENABLED"));
assert.ok(operations.includes("does not call Facebook/YouTube"));

console.log("Kids social catalog reconciliation policy and safety contracts passed.");
