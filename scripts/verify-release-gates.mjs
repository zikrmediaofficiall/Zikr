#!/usr/bin/env node
import { getRequiredPullRequestCheckNames } from "./lib/release-gate-checks.mjs";
import { findMergedMainPullRequest, getPullRequestLookupCommitSha } from "./lib/release-gate-pr.mjs";

const repository = process.env.GITHUB_REPOSITORY?.trim();
const commitSha = process.env.RELEASE_COMMIT_SHA?.trim() || process.env.GITHUB_SHA?.trim();
const token = process.env.GITHUB_TOKEN?.trim();
const requireVercelStatusSetting = process.env.REQUIRE_VERCEL_STATUS?.trim().toLowerCase();
if (requireVercelStatusSetting && !["true", "false"].includes(requireVercelStatusSetting)) {
  throw new Error("REQUIRE_VERCEL_STATUS must be true or false when provided.");
}
const requireVercelStatus = requireVercelStatusSetting !== "false";
const allowPrivateAndroidDraftFailureSetting = process.env.ALLOW_PRIVATE_ANDROID_DRAFT_FAILURE?.trim().toLowerCase();
if (allowPrivateAndroidDraftFailureSetting && !["true", "false"].includes(allowPrivateAndroidDraftFailureSetting)) {
  throw new Error("ALLOW_PRIVATE_ANDROID_DRAFT_FAILURE must be true or false when provided.");
}
const allowPrivateAndroidDraftFailure = allowPrivateAndroidDraftFailureSetting === "true";

if (!repository || !commitSha || !token || !/^[0-9a-f]{40}$/i.test(commitSha)) {
  throw new Error("GITHUB_REPOSITORY, RELEASE_COMMIT_SHA or GITHUB_SHA, and GITHUB_TOKEN are required.");
}

const apiHeaders = {
  Accept: "application/vnd.github+json",
  Authorization: "Bearer " + token,
  "X-GitHub-Api-Version": "2022-11-28",
};

async function api(path) {
  const response = await fetch("https://api.github.com" + path, {
    headers: apiHeaders,
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error("GitHub API " + path + " returned HTTP " + response.status + ": " + body.replace(/\s+/g, " ").slice(0, 300));
  }
  return body ? JSON.parse(body) : {};
}

async function allPages(path) {
  const results = [];
  for (let page = 1; page <= 10; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const pageItems = await api(path + separator + "per_page=100&page=" + page);
    if (!Array.isArray(pageItems)) throw new Error("Expected an array from " + path);
    results.push(...pageItems);
    if (pageItems.length < 100) return results;
  }
  throw new Error("Pagination limit exceeded while reading " + path);
}

function latestStatusesByContext(statuses) {
  const latest = new Map();
  for (const status of statuses) {
    const previous = latest.get(status.context);
    const currentTime = Date.parse(status.updated_at || status.created_at || "1970-01-01T00:00:00Z");
    const previousTime = previous
      ? Date.parse(previous.updated_at || previous.created_at || "1970-01-01T00:00:00Z")
      : -1;
    if (!previous || currentTime >= previousTime) latest.set(status.context, status);
  }
  return latest;
}

async function requireSuccessfulCheckRuns(sha, requiredNames, label) {
  const payload = await api("/repos/" + repository + "/commits/" + sha + "/check-runs?per_page=100");
  const runs = payload.check_runs || [];
  for (const name of requiredNames) {
    const matches = runs
      .filter((run) => run.name === name)
      .sort((left, right) => Date.parse(left.started_at || 0) - Date.parse(right.started_at || 0));
    const latest = matches.at(-1);
    if (!latest || latest.status !== "completed" || latest.conclusion !== "success") {
      throw new Error(label + ': required check "' + name + '" is missing, pending, or not successful on ' + sha.slice(0, 12) + ".");
    }
  }
}

async function requireCircleCiStatuses(
  sha,
  label,
  requireVercel,
  requireReleaseBuildContexts = false,
  allowPrivateDraftFailure = false,
) {
  const payload = await api("/repos/" + repository + "/commits/" + sha + "/status");
  const statuses = latestStatusesByContext(payload.statuses || []);
  const required = ["ci/circleci: config-guard"];
  if (requireReleaseBuildContexts) {
    required.push("ci/circleci: application-build-docs", "ci/circleci: source-verify");
  }
  if (requireVercel) required.push("Vercel");

  for (const context of required) {
    const status = statuses.get(context);
    if (!status || status.state !== "success") {
      throw new Error(label + ': required status "' + context + '" is missing, pending, or ' + (status?.state || "absent") + " on " + sha.slice(0, 12) + ".");
    }
  }

  const privateDraftVisibilityFailure = statuses.get("ci/circleci: android-release-draft");
  const mayIgnorePrivateDraftVisibilityFailure =
    allowPrivateDraftFailure &&
    privateDraftVisibilityFailure?.state === "failure";
  const failures = [...statuses.values()].filter(
    (status) =>
      status.context.startsWith("ci/circleci:") &&
      status.state !== "success" &&
      !(mayIgnorePrivateDraftVisibilityFailure && status.context === "ci/circleci: android-release-draft"),
  );
  if (mayIgnorePrivateDraftVisibilityFailure) {
    console.warn(
      label + ": tolerated only ci/circleci: android-release-draft=failure after authenticated manual-recovery preflight verified the unique eligible private draft.",
    );
  }
  if (failures.length) {
    throw new Error(label + ": non-success CircleCI contexts: " + failures.map((status) => status.context + "=" + status.state).join(", "));
  }
}

const sourceCommit = await api("/repos/" + repository + "/commits/" + commitSha);
const pullRequestLookupSha = getPullRequestLookupCommitSha(commitSha, sourceCommit);
const pullRequests = await allPages("/repos/" + repository + "/commits/" + pullRequestLookupSha + "/pulls");
const pullRequest = findMergedMainPullRequest(pullRequests, pullRequestLookupSha);
if (!pullRequest) {
  if (pullRequestLookupSha !== commitSha) {
    throw new Error(
      "The Android release-preparation commit must be based directly on a merged main PR; " +
        "no merged PR was found for parent " + pullRequestLookupSha.slice(0, 12) + ".",
    );
  }
  throw new Error("The release commit must be the merge commit of a merged pull request targeting main; direct pushes are not accepted.");
}

const changedFiles = await allPages("/repos/" + repository + "/pulls/" + pullRequest.number + "/files");
const requiredPullRequestChecks = getRequiredPullRequestCheckNames(
  changedFiles.map((file) => file.filename),
);

const repositoryOwner = repository.split("/")[0]?.trim().toLowerCase();
const pullRequestAuthor = String(pullRequest.user?.login ?? "").trim().toLowerCase();
const pullRequestHeadRepository = String(pullRequest.head?.repo?.full_name ?? "").trim().toLowerCase();
if (!repositoryOwner || pullRequestAuthor !== repositoryOwner || pullRequestHeadRepository !== repository.toLowerCase()) {
  throw new Error(
    "Release PR must be authored by the canonical GitHub repository owner and use a branch from the canonical repository.",
  );
}

await requireSuccessfulCheckRuns(
  pullRequest.head.sha,
  requiredPullRequestChecks,
  "PR #" + pullRequest.number + " head checks",
);
await requireCircleCiStatuses(pullRequest.head.sha, "PR #" + pullRequest.number + " head statuses", false, false, false);
await requireSuccessfulCheckRuns(commitSha, ["ZIKR / Quality Gate"], "Merged commit checks");
await requireCircleCiStatuses(
  commitSha,
  "Merged commit statuses",
  requireVercelStatus,
  true,
  allowPrivateAndroidDraftFailure,
);

console.log(
  "RELEASE_PREFLIGHT_PASSED: commit=" + commitSha + "; PR=#" + pullRequest.number +
  "; head=" + pullRequest.head.sha + "; pullRequestLookupCommit=" + pullRequestLookupSha + "; repositoryOwner=" + repositoryOwner + "; VercelStatusRequired=" + requireVercelStatus + "; checks=success.",
);
