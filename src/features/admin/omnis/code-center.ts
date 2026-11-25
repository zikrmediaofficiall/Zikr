/** OMNIS P11-03: pure shaping of GitHub pull request and branch data for the read-only code center. */
export type RawPull = { number?: unknown; title?: unknown; html_url?: unknown; draft?: unknown; user?: { login?: unknown } | null; head?: { ref?: unknown; sha?: unknown } | null; base?: { ref?: unknown } | null; updated_at?: unknown; requested_reviewers?: unknown };
export type PullSummary = { number: number; title: string; url: string; draft: boolean; author: string; head: string; headSha: string; base: string; updatedAt: string; reviewersRequested: number; targetsMain: boolean };
export type RawBranch = { name?: unknown; protected?: unknown };
export type BranchSummary = { name: string; protectedBranch: boolean };

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");

export function summarizePulls(raw: unknown): PullSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: RawPull): PullSummary[] => {
    const number = typeof item?.number === "number" ? item.number : NaN;
    const url = str(item?.html_url, 300);
    if (!Number.isFinite(number) || !url.startsWith("https://github.com/")) return [];
    const base = str(item.base?.ref, 100);
    return [{ number, title: str(item.title), url, draft: item.draft === true, author: str(item.user?.login, 60), head: str(item.head?.ref, 100), headSha: str(item.head?.sha, 40).slice(0, 7), base, updatedAt: str(item.updated_at, 40), reviewersRequested: Array.isArray(item.requested_reviewers) ? item.requested_reviewers.length : 0, targetsMain: base === "main" }];
  });
}

export function summarizeBranches(raw: unknown): BranchSummary[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: RawBranch): BranchSummary[] => (typeof item?.name === "string" ? [{ name: item.name.slice(0, 120), protectedBranch: item.protected === true }] : []));
}

/** A PR is ready for review only when it is not a draft and targets a branch that exists in the repo. */
export function reviewState(pr: PullSummary): "draft" | "needs_reviewer" | "in_review" {
  if (pr.draft) return "draft";
  return pr.reviewersRequested > 0 ? "in_review" : "needs_reviewer";
}
