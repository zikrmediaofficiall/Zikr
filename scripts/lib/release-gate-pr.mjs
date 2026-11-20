/**
 * Resolve the PR approval basis for a release source commit.
 *
 * Regular releases must be an exact merged PR commit. The Admin Android
 * release manager creates one additional atomic metadata commit directly on
 * main; for that single, explicit commit type, the CODEOWNER approval basis is
 * its sole parent, which must itself be the merge commit of a PR to main.
 * CI checks are still verified against the actual release source commit.
 */
export function getApprovalCommitSha(commitSha, sourceCommit) {
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

export function findMergedMainPullRequest(pullRequests, approvalCommitSha) {
  const expectedSha = String(approvalCommitSha ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedSha) || !Array.isArray(pullRequests)) {
    throw new Error("A valid approval commit SHA and pull-request list are required.");
  }
  return pullRequests.find(
    (candidate) =>
      candidate?.base?.ref === "main" &&
      Boolean(candidate.merged_at) &&
      String(candidate.merge_commit_sha ?? "").toLowerCase() === expectedSha,
  );
}
