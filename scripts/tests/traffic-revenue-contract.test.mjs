import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/features/admin/services/traffic-revenue.ts", "utf8");
const panel = readFileSync("src/features/admin/components/traffic-revenue-panel.tsx", "utf8");
const youtubeConnect = readFileSync("src/app/api/admin/social/youtube/connect/route.ts", "utf8");
const page = readFileSync("src/app/admin/analytics/page.tsx", "utf8");
const metricsHelper = readFileSync("src/features/admin/services/traffic-revenue-metrics.ts", "utf8");
const permissions = readFileSync("src/features/admin/services/permissions.ts", "utf8");

assert.match(service, /select\("id", \{ count: "exact", head: true \}\)/);
assert.match(service, /video_generation_requests/);
assert.match(service, /from\("articles"\)/);
assert.match(service, /from\("videos"\)/);
assert.doesNotMatch(service, /social_publish_queue|social_platform_profiles|socialProfiles|socialPlatformStats/);
assert.doesNotMatch(service, /socialQueued|socialPublished|socialCreated24h|socialFailed/);
assert.doesNotMatch(service, /\.select\([^)]*(?:page_access_token|access_token)/i);
assert.match(service, /GA4_REFRESH_TOKEN/);
assert.match(service, /GA4_PROPERTY_ID/);
assert.match(service, /analyticsdata\.googleapis\.com/);
assert.match(service, /sessionDefaultChannelGroup/);
assert.match(service, /landingPagePlusQueryString/);
assert.match(service, /getCachedGa4AnalyticsSnapshot/);
assert.match(service, /ga4ReportingConnected: ga4Analytics\.status === "connected"/);
assert.match(service, /getYouTubeRefreshToken/);
assert.match(service, /getCachedYoutubeAnalyticsSnapshot/);
assert.match(service, /inspectStoredYouTubeAnalyticsCredential/);
assert.match(service, /classifyYoutubeOAuthTokenError/);
assert.match(service, /classifyYoutubeAnalyticsApiError/);
assert.match(service, /getYoutubeAnalyticsStatusPresentation/);
assert.match(service, /status: YoutubeAnalyticsStatus/);
for (const metric of ["views", "estimatedMinutesWatched", "subscribersGained", "subscribersLost", "likes", "comments", "shares"]) {
  assert.ok(
    !service.includes(`reportNumber(summary, row, "${metric}") ?? 0`),
    "missing YouTube Analytics report metrics must remain unavailable instead of being rendered as zero",
  );
}
assert.match(metricsHelper, /"api_disabled"/);
assert.match(metricsHelper, /"quota_exceeded"/);
assert.match(metricsHelper, /"permission_denied"/);
assert.match(metricsHelper, /"authorization_required"/);
assert.match(metricsHelper, /classifyYoutubeAnalyticsApiError/);
assert.match(metricsHelper, /classifyYoutubeOAuthTokenError/);
assert.match(service, /monetagReportingConnected: false/);
assert.match(service, /return result\.error \? null : \(result\.count \?\? 0\)/);
assert.match(panel, /Google Analytics 4/);
assert.match(panel, /قنوات الزيارات/);
assert.match(panel, /أهم صفحات الدخول/);
assert.match(panel, /تحليلات قناة YouTube/);
assert.match(panel, /getYoutubeAnalyticsStatusPresentation/);
assert.match(panel, /youtubeAnalyticsStatus\.label/);
assert.match(panel, /snapshot\.youtubeAnalytics\.message/);
assert.match(panel, /Monetag/);
assert.match(panel, /getTrafficRevenueSnapshot/);
assert.match(panel, /غير متاح/);
assert.match(panel, /لا يستخدم هذا المحرك تحديث الصفحات أو النقرات الاصطناعية/);
assert.doesNotMatch(panel, /facebook|instagram|tiktok|pinterest|whatsapp|مركز النشر الاجتماعي|نتائج النشر لكل منصة/i);
assert.match(panel, /api\/admin\/social\/youtube\/connect/);
assert.match(panel, /canManageYouTubeConnection\s*\?/);
assert.match(panel, /ربط YouTube للنشر والتحليلات/);
assert.match(panel, /YouTube Analytics لم تسمح بقراءة التقرير/);
assert.match(youtubeConnect, /https:\/\/www\.googleapis\.com\/auth\/youtube\.upload/);
assert.match(youtubeConnect, /https:\/\/www\.googleapis\.com\/auth\/youtube\.readonly/);
assert.match(youtubeConnect, /https:\/\/www\.googleapis\.com\/auth\/yt-analytics\.readonly/);
assert.doesNotMatch(panel, /قراءة فقط|إعادة ربط القراءة/);
assert.match(page, /requireAdminPermission\("analytics\.read"\)/);
assert.match(page, /hasAdminPermission\(admin\.role, "social\.manage"\)/);
assert.match(page, /hasAdminPermission\(admin\.role, "social\.publish"\)/);
assert.match(page, /<TrafficRevenuePanel\s+canManageYouTubeConnection=\{canManageYouTubeConnection\}\s*\/>/);
const analystPermissions = permissions.match(/analyst:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
assert.match(analystPermissions, /analytics\.read/);
assert.doesNotMatch(analystPermissions, /social\.manage|social\.publish/);
assert.doesNotMatch(page, /YOUTUBE_REDIRECT|api\/admin\/social\/youtube\/connect/);

assert.match(service, /videoRetryPending/);
assert.match(service, /videoRequested24h/);
assert.match(service, /videoCompleted7d/);
assert.match(service, /averageRenderDurationMs7d/);
assert.match(service, /timezone: "UTC"/);
assert.match(metricsHelper, /averageRenderDuration/);
assert.doesNotMatch(metricsHelper, /platformResults|remoteIds|SocialPlatform/);

console.log("✅ Internal analytics and revenue contracts passed.");

assert.match(metricsHelper, /getGa4ReportingStatusPresentation/);
assert.match(panel, /getGa4ReportingStatusPresentation\(\s*snapshot\.ga4Analytics\.status,\s*snapshot\.integrations\.ga4MeasurementConfigured/);
assert.match(panel, /ga4Status\.measurementDescription/);
assert.match(panel, /ga4Status\.description/);
assert.match(panel, /ga4Status\.label/);
assert.doesNotMatch(panel, /واجهة التقارير البرمجية لم تُربط بعد/);
