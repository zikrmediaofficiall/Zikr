/**
 * Resolve the commit used to locate the source PR for a release source commit.
 *
 * Regular releases use their exact merged PR commit. The Admin Android
 * release manager may create one atomic metadata commit directly on main;
 * that commit must have exactly one parent, which must itself be the merge
 * commit of a PR to main. This helper locates the source PR only; it does not
 * grant review approval or replace the canonical repository-owner identity
 * check. CI checks are always verified against the actual release source SHA.
 */
export function getPullRequestLookupCommitSha(commitSha, sourceCommit) {
  const sourceSha = String(commitSha ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) {
    throw new Error("A full release source commit SHA is required.");
  }

  const subject = String(sourceCommit?.commit?.message ?? "").split("\n")[0].trim();
  if (!subject.startsWith("release: prepare Android ")) return sourceSha;

  const parents = Array.isArray(sourceCommit?.parents) ? sourceCommit.parents : [];
  if (parents.length !== 1) {
    throw new Error("An Android release-preparation commit must have exactly one parent commit.");
  }

  const parentSha = String(parents[0]?.sha ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(parentSha) || parentSha === sourceSha) {
    throw new Error("An Android release-preparation commit must reference one valid, distinct parent SHA.");
  }
  return parentSha;
}

export function findMergedMainPullRequest(pullRequests, pullRequestLookupSha) {
  const expectedSha = String(pullRequestLookupSha ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedSha) || !Array.isArray(pullRequests)) {
    throw new Error("A valid source PR lookup commit SHA and pull-request list are required.");
  }
  return pullRequests.find(
    (candidate) =>
      candidate?.base?.ref === "main" &&
      Boolean(candidate.merged_at) &&
      String(candidate.merge_commit_sha ?? "").toLowerCase() === expectedSha,
  );
}
