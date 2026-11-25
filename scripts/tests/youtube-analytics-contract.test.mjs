import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/features/admin/services/traffic-revenue.ts", "utf8");
const panel = readFileSync("src/features/admin/components/traffic-revenue-panel.tsx", "utf8");
const metricsHelper = readFileSync("src/features/admin/services/traffic-revenue-metrics.ts", "utf8");
const credentials = readFileSync("src/features/social/services/youtube-oauth-credentials.ts", "utf8");

assert.match(service, /YOUTUBE_CLIENT_ID/);
assert.match(service, /YOUTUBE_CLIENT_SECRET/);
assert.match(service, /getYouTubeRefreshToken/);
assert.match(service, /inspectStoredYouTubeAnalyticsCredential/);
assert.match(credentials, /export async function inspectStoredYouTubeAnalyticsCredential/);
assert.match(service, /yt-analytics|youtubeanalytics\.googleapis\.com/);
assert.match(service, /insightTrafficSourceType/);
assert.match(service, /estimatedMinutesWatched/);
assert.match(service, /averageViewDuration/);
assert.match(service, /subscribersGained/);
assert.match(service, /subscribersLost/);
assert.match(service, /unstable_cache/);
assert.match(metricsHelper, /authorization_required/);
assert.match(metricsHelper, /scope_missing/);
assert.match(service, /youtubeAnalyticsConnected/);
assert.doesNotMatch(service, /console\.(log|error|warn)\([^\n]*(accessToken|refreshToken|clientSecret)/i);
assert.match(panel, /تحليلات قناة YouTube/);
assert.match(metricsHelper, /أعد ربط القناة بعد التحقق من الحساب المطلوب/);
assert.match(panel, /getYoutubeAnalyticsStatusPresentation/);
assert.match(panel, /snapshot\.youtubeAnalytics\.message/);
assert.match(panel, /youtubeAnalyticsStatus\.canReauthorize/);
assert.match(panel, /مصادر الزيارات إلى فيديوهات القناة/);
assert.match(panel, /متوسط مدة المشاهدة/);
console.log("✅ YouTube Analytics authorization and reporting contracts passed.");

assert.match(metricsHelper, /YouTube Analytics API غير مفعّل/);
assert.match(metricsHelper, /حصة YouTube Analytics مستنفدة/);
assert.match(metricsHelper, /صلاحية Analytics مفقودة/);
assert.doesNotMatch(panel, /يحتاج إلى youtube\.upload/);
