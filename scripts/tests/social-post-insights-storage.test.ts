import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildSocialInsightsQueueCursorFilter,
  readSocialInsightsScanCursor,
  writeSocialInsightsScanCursor,
  type SocialInsightsScanRequest,
} from "../../src/features/social/services/social-insights-scan-cursor";

const read = (path: string) => readFileSync(path, "utf8");
const youtube = read("src/features/social/services/youtube-post-insights.ts");
const facebook = read("src/features/social/services/facebook-reels-insights.ts");
const worker = read("scripts/jobs/social-publishing.ts");
const runner = read("scripts/run-background-jobs.ts");
const adminApi = read("src/app/api/admin/social/route.ts");
const migration = read("supabase/migrations/20261106090800_production_blockers_and_social_insights.sql");
const integration = read("src/features/videos/integrations/youtube.ts");
const stories = read("src/app/stories/page.tsx");
const videos = read("src/app/videos/page.tsx");
const insightsWorkflow = read(".github/workflows/sync-social-insights.yml");

assert.match(youtube, /social_post_insights/);
assert.match(youtube, /buildSocialInsightsQueueCursorFilter\(queryCursor\)/);
assert.match(youtube, /created_at=gte\./);
assert.doesNotMatch(youtube, /offset=/);
assert.match(youtube, /order=created_at\.asc,id\.asc/);
assert.match(youtube, /requireSocialQueueRows<QueueRow>/);
assert.match(youtube, /requireSocialQueueRows<ExistingInsightRow>/);
assert.doesNotMatch(youtube, /\.catch\(\(\) => \[\]\)/, "YouTube freshness query failures must not trigger redundant provider API calls");
assert.match(youtube, /readSocialInsightsScanCursor\("youtube"\)/);
assert.match(youtube, /writeSocialInsightsScanCursor\("youtube", nextCursor\)/);
assert.doesNotMatch(youtube, /PATCH[\s\S]*social_publish_queue/);
assert.doesNotMatch(youtube, /status=eq\.published/);
assert.match(facebook, /social_post_insights/);
assert.match(facebook, /order=created_at\.asc,id\.asc/);
assert.match(facebook, /buildSocialInsightsQueueCursorFilter\(queryCursor\)/);
assert.match(facebook, /created_at=gte\./);
assert.match(facebook, /readSocialInsightsScanCursor\("facebook_reels"\)/);
assert.match(facebook, /writeSocialInsightsScanCursor\("facebook_reels", nextCursor\)/);
assert.match(insightsWorkflow, /"src\/features\/social\/services\/social-insights-scan-cursor\.ts"/);
assert.doesNotMatch(facebook, /status=eq\.published/);
assert.doesNotMatch(facebook, /PATCH[\s\S]*social_publish_queue/);
assert.match(worker, /syncSocialInsights/);
assert.match(runner, /processSocialPublishQueue/);
assert.match(runner, /SOCIAL_SYNC_INSIGHTS/);
assert.doesNotMatch(runner, /reconcileCompletedVideoSocialQueue|Social queue reconciliation/);
assert.match(runner, /processScheduledContent\(20\)/);
assert.match(adminApi, /requireAdminApi\("social\.manage"\)/);
assert.match(adminApi, /requireAdminStepUpApi\("social\.publish"/);
assert.match(adminApi, /dispatchGitHubWorkflow\("publish-social\.yml"/);
assert.match(adminApi, /social_post_insights/);
assert.match(adminApi, /created_at=gte/);
assert.match(adminApi, /limit=200/);
assert.match(adminApi, /limit=500/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.social_post_insights/);
assert.doesNotMatch(migration, /REFERENCES public\.social_publish_queue/i);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /FROM PUBLIC, anon, authenticated/);
assert.match(migration, /FROM public\.social_publish_queue/);
assert.doesNotMatch(migration, /UPDATE public\.social_publish_queue|DELETE FROM public\.social_publish_queue/i);
assert.match(integration, /safeYoutubeErrorMessage/);
assert.doesNotMatch(integration, /YouTube API failed \(\$\{response\.status\}\):/);
assert.match(stories, /export const dynamic = 'force-dynamic'/);
assert.match(videos, /export const dynamic = ["\']force-dynamic["\']/);

const cursorState = new Map<string, unknown>();
const cursorCalls: Array<{ path: string; init?: RequestInit }> = [];
const cursorRequest: SocialInsightsScanRequest = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  cursorCalls.push({ path, init });
  if (init?.method === "POST") {
    const body = JSON.parse(String(init.body)) as { key: string; value: unknown };
    cursorState.set(body.key, body.value);
    return undefined as unknown as T;
  }
  const key = path.match(/key=eq\.([^&]+)/)?.[1] ?? "";
  const value = cursorState.get(key);
  return (value === undefined ? [] : [{ key, value }]) as unknown as T;
};

const scanCursor = {
  createdAt: "2026-11-14T00:00:00.000Z",
  id: "60000000-0000-4000-8000-000000000001",
};
assert.equal(await readSocialInsightsScanCursor("youtube", cursorRequest), null);
await writeSocialInsightsScanCursor("youtube", scanCursor, cursorRequest);
assert.deepEqual(await readSocialInsightsScanCursor("youtube", cursorRequest), scanCursor);
assert.equal(
  buildSocialInsightsQueueCursorFilter(scanCursor),
  "&or=" + encodeURIComponent("(created_at.gt." + scanCursor.createdAt + ",and(created_at.eq." + scanCursor.createdAt + ",id.gt." + scanCursor.id + "))"),
  "social insights pagination must use a stable timestamp-and-ID keyset cursor",
);
assert.ok(cursorCalls.some(call => call.path.includes("key=eq.social_insights_scan_cursor_youtube")));
assert.ok(cursorCalls.some(call => call.init?.method === "POST" && String(call.init.body).includes("social_insights_scan_cursor_youtube")));
await writeSocialInsightsScanCursor("youtube", null, cursorRequest);
assert.equal(await readSocialInsightsScanCursor("youtube", cursorRequest), null);
cursorState.set("social_insights_scan_cursor_youtube", { createdAt: "not-a-date", id: scanCursor.id });
await assert.rejects(
  () => readSocialInsightsScanCursor("youtube", cursorRequest),
  /Stored social insights cursor is invalid/,
  "corrupt scan state must fail closed instead of restarting and repeatedly consuming provider quota",
);
await assert.rejects(
  () => writeSocialInsightsScanCursor("facebook_reels", { createdAt: "invalid", id: scanCursor.id }, cursorRequest),
  /Refusing to persist an invalid social insights cursor/,
);

console.log("✅ Social insights storage is isolated and bounded keyset cursor state is validated.");
