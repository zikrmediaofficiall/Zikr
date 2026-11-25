import "server-only";

import generatedImportGraphJson from "@/features/admin/omnis/import-graph.generated.json";
import { getServerEnv } from "@/lib/env";
import { isOmnisImportGraph, type OmnisImportGraph } from "@/features/admin/omnis/import-graph";
import { classifyOmnisResource, type OmnisResource, type OmnisResourceCategory } from "@/features/admin/omnis/resource-index";

const REPOSITORY = "zikrmediaofficiall/Zikr";
const BRANCH = "feat/zikr-omnis-control-plane-20261125";
const MAX_RESOURCES = 500;

export type OmnisProjectResourceIndex = {
  available: boolean;
  complete: boolean;
  branch: string;
  commitSha: string | null;
  treeSha: string | null;
  generatedAt: string;
  total: number;
  counts: Record<OmnisResourceCategory, number>;
  resources: OmnisResource[];
  importGraph: OmnisImportGraph | null;
  importGraphAvailable: boolean;
  importGraphError: string | null;
  error: string | null;
};

const emptyCounts = (): Record<OmnisResourceCategory, number> => ({
  page: 0, api: 0, component: 0, service: 0, library: 0, workflow: 0, migration: 0, test: 0,
});

async function githubJson(url: string, token: string | undefined): Promise<Response> {
  return fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(7000),
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
  });
}

function exactImportGraphForCommit(commitSha: string): OmnisImportGraph | null {
  if (!isOmnisImportGraph(generatedImportGraphJson)) return null;
  if (!generatedImportGraphJson.files.length || generatedImportGraphJson.commitSha !== commitSha) return null;
  return generatedImportGraphJson;
}

export async function getOmnisProjectResourceIndex(): Promise<OmnisProjectResourceIndex> {
  const generatedAt = new Date().toISOString();
  const counts = emptyCounts();
  try {
    const token = getServerEnv().GITHUB_DISPATCH_TOKEN?.trim() || undefined;
    const branchResponse = await githubJson(
      "https://api.github.com/repos/" + REPOSITORY + "/branches/feat/zikr-omnis-control-plane-20261125",
      token,
    );
    if (!branchResponse.ok) throw new Error("GitHub branch lookup failed with HTTP " + branchResponse.status + ".");
    const branchPayload = await branchResponse.json() as { commit?: { sha?: string } };
    const commitSha = branchPayload.commit?.sha;
    if (!commitSha || !/^[0-9a-f]{40}$/.test(commitSha)) throw new Error("GitHub returned an invalid branch commit SHA.");

    const treeResponse = await githubJson(
      "https://api.github.com/repos/" + REPOSITORY + "/git/trees/" + commitSha + "?recursive=1",
      token,
    );
    if (!treeResponse.ok) throw new Error("GitHub resource tree lookup failed with HTTP " + treeResponse.status + ".");
    const treePayload = await treeResponse.json() as {
      sha?: string;
      truncated?: boolean;
      tree?: Array<{ path?: string; type?: string; sha?: string }>;
    };
    if (!Array.isArray(treePayload.tree)) throw new Error("GitHub returned an invalid resource tree.");

    const resources: OmnisResource[] = [];
    for (const entry of treePayload.tree) {
      if (entry.type !== "blob" || !entry.path || !entry.sha) continue;
      const category = classifyOmnisResource(entry.path);
      if (!category) continue;
      counts[category] += 1;
      resources.push({ path: entry.path, category, sha: entry.sha });
    }
    resources.sort((a, b) => a.path.localeCompare(b.path));
    const importGraph = exactImportGraphForCommit(commitSha);
    return {
      available: true, complete: !treePayload.truncated, branch: BRANCH, commitSha,
      treeSha: treePayload.sha ?? null, generatedAt, total: resources.length, counts,
      resources: resources.slice(0, MAX_RESOURCES),
      importGraph, importGraphAvailable: Boolean(importGraph),
      importGraphError: importGraph ? null : "خريطة الاستيراد غير متاحة لهذا الـ Commit بالضبط؛ سيظل تحليل المسارات النطاقي متاحًا.",
      error: treePayload.truncated ? "GitHub marked this resource tree as truncated; the index is partial." : null,
    };
  } catch (error) {
    console.error("[admin/omnis] project resource index failed", error);
    return {
      available: false, complete: false, branch: BRANCH, commitSha: null, treeSha: null,
      generatedAt, total: 0, counts, resources: [], importGraph: null,
      importGraphAvailable: false, importGraphError: "تعذر تحميل خريطة الاستيراد لهذا الإصدار.",
      error: "تعذر قراءة فهرس موارد GitHub. لم يتم عرض نتائج مخزنة على أنها حديثة.",
    };
  }
}
