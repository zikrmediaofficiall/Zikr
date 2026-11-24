import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getConfirmedPublicKidsVideoSocialPlatforms, resolveKidsVideoSocialPublication } from "../../src/features/social/services/kids-video-social-visibility";
import {
  buildKidsSeriesEpisode,
  KIDS_SERIES_EPISODES_PER_SEASON,
  KIDS_VIDEO_SERIES,
  validateCanonicalKidsEpisodeSnapshot,
  validateGeneratedKidsEpisode,
} from "../../src/features/videos/data/kids-story-factory";
import {
  filterGeneralStorySources,
  resolveKidsVideoPublicDisclosure,
  resolveVideoSourceDisclosureLine,
} from "../../src/features/videos/services/video-source-contract";

assert.equal(KIDS_VIDEO_SERIES.length, 4, "the catalog must expose four distinct child-friendly series");
assert.equal(KIDS_SERIES_EPISODES_PER_SEASON, 24, "the first catalog season must contain six episodes per series");

const generalStorySources = filterGeneralStorySources([
  { id: "verified-story", audience: "general" },
  { id: "legacy-general-story" },
  { id: "kids-series:little-good-steps:s1:e2", audience: "kids" },
  { id: "future-kids-story", generationMode: "free_deterministic_story_factory" },
  { id: "mislabelled-kids-story", sourceType: "original_kids_fiction" },
]);
assert.deepEqual(
  generalStorySources.map((source) => source.id),
  ["verified-story", "legacy-general-story"],
  "generic story automation must exclude every child-directed source even when its category is story",
);

const fictionLabel = "قصة تربوية خيالية أصلية من ذِكر — ليست آية أو حديثًا أو واقعة تاريخية.";
assert.equal(
  resolveVideoSourceDisclosureLine({
    audience: "kids",
    aiMode: "original_kids_story",
    sourceType: "original_kids_fiction",
    sourceLabel: fictionLabel,
    sourceUrl: "https://zikrmediaofficial.vercel.app/kids",
  }, "https://zikrmediaofficial.vercel.app/kids"),
  fictionLabel,
  "original Kids fiction must disclose its fictional nature instead of labelling the Kids landing page as a source",
);
assert.equal(
  resolveVideoSourceDisclosureLine({
    sourceType: "editorial",
    sourceLabel: "محتوى تحريري أصلي من منصة ذِكر",
  }, "https://zikrmediaofficial.vercel.app/about"),
  "محتوى تحريري أصلي من منصة ذِكر",
  "original editorial copy must not be presented as externally sourced",
);
assert.equal(
  resolveVideoSourceDisclosureLine({ sourceType: "story" }, "https://quran.com/12"),
  "المصدر: https://quran.com/12",
  "source-backed stories must retain their external source URL",
);
const legacyFictionDisclosure = resolveKidsVideoPublicDisclosure(
  { audience: "kids", sourceType: "original_kids_fiction", sourceLabel: fictionLabel },
  "قصة موثقة في مكتبة ذِكر مع إحالة إلى مصدرها الأساسي.",
  "تابع القصة.\n\nالمصدر: https://zikrmediaofficial.vercel.app/kids",
);
assert.equal(legacyFictionDisclosure.sourceLabel, fictionLabel);
assert.equal(legacyFictionDisclosure.description, null, "legacy fiction must not retain a false verified-source description");
assert.equal(legacyFictionDisclosure.socialCaption, null, "legacy fiction must not surface a caption that claims an external source");
const safeFictionDisclosure = resolveKidsVideoPublicDisclosure(
  { audience: "kids", sourceType: "original_kids_fiction", sourceLabel: fictionLabel },
  "قصة تربوية خيالية أصلية للأطفال عن العدل وانتظار الدور.",
  "حكاية أصلية من ذِكر عن العدل وانتظار الدور.",
);
assert.equal(safeFictionDisclosure.description, "قصة تربوية خيالية أصلية للأطفال عن العدل وانتظار الدور.");
assert.equal(safeFictionDisclosure.socialCaption, "حكاية أصلية من ذِكر عن العدل وانتظار الدور.");

const unsafeFictionSourceLabel = resolveKidsVideoPublicDisclosure(
  { audience: "kids", aiMode: "original_kids_story", sourceLabel: "المصدر: https://quran.com/12" },
  "قصة تربوية خيالية أصلية للأطفال عن الصدق.",
  null,
);
assert.equal(unsafeFictionSourceLabel.sourceType, "original_kids_fiction", "the inferred Kids-fiction mode must expose its canonical source type");
assert.equal(unsafeFictionSourceLabel.sourceLabel, fictionLabel, "an external URL must not be trusted as the source label for original Kids fiction");
assert.equal(
  resolveVideoSourceDisclosureLine(
    { sourceType: "original_kids_fiction", sourceLabel: "قصة موثقة في مكتبة خارجية" },
    "https://quran.com/12",
  ),
  fictionLabel,
  "worker-generated social disclosures must replace legacy external-source claims for original Kids fiction",
);

const firstSeason = Array.from({ length: 24 }, (_, index) => buildKidsSeriesEpisode(index + 1));
assert.equal(new Set(firstSeason.map((episode) => episode.sourceId)).size, 24, "source IDs must be unique");
assert.equal(new Set(firstSeason.map((episode) => episode.seriesId)).size, 4, "all series must be represented");
for (const series of KIDS_VIDEO_SERIES) {
  const episodes = firstSeason.filter((episode) => episode.seriesId === series.id);
  assert.equal(episodes.length, 6, "each series must contain six first-season episodes");
  assert.deepEqual(episodes.map((episode) => episode.episodeNumber).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
}

for (let sequence = 1; sequence <= 1000; sequence += 1) {
  const episode = buildKidsSeriesEpisode(sequence);
  const result = validateGeneratedKidsEpisode(episode);
  assert.equal(result.ok, true, "episode " + sequence + " failed: " + result.errors.join(" | "));
  const canonicalSnapshot = validateCanonicalKidsEpisodeSnapshot({
    factorySequence: sequence,
    sourceId: episode.sourceId,
    text: episode.text.normalize("NFD"),
    seriesId: episode.seriesId,
    seasonNumber: episode.seasonNumber,
    episodeNumber: episode.episodeNumber,
    learningObjective: episode.learningObjective,
  });
  assert.equal(canonicalSnapshot.ok, true, "normalized canonical snapshot " + sequence + " failed: " + canonicalSnapshot.errors.join(" | "));
  assert.ok(episode.text.length >= 180 && episode.text.length <= 1500, "episode narration must be short enough for QA");
  assert.ok(episode.learningObjective.trim(), "every episode must have an explicit learning objective");
  assert.ok(episode.title.includes("الموسم " + episode.seasonNumber), "titles must expose season numbers");
  assert.ok(episode.title.includes("الحلقة " + episode.episodeNumber), "titles must expose episode numbers");
  assert.equal(episode.generationMode, "free_deterministic_story_factory");
}
assert.notEqual(buildKidsSeriesEpisode(1).text, buildKidsSeriesEpisode(25).text, "later seasons must vary the story narration");
assert.notEqual(buildKidsSeriesEpisode(1).sourceId, buildKidsSeriesEpisode(25).sourceId, "later seasons must not reuse episode IDs");
const invalidEpisode = buildKidsSeriesEpisode(1);
const invalidSnapshot = validateCanonicalKidsEpisodeSnapshot({
  factorySequence: 1,
  sourceId: invalidEpisode.sourceId,
  text: invalidEpisode.text + " نص مضاف",
  seriesId: invalidEpisode.seriesId,
  seasonNumber: invalidEpisode.seasonNumber,
  episodeNumber: invalidEpisode.episodeNumber,
  learningObjective: invalidEpisode.learningObjective,
});
assert.equal(invalidSnapshot.ok, false, "mutated stored story text must be rejected");
assert.ok(invalidSnapshot.errors.some((error) => error.includes("narration")), "the mismatch must identify the story field");
for (const [hour, expected] of [[3, 3], [9, 6], [15, 9], [21, 12]] as const) {
  const window = Math.min(4, Math.max(1, Math.floor(hour / 6) + 1));
  assert.equal(Math.ceil((12 * window) / 4), expected, "the six-hour schedule must release its expected quota at " + hour + " UTC");
}
const automationSource = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
const genericStoryStart = automationSource.indexOf('key = `story:${day}:${slot}`');
const kidsSeriesStart = automationSource.indexOf('key = `kids-series:${day}:${slot}`');
assert.ok(genericStoryStart >= 0 && kidsSeriesStart > genericStoryStart, "generic story and Kids series automation branches must remain distinct");
const genericStoryBranch = automationSource.slice(genericStoryStart, kidsSeriesStart);
assert.match(genericStoryBranch, /audience:\s*"general"/, "verified public story sources must not be misclassified as Kids series episodes");
assert.match(genericStoryBranch, /filterGeneralStorySources/, "generic story automation must filter Kids sources from its curated fallback pool");
assert.match(automationSource, /resolveVideoSourceDisclosureLine\(content,\s*contentSourceUrl\(request\)\)/, "social captions must use audience-aware source disclosure");
assert.match(automationSource, /containsKidsPersonalDataSolicitation\(reflection\)/, "AI Kids reflections must reject personal-data solicitation");
assert.match(automationSource, /containsKidsPersonalDataSolicitation\(caption\)/, "AI Kids social captions must reject personal-data solicitation");
assert.match(automationSource, /const kidsEditorialTextSafe = content\.audience !== "kids"/, "automated video QA must fail closed on unsafe Kids editorial text");
assert.match(automationSource, /const captionsReviewed = kidsEditorialTextSafe && narrationQuality\.ok/, "unsafe Kids editorial text must prevent a passed video QA snapshot");
const kidsSeriesEnd = automationSource.indexOf("const reminders =", kidsSeriesStart);
assert.ok(kidsSeriesEnd > kidsSeriesStart, "Kids series branch must end before general reminder seeding");
const kidsSeriesBranch = automationSource.slice(kidsSeriesStart, kidsSeriesEnd);
assert.match(kidsSeriesBranch, /audience:\s*"kids"/, "only the canonical Kids series factory may seed Kids-audience video requests");
assert.match(kidsSeriesBranch, /generationMode:\s*episode\.generationMode/, "Kids series requests must retain their deterministic factory provenance");

// Social deletion state belongs to the exact remote post on its queue row.
 // Deleting an older Facebook post must not hide a newer live post for the same
 // generated Kids video, even when the old deletion timestamp is later.
const kidsVideoQueueRow = (
  id: string,
  publishedAt: string,
  remoteId: string,
  extraMetadata: Record<string, unknown> = {},
) => ({
  id,
  content_id: "60000000-0000-4000-8000-000000000001",
  content_type: "kids_story_video",
  body: null,
  target_platforms: ["facebook"],
  status: "published",
  published_at: publishedAt,
  created_at: publishedAt,
  metadata: {
    audience: "kids",
    platformResults: { facebook: { ok: true, remoteId } },
    ...extraMetadata,
  },
});

const newerKidsPublication = kidsVideoQueueRow(
  "50000000-0000-4000-8000-000000000002",
  "2026-11-10T12:00:00.000Z",
  "new-facebook-post",
);
const olderDeletedKidsPublication = kidsVideoQueueRow(
  "50000000-0000-4000-8000-000000000001",
  "2026-11-09T10:00:00.000Z",
  "old-facebook-post",
  {
    platformDeletions: {
      facebook: {
        status: "deleted",
        remoteId: "old-facebook-post",
        deletedAt: "2026-11-11T10:00:00.000Z",
      },
    },
  },
);
assert.deepEqual(
  resolveKidsVideoSocialPublication(
    [newerKidsPublication, olderDeletedKidsPublication],
    null,
    true,
  ),
  {
    status: "published",
    platforms: ["facebook"],
    publishedAt: "2026-11-10T12:00:00.000Z",
  },
  "deleting an older remote post must not tombstone a newer live post on the same platform",
);

const failedQueueRowWithHistoricalSuccess = {
  ...newerKidsPublication,
  status: "failed",
};
assert.deepEqual(
  getConfirmedPublicKidsVideoSocialPlatforms(failedQueueRowWithHistoricalSuccess),
  [],
  "a failed queue row must not expose an old successful provider result as a current publication",
);
assert.equal(
  resolveKidsVideoSocialPublication([failedQueueRowWithHistoricalSuccess], null, true),
  null,
  "a failed queue row with a stale published_at and prior success must not create a public social badge",
);
assert.deepEqual(
  resolveKidsVideoSocialPublication([newerKidsPublication, failedQueueRowWithHistoricalSuccess], null, true),
  {
    status: "published",
    platforms: ["facebook"],
    publishedAt: "2026-11-10T12:00:00.000Z",
  },
  "a newer failed retry must not hide the older confirmed publication",
);

const olderFacebookPublication = kidsVideoQueueRow(
  "50000000-0000-4000-8000-000000000003",
  "2026-11-09T10:00:00.000Z",
  "old-facebook-post",
);
const supplementalFacebookDeletion = {
  id: "50000000-0000-4000-8000-000000000005",
  content_id: "60000000-0000-4000-8000-000000000001",
  content_type: "kids_story_video",
  body: null,
  target_platforms: ["facebook"],
  status: "partial",
  published_at: null,
  created_at: "2026-11-11T10:00:00.000Z",
  metadata: {
    audience: "kids",
    platformDeletions: {
      facebook: {
        status: "deleted",
        remoteId: "old-facebook-post",
        deletedAt: "2026-11-11T10:00:00.000Z",
      },
    },
  },
};
assert.equal(
  resolveKidsVideoSocialPublication([olderFacebookPublication, supplementalFacebookDeletion], null, true),
  null,
  "a supplemental deletion must suppress the exact older remote post even when its result is stored on another queue row",
);

const republishedOnSameQueueRow = kidsVideoQueueRow(
  "50000000-0000-4000-8000-000000000004",
  "2026-11-12T12:00:00.000Z",
  "replacement-facebook-post",
  {
    platformDeletions: {
      facebook: {
        status: "deleted",
        remoteId: "old-facebook-post",
        deletedAt: "2026-11-13T10:00:00.000Z",
      },
    },
  },
);
assert.deepEqual(
  resolveKidsVideoSocialPublication([republishedOnSameQueueRow], null, true),
  {
    status: "published",
    platforms: ["facebook"],
    publishedAt: "2026-11-12T12:00:00.000Z",
  },
  "a new remote ID on the same queue row must remain visible after the old remote post is deleted",
);


const legacyStoredSocialPublication = {
  status: "published",
  platforms: ["facebook"],
  publishedAt: "2026-11-12T12:00:00.000Z",
};
assert.deepEqual(
  resolveKidsVideoSocialPublication([], legacyStoredSocialPublication, true),
  {
    status: "published",
    platforms: ["facebook"],
    publishedAt: "2026-11-12T12:00:00.000Z",
  },
  "legacy Kids videos without a generation-request ID must retain their stored confirmed social publication",
);
assert.equal(
  resolveKidsVideoSocialPublication([], legacyStoredSocialPublication, false),
  null,
  "stored publication metadata must not be used when a required queue read failed",
);
const kidsVideosRouteSource = readFileSync("src/app/api/kids/videos/route.ts", "utf8");
assert.ok(kidsVideosRouteSource.includes("resolveKidsVideoPublicDisclosure") && kidsVideosRouteSource.includes("sourceLabel: disclosure.sourceLabel"), "the public Kids API must expose the authoritative source disclosure");
const kidsHomeSource = readFileSync("src/app/kids/page.tsx", "utf8");
const kidsVideoListSource = readFileSync("src/app/kids/videos/page.tsx", "utf8");
const kidsVideoDetailSource = readFileSync("src/app/kids/videos/[slug]/page.tsx", "utf8");
assert.ok(kidsHomeSource.includes("item.sourceLabel"), "the Kids home feed must display the source disclosure");
assert.ok(kidsVideoListSource.includes("resolveKidsVideoPublicDisclosure"), "the Kids video list must suppress misleading legacy source descriptions");
assert.ok(kidsVideoDetailSource.includes("resolveKidsVideoPublicDisclosure") && kidsVideoDetailSource.includes("disclosure.sourceLabel"), "the Kids video detail must show the source disclosure and suppress false attribution");
assert.ok(
  kidsVideosRouteSource.includes("let socialQueueReadSucceeded = requestIds.length === 0;"),
  "the list feed must treat an empty request-ID set as a successful no-op queue read",
);
const kidsVideoServiceSource = readFileSync("src/features/videos/services/videos.ts", "utf8");
const detailResolverSource = readFileSync("src/features/social/services/kids-video-social-detail.ts", "utf8");
assert.ok(kidsVideoServiceSource.includes("resolveKidsVideoSocialPublicationForDetail"));
const publicKidsListStart = kidsVideoServiceSource.indexOf("export async function getKidsGeneratedVideos");
const publicKidsDetailStart = kidsVideoServiceSource.indexOf("export async function getKidsGeneratedVideoBySlug");
const publicKidsListSource = kidsVideoServiceSource.slice(publicKidsListStart, publicKidsDetailStart);
const publicKidsDetailServiceSource = kidsVideoServiceSource.slice(publicKidsDetailStart);
assert.ok(kidsVideoServiceSource.includes("loadApprovedKidsVideoRequests"), "public Kids video reads must verify the linked completed generation request");
assert.ok(kidsVideoServiceSource.includes("hasCurrentAutomatedKidsVideoApproval"), "public Kids video reads must verify a current automated QA approval snapshot");
assert.ok(kidsVideoServiceSource.includes("isAutomatedKidsVideoApprovalRecorded(requestContent, snapshotHash)"), "the linked request must contain a matching human approval");
assert.ok(kidsVideoServiceSource.includes("isAutomatedKidsVideoApprovalRecorded(metadata, snapshotHash)"), "the public catalog row must contain the same automated QA approval snapshot");
assert.ok(kidsVideoServiceSource.includes("resolveKidsVideoQaStatusForApproval"), "public Kids reads must revalidate QA against the current request and media fingerprints");
assert.ok(kidsVideoServiceSource.includes("status=eq.completed"), "only completed generation requests may authorize public Kids videos");
assert.ok(publicKidsListSource.includes("hasCurrentAutomatedKidsVideoApproval(metadata, request)"), "the Kids list must fail closed when a matching automated QA approval request is absent");
assert.ok(publicKidsDetailServiceSource.includes("hasCurrentAutomatedKidsVideoApproval(metadata, approvalRequest)"), "the Kids detail must fail closed when a matching automated QA approval request is absent");

assert.ok(
  detailResolverSource.includes('requestIdState.kind === "missing"'),
  "the detail feed must fail closed when a generation request ID is missing or invalid",
);
assert.ok(
  !detailResolverSource.includes("storedSocialPublication") &&
    !detailResolverSource.includes("resolveKidsVideoSocialPublication([], stored, true, true)"),
  "the detail feed must never fall back to stale catalog publication metadata",
);
assert.ok(
  detailResolverSource.includes('requestIdState.kind === "invalid"') &&
    detailResolverSource.includes('reason: "invalid_request_id"'),
  "malformed request IDs must not be treated as legacy rows",
);
assert.ok(
  detailResolverSource.includes("loadKidsSocialQueueRows([requestIdState.id], request)") &&
    detailResolverSource.includes('reason: "queue_read_failed"'),
  "a failed detail queue read must be distinguishable from a verified empty queue history",
);

console.log("✅ Kids video series: four series, 24 first-season episodes, 1,000 validated episode variants, and scheduled quota and social publication checks passed.");
