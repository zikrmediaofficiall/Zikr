import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const library = read("src/app/admin/library/page.tsx");
const queues = read("src/app/admin/queues/page.tsx");
const knowledge = read("src/features/admin/services/knowledge.ts");
const videos = read("src/app/videos/page.tsx");
const facebookPosts = read("src/features/social/services/facebook-public-posts.ts");
const mediaRoute = read("src/app/api/admin/media/route.ts");
const mediaClient = read("src/app/admin/media/media-client.tsx");

const videoSourcesPage = read("src/app/admin/video/sources/page.tsx");
const videoSourcesLogo = read("src/features/admin/video-sources/components/source-logo.tsx");
const youtubeSocialClient = read("src/app/admin/social/social-client.tsx");
const videoRequestApi = read("src/app/api/admin/videos/route.ts");
assert.match(videoSourcesPage, /content_agent_sources/);
assert.match(videoSourcesPage, /safeEndpointLabel/);
assert.match(videoSourcesPage, /source_type/);
assert.match(videoSourcesLogo, /onError/);
assert.match(youtubeSocialClient, /youtubeLastCheckedAt/);
assert.match(youtubeSocialClient, /youtubeReadSource/);
assert.match(youtubeSocialClient, /youtubeUploadReady/);
assert.match(videoRequestApi, /resolveCloudinaryVideoPoster/);

const migration = read("supabase/migrations/20261110085520_add_hadith_chapter.sql");

assert.ok(
  library.includes("x.review_status === 'editorial_review' || x.review_status === 'scholarly_review'"),
  "Library review metric must exclude approved and published records",
);
assert.ok(queues.includes('"completed", "retry_wait", "failed"'), "Video queue must expose completed jobs");
assert.ok(queues.includes('"generated", "approved", "published", "completed"'), "Translation queue must expose generated and approved jobs");
assert.ok(queues.includes('"published", "partial", "failed"'), "Social queue must expose successful publications");
assert.ok(knowledge.includes("readAdminRows<KnowledgeBook>"), "Knowledge books must use the protected admin read path");
assert.ok(knowledge.includes("chapter,grade_ar"), "Knowledge hadith query must match the migrated schema");
assert.ok(videos.includes("getFacebookPublishedPosts(6)"), "Video hub must read confirmed Facebook posts");
assert.ok(!videos.includes("facebook.com/plugins/page.php"), "Video hub must not depend on the broken Facebook Page Plugin iframe");
assert.ok(facebookPosts.includes('delivery?.ok === true'), "Only successful Facebook delivery ledger rows may be shown");
assert.ok(facebookPosts.includes("remoteId"), "Published Facebook cards must link to a confirmed remote post ID");
assert.ok(facebookPosts.includes("isGeneralAudienceVideoMetadata(row.metadata)"), "The general video hub must exclude Kids and unknown-audience Facebook posts");
assert.ok(facebookPosts.includes("metadata->>audience.eq.general"), "The public Facebook query must select only legacy/general-audience posts");
assert.ok(facebookPosts.includes("isSocialPlatformDeletionCurrent(deletion, remoteId, row.published_at)"), "The public video hub must hide Facebook posts only when the matching remote delivery is confirmed deleted");
assert.match(migration, /add column if not exists chapter text/i);
assert.equal(mediaRoute.split("runPostCommitAudit(").length - 1, 2, "Media create/update must report post-commit audit outcomes");
assert.ok(mediaRoute.includes("{ asset, auditRecorded }"), "Media upload response must expose audit recording status");
assert.ok(mediaRoute.includes("{ ok: true, auditRecorded }"), "Media update response must expose audit recording status");
assert.ok(mediaClient.includes("payload.auditRecorded === false"), "Media UI must surface audit failures without inviting a duplicate mutation");
assert.ok(mediaClient.includes("لا تعِد رفعه") && mediaClient.includes("لا تكرر الإجراء"), "Media UI must tell admins not to retry a committed mutation when audit logging fails");
assert.ok(mediaClient.includes("value={license} maxLength={120}"), "Media license input must match the API's 120-character limit");

console.log("Admin screen, Facebook feed, and media audit regression contracts passed.");
