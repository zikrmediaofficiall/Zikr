import "server-only";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { selectAndroidRelease } from "../android-release-selection";
export { selectAndroidRelease } from "../android-release-selection";

const RELEASES_API_BASE =
  "https://api.github.com/repos/zikrmediaofficiall/Zikr/releases";
const TAG_RELEASE_API =
  "https://api.github.com/repos/zikrmediaofficiall/Zikr/releases/tags";
const ASSET_API_BASE =
  "https://api.github.com/repos/zikrmediaofficiall/Zikr/releases/assets";
const MAX_RELEASE_PAGES = 3;

export type GitHubReleaseAsset = {
  id?: number;
  name?: string;
  browser_download_url?: string;
};

export type GitHubRelease = {
  tag_name?: string;
  name?: string;
  html_url?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
  assets?: GitHubReleaseAsset[];
};

export type AndroidReleaseSetting = {
  mode?: "auto" | "pinned" | "github-supabase";
  releaseTag?: string | null;
  version?: string | null;
  versionCode?: number | null;
  applicationId?: string | null;
  targetSdk?: number | null;
  releaseUrl?: string | null;
  apkUrl?: string | null;
  aabUrl?: string | null;
  sha256Url?: string | null;
  metadataUrl?: string | null;
  apkSha256?: string | null;
  aabSha256?: string | null;
};

function getGitHubToken() {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? null;
}

function githubHeaders(
  token: string | null = getGitHubToken(),
  accept = "application/vnd.github+json",
): HeadersInit {
  return {
    Accept: accept,
    "User-Agent": "ZIKR-platform-release",
    ...(token?.trim() ? { Authorization: `Bearer ${token.trim()}` } : {}),
  };
}

/**
 * GitHub Releases for this repository are public. If a stored PAT is revoked,
 * expired, or mis-scoped, retry the same read without Authorization instead
 * of turning public release metadata into a production outage.
 */
async function fetchGitHubResponse(
  url: string,
  accept = "application/vnd.github+json",
  redirect: RequestRedirect = "follow",
): Promise<Response> {
  const token = getGitHubToken();
  const request = {
    headers: githubHeaders(token, accept),
    cache: "no-store" as RequestCache,
    redirect,
  };
  let response = await fetch(url, request);
  if (response.status === 401 && token) {
    console.warn("[android release] GitHub rejected the configured token; retrying public release access without it.");
    response = await fetch(url, {
      ...request,
      headers: githubHeaders(null, accept),
    });
  }
  return response;
}

function isPublicReleaseAssetUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.startsWith("/zikrmediaofficiall/Zikr/releases/download/")
    );
  } catch {
    return false;
  }
}

function isSafeGitHubAssetRedirect(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "github.com" ||
        url.hostname.endsWith(".githubusercontent.com"))
    );
  } catch {
    return false;
  }
}

export function compareVersions(a: string, b: string): number {
  const left = a
    .trim()
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map(part => Number.parseInt(part, 10))
    .map(part => (Number.isFinite(part) ? part : 0));
  const right = b
    .trim()
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map(part => Number.parseInt(part, 10))
    .map(part => (Number.isFinite(part) ? part : 0));

  const length = Math.max(left.length, right.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function hasApk(release: GitHubRelease) {
  return release.assets?.some(asset =>
    asset.name?.toLowerCase().endsWith(".apk")
  );
}

function hasAab(release: GitHubRelease) {
  return release.assets?.some(asset =>
    asset.name?.toLowerCase().endsWith(".aab")
  );
}

async function fetchReleases(): Promise<GitHubRelease[] | null> {
  const releases: GitHubRelease[] = [];
  for (let page = 1; page <= MAX_RELEASE_PAGES; page += 1) {
    const response = await fetchGitHubResponse(
      `${RELEASES_API_BASE}?per_page=100&page=${page}`,
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error("GitHub Android release lookup failed: HTTP " + response.status);
    }

    const batch = (await response.json()) as GitHubRelease[];
    if (!Array.isArray(batch) || batch.length === 0) break;

    releases.push(...batch);
    if (batch.length < 100) break;
  }

  return releases;
}

export async function getStableAndroidReleases(): Promise<GitHubRelease[] | null> {
  const releases = await fetchReleases();
  if (!releases) return null;

  return releases
    .filter(
      release =>
        !release.draft &&
        !release.prerelease &&
        Boolean(release.tag_name?.trim()) &&
        hasApk(release) &&
        hasAab(release)
    )
    .sort((a, b) => {
      const versionDiff = compareVersions(b.tag_name ?? "", a.tag_name ?? "");
      if (versionDiff !== 0) return versionDiff;

      const aDate = a.published_at ? Date.parse(a.published_at) : 0;
      const bDate = b.published_at ? Date.parse(b.published_at) : 0;
      return bDate - aDate;
    });
}

export async function getLatestStableAndroidRelease(): Promise<GitHubRelease | null> {
  const releases = await getStableAndroidReleases();
  return releases?.[0] ?? null;
}

export async function getStableReleaseByTag(
  tag: string
): Promise<GitHubRelease | null> {
  if (!/^[A-Za-z0-9._-]+$/.test(tag)) return null;

  const response = await fetchGitHubResponse(
    `${TAG_RELEASE_API}/${encodeURIComponent(tag)}`,
  );
  if (!response.ok) return null;

  const release = (await response.json()) as GitHubRelease;
  if (release.draft || release.prerelease || !hasApk(release) || !hasAab(release)) return null;
  return release;
}

export async function getAndroidReleaseSetting(): Promise<AndroidReleaseSetting> {
  if (!isSupabaseConfigured()) {
    return { mode: "auto", releaseTag: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "android_release")
    .maybeSingle();

  if (error) {
    // A failed read must not silently bypass an admin pin and promote a newer
    // release. Callers return a temporary-unavailable response instead.
    console.error("[android release] setting lookup failed:", error.code);
    throw new Error("Unable to read Android release setting");
  }

  const value = data?.value as AndroidReleaseSetting | null;
  if (
    value &&
    (value.mode === "pinned" || value.mode === "github-supabase")
  ) {
    return value;
  }

  return { mode: "auto", releaseTag: null };
}

export async function getSelectedAndroidRelease(): Promise<GitHubRelease | null> {
  const [setting, latestStable] = await Promise.all([
    getAndroidReleaseSetting(),
    getLatestStableAndroidRelease(),
  ]);

  const pinnedRelease =
    setting.mode === "pinned" && setting.releaseTag
      ? await getStableReleaseByTag(setting.releaseTag)
      : null;

  return selectAndroidRelease(latestStable, pinnedRelease);
}

export function findApkAsset(
  release: GitHubRelease | null
): GitHubReleaseAsset | null {
  return (
    release?.assets?.find(asset =>
      asset.name?.toLowerCase().endsWith(".apk")
    ) ?? null
  );
}

export function findAabAsset(
  release: GitHubRelease | null
): GitHubReleaseAsset | null {
  return (
    release?.assets?.find(asset =>
      asset.name?.toLowerCase().endsWith(".aab")
    ) ?? null
  );
}

export async function getSignedGitHubAssetUrl(
  assetId: number,
  browserDownloadUrl?: string,
): Promise<string | null> {
  if (!Number.isSafeInteger(assetId) || assetId < 1) return null;

  // Public browser_download_url values are returned by GitHub's authenticated-
  // or unauthenticated release metadata endpoint and avoid a PAT dependency.
  if (isPublicReleaseAssetUrl(browserDownloadUrl)) return browserDownloadUrl;

  const response = await fetchGitHubResponse(
    `${ASSET_API_BASE}/${assetId}`,
    "application/octet-stream",
    "manual",
  );

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    return isSafeGitHubAssetRedirect(location) ? location : null;
  }

  return null;
}
