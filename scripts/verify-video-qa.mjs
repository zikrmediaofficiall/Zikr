#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (path) => {
  if (!existsSync(path)) {
    failures.push(`missing required Video QA file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
};

const service = read("src/features/videos/services/videos.ts");
const mediaContract = read("src/features/videos/services/video-media-contract.ts");
for (const token of [
  "function resolveVideoMediaUrl",
  "function resolveVideoThumbnail",
  "https://i.ytimg.com/vi/",
  "metadata.mediaFallbackAvailable !== true",
  'mediaState === "purged"',
]) {
  if (!mediaContract.includes(token)) failures.push(`video media contract missing QA contract: ${token}`);
}
for (const token of [
  'from "./video-media-contract"',
  'from "./video-audience-visibility"',
  "function isPubliclyRenderableVideo",
  "resolveVideoMediaUrl(row)",
  "defaultOgImage",
  "metadata->>audience.eq.general",
  "isGeneralAudienceVideoMetadata(row.metadata)",
  "renderableRows.slice(0, safeLimit)",
]) {
  if (!service.includes(token)) failures.push(`video service missing QA contract: ${token}`);
}
for (const token of [
  "metadata->>audience=eq.kids",
  "metadata->>generator=eq.zikr_internal_video_factory",
  "metadata->>kidsVideoQaStatus=eq.passed",
  "metadata->automatedVideoQa->>status=eq.passed",
  "hasPassedKidsVideoQa(metadata)",
]) {
  if (!service.includes(token)) failures.push(`Kids video service missing QA visibility contract: ${token}`);
}
if (service.includes("metadata.content_ref")) failures.push("generic content_ref must not be treated as a playable video URL");
if (!service.includes("Math.min(100, safeLimit * 2)")) failures.push("video query must over-fetch enough rows to fill the public renderable limit");
if (!service.includes("renderableRows.slice(0, safeLimit)")) failures.push("video service must cap after renderability filtering");

const detail = read("src/app/videos/[slug]/page.tsx");
if (!detail.includes("images: video.thumbnailUrl")) failures.push("video detail metadata must expose the resolved thumbnail");
if (!detail.includes("poster={video.thumbnailUrl || undefined}")) failures.push("direct video player must consume the resolved poster");
if (!detail.includes("video.youtubeId")) failures.push("video detail must retain YouTube playback path");

const site = read("src/lib/site.ts");
if (!site.includes('defaultOgImage = "/branding/og-image.jpg"')) failures.push("QA placeholder must use the canonical optimized local OG image");

const backfill = read("scripts/jobs/backfill-legacy-video-qa.ts");
for (const token of [
  "updated_at=eq.",
  'Prefer: "return=representation"',
  "classifyBackfillPatchResult",
  'status: "stale"',
]) {
  if (!backfill.includes(token)) failures.push(`legacy Video QA backfill missing concurrency guard: ${token}`);
}
const backfillPolicy = read("src/features/videos/services/video-qa-backfill-policy.ts");
if (!backfillPolicy.includes("rows.length === 1") || !backfillPolicy.includes('return "stale"')) {
  failures.push("legacy Video QA backfill must distinguish one-row success from a stale compare-and-set");
}
const backfillTest = read("scripts/tests/video-qa-backfill-policy.test.ts");
if (!backfillTest.includes("zero returned rows is a stale compare-and-set")) {
  failures.push("legacy Video QA backfill stale-write regression test is missing");
}

const worker = read("scripts/jobs/template-video-automation.ts");
for (const token of [
  "assertNarrationQuality",
  "evaluateArabicNarrationText",
  "CURRENT_VIDEO_RENDERER_VERSION",
  "VIDEO_TEMPLATE_VERSION = CURRENT_VIDEO_RENDERER_VERSION",
  "تابع ذِكر للمزيد",
  "resolveDeterministicVideoHook",
  "function audienceCta",
  "اكتشفوا الحلقة القادمة معًا",
  "تدبّر الآية واحفظها وشاركها",
  "category === \"quran\" && !audioUrl",
  "QURAN_AYAH_AUDIO_BASE_URL",
  "resolveVideoComposition",
  "paginateCaptionText(normalizeArabicText(value), lineChars, linesPerPage)",
  "planCaptionTimings(textPages, audioDuration)",
  "audioDuration - 0.55",
  "captionTiming: \"page-weighted-audio-duration\"",
  "buildAutomatedVideoQaChecklist",
  "createAutomatedVideoQaApproval",
  "request.content.kidsVideoQaStatus === \"passed\"",
  "content.kidsVideoQaStatus === \"passed\"",
  "automatedQa.status !== \"passed\"",
  "rightsReviewed",
  "automatedVideoQa: request.content.automatedVideoQa ?? null",
  "gemini-3.8-flash",
]) {
  if (!worker.includes(token)) failures.push(`worker missing narration/video QA contract: ${token}`);
}
for (const token of [
  "force_original_aspect_ratio=increase",
  "crop=${width}:${height}",
  "acompressor=threshold=-18dB",
  "loudnorm=I=-16:TP=-1.5:LRA=11",
  "VIDEO_OUTPUT_CRF",
]) {
  if (!worker.includes(token)) failures.push(`worker missing quality enhancement: ${token}`);
}
const rendererVersion = read("src/features/videos/services/video-template-version.ts");
if (!rendererVersion.includes('CURRENT_VIDEO_RENDERER_VERSION = "2026-11-21-visual-catalog-v12"')) {
  failures.push("central video renderer version must match the validated template worker version");
}

const composition = read("src/features/videos/services/video-composition.ts");
for (const token of ["resolveVideoComposition", "paginateCaptionText", "planCaptionTimings", "cameraPath", "panelPixelWidth", "minimumPageSeconds"]) {
  if (!composition.includes(token)) failures.push(`category composition/caption pacing helper missing: ${token}`);
}
const compositionTest = read("scripts/tests/video-composition.test.ts");
if (!compositionTest.includes("Video composition and audio-aware caption timing tests passed")) failures.push("composition/caption pacing regression tests are not registered in source");
const voiceProfiles = read("src/features/videos/services/voice-profiles.ts");
if (!voiceProfiles.includes("hadith_male_msa")) failures.push("hadith voice profile missing from canonical voice service");
const socialPublisher = read("src/features/social/services/social-publishing.ts");
for (const token of [
  "recoverStaleSocialPublishItems",
  "hasTransientFailure",
  "updated_at=lt.",
  "Video held because automated QA, Kids safety, source provenance, or the current media fingerprint is missing, incomplete or stale.",
  "getYouTubeVideoDisclosure",
  "Video approval lookup failed; holding video item",
]) {
  if (!socialPublisher.includes(token)) failures.push(`social publisher missing automated delivery contract: ${token}`);
}
const approvalService = read("src/features/videos/services/video-publish-approval.ts");
const kidsVideoPublication = read("src/features/videos/services/kids-video-publication.ts");
const adminVideoRequestsClient = read("src/features/admin/video-requests/components/admin-video-requests-client.tsx");
for (const token of [
  "AUTOMATED_VIDEO_QA_ENGINE",
  "AUTOMATED_VIDEO_QA_VERSION",
  "AUTOMATED_VIDEO_QA_REVIEWER_ID",
  "createAutomatedVideoQaApproval",
  "isAutomatedKidsVideoApprovalRecorded",
  "inspectVideoQueueItemExternalApproval",
  "buildVideoApprovalSnapshotHash",
  "normalizeVideoAudience(snapshot.audience)",
  'normalizeVideoMarker(snapshot.kidsVideoQaStatus) !== "passed"',
  'normalizeVideoMarker(content.kidsVideoQaStatus) !== "passed"',
]) {
  if (!approvalService.includes(token)) failures.push(`automated QA approval service missing integrity contract: ${token}`);
}
const kidsVideoPublicReadMigration = read(
  "supabase/migrations/20261124190000_allow_automated_kids_video_publication.sql",
);
for (const token of [
  "DROP POLICY IF EXISTS videos_public_read ON public.videos;",
  "CREATE POLICY videos_public_read",
  "ON public.videos",
  "FOR SELECT",
  "TO anon, authenticated",
  "published IS TRUE",
  "metadata IS NULL",
  "jsonb_typeof(metadata) = 'object'",
  "metadata->>'audience' IS NULL",
  "metadata->>'audience' = 'general'",
  "metadata->>'audience' = 'kids'",
  "metadata->>'generator' = 'zikr_internal_video_factory'",
  "metadata->>'kidsVideoQaStatus' = 'passed'",
  "metadata->'automatedVideoQa'->>'status' = 'passed'",
  "private.video_catalog_has_current_automated_kids_qa(metadata)",
  "metadata->'qualityReview'->>'mode' = 'automated'",
  "metadata->'approvalReviewerId' = 'system:zikr-video-factory'",
  "BEGIN;",
  "COMMIT;",
]) {
  if (!kidsVideoPublicReadMigration.includes(token)) {
    failures.push("Kids video public-read migration missing fail-closed QA-gated RLS contract: " + token);
  }
}
if (/metadata->>'audience'\s*(?:<>|!=)\s*'kids'/i.test(kidsVideoPublicReadMigration)) {
  failures.push("Kids video public-read migration must not treat every non-Kids audience value as general");
}
if (!approvalService.includes("export function isAutomatedKidsVideoApprovalRecorded") ||
    !approvalService.includes('review?.mode === "automated"') ||
    !approvalService.includes("hasCompleteVideoApprovalChecklist(automated.checks)")) {
  failures.push("Kids external publishing must use a matching, complete five-part automated QA record");
}
if (!adminVideoRequestsClient.includes("system:zikr-video-factory") ||
    !adminVideoRequestsClient.includes("اجتاز الفيديو فحوص الجودة الآلية الخمسة") ||
    adminVideoRequestsClient.includes("مراجعة بشرية إلزامية لفيديو الأطفال")) {
  failures.push("the admin video request screen must report automated Kids QA and must not require manual approval");
}
if (/DELETE FROM|TRUNCATE TABLE|DROP TABLE|DISABLE ROW LEVEL SECURITY/i.test(kidsVideoPublicReadMigration)) {
  failures.push("Kids video public-read migration must not mutate video data or disable RLS");
}

const youtubePublisher = read("src/features/videos/services/video-automation.ts");
if (!youtubePublisher.includes("containsSyntheticMedia: options.containsSyntheticMedia === true")) {
  failures.push("YouTube upload must carry the synthetic-media disclosure flag when realistic AI video is used");
}
if (worker.toLowerCase().includes("human qa approval")) {
  failures.push("video generation must not retain a manual human QA gate");
}

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts["video:qa:check"]) failures.push("video:qa:check must be registered");
if (!pkg.scripts["verify:pr"]?.includes("pnpm video:qa:check")) failures.push("verify:pr must include Video QA verification");
if (!pkg.scripts["verify"]?.includes("pnpm video:qa:check")) failures.push("verify must include Video QA verification");

if (failures.length) {
  console.error("VIDEO_QA_CHECK_FAILED");
  for (const failure of failures) console.error(`❌ ${failure}`);
  process.exit(1);
}
console.log("✅ Phase 12 Video QA checks passed");
