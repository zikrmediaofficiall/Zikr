#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (path) => {
  if (!existsSync(path)) {
    failures.push(`missing Admin Video Factory file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
};

const systemActions = read("src/app/admin/system-actions.ts");
if (/video_automation_ai_enabled"\s*\|\|\s*\)/.test(systemActions)) {
  failures.push("video automation boolean setting guard must not contain a trailing logical OR");
}
const permissions = read("src/features/admin/services/permissions.ts");
const createRoute = read("src/app/api/admin/videos/create/route.ts");
if (!createRoute.includes('requireAdminStepUpApi("video.manage"')) failures.push("video create API must require video.manage step-up");
if (!createRoute.includes("SOURCE_LOCKED_CATEGORIES")) failures.push("video create API must enforce source-locked categories");
if (!createRoute.includes("resolveVideoSource")) failures.push("video create API must resolve the canonical source");
if (!createRoute.includes("sourceVerifiedAtRequest: true")) failures.push("video create API must stamp source verification");
if (!createRoute.includes("parseAdminNarrationAssetUrl") || !createRoute.includes("isReadyAdminNarrationAsset") || !createRoute.includes("humanAudioAssetId")) failures.push("human narration must be restricted to the current admin's tracked, audit-ready Cloudinary media asset");
const createAudienceGuardIndex = createRoute.indexOf("const requestedAudience = normalizeVideoAudience(content.audience);");
const createTemplateBranchIndex = createRoute.indexOf('if (typeof content.templateVersionId === "string"');
const createRequestIndex = createRoute.indexOf("const result = await createVideoGenerationRequest({");
const createAudienceGuard = createAudienceGuardIndex >= 0 && createTemplateBranchIndex > createAudienceGuardIndex
  ? createRoute.slice(createAudienceGuardIndex, createTemplateBranchIndex)
  : "";
if (!createAudienceGuard.includes("if (!requestedAudience)") ||
    !createAudienceGuard.includes("audience: requestedAudience") ||
    createRequestIndex <= createTemplateBranchIndex) {
  failures.push("video create API must reject unknown audience markers and persist a canonical audience before optional template handling");
}
if (!createRoute.includes("category === \"quran\"")) failures.push("Quran audio substitution must remain blocked");

const approvalHelper = read("src/features/videos/services/video-publish-approval.ts");
const socialPublishing = read("src/features/social/services/social-publishing.ts");
if (!approvalHelper.includes("approvalReviewerId") || !approvalHelper.includes("approvalSnapshotHash")) {
  failures.push("video approval must be attributed to a reviewer and bound to a snapshot hash");
}
if (!approvalHelper.includes("sourceHash") || !approvalHelper.includes("contentHash") || !approvalHelper.includes("templateVersion")) {
  failures.push("video approval snapshot must bind source, content and template versions");
}
if (!approvalHelper.includes("buildVideoApprovalSnapshotHash")) {
  failures.push("video approval snapshot hashing helper is missing");
}
if (!approvalHelper.includes("normalizeVideoAudience(snapshot.audience)") ||
    !approvalHelper.includes('normalizeVideoMarker(snapshot.kidsVideoQaStatus) !== "passed"') ||
    !approvalHelper.includes('normalizeVideoMarker(content.kidsVideoQaStatus) !== "passed"')) {
  failures.push("Kids audience and safety QA status must be bound to the video approval snapshot");
}
if (!socialPublishing.includes("source_hash,content_hash,template_version")) {
  failures.push("social publisher must fetch current video source/content/template hashes before sending");
}
if (!socialPublishing.includes("hasVideoApprovalForQueueItem(item)")) {
  failures.push("social publisher must revalidate approval after queue claim and before provider calls");
}

const generation = read("src/app/api/admin/video-generation/route.ts");
const manualApprovalStart = generation.indexOf("if (action === 'approve_publish')");
const manualApprovalEnd = generation.indexOf('if (action === "retry_publish")', manualApprovalStart);
const manualApprovalBlock = manualApprovalStart >= 0 && manualApprovalEnd > manualApprovalStart
  ? generation.slice(manualApprovalStart, manualApprovalEnd)
  : "";
if (
  !manualApprovalBlock.includes("KIDS_AUTOMATED_QA_ONLY") ||
  !manualApprovalBlock.includes("if (audience === 'kids')") ||
  !manualApprovalBlock.includes("status: 410") ||
  (manualApprovalBlock.includes("admin_approve_video_generation_request") &&
    manualApprovalBlock.indexOf("KIDS_AUTOMATED_QA_ONLY") > manualApprovalBlock.indexOf("admin_approve_video_generation_request"))
) {
  failures.push("manual Kids approval must be rejected before the atomic approval RPC; only the worker may persist system QA approval");
}
const generationGet = generation.match(/export async function GET\([\s\S]*?(?=export async function DELETE|$)/)?.[0] ?? "";
const generationDelete = generation.match(/export async function DELETE\([\s\S]*?(?=export async function PATCH|$)/)?.[0] ?? "";
const generationPatch = generation.match(/export async function PATCH\([\s\S]*$/)?.[0] ?? "";
if (!generationGet.includes("requireAdminApi('video.manage')")) failures.push("video generation GET must require video.manage");
if (!generationPatch.includes("requireAdminStepUpApi('video.manage'")) failures.push("video generation PATCH must require video.manage step-up");
if (!generationDelete.includes("requireAdminStepUpApi('video.delete'")) failures.push("video generation DELETE must require video.delete step-up");
if (
  !generationDelete.includes("VIDEO_GENERATION_DELETE_REQUIRES_REFERENCE_AUDIT") ||
  !generationDelete.includes("status: 410") ||
  generationDelete.includes("supabaseServerAdminRequest")
) failures.push("legacy video-generation DELETE must remain disabled until media, catalog, and social-queue references are safely inventoried");
const approvalConcurrencyStart = generation.indexOf("if (action === 'approve_publish')");
const approvalConcurrencyEnd = generation.indexOf('if (action === "retry_publish")', approvalConcurrencyStart);
const approvalConcurrencyBlock = approvalConcurrencyStart >= 0 && approvalConcurrencyEnd > approvalConcurrencyStart
  ? generation.slice(approvalConcurrencyStart, approvalConcurrencyEnd)
  : "";
if (
  !approvalConcurrencyBlock.includes("p_expected_request_updated_at") ||
  !approvalConcurrencyBlock.includes("p_expected_catalog_updated_at") ||
  !approvalConcurrencyBlock.includes("current.updated_at") ||
  !approvalConcurrencyBlock.includes("catalog.updated_at")
) {
  failures.push("admin video approval must use optimistic concurrency for both the request and catalog");
}

const retryPublishStart = generation.search(/if\s*\(\s*action\s*===\s*["']retry_publish["']\s*\)/);
const retryPublishEnd = generation.indexOf("DIRECT_VIDEO_STATUS_MUTATION_RETIRED", retryPublishStart);
const retryPublishBlock = retryPublishStart >= 0 && retryPublishEnd > retryPublishStart
  ? generation.slice(retryPublishStart, retryPublishEnd)
  : "";
if (!retryPublishBlock.includes("EXTERNAL_VIDEO_PUBLISHING_RETIRED") || !retryPublishBlock.includes("status: 410")) {
  failures.push("external video publish retry must be retired; internal generation remains available");
}
if (retryPublishBlock.includes("publishToYoutube") || retryPublishBlock.includes("publishToFacebook")) {
  failures.push("retired external publish retry must not call provider upload functions");
}
const videoManagerRole = permissions.match(/video_manager:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
const socialManagerRole = permissions.match(/social_manager:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
if (videoManagerRole.includes("'social.publish'")) {
  failures.push("video_manager must not receive social.publish through the role matrix");
}
if (!socialManagerRole.includes("'social.publish'")) {
  failures.push("social_manager must retain the explicit social.publish permission");
}

const sources = read("src/app/api/admin/video-generation/sources/route.ts");
if (!sources.includes('requireAdminApi("video.manage")')) failures.push("video source API must require video.manage");

const upload = read("src/app/api/admin/video-generation/narration-upload/route.ts");
if (!upload.includes('requireAdminStepUpApi("video.manage"')) failures.push("narration upload must require video.manage step-up");
if (!upload.includes("hasValidAudioSignature")) failures.push("narration upload must validate file signatures");
for (const token of ["ID3", "ftyp", "RIFF", "WAVE", "OggS", "0x1a", "0x45", "0xdf", "0xa3"]) if (!upload.includes(token)) failures.push(`audio signature contract missing: ${token}`);
if (!upload.includes("audio-human-") || !upload.includes("/video/upload")) failures.push("narration upload must use the dedicated Cloudinary audio prefix");
if (upload.includes("/storage/v1/object/videos/")) failures.push("narration upload must not stage audio in Supabase Storage");
const mediaAssetsService = read("src/features/media/services/media-assets.ts");
const narrationRecovery = read("src/features/media/services/narration-upload-recovery.ts");
const studioClient = read("src/features/admin/video-studio/components/admin-video-studio-client.tsx");
const createVideoRoute = read("src/app/api/admin/videos/create/route.ts");
const audioWorker = read("scripts/jobs/template-video-automation.ts");
const audioSourceContract = read("src/features/media/services/video-audio-source.ts");
if (
  !audioSourceContract.includes("parseAdminNarrationAssetUrl") ||
  !audioSourceContract.includes("isCanonicalQuranAyahAudioUrl") ||
  !audioSourceContract.includes("isReadyAdminNarrationAsset") ||
  !audioSourceContract.includes("audio/x-m4a") ||
  !audioSourceContract.includes("MAX_ADMIN_NARRATION_BYTES")
) {
  failures.push("shared audio source contract must validate Cloudinary provenance, canonical Quran URLs, audit-ready media rows, MIME types and size limits");
}
if (
  !createVideoRoute.includes("delete content.audioUrl") ||
  !createVideoRoute.includes("delete content.audioSource") ||
  !createVideoRoute.includes("isReadyAdminNarrationAsset") ||
  !createVideoRoute.includes("humanAudioAssetId")
) {
  failures.push("video creation must discard client audio URLs and require the current admin's ready, audited media_assets row");
}
if (
  !studioClient.includes('assetTrackingStatus !== "ready"') ||
  !studioClient.includes("uploadedAudioAssetId") ||
  !studioClient.includes("humanAudioAssetId")
) {
  failures.push("studio must not attach narration until the media asset is audit-ready and must send its exact asset ID");
}
if (
  !audioWorker.includes("resolveVideoAudioSource") ||
  !audioWorker.includes("isReadyAdminNarrationAsset") ||
  !audioWorker.includes("readBoundedAudioResponse") ||
  !audioWorker.includes('redirect: "error"') ||
  !audioWorker.includes("MAX_VIDEO_AUDIO_BYTES")
) {
  failures.push("video worker must restrict audio fetches to canonical Quran or tracked Cloudinary narration, reject redirects, and bound response bytes");
}
if (!upload.includes("registerAdminNarrationAsset") || !upload.includes("markAdminNarrationAssetAuditRecorded")) {
  failures.push("Cloudinary narration uploads must be durably registered in media_assets before audit success is reported");
}
if (!upload.includes("uploadReference") || !studioClient.includes("مرجع الاسترداد")) {
  failures.push("failed narration upload responses must expose a recovery reference instead of leaving an untraceable Cloudinary object");
}
const cloudinaryResponseFailureStart = upload.indexOf(
  "if (!upload.ok || !result.secure_url || result.public_id !== publicId)",
);
const audioUrlParseStart = upload.indexOf(
  "const parsedUpload = parseAdminNarrationAssetUrl(result.secure_url, cloudName)",
  cloudinaryResponseFailureStart,
);
const invalidCloudinaryUrlStart = upload.indexOf(
  "if (!parsedUpload || parsedUpload.publicId !== publicId)",
  audioUrlParseStart,
);
const assetTrackingStart = upload.indexOf("let mediaAssetId", invalidCloudinaryUrlStart);
const cloudinaryResponseFailureBlock = upload.slice(cloudinaryResponseFailureStart, audioUrlParseStart);
const invalidCloudinaryUrlBlock = upload.slice(audioUrlParseStart, assetTrackingStart);
if (
  cloudinaryResponseFailureStart < 0 ||
  audioUrlParseStart <= cloudinaryResponseFailureStart ||
  !cloudinaryResponseFailureBlock.includes("recoveryReference") ||
  !cloudinaryResponseFailureBlock.includes("...recoveryReference") ||
  !cloudinaryResponseFailureBlock.includes("recoveryRequired: true")
) {
  failures.push("ambiguous Cloudinary response failures must retain the safe returned recovery reference for possible uploaded assets");
}
if (
  audioUrlParseStart < 0 ||
  invalidCloudinaryUrlStart <= audioUrlParseStart ||
  assetTrackingStart <= invalidCloudinaryUrlStart ||
  !invalidCloudinaryUrlBlock.includes("parsedUpload.publicId !== publicId") ||
  !invalidCloudinaryUrlBlock.includes("uploadReference: publicId") ||
  !invalidCloudinaryUrlBlock.includes("recoveryRequired: true") ||
  !upload.includes("secureUrl: parsedUpload.url") ||
  !upload.includes("audioUrl: parsedUpload.url")
) {
  failures.push("invalid or non-canonical Cloudinary URLs must retain a recovery reference for the uploaded asset");
}

const uploadCatchStart = upload.lastIndexOf("} catch (error) {");
const uploadCatchBlock = upload.slice(uploadCatchStart);
if (
  !upload.includes("let recoveryPublicId: string | null = null;") ||
  !upload.includes("let uploadAttempted = false;") ||
  !upload.includes("uploadAttempted = true;") ||
  !uploadCatchBlock.includes("uploadAttempted && recoveryPublicId") ||
  !uploadCatchBlock.includes("uploadReference: recoveryPublicId") ||
  !uploadCatchBlock.includes("recoveryRequired: true")
) {
  failures.push("ambiguous Cloudinary network failures must return the preallocated recovery reference");
}
if (
  !upload.includes("resolveNarrationUploadRecoveryReference(publicId, result.public_id)") ||
  !narrationRecovery.includes("requestedUploadReference") ||
  !studioClient.includes("requestedUploadReference") ||
  !upload.includes('assetTrackingStatus === "reconciliation_pending"')
) {
  failures.push("Cloudinary recovery responses must expose a safe returned ID, the requested ID, and reconciliation-pending reference");
}

if (!mediaAssetsService.includes('purpose: "video_generation_narration"') ||
    !mediaAssetsService.includes('upload_state: "audit_pending"') ||
    !mediaAssetsService.includes("rights_verified: false") ||
    !mediaAssetsService.includes("published: false") ||
    !mediaAssetsService.includes('upload_state: "ready"')) {
  failures.push("narration media assets must remain private, rights-unverified and tracked through audit reconciliation");
}


const service = read("src/features/videos/services/video-automation.ts");
if (!service.includes("updated_at=eq.") || !service.includes("request.updated_at")) failures.push("video queue claims must include optimistic updated_at");

if (!permissions.includes("'video.manage'")) failures.push("video.manage permission missing");
if (!permissions.includes("'video.delete'")) failures.push("video.delete permission missing");
if (!permissions.includes("'video.manage', 'video.delete'")) failures.push("video_manager role must own video permissions");

const hub = read("src/app/admin/video/page.tsx");
for (const [href, route] of [
  ["/admin/video/requests", "src/app/admin/video/requests/page.tsx"],
  ["/admin/video/studio", "src/app/admin/video/studio/page.tsx"],
  ["/admin/video/sources", "src/app/admin/video/sources/page.tsx"],
  ["/admin/video/scripts", "src/app/admin/video/scripts/page.tsx"],
  ["/admin/video/voices", "src/app/admin/video/voices/page.tsx"],
  ["/admin/video/visuals", "src/app/admin/video/visuals/page.tsx"],
  ["/admin/video/templates", "src/app/admin/video/templates/page.tsx"],
  ["/admin/video/qa", "src/app/admin/video/qa/page.tsx"],
]) {
  if (!hub.includes(href)) failures.push(`Canonical Video Hub destination is missing: ${href}`);
  read(route);
}

if (hub.includes("/admin/video-factory/")) {
  failures.push("Canonical Video Hub must not link into the legacy video-factory route tree");
}

const retiredAdminPages = [
  "src/app/admin/videos/page.tsx",
  "src/app/admin/video-factory/page.tsx",
  "src/app/admin/video-factory/sources/page.tsx",
  "src/app/admin/video-factory/scripts/page.tsx",
  "src/app/admin/video-factory/voices/page.tsx",
  "src/app/admin/video-factory/visuals/page.tsx",
  "src/app/admin/video-factory/templates/page.tsx",
  "src/app/admin/video-factory/qa/page.tsx",
  "src/app/admin/video-factory/queue/page.tsx",
  "src/app/admin/video-factory/scheduler/page.tsx",
  "src/app/admin/video-factory/publishing/page.tsx",
];
for (const retiredPath of retiredAdminPages) {
  if (existsSync(retiredPath)) failures.push("Retired admin compatibility page must be deleted, not redirected: " + retiredPath);
}

const page = read("src/app/admin/video/studio/page.tsx");
if (!page.includes('requireAdminPermission("video.manage")')) failures.push("Video Studio admin page must require video.manage");

const canonicalQueue = read("src/app/admin/video/requests/page.tsx");
if (!canonicalQueue.includes("AdminVideoRequestsClient")) failures.push("Video Factory queue must render the feature-owned queue client");
if (!canonicalQueue.includes('requireAdminPermission("video.manage")')) failures.push("Video Factory queue must require video.manage");
const socialClient = read("src/app/admin/social/social-client.tsx");
if (socialClient.includes('href="/admin/video-requests"') || socialClient.includes('href="/admin/videos"')) {
  failures.push("Video review links must target the canonical /admin/video/requests page, not a missing route");
}
const hasVideoReviewShortcut =
  socialClient.includes("طلبات تحتاج مراجعة") || socialClient.includes("مراجعة الفيديوهات");
if (
  !socialClient.includes('href="/admin/video/requests"') ||
  !socialClient.includes('href="/admin/video/review"') ||
  !hasVideoReviewShortcut
) {
  failures.push("Publishing video-review actions must link to the canonical protected review queue and all video requests");
}

for (const adminPage of [
  "src/app/admin/video/page.tsx",
  "src/app/admin/audio/tts/page.tsx",
  "src/app/admin/audio/quran/page.tsx",
]) {
  const source = read(adminPage);
  if (!source.includes('requireAdminPermission("video.manage")') && !source.includes('requireAdminPermission("audio.manage")')) {
    failures.push(`${adminPage} must be protected by its canonical admin permission`);
  }
}

const client = read("src/features/admin/video-studio/components/admin-video-studio-client.tsx");
if (client.includes("SUPABASE_SERVICE_ROLE_KEY") || client.includes("createAdminClient")) failures.push("AI video client must not contain service-role access");
const studioClientRoute = read("src/app/admin/video/studio/page.tsx");
if (!studioClientRoute.includes('@/features/admin/video-studio/components/admin-video-studio-client')) failures.push("Video Studio must import its client from feature ownership");
if (!canonicalQueue.includes('@/features/admin/video-requests/components/admin-video-requests-client')) failures.push("Video Requests page must import its client from feature ownership");
if (existsSync("src/app/admin/ai-video/ai-video-client.tsx")) failures.push("Legacy AI video client must be moved out of app route folders");
if (existsSync("src/app/admin/videos/videos-client.tsx")) failures.push("Legacy Video Requests client must be moved out of app route folders");

const templateApi = read("src/app/api/admin/video/templates/route.ts");
const templateStudio = read("src/features/admin/video-templates/components/template-studio-client.tsx");
const templateConfig = read("src/features/videos/services/template-config.ts");
const templateVersion = read("src/features/videos/services/video-template-version.ts");
if (!templateApi.includes('requireAdminApi("video.manage")')) failures.push("template registry API must require video.manage");
for (const action of ["create-version", "approve-version", "activate-version", "preview-version"]) {
  if (!templateApi.includes(action)) failures.push(`template registry API action is missing: ${action}`);
}
if (!templateApi.includes("created_by === auth.profile.id")) failures.push("template review must require a reviewer different from the author");
if (!templateApi.includes("skipSocialPublish: true") || !templateApi.includes("templatePreview: true")) failures.push("template previews must be marked internal and excluded from social publishing");
if (!templateStudio.includes("TemplateStudioClient") || !templateStudio.includes("معاينات الرندر الأخيرة")) failures.push("Admin must render the versioned Template Studio and preview history");
for (const token of ["parseVideoTemplateConfig", "isVideoTemplateAssetAllowedForAudience", "videoTemplateAssetPath"]) {
  if (!templateConfig.includes("export function " + token)) failures.push(`template renderer config validation missing: ${token}`);
}
if (!templateVersion.includes("CURRENT_VIDEO_RENDERER_VERSION")) failures.push("a shared immutable renderer version identifier is required");
const createVideoApi = read("src/app/api/admin/videos/create/route.ts");
if (!createVideoApi.includes("templateVersion.status !== \"active\"")) failures.push("normal video creation must pin an active template version only");
if (!createVideoApi.includes("versionedTemplateLabel")) failures.push("normal video requests must persist the exact template version label");
const videoAutomation = read("src/features/videos/services/video-automation.ts");
for (const token of ["source_hash: sourceHashValue", "content_hash: contentHashValue", "template_version: templateVersion"]) {
  if (!videoAutomation.includes(token)) failures.push(`manual video requests must persist ${token}`);
}
if (!templateApi.includes("/rest/v1/rpc/admin_create_video_template_version") || !templateApi.includes("/rest/v1/rpc/activate_video_template_version")) {
  failures.push("template version creation/activation must use atomic database functions");
}
if (!templateApi.includes("recordAdminAuditEvent")) failures.push("template actions must be included in the admin audit stream");

const worker = read("scripts/jobs/template-video-automation.ts");
const approvalRoute = read("src/app/api/admin/video-generation/route.ts");
const approvalService = read("src/features/videos/services/video-publish-approval.ts");
const contentPublisher = read("scripts/jobs/content-publishing.ts");
const backgroundRunner = read("scripts/run-background-jobs.ts");
if (!worker.includes("async function bindTemplateVersion")) failures.push("video worker must bind requests to an immutable template version");
if (!worker.includes("request.content.templatePreview === true")) failures.push("template preview mode must be recognized by the renderer");
if (!worker.includes("if (!isTemplatePreview && !isLaylProgram && !isHadyProgram && !isProphetStoryRequest) aiPlan = await generateAiVideoPlan(request, signal)")) failures.push("internal template previews, Layl and Hady scripts, and source-locked Prophet stories must avoid external generative planning");
if (!worker.includes("registerGeneratedVideoOnSite(request, rendered, {}, signal)") || !worker.includes('generator: "zikr_internal_video_factory"')) {
  failures.push("successfully generated videos must be persisted in the internal ZIKR catalog");
}
if (!read("scripts/jobs/content-publishing.ts").includes('"videos"')) failures.push("scheduled site publisher must support videos records");
const internalVideoQueueMigration = read("supabase/migrations/20261106160000_allow_internal_videos_in_content_publish_queue.sql");
if (!internalVideoQueueMigration.includes("'videos'") || !internalVideoQueueMigration.includes("content_publish_queue_content_table_check")) {
  failures.push("Supabase content publication queue constraint must explicitly allow internal videos");
}
if (!worker.includes("source_hash: rendered.sourceHash") || !worker.includes("content_hash: rendered.contentHash") || !worker.includes("template_version: rendered.templateVersion")) {
  failures.push("completed manual renders must persist source, content and template integrity fingerprints");
}
const generationWorkflow = read(".github/workflows/generate-ai-video.yml");
const providerTypes = read("src/features/videos/providers/types.ts");
if (
  !generationWorkflow.includes('VIDEO_FREE_ONLY: "true"') ||
  !generationWorkflow.includes('HF_WAN_VIDEO_ENABLED: "true"') ||
  !generationWorkflow.includes('HF_LTX_FAST_VIDEO_ENABLED: "true"') ||
  !generationWorkflow.includes('VIDEO_PROVIDER_ORDER: "hf_wan,hf_ltx_fast,template"') ||
  !generationWorkflow.includes('GEMINI_AUDIO_SMOKE_TEST: "false"') ||
  !providerTypes.includes("return !config.freeOnly && config.aiEnabled && Boolean(env.GEMINI_API_KEY?.trim())")
) {
  failures.push("scheduled video generation must explicitly enable free Hugging Face providers while keeping paid Gemini planning disabled in free-only mode");
}
const leaseWrappedSocialEnqueue = /await\s+withLeaseHeartbeat\s*\(\s*\(signal\)\s*=>\s*queueSocialItems\s*\(\s*request\s*,\s*rendered\.videoUrl\s*,\s*signal\s*\)\s*,?\s*\)/.test(worker);
if (!/async\s+function\s+queueSocialItems\s*\(/.test(worker) ||
    !leaseWrappedSocialEnqueue ||
    !worker.includes('status: "queued"') ||
    !worker.includes("automation_key: queueAutomationKey") ||
    !worker.includes("reserveScheduledAt") ||
    !worker.includes("scheduled_at: scheduledAt") ||
    !worker.includes("buildQueuePayload(targets, socialKey, scheduledAt)")) {
  failures.push("new generated videos may create only idempotent queued social candidates with a reserved Cairo publishing slot");
}
const processingSocialQueueBranch = worker.match(
  /if\s*\(\s*existing\.status\s*===\s*["']processing["']\s*\)\s*\{([\s\S]*?)\n\s*\}/,
)?.[1] ?? "";
if (!/newlyEnabledTargets\.length\s*>\s*0/.test(processingSocialQueueBranch) ||
    !/queueSupplementalTargets\(newlyEnabledTargets\)/.test(processingSocialQueueBranch) ||
    !/return\s+["']queued["']/.test(processingSocialQueueBranch) ||
    !worker.includes(":late:${target}") ||
    !/buildVideoSocialQueueUpdateFilter\s*\(\s*existing\.id,\s*existing\.status,\s*existing\.updated_at\s*\)/.test(worker) ||
    !/const\s+latest\s*=\s*await\s+findSocialQueueByAutomationKey\(socialKey,\s*signal\)/.test(worker) ||
    !/queueSupplementalTargets\(latestNewTargets\)/.test(worker)) {
  failures.push("video social queue expansion must preserve active publisher leases and use compare-and-set for non-processing rows");
}
if (worker.includes("publishToYoutube(") || worker.includes("publishToFacebook(") ||
    worker.includes("https://www.googleapis.com/upload/youtube/v3/videos") ||
    worker.includes("graph.facebook.com")) {
  failures.push("video generation must never call external platform publishing APIs directly");
}
if (!generationWorkflow.includes('AUTO_VIDEO_PUBLISH_REQUIRES_APPROVAL: "false"') ||
    !worker.includes("buildAutomatedVideoQaChecklist") ||
    !worker.includes("createAutomatedVideoQaApproval") ||
    !worker.includes("automatedQa.status !== \"passed\"")) {
  failures.push("new video candidates must use a complete automated QA snapshot instead of a manual approval gate");
}
if (!socialPublishing.includes("hasVideoApprovalForQueueItem(item)") ||
    !socialPublishing.includes("Video held because automated QA, Kids safety, source provenance, or the current media fingerprint is missing, incomplete or stale.") ||
    !socialPublishing.includes("Video approval lookup failed; holding video item") ||
    !approvalHelper.includes("inspectVideoQueueItemExternalApproval") ||
    !approvalHelper.includes("isAutomatedKidsVideoApprovalRecorded")) {
  failures.push("the social worker must fail closed and revalidate source-locked automated QA, Kids safety, and the current media fingerprint before provider calls");
}
if (!worker.includes("!isTemplatePreview &&") || !worker.includes("!boundTemplate &&")) failures.push("pinned template renders must not be handed to external video providers");
for (const [path, destinations] of [
  ["src/app/admin/audio/tts/page.tsx", ["/admin/video/voices", "/admin/video/scripts"]],
  ["src/app/admin/audio/quran/page.tsx", ["/admin/video/voices"]],
  ["src/app/admin/automation/page.tsx", ["/admin/video/voices", "/admin/video/scripts", "/admin/video/qa"]],
]) {
  const source = read(path);
  if (source.includes("/admin/video-factory/")) failures.push(`${path} still links into the legacy video-factory tree`);
  for (const destination of destinations) {
    if (!source.includes(destination)) failures.push(`${path} is missing canonical destination ${destination}`);
  }
}

const routeManifest = JSON.parse(read("public/manus-routes.json"));
for (const route of [
  "/admin/queues",
  "/admin/video",
  "/admin/video/requests",
  "/admin/video/studio",
  "/admin/video/studio/curated",
  "/admin/video/sources",
  "/admin/video/scripts",
  "/admin/video/voices",
  "/admin/video/visuals",
  "/admin/video/templates",
  "/admin/video/qa",
  "/data-deletion",
  "/kids/parent-dashboard",
]) {
  if (!routeManifest.routes.some((entry) => entry.path === route)) {
    failures.push(`Manus route manifest is missing canonical route: ${route}`);
  }
}

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts["admin:video:check"]) failures.push("admin:video:check must be registered");
if (!pkg.scripts["verify:pr"]?.includes("pnpm admin:video:check")) failures.push("verify:pr must include Admin Video Factory verification");
if (!pkg.scripts["verify"]?.includes("pnpm admin:video:check")) failures.push("verify must include Admin Video Factory verification");
if (!read("src/features/videos/services/voice-profiles.ts").includes("hadith_male_msa")) failures.push("canonical hadith male voice profile missing");
if (!read("src/features/videos/services/narration-quality.ts").includes("evaluateArabicNarrationText")) failures.push("Arabic narration quality validator missing");
if (!worker.includes("wordsPerSecond")) failures.push("Video worker missing speaking-rate checks");
for (const token of [
  "approvalStatus: typeof request.content.approvalStatus === \"string\"",
  "approvalReviewerId: typeof request.content.approvalReviewerId === \"string\"",
  "approvalSnapshotHash: typeof request.content.approvalSnapshotHash === \"string\"",
  "contentFormat: typeof request.content.contentFormat === \"string\"",
  "aiMode: typeof request.content.aiMode === \"string\"",
]) {
  if (!worker.includes(token)) failures.push("Video catalog row must retain the exact generation approval contract: " + token);
}
const catalogApprovalHelper = approvalService.slice(
  approvalService.indexOf("export function buildVideoCatalogApprovalPatch"),
  approvalService.indexOf("export function isVideoApprovalRecorded"),
);
if (!catalogApprovalHelper.includes("metadata.videoGenerationRequestId !== requestId") ||
    !catalogApprovalHelper.includes('metadata.mediaState === "purged"') ||
    !catalogApprovalHelper.includes("requestContent.approvalStatus !== \"approved\"") ||
    catalogApprovalHelper.includes("published: true")) {
  failures.push("Manual video approval must be source-locked, reject purged media, and leave publication to the scheduled content queue");
}
for (const token of [
  "buildVideoCatalogApprovalPatch",
  "/rest/v1/videos?slug=eq.",
  "catalogApprovalRecorded: true",
]) {
  if (!approvalRoute.includes(token)) failures.push("Admin approval must record approval only on the matching internal video catalog row: " + token);
}
if (approvalRoute.includes("publishedInternally: true") || approvalRoute.includes("catalogPublished: true")) {
  failures.push("Admin approval must not claim that the internal content-publishing queue has already published the video");
}
const internalVideoMediaValidation = contentPublisher.match(
  /const parsed = new URL\(mediaUrl\);([\s\S]*?)\n\s*\} catch \{/,
)?.[1] ?? "";
if (!contentPublisher.includes("content_publish_queue") ||
    !contentPublisher.includes("inspectVideoQueueItemApproval") ||
    !contentPublisher.includes("!approval.approved") ||
    !internalVideoMediaValidation.includes('metadata.mediaState !== "purged"') ||
    !internalVideoMediaValidation.includes('metadata.mediaState !== "unlinked"') ||
    !contentPublisher.includes("row.published !== false")) {
  failures.push("Internal video publication must remain behind the scheduled content queue's QA and media-state checks");
}
if (!backgroundRunner.includes("processScheduledContent(20)") ||
    !backgroundRunner.includes('const social = target === "all" || target === "social"') ||
    backgroundRunner.indexOf("processScheduledContent(20)") > backgroundRunner.indexOf('const social = target === "all" || target === "social"')) {
  failures.push("Scheduled internal content publication must run before external social publishing");
}

if (!worker.includes("VIDEO_PLAN_SYSTEM_INSTRUCTION") ||
    !worker.includes("systemInstruction: { parts: [{ text: systemInstruction }] }") ||
    !worker.includes('contents: [{ role: "user", parts: [{ text: userPayload }] }]') ||
    !worker.includes("sourceText,")) {
  failures.push("video planning must isolate fixed editorial policy from untrusted source data in the Gemini system-instruction channel");
}

const atomicVideoApprovalStart = approvalRoute.indexOf("if (action === 'approve_publish')");
const atomicVideoApprovalEnd = approvalRoute.indexOf('if (action === "retry_publish")', atomicVideoApprovalStart);
const atomicVideoApprovalBlock = atomicVideoApprovalStart >= 0 && atomicVideoApprovalEnd > atomicVideoApprovalStart
  ? approvalRoute.slice(atomicVideoApprovalStart, atomicVideoApprovalEnd)
  : "";
// The approval itself must use one atomic service-only RPC. Layl may then
// compare-and-set its separate internal content_publish_queue row; that PATCH
// is queue recovery, not a direct request/catalog approval mutation.
const atomicApprovalRpcEnd = atomicVideoApprovalBlock.indexOf("let laylSitePublishQueueStatus");
const atomicApprovalMutationBlock = atomicApprovalRpcEnd >= 0
  ? atomicVideoApprovalBlock.slice(0, atomicApprovalRpcEnd)
  : atomicVideoApprovalBlock;
if (
  !atomicVideoApprovalBlock.includes("/rest/v1/rpc/admin_approve_video_generation_request") ||
  !atomicVideoApprovalBlock.includes("p_expected_request_updated_at") ||
  !atomicVideoApprovalBlock.includes("p_expected_catalog_updated_at") ||
  !atomicVideoApprovalBlock.includes("p_approved_content") ||
  !atomicVideoApprovalBlock.includes("p_catalog_metadata") ||
  atomicApprovalMutationBlock.includes("method: 'PATCH'") ||
  atomicApprovalMutationBlock.includes('method: "PATCH"')
) {
  failures.push("Human video approval must atomically compare-and-set the request and catalog through the service-only approval RPC");
}
const atomicVideoApprovalMigration = read("supabase/migrations/20261115153600_admin_video_approval_atomic.sql");
for (const token of [
  "CREATE OR REPLACE FUNCTION public.admin_approve_video_generation_request",
  "FOR UPDATE",
  "VIDEO_APPROVAL_CONFLICT",
  "p_approved_content - v_request_approval_fields",
  "p_catalog_metadata - v_catalog_approval_fields",
  "kidsVideoQaStatus",
  "seriesId",
  "automatedVideoQa",
  "v_request_approval_fields := v_request_approval_fields || ARRAY['kidsVideoQaStatus']",
  "v_catalog_approval_fields := v_catalog_approval_fields || ARRAY[",
  "v_catalog.metadata->>'audience' IS DISTINCT FROM 'kids'",
  "v_request.content->'automatedVideoQa'->>'status' IS DISTINCT FROM 'passed'",
  "v_catalog.metadata->'automatedVideoQa'->>'status' IS DISTINCT FROM 'passed'",
  "coalesce(p_approved_content->>'seasonNumber' ~ '^[1-9][0-9]*$', false) IS NOT TRUE",
  "p_approved_content->'automatedVideoQa'->>'snapshotHash' IS DISTINCT FROM v_request.content->'automatedVideoQa'->>'snapshotHash'",
  "REVOKE ALL ON FUNCTION public.admin_approve_video_generation_request",
  "GRANT EXECUTE ON FUNCTION public.admin_approve_video_generation_request",
]) {
  if (!atomicVideoApprovalMigration.includes(token)) {
    failures.push("Atomic human video approval migration is missing its concurrency, immutability, or service-role-only guard: " + token);
  }
}
const atomicApprovalWorkflow = read(".github/workflows/quality-gate.yml");
if (!atomicApprovalWorkflow.includes("scripts/tests/video-approval-atomic.integration.sh")) {
  failures.push("Atomic video approval rollback regression must run in the canonical Quality Gate");
}


if (failures.length) {
  console.error("ADMIN_VIDEO_FACTORY_CHECK_FAILED");
  for (const failure of failures) console.error(`❌ ${failure}`);
  process.exit(1);
}
console.log("✅ Phase 15 Admin Video Factory checks passed");
