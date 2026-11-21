import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ANDROID_DEBUG_PATH_FILTERS, CIRCLECI_VALIDATION_PATH_FILTERS, getRequiredPullRequestCheckNames } from "../lib/release-gate-checks.mjs";

const workflow = readFileSync(".github/workflows/release-vercel.yml", "utf8");
const releaseWorkflow = readFileSync(".github/workflows/release-finalization.yml", "utf8");
const androidReleaseWorkflow = readFileSync(".github/workflows/publish-android-release-assets.yml", "utf8");
const androidRecoveryDispatchWorkflow = readFileSync(".github/workflows/dispatch-android-release-recovery.yml", "utf8");
const gate = readFileSync("scripts/verify-release-gates.mjs", "utf8");

const androidWorkflowPaths = readFileSync(".github/workflows/android-native-login-test.yml", "utf8");
const circleValidationPaths = readFileSync(".github/workflows/circleci-config-validation.yml", "utf8");
for (const path of ANDROID_DEBUG_PATH_FILTERS) {
  assert.ok(androidWorkflowPaths.includes(`"${path}"`), "release gate Android path policy must match the Android workflow filter: " + path);
}
for (const path of CIRCLECI_VALIDATION_PATH_FILTERS) {
  assert.ok(circleValidationPaths.includes(`"${path}"`), "release gate CircleCI path policy must match the CircleCI workflow filter: " + path);
}
assert.deepEqual(getRequiredPullRequestCheckNames(["README.md"]), ["ZIKR / Quality Gate"], "unrelated changes must not require path-filtered checks that did not run");
assert.deepEqual(getRequiredPullRequestCheckNames(["android/app/src/main/AndroidManifest.xml"]), ["ZIKR / Quality Gate", "Build Android Debug APK"]);
assert.deepEqual(getRequiredPullRequestCheckNames(["src/features/auth/actions.ts"]), ["ZIKR / Quality Gate", "Build Android Debug APK"]);
assert.deepEqual(getRequiredPullRequestCheckNames([".circleci/config.yml"]), ["ZIKR / Quality Gate", "Validate CircleCI configuration"]);
assert.deepEqual(getRequiredPullRequestCheckNames([".github/workflows/circleci-config-validation.yml"]), ["ZIKR / Quality Gate", "Validate CircleCI configuration"]);
assert.deepEqual(getRequiredPullRequestCheckNames(["android/app/build.gradle", ".circleci/config.yml"]), ["ZIKR / Quality Gate", "Build Android Debug APK", "Validate CircleCI configuration"]);
assert.throws(() => getRequiredPullRequestCheckNames(null), /changedPaths/, "release gate path selection must fail closed on malformed changed-file data");
const videoDeleteIntegration = readFileSync("scripts/tests/video-request-delete.integration.sh", "utf8");
assert.match(
  videoDeleteIntegration,
  /psql -X -q -v ON_ERROR_STOP=1 -U postgres -d zikr_video_delete_test -c "SELECT 1"/,
  "the video-request integration must wait for its configured database, not just the PostgreSQL server process",
);
assert.doesNotMatch(videoDeleteIntegration, /pg_isready/, "pg_isready can pass before POSTGRES_DB initialization completes");


const circleCiConfig = readFileSync(".circleci/config.yml", "utf8");
const androidDraftStart = circleCiConfig.indexOf("  android-release-draft:");
const androidRebuildStart = circleCiConfig.indexOf("  android-rebuild:", androidDraftStart);
const androidDraftJob = circleCiConfig.slice(androidDraftStart, androidRebuildStart);
assert.ok(androidDraftStart >= 0 && androidRebuildStart > androidDraftStart, "the read-only Android release verifier must remain a distinct CircleCI job");
assert.doesNotMatch(androidDraftJob, /context:\s*\n\s*-\s*android-signing/, "read-only Android release verification must not receive the Android signing context");
assert.doesNotMatch(
  androidDraftJob,
  /^\s*(?:GH_TOKEN|ANDROID_KEYSTORE_BASE64|ANDROID_KEYSTORE_PASSWORD|ANDROID_KEY_ALIAS|ANDROID_KEY_PASSWORD):\s*(?!"")\S.*$/m,
  "read-only Android release verification must not contain non-empty release-write or signing secret values",
);
// The empty job-level values intentionally shadow inherited CircleCI context secrets.
// expectBlankCircleCiEnv below verifies the exact empty assignments for this read-only job.
assert.doesNotMatch(androidDraftJob, /Authorization:\s*"Bearer"/, "public release metadata verification must not need a write-capable GitHub token");
assert.ok(
  androidDraftJob.includes('const repository = "zikrofficial-X/Zikr";') &&
    androidDraftJob.includes('"https://api.github.com/repos/" + repository'),
  "the verifier must continue to inspect the public canonical GitHub repository",
);
const workflowStart = circleCiConfig.indexOf("\nworkflows:");
const workflowConfig = circleCiConfig.slice(workflowStart);
const releaseBranchFilters = [
  "/^fix\\/production-web-release-optional-aasa-20261120$/",
  "/^fix\\/android-release-signed-tag-gate-20261121$/",
];
for (const jobName of ["source-verify", "application-build-docs"]) {
  const invocationStart = workflowConfig.indexOf("      - " + jobName + ":");
  assert.ok(invocationStart >= 0, jobName + " must be invoked by the canonical CircleCI workflow");
  const nextInvocation = workflowConfig.indexOf("\n      - ", invocationStart + 1);
  const invocation = workflowConfig.slice(invocationStart, nextInvocation >= 0 ? nextInvocation : undefined);
  assert.ok(
    releaseBranchFilters.every((filter) => invocation.includes(filter)),
    jobName + " must run on every controlled production-release PR branch so release preflight can verify its CI contexts",
  );
}

const androidRebuildInvocationStart = workflowConfig.indexOf("      - android-rebuild:");
const androidDispatchInvocationStart = workflowConfig.indexOf("      - android-release-dispatch:", androidRebuildInvocationStart);
const nextInvocationAfterDispatch = workflowConfig.indexOf("\n      - ", androidDispatchInvocationStart + 1);
const androidRebuildInvocation = workflowConfig.slice(androidRebuildInvocationStart, androidDispatchInvocationStart);
const androidDispatchInvocation = workflowConfig.slice(androidDispatchInvocationStart, nextInvocationAfterDispatch >= 0 ? nextInvocationAfterDispatch : undefined);
assert.match(androidRebuildInvocation, /context:\s*\n\s*-\s*android-signing/, "the signed Android build must retain its protected signing context");
assert.match(androidDispatchInvocation, /context:\s*\n\s*-\s*android-signing/, "the release dispatch must retain its protected release context for GH_TOKEN only");
const draftInvocationStart = circleCiConfig.indexOf("      - android-release-draft:");
const draftInvocationEnd = circleCiConfig.indexOf("      - supabase-production-gate:", draftInvocationStart);
const draftInvocation = circleCiConfig.slice(draftInvocationStart, draftInvocationEnd);
assert.ok(draftInvocation.includes("only: main"), "the read-only release verifier must remain restricted to canonical main");
assert.doesNotMatch(draftInvocation, /context:\s*\n\s*-\s*android-signing/, "the main-only read-only release check must not inherit signing secrets");
const extractCircleCiJob = (name) => {
  const start = circleCiConfig.indexOf("  " + name + ":\n");
  if (start < 0) return "";
  const tail = circleCiConfig.slice(start + 3);
  const next = /\n  [a-z0-9-]+:\n/.exec(tail);
  return circleCiConfig.slice(start, next ? start + 3 + next.index : undefined);
};
const expectBlankCircleCiEnv = (jobName, names) => {
  const job = extractCircleCiJob(jobName);
  assert.ok(job, "CircleCI job " + jobName + " must exist");
  for (const name of names) {
    const expected = "      " + name + ": \"\"";
    assert.ok(job.includes(expected), jobName + " must shadow unused secret " + name);
  }
};
const secretNames = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "GH_TOKEN",
  "ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"];
for (const jobName of ["config-guard", "source-verify", "application-build-docs", "security-audit", "android-release-draft"]) {
  expectBlankCircleCiEnv(jobName, secretNames);
}
expectBlankCircleCiEnv("supabase-production-gate", ["GEMINI_API_KEY", "GH_TOKEN",
  "ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]);
expectBlankCircleCiEnv("english-content-sync", ["GH_TOKEN", "ANDROID_KEYSTORE_BASE64",
  "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]);
expectBlankCircleCiEnv("android-rebuild", ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]);
expectBlankCircleCiEnv("android-release-dispatch", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY", "ANDROID_KEYSTORE_BASE64", "ANDROID_KEYSTORE_PASSWORD", "ANDROID_KEY_ALIAS", "ANDROID_KEY_PASSWORD"]);


assert.match(workflow, /checks:\s*read/);
assert.match(workflow, /statuses:\s*read/);
assert.match(workflow, /pull-requests:\s*read/);
assert.ok(workflow.includes("node scripts/verify-release-gates.mjs"));
assert.ok(
  workflow.indexOf("verify-release-gates.mjs") < workflow.indexOf("verify-production-smoke.mjs"),
  "canonical owner identity and exact-commit checks must run before production smoke requests",
);
assert.doesNotMatch(workflow, /Quality gate:\s*PASSED/i, "the workflow must not hardcode a successful quality-gate claim");

assert.doesNotMatch(gate, /CODEOWNERS|CODEOWNER|hasCurrentCodeOwnerApproval/,
  "release preflight must not depend on CODEOWNERS or separate reviewer records");
assert.ok(gate.includes("findMergedMainPullRequest(pullRequests, pullRequestLookupSha)"),
  "release preflight must delegate exact merged-main PR lookup to its validated helper");
assert.match(gate, /pullRequest\.user\?\.login/);
assert.match(gate, /pullRequest\.head\?\.repo\?\.full_name/);
assert.match(gate, /canonical GitHub repository owner/);
assert.match(gate, /check-runs/);
assert.ok(gate.includes("ci/circleci:"));
assert.match(gate, /required check/);
assert.match(gate, /pending/);

console.log("Release preflight contract passed: canonical GitHub owner identity, exact commit checks, and production smoke ordering are enforced.");


assert.ok(releaseWorkflow.includes("pull-requests: read"));
assert.ok(releaseWorkflow.includes("name: Verify canonical GitHub owner identity before production changes"));
assert.ok(releaseWorkflow.includes("GITHUB_TOKEN: ${{ github.token }}"));
assert.ok(releaseWorkflow.includes('REQUIRE_VERCEL_STATUS: "false"'));
const releasePreflightIndex = releaseWorkflow.indexOf("node scripts/verify-release-gates.mjs");
const releaseMigrationIndex = releaseWorkflow.indexOf("supabase db push");
const releaseFunctionDeployIndex = releaseWorkflow.indexOf("supabase functions deploy");
const releaseVercelDeployIndex = releaseWorkflow.indexOf("vercel deploy --prebuilt");
const releaseRestoreIndex = releaseWorkflow.indexOf("Restore source-verified Quran tafsir corpus");
assert.ok(releasePreflightIndex >= 0, "production deployment must run the release identity preflight");
assert.ok(releaseMigrationIndex > releasePreflightIndex, "release identity preflight must run before database migrations");
assert.ok(releaseFunctionDeployIndex > releasePreflightIndex, "release identity preflight must run before Edge Function deployment");
for (const functionName of [
  "prayer-notification-worker",
  "source-verified-content-agent",
  "spiritual-ai",
  "health",
]) {
  assert.ok(
    releaseWorkflow.includes(`supabase functions deploy ${functionName} --project-ref`),
    `the approved production release must deploy ${functionName}, including consumers of changed shared Edge Function modules`,
  );
}

assert.ok(releaseVercelDeployIndex > releasePreflightIndex, "release identity preflight must run before Vercel deployment");
assert.ok(releaseRestoreIndex > releasePreflightIndex, "release identity preflight must run before production corpus restoration");

assert.ok(gate.includes("REQUIRE_VERCEL_STATUS"));
assert.ok(gate.includes('const requireVercelStatus = requireVercelStatusSetting !== "false"'));
assert.ok(gate.includes("ALLOW_PRIVATE_ANDROID_DRAFT_FAILURE"));
assert.ok(gate.includes('const allowPrivateAndroidDraftFailure = allowPrivateAndroidDraftFailureSetting === "true"'));
assert.ok(gate.includes('await requireCircleCiStatuses(pullRequest.head.sha, "PR #" + pullRequest.number + " head statuses", false, false, false);'), "PR head checks must require the path-appropriate GitHub checks and config validation, not post-merge application build contexts");
assert.ok(gate.includes('requireCircleCiStatuses(\n  commitSha,\n  "Merged commit statuses",\n  requireVercelStatus,\n  true,\n  allowPrivateAndroidDraftFailure,\n);'), "merged release commits must still require all source/build statuses and only permit the authenticated private-draft visibility fallback");
assert.ok(gate.includes('status.context === "ci/circleci: android-release-draft"') && gate.includes("privateDraftVisibilityFailure?.state === \"failure\""), "only an authenticated manual recovery may tolerate the exact private-draft visibility failure");
assert.ok(androidReleaseWorkflow.includes("ALLOW_PRIVATE_ANDROID_DRAFT_FAILURE: ${{ github.event_name == 'workflow_dispatch' && inputs.retry == true }}"), "only the manually authenticated Android recovery publisher may enable the private-draft visibility fallback");
assert.ok(!workflow.includes('REQUIRE_VERCEL_STATUS: "false"'), "post-deploy smoke must continue to require Vercel status by default");


assert.ok(androidReleaseWorkflow.includes("pull-requests: read"));
assert.ok(androidReleaseWorkflow.includes("id: resolve_tag"));
assert.ok(androidReleaseWorkflow.includes('echo "tag_target_sha=$TAG_TARGET_SHA" >> "$GITHUB_OUTPUT"'));
assert.ok(androidReleaseWorkflow.includes("RELEASE_COMMIT_SHA: ${{ steps.resolve_tag.outputs.tag_target_sha }}"));
assert.ok(androidReleaseWorkflow.includes('REQUIRE_VERCEL_STATUS: "false"'));
assert.ok(androidReleaseWorkflow.includes("name: Verify canonical GitHub owner identity before publishing Android assets"));
const androidPreflightIndex = androidReleaseWorkflow.indexOf("node scripts/verify-release-gates.mjs");
const androidPrerequisitesIndex = androidReleaseWorkflow.indexOf("Verify all CircleCI and GitHub release prerequisites before waiting for artifacts");
const androidUploadIndex = androidReleaseWorkflow.indexOf('gh release upload "$TAG"');
const androidPublishIndex = androidReleaseWorkflow.indexOf('gh api --method PATCH "repos/${GITHUB_REPOSITORY}/releases/${RELEASE_ID}"');
assert.ok(androidPreflightIndex >= 0, "Android publisher must run the release identity preflight");
assert.ok(androidPrerequisitesIndex > androidPreflightIndex, "release identity preflight must run before release prerequisite polling");
assert.ok(androidUploadIndex > androidPreflightIndex, "release identity preflight must run before uploading release assets");
assert.ok(androidPublishIndex > androidPreflightIndex, "release identity preflight must run before publishing a GitHub Release");

assert.ok(gate.includes("process.env.RELEASE_COMMIT_SHA?.trim() || process.env.GITHUB_SHA?.trim()"));
assert.ok(gate.includes("RELEASE_COMMIT_SHA or GITHUB_SHA"));
console.log("Release preflight contract passed.");

const vercelReadyIndex = releaseWorkflow.indexOf("node scripts/verify-vercel-deployment-ready.mjs");
const supabaseHealthIndex = releaseWorkflow.indexOf("node scripts/verify-supabase-edge-health.mjs");
const productionSmokeIndex = releaseWorkflow.indexOf("run: pnpm production:smoke");
assert.ok(vercelReadyIndex > releaseVercelDeployIndex, "the exact production deployment must be inspected after deploy");
assert.ok(supabaseHealthIndex > vercelReadyIndex, "the deployed Supabase health function must be checked after Vercel reaches READY");
assert.ok(productionSmokeIndex > supabaseHealthIndex, "public production smoke must run after deployment and Edge Function health checks");
assert.ok(releaseWorkflow.includes("node scripts/verify-vercel-deployment-ready.mjs"));
assert.ok(releaseWorkflow.includes("node scripts/verify-supabase-edge-health.mjs"));

assert.ok(
  releaseWorkflow.includes("if app_id:") &&
    releaseWorkflow.includes("Optional iOS Universal Links") &&
    releaseWorkflow.includes("Invalid iOS Universal Links App ID"),
  "website production release must warn when the optional Apple App ID is absent but still reject malformed configured IDs",
);
assert.ok(releaseWorkflow.includes("NEXT_PUBLIC_SUPABASE_URL="));
assert.ok(releaseWorkflow.includes("SUPABASE_URL must point to the approved ZIKR production project"));

assert.ok(releaseWorkflow.includes("VERCEL_ORG_ID: ${{ env.VERCEL_ORG_ID }}"), "Vercel readiness must use the approved team ID");
assert.ok(releaseWorkflow.includes("EXPECTED_COMMIT_SHA: ${{ github.sha }}"), "Vercel readiness must verify the exact approved commit");
assert.ok(releaseWorkflow.includes("EXPECTED_VERCEL_PROJECT_ID: ${{ env.VERCEL_PROJECT_ID }}"), "Vercel readiness must verify the production project");

assert.ok(
  releaseWorkflow.includes('r"https://zqtssvlvmkzeeyqghqfk\\.supabase\\.co/?"'),
  "production Supabase URL validation must use a literal-dot regex",
);
assert.ok(
  releaseWorkflow.includes('github_env.write(f"SUPABASE_URL={supabase_url.rstrip(\'/\')}\\n")'),
  "the production Supabase URL must be exported to later release steps with a real newline",
);
assert.ok(
  releaseWorkflow.includes("VERCEL_GIT_COMMIT_SHA: ${{ github.sha }}"),
  "Vercel build and deployment must carry the approved commit SHA",
);


assert.match(
  androidReleaseWorkflow,
  /\(github\.event_name == 'push' && github\.ref_type == 'tag'\)/,
  "automatic tag publication must remain available only to tag-push events",
);
assert.match(
  androidReleaseWorkflow,
  /github\.event_name == 'workflow_dispatch' &&[\s\S]*?inputs\.retry == true[\s\S]*?github\.ref_type == 'tag'/,
  "manual tag dispatch must require the explicit retry input",
);
assert.doesNotMatch(
  androidReleaseWorkflow,
  /if:\s*>-\s*\n\s*github\.ref_type == 'tag'\s*\|\|/,
  "a tag ref alone must not authorize manual publisher dispatch",
);
const manualRecoveryGuardIndex = androidReleaseWorkflow.indexOf("Verify explicit recovery guard for manual dispatch");
const androidOwnerIdentityPreflightIndex = androidReleaseWorkflow.indexOf("Verify canonical GitHub owner identity before publishing Android assets");
assert.ok(manualRecoveryGuardIndex >= 0 && manualRecoveryGuardIndex < androidOwnerIdentityPreflightIndex,
  "manual recovery authorization must run before the release identity preflight and every release mutation");
for (const required of [
  "docs/finalization/RELEASE_RETRY.flag",
  '"RETRY"',
  "docs/releases/${version}.md",
  "TAG_TARGET_SHA",
  "GITHUB_SHA",
  "ci/circleci: android-rebuild",
  'if [[ "${tag}" != "${TAG}" ]]',
  'releases?per_page=100',
  "matching_releases",
  "matching_count",
  "release_prerelease",
  '"${release_draft}" != "true"',
]) {
  assert.ok(androidReleaseWorkflow.includes(required), "manual publisher retry must enforce " + required);
}
assert.ok(androidRecoveryDispatchWorkflow.includes("docs/finalization/RELEASE_RETRY.flag"),
  "the recovery dispatcher must retain the repository retry flag");
assert.ok(androidRecoveryDispatchWorkflow.includes('context.ref === "refs/tags/" + tag'),
  "the recovery dispatcher must retain exact tag-dispatch handling");
assert.ok(androidRecoveryDispatchWorkflow.includes('item.context === "ci/circleci: android-rebuild"'),
  "the recovery dispatcher must retain the signed-build status gate");

import {
  findMergedMainPullRequest,
  getPullRequestLookupCommitSha,
} from "../lib/release-gate-pr.mjs";

const releaseSourceSha = "a".repeat(40);
const approvedMainMergeSha = "b".repeat(40);
const androidPreparationCommit = {
  commit: { message: "release: prepare Android v1.1.16 atomically" },
  parents: [{ sha: approvedMainMergeSha }],
};
assert.equal(
  getPullRequestLookupCommitSha(releaseSourceSha, androidPreparationCommit),
  approvedMainMergeSha,
  "Android preparation commits must use their sole merged-main parent to locate the originating PR",
);
assert.equal(
  getPullRequestLookupCommitSha(releaseSourceSha, {
    commit: { message: "fix(android-release): repair release metadata" },
    parents: [{ sha: approvedMainMergeSha }],
  }),
  releaseSourceSha,
  "ordinary commits must use their own exact merged-PR commit for source lookup",
);
assert.throws(
  () => getPullRequestLookupCommitSha(releaseSourceSha, {
    commit: { message: "release: prepare Android v1.1.16 atomically" },
    parents: [],
  }),
  /exactly one parent/,
  "malformed Android preparation commits must fail closed",
);
const approvedParentPullRequest = {
  number: 999,
  base: { ref: "main" },
  merged_at: "2026-11-20T21:00:00Z",
  merge_commit_sha: approvedMainMergeSha,
};
assert.equal(
  findMergedMainPullRequest([approvedParentPullRequest], approvedMainMergeSha),
  approvedParentPullRequest,
  "the exact merged-main parent PR must be selected",
);
assert.equal(
  findMergedMainPullRequest([approvedParentPullRequest], "c".repeat(40)),
  undefined,
  "a PR for a different commit must never be accepted as the source PR",
);
assert.match(gate, /getPullRequestLookupCommitSha\(commitSha, sourceCommit\)/);
assert.match(gate, /findMergedMainPullRequest\(pullRequests, pullRequestLookupSha\)/);


const androidPublisher = readFileSync(".github/workflows/publish-android-release-assets.yml", "utf8");
assert.ok(androidPublisher.includes("GitHub cryptographic tag signature and exact commit target"), "Android asset publisher must verify the signed Git tag before asset upload");
assert.ok(androidPublisher.includes("verification.verified // false") && androidPublisher.includes('\"$signature_reason\" == \"valid\"'), "Android asset publisher must require GitHub's valid GPG signature result");
