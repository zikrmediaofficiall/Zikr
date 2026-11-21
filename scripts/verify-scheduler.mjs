#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const failures = [];
const read = (path) => {
  if (!existsSync(path)) {
    failures.push(`missing scheduler file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
};

const workflow = read(".github/workflows/generate-ai-video.yml");
if (!workflow.includes('cron: "17 3,9,15,21 * * *"')) failures.push("GitHub video worker must own the four-times-daily production schedule");
if (workflow.includes("\n  push:")) failures.push("production video generation must not start automatically on source pushes");
if (!workflow.includes("if: github.ref == 'refs/heads/main'")) failures.push("video worker must restrict production secrets to main");
if (!workflow.includes("environment: production")) failures.push("video worker must use the existing production-secret environment");
if (!workflow.includes("concurrency:")) failures.push("video worker must define concurrency protection");
const videoConcurrencyGroup = workflow.match(/concurrency:\s*\n\s*group:\s*([^\n]+)/)?.[1]?.trim();
if (videoConcurrencyGroup !== "zikr-background-worker") failures.push("video worker must use the shared background-worker concurrency group");
if (!workflow.includes("cancel-in-progress: false")) failures.push("video worker must not cancel an active generation run");
if (!workflow.includes("workflow_dispatch:")) failures.push("video worker must retain manual recovery dispatch");
if (!workflow.includes("urgent:")) failures.push("video worker must support an urgent dispatch input");

const vercel = existsSync("vercel.json") ? readFileSync("vercel.json", "utf8") : "";
if (vercel.includes('"crons"') || vercel.includes("crons:")) failures.push("Vercel must not own production video scheduling");


const currentCronMigration = read("supabase/migrations/20261106210440_repoint_active_cron_jobs_to_current_project.sql");
if (!currentCronMigration.includes("ymxdswkaxafakugktsim.supabase.co")) failures.push("cron migration must match only the previously configured project host");
if (!currentCronMigration.includes("zqtssvlvmkzeeyqghqfk.supabase.co")) failures.push("cron migration must repoint to the active Supabase project");
if (!currentCronMigration.includes("cron.alter_job")) failures.push("cron migration must use the supported pg_cron alter_job API");
if (!currentCronMigration.includes("zikr-prayer-push-dispatch") || !currentCronMigration.includes("zikr-source-verified-content-agent")) failures.push("current cron migration must explicitly limit updates to the two active ZIKR jobs");

const prayerPushCronReconcileMigration = read("supabase/migrations/20261115070000_reconcile_prayer_push_cron_project_ref.sql");
for (const token of [
  "zikr-prayer-push-dispatch",
  "https://zqtssvlvmkzeeyqghqfk.supabase.co/functions/v1/prayer-notification-worker",
  "cron.alter_job",
  "cron.unschedule",
  "cron.schedule",
  "public.get_push_scheduler_secret()",
  "WHERE EXISTS (SELECT 1 FROM public.push_subscriptions WHERE is_active)",
  "'* * * * *'",
]) {
  if (!prayerPushCronReconcileMigration.includes(token)) {
    failures.push("prayer push cron reconciliation is missing its canonical contract: " + token);
  }
}
if (prayerPushCronReconcileMigration.includes("nmdeazfmtncelykzxkhs.supabase.co")) {
  failures.push("prayer push cron reconciliation must not retain the historical project URL");
}

const contentSync = read(".github/workflows/english-content-sync.yml");
const circleciConfig = read(".circleci/config.yml");
const githubCredentialStart = contentSync.indexOf("name: Validate Supabase credentials before installing dependencies");
const githubCredentialEnd = contentSync.indexOf("- uses: pnpm/action-setup", githubCredentialStart);
const githubCredentialBlock = contentSync.slice(githubCredentialStart, githubCredentialEnd);
const githubWorkerStart = contentSync.indexOf("name: Run one bounded article batch and one bounded Hadith batch");
const githubWorker = contentSync.slice(githubWorkerStart);
const githubQuranPosition = githubWorker.indexOf("pnpm sync:quran:en");
const githubHadithPosition = githubWorker.indexOf("pnpm sync:hadith:en");
const githubGeminiPosition = githubWorker.indexOf('if [[ -n "${GEMINI_API_KEY:-}" ]]');
const hasSuccessfulReleaseTrigger =
  contentSync.includes('workflows: ["ZIKR Finalization Controlled Release"]') &&
  contentSync.includes("types: [completed]") &&
  contentSync.includes("github.event.workflow_run.conclusion == 'success'") &&
  contentSync.includes("github.event.workflow_run.head_branch == 'main'") &&
  !contentSync.split(/\r?\n/).some((line) => line.trim() === "push:");
const hasProtectedEnglishBackup =
  contentSync.includes('cron: "15 7 * * *"') &&
  contentSync.includes("environment: production") &&
  contentSync.includes("SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY || secrets.SUPABASE_SERVICE_KEY }}") &&
  contentSync.includes("GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}") &&
  contentSync.includes("if: github.ref == 'refs/heads/main'") &&
  githubCredentialStart >= 0 &&
  githubCredentialEnd > githubCredentialStart &&
  !githubCredentialBlock.includes('test -n "${GEMINI_API_KEY:-}"') &&
  githubQuranPosition >= 0 &&
  githubHadithPosition > githubQuranPosition &&
  githubGeminiPosition > githubHadithPosition &&
  hasSuccessfulReleaseTrigger &&
  circleciConfig.includes('cron: "17 4 * * *"');
if (contentSync.includes("\n  schedule:") && !hasProtectedEnglishBackup) {
  failures.push("GitHub English sync must retain its protected 07:15 UTC backup, validate Supabase before source writes, and run Quran/Hadith independently of the optional Gemini batches");
}
if (!contentSync.includes("pnpm translate:articles:en") || !contentSync.includes("pnpm sync:hadith:en") || !contentSync.includes("pnpm sync:quran:en")) failures.push("English article, Quran and Hadith sync commands are incomplete");
if (!circleciConfig.includes("pnpm sync:quran:en") || !circleciConfig.includes("quran_status")) failures.push("primary CircleCI must run and report the source-attributed Quran translation worker");
if (contentSync.includes("seq 1 10")) failures.push("article translation must not rerun the same bounded batch ten times");
if (!contentSync.includes("environment: production") || !contentSync.includes("if: github.ref == 'refs/heads/main'")) failures.push("English content sync must use production secrets on main only");
if (contentSync.split(/\r?\n/).some((line) => line.trim() === "push:")) failures.push("English production sync must wait for the controlled release to apply and verify migrations");
if (!contentSync.includes("workflow_dispatch:")) failures.push("English content sync must retain deliberate manual dispatch");
const articleTranslator = read("scripts/translate-published-articles-en.ts");
if (articleTranslator.includes("GEMINI_API_KEY_")) failures.push("article translation must not rotate through quota-pooling Gemini keys");
if (articleTranslator.includes("gemini-3.5-flash-lite")) failures.push("article translation must not make a second model call after a failed primary call");

const publisher = read(".github/workflows/publish-social.yml");
const socialConcurrencyGroup = publisher.match(/concurrency:\s*\n\s*group:\s*([^\n]+)/)?.[1]?.trim();
if (socialConcurrencyGroup !== videoConcurrencyGroup) failures.push("video and social publishing workflows must share one concurrency group");
if (!publisher.includes("cancel-in-progress: false")) failures.push("social publisher must not cancel an active background worker");
const adminSocial = read("src/app/api/admin/social/route.ts");
const socialRunner = read("scripts/run-background-jobs.ts");
const socialService = read("src/features/social/services/social-publishing.ts");
if (existsSync("src/app/api/internal/video-processing/route.ts")) failures.push("retired /api/internal/video-processing endpoint must remain deleted");
if (existsSync("src/app/api/internal/video-generation/daily/route.ts")) failures.push("retired /api/internal/video-generation/daily endpoint must remain deleted");
if (existsSync("src/app/api/internal/youtube-sync/route.ts")) failures.push("retired /api/internal/youtube-sync endpoint must remain deleted");
if (adminSocial.includes("SOCIAL_PUBLISHING_RETIRED") || !adminSocial.includes("dispatchGitHubWorkflow(\"publish-social.yml\"")) failures.push("admin social API must dispatch the controlled publisher and must not return HTTP 410");
if (!publisher.includes("workflow_run:") || !publisher.includes("github.event.workflow_run.conclusion == 'success'")) failures.push("social publisher must run only after a successful video-generation workflow");
if (!publisher.includes("workflow_dispatch:") || !publisher.includes('cron: "7,22,37,52 * * * *"') || !publisher.includes("github.event_name == 'schedule'") || publisher.includes("\\n  push:")) failures.push("social publishing must combine event-driven publishing with a bounded 15-minute retry drain and must not trigger on source pushes");
if (!publisher.includes('SOCIAL_PUBLISH_ENABLED: "true"') || !publisher.includes('BACKGROUND_JOB_TARGET: "social"')) failures.push("social publisher must execute the social target behind the explicit enabled flag");
if (!publisher.includes('SOCIAL_SYNC_INSIGHTS: "false"')) failures.push("publishing runs must not refresh expensive social insights on every dispatch");
if (!publisher.includes("SOCIAL_PUBLISH_AFTER: \"2026-11-06T20:00:00Z\"")) failures.push("social publisher must exclude the pre-activation queue backlog");
if (!publisher.includes("youtube.upload") || !publisher.includes("SOCIAL_PUBLISH_FACEBOOK_ENABLED") || !publisher.includes("SOCIAL_PUBLISH_YOUTUBE_ENABLED")) failures.push("social preflight must verify provider scopes and credentials before allowing queue claims");
if (socialRunner.includes("reconcileCompletedVideoSocialQueue")) failures.push("video worker must never reconcile historical completed requests into social queue rows");
if (!socialRunner.includes("processSocialPublishQueue") || !socialRunner.includes('process.env.SOCIAL_PUBLISH_ENABLED !== "true"')) failures.push("background runner must execute social publishing only when the protected workflow and admin setting allow it");
const socialProcessStart = socialRunner.indexOf("async function processSocial(");
const socialProcessEnd = socialRunner.indexOf("async function recordAutomationRun", socialProcessStart);
const socialProcessBody = socialProcessStart >= 0 && socialProcessEnd > socialProcessStart
  ? socialRunner.slice(socialProcessStart, socialProcessEnd)
  : "";
const catalogReconciliationCall = socialProcessBody.indexOf("reconcileKidsCatalogMetadata()");
const externalPublishGate = socialProcessBody.indexOf('if (!settings.autoPublish || process.env.SOCIAL_PUBLISH_ENABLED !== "true")');
if (catalogReconciliationCall < 0 ||
    externalPublishGate < 0 ||
    catalogReconciliationCall > externalPublishGate ||
    socialProcessBody.indexOf("processSocialPublishQueue(batchSize)") < externalPublishGate) {
  failures.push("catalog-only Kids reconciliation must remain available before external publishing gates while provider queue claims stay gated");
}
if (!publisher.includes("cloudinary_ready=false") ||
    !publisher.includes('if [[ "$cloudinary_ready" != "true" ]]') ||
    !publisher.includes("catalog-only Kids reconciliation may still run") ||
    !publisher.includes("SOCIAL_PUBLISH_ENABLED=false")) {
  failures.push("social publisher preflight must not abort catalog-only reconciliation when Cloudinary is unavailable");
}
if (!socialRunner.includes('process.env.SOCIAL_SYNC_INSIGHTS === "true"')) failures.push("social insight sync must remain opt-in to protect Free-plan query usage");
if (!socialRunner.includes('"insights"') || !socialRunner.includes('target === "insights"')) failures.push("social insights must have an isolated non-publishing worker target");
const insightsWorkflow = read(".github/workflows/sync-social-insights.yml");
if (!insightsWorkflow.includes('cron: "13 4 * * *"') || !insightsWorkflow.includes('BACKGROUND_JOB_TARGET: "insights"') || !insightsWorkflow.includes('SOCIAL_SYNC_INSIGHTS: "true"') || !insightsWorkflow.includes('SOCIAL_PUBLISH_ENABLED: "false"')) failures.push("daily insights workflow must run independently with publishing disabled");
if (!insightsWorkflow.includes("YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}")) failures.push("daily YouTube insights worker must receive the API key used for channel video metrics");
if (!insightsWorkflow.includes("push:") || !insightsWorkflow.includes('branches: [main]') ||
    !insightsWorkflow.includes('"scripts/jobs/social-publishing.ts"') ||
    !insightsWorkflow.includes('"src/features/social/services/facebook-reels-insights.ts"') ||
    !insightsWorkflow.includes('"src/features/videos/services/video-automation.ts"')) {
  failures.push("daily insights worker must refresh after relevant YouTube/Facebook publisher and insights changes reach main");
}
if (!socialService.includes("created_at=gte.${createdSince}") ||
    (socialService.match(/resolveSocialPublishCutoff\(process\.env\.SOCIAL_PUBLISH_AFTER\)/g) ?? []).length < 2) {
  failures.push("social queue claims and stale recovery must share the validated launch cutoff");
}
if (publisher.includes("if: false")) failures.push("social publisher must not retain the retired workflow kill switch");
const mediaAuditWorkflow = read(".github/workflows/audit-video-media.yml");
if (!mediaAuditWorkflow.includes('cron: "41 4 * * *"') ||
    !mediaAuditWorkflow.includes("workflow_dispatch:") ||
    !mediaAuditWorkflow.includes('environment: production') ||
    !mediaAuditWorkflow.includes("pnpm video:media:audit")) {
  failures.push("published video media audit must run daily in the production environment with a manual recovery trigger");
}
const retentionWorkflow = read(".github/workflows/storage-retention.yml");
if (retentionWorkflow.includes("\n  push:")) failures.push("Supabase Storage cleanup must not be triggered by source pushes");
if (!retentionWorkflow.includes("workflow_dispatch:") || !retentionWorkflow.includes("inputs:") || !retentionWorkflow.includes("apply:")) failures.push("Storage retention must retain an explicit manual approval control");
if (!retentionWorkflow.includes("default: false")) failures.push("Storage retention workflow must default to dry-run mode");

const circleci = read(".circleci/config.yml");
if (circleci.includes('cron: "17 3,9,15,21 * * *"')) failures.push("CircleCI must not own video generation scheduling");
if (circleci.includes("background-jobs:")) failures.push("CircleCI must not contain the production video/social worker job");
if (circleci.includes("android-release-on-build-tag:")) failures.push("CircleCI must not retain the redundant Android build-tag workflow");
const androidReleaseManager = read("src/features/releases/services/github-release-manager.ts");
const androidSigningPreflight = read(".github/workflows/android-release-signing-preflight.yml");
const androidTagSigning = read(".github/workflows/sign-android-release-tag.yml");
if (!androidReleaseManager.includes("getAndroidReleaseSigningPreflightStatus") ||
    !androidReleaseManager.includes("requestAndroidReleaseSigningPreflight")) {
  failures.push("Admin Android release manager must verify protected signing readiness before preparing release metadata");
}
if (!androidReleaseManager.includes("dispatchPreparedAndroidReleaseTagSigning") ||
    !androidReleaseManager.includes("sign-android-release-tag.yml")) {
  failures.push("Admin Android release manager must delegate tag creation to the protected signing runner");
}
if (!androidReleaseManager.includes("createAtomicMainCommit")) {
  failures.push("Admin Android release metadata must be committed atomically against the exact main SHA");
}
if (androidReleaseManager.includes('"/git/tags"') || androidReleaseManager.includes('"/git/refs"')) {
  failures.push("Admin Android release manager must never create an unsigned Git tag through the REST API");
}
if (androidReleaseManager.includes("buildTag")) failures.push("Android release manager must not create a redundant -build tag");
if (!androidSigningPreflight.includes("name: android-release-signing") ||
    !androidSigningPreflight.includes("ANDROID_RELEASE_TAG_GPG_PRIVATE_KEY") ||
    !androidSigningPreflight.includes("ANDROID_RELEASE_TAG_GPG_FINGERPRINT")) {
  failures.push("Android signing preflight must run in the protected GPG environment and validate the owner-managed key");
}
if (!androidTagSigning.includes("name: android-release-signing") ||
    !androidTagSigning.includes("git tag -s -u") ||
    !androidTagSigning.includes("git verify-tag --raw") ||
    !androidTagSigning.includes(".verification.verified") ||
    !androidTagSigning.includes("reason") ||
    !androidTagSigning.includes("Create the draft release only after GitHub tag verification")) {
  failures.push("Android tag signing must create, locally verify, and remotely verify a signed tag before creating its draft release");
}
const androidPublish = read(".github/workflows/publish-android-release-assets.yml");
if (androidPublish.includes("branches:\n      - main")) failures.push("Android release publishing must not trigger directly from main");
if (!androidPublish.includes("workflow_dispatch:")) failures.push("Android release publishing must retain explicit manual recovery");
if (!androidPublish.includes("inputs.retry")) failures.push("Android manual recovery must require an explicit retry input");
if (!androidPublish.includes("docs/finalization/RELEASE_RETRY.flag")) failures.push("Android asset retries must remain tied to an explicit release flag");
if (!androidPublish.includes("github.ref_type == 'tag'")) failures.push("tagged Android release publishing must remain enabled");
if (!androidPublish.includes("GitHub cryptographic tag signature and exact commit target")) {
  failures.push("Android asset publisher must independently verify the signed tag and exact source commit before upload");
}

const runner = read("scripts/run-background-jobs.ts");
if (!runner.includes("processTemplateVideoQueue")) failures.push("background runner must invoke the canonical video queue");
if (runner.includes("reconcileCompletedVideoSocialQueue") || runner.includes("social_publish_queue")) failures.push("background runner must not reconcile or mutate historical external social queue rows");
if (!runner.includes("ensureArabicTtsRuntime")) failures.push("background runner must initialize Arabic TTS");
if (!runner.includes("runNowRequest")) failures.push("background runner must consume the admin run-now request");
if (!runner.includes("clearRunNowRequest")) failures.push("background runner must clear fulfilled run-now requests");

const queue = read("scripts/jobs/template-video-automation.ts");
if (!queue.includes("engineConfig().staleAfterMinutes")) failures.push("video queue must enforce stale-processing recovery");
if (!queue.includes("status=eq.processing")) failures.push("video queue stale recovery query is missing");
if (!queue.includes('status: "pending"')) failures.push("stale processing requests must return to pending");
if (!queue.includes("status=in.(pending,retry_wait)")) failures.push("queue must claim pending and due retry_wait requests");
if (!queue.includes('terminalStatus = attempts >= engineConfig().maxRetries ? "failed" : "retry_wait"')) failures.push("retry policy must remain bounded");

const env = read(".env.example");
if (!env.includes("VIDEO_MAX_RETRIES=3")) failures.push("video retry default is not documented");
if (!env.includes("VIDEO_STALE_AFTER_MINUTES=30")) failures.push("video stale timeout default is not documented");

const scheduling = read("docs/production-scheduling.md");
if (!scheduling.includes("GitHub Actions is the authoritative automatic video generation worker")) failures.push("production scheduler ownership documentation is stale");
if (!scheduling.includes("GitHub Actions is the authoritative automatic social publisher")) failures.push("social publisher ownership documentation is stale");
if (!scheduling.includes("bounded 15-minute poll") || scheduling.includes("There is no periodic social polling.")) failures.push("social scheduling documentation must describe the active bounded retry poll without contradicting the workflow");
if (scheduling.includes("GitHub Actions is the authoritative automatic video/social worker")) failures.push("stale GitHub-owned scheduler documentation remains");
if (scheduling.includes("GitHub Actions are not the active scheduler in the current repository.")) failures.push("stale contradictory scheduler documentation remains");

const mig1 = read("supabase/migrations/20261008050000_repoint_production_cron_to_current_project.sql");
if (!mig1.includes("job_id => 4") || !mig1.includes("active => false")) failures.push("historical cron migration must retire the obsolete cleanup job");

const mig2 = read("supabase/migrations/20261002114000_retire_dead_media_cleanup_cron_20261002.sql");
if (!mig2.includes("cron.unschedule(4)")) failures.push("dead media cleanup cron retirement migration is missing");

const socialSyncMigration = read("supabase/migrations/20261008074605_reconcile_social_sync_cron_and_child_rls.sql");
if (!socialSyncMigration.includes("active := false")) failures.push("legacy social sync cron must remain disabled");
if (existsSync("supabase/functions/sync-youtube-facebook/index.ts")) failures.push("retired sync-youtube-facebook Edge Function source must not remain in the runtime tree");
for (const table of ["companion_stories", "battle_events", "conquest_events"]) {
  if (!socialSyncMigration.includes(`DROP POLICY IF EXISTS allow_public_read ON public.${table}`)) {
    failures.push(`unscoped public read policy must be removed from ${table}`);
  }
}

const pkg = JSON.parse(read("package.json"));
if (!pkg.scripts["scheduler:check"]) failures.push("scheduler:check must be registered");
if (!pkg.scripts["verify:pr"]?.includes("pnpm scheduler:check")) failures.push("verify:pr must include scheduler verification");
if (!pkg.scripts["verify"]?.includes("pnpm scheduler:check")) failures.push("verify must include scheduler verification");

if (failures.length) {
  console.error("SCHEDULER_CHECK_FAILED");
  for (const failure of failures) console.error(`❌ ${failure}`);
  process.exit(1);
}
console.log("✅ Phase 13 Scheduler checks passed");
