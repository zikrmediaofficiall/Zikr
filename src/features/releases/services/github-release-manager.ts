import "server-only";

import { dispatchGitHubWorkflow } from "@/lib/github/dispatch-workflow";

type GitHubCommit = {
  sha: string;
  commit?: { message?: string };
  html_url?: string;
};

type GitHubRelease = {
  id?: number;
  tag_name?: string;
  name?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
  html_url?: string;
  target_commitish?: string;
  immutable?: boolean;
};

type GitHubRef = { object?: { sha?: string; type?: string } };
type GitHubGitCommit = { tree?: { sha?: string } };

class GitHubApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

const REPO = process.env.GITHUB_REPOSITORY?.trim() || "zikrofficial-X/Zikr";
const API = "https://api.github.com";

function token() {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
}

function headers(): HeadersInit {
  const value = token();
  return {
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "ZIKR-admin-release-manager",
    ...(value ? { Authorization: "Bearer " + value } : {}),
  };
}

async function githubJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!token()) throw new Error("GITHUB_TOKEN غير مُعد في بيئة الإنتاج.");
  const response = await fetch(API + path, {
    ...init,
    headers: { ...headers(), ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const body = await response.text();
  let payload: unknown = null;
  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    payload = body;
  }
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: unknown }).message ?? "")
        : "GitHub API HTTP " + response.status;
    throw new GitHubApiError(message || "GitHub API HTTP " + response.status, response.status);
  }
  return payload as T;
}

function decodeBase64(content: string) {
  return Buffer.from(content.replace(/\\n/g, "").replace(/\s/g, ""), "base64").toString("utf8");
}

function encodeBase64(content: string) {
  return Buffer.from(content, "utf8").toString("base64");
}

function repositoryPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function getOptionalJson<T>(path: string): Promise<T | null> {
  try {
    return await githubJson<T>(path);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) return null;
    throw error;
  }
}

async function getTextFile(path: string, ref: string) {
  const data = await githubJson<{ content?: string }>(
    "/repos/" + REPO + "/contents/" + repositoryPath(path) + "?ref=" + encodeURIComponent(ref),
  );
  if (typeof data.content !== "string") throw new Error("تعذر قراءة الملف: " + path);
  return decodeBase64(data.content);
}

async function getOptionalTextFile(path: string, ref: string) {
  try {
    return await getTextFile(path, ref);
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) return null;
    throw error;
  }
}

function replaceMatchesExactly(
  content: string,
  pattern: RegExp,
  replacement: string,
  expectedMatches: number,
  label: string,
) {
  if (!pattern.global) throw new Error("يجب أن يكون نمط الاستبدال global: " + label);
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== expectedMatches) {
    throw new Error(
      "تعذر تحديث " + label + ": المتوقع " + expectedMatches + " تطابق، والموجود " + matches.length + ".",
    );
  }
  return content.replace(pattern, replacement);
}

function assertAllVersionsMatch(
  content: string,
  pattern: RegExp,
  expectedValue: string,
  expectedMatches: number,
  label: string,
) {
  const values = [...content.matchAll(pattern)].map(match => match[1]);
  if (values.length !== expectedMatches || values.some(value => value !== expectedValue)) {
    throw new Error(
      "تعارض في بيانات " + label + ": القيم يجب أن تكون " + expectedValue +
      " في " + expectedMatches + " مواضع، والقيم الحالية: " + values.join(", "),
    );
  }
}

function parseAndroidVersion(buildGradle: string) {
  const normalizedGradle = buildGradle.replace(/\r/g, "");
  const versionName = normalizedGradle.match(/\bversionName\s*(?:=\s*)?["']([^"']+)["']/)?.[1]?.trim();
  const versionCodeRaw = normalizedGradle.match(/\bversionCode\s*(?:=\s*)?(\d+)\b/)?.[1];
  const versionCode = Number.parseInt(versionCodeRaw ?? "", 10);

  if (!versionName || !Number.isSafeInteger(versionCode) || versionCode < 1) {
    throw new Error("تعذر قراءة بيانات إصدار Android الصحيحة من android/app/build.gradle.");
  }
  return { versionName, versionCode };
}

function bumpPatch(version: string) {
  const parts = version.replace(/^v/i, "").split(".").map(value => Number.parseInt(value, 10));
  if (parts.length !== 3 || parts.some(value => !Number.isSafeInteger(value) || value < 0)) {
    throw new Error("صيغة الإصدار الحالية غير صالحة: " + version);
  }
  parts[2] += 1;
  return parts.join(".");
}

function categorize(message: string) {
  const first = message.split("\n")[0].trim();
  const lower = first.toLowerCase();
  if (lower.startsWith("feat") || lower.startsWith("add") || lower.startsWith("enhance")) return "features";
  if (lower.startsWith("fix") || lower.startsWith("bug")) return "fixes";
  return "improvements";
}

function buildReleaseNotes(
  version: string,
  versionCode: number,
  baseSha: string,
  commits: GitHubCommit[],
  previousTag: string | null,
) {
  const groups: Record<string, string[]> = { features: [], fixes: [], improvements: [] };
  for (const item of commits) {
    const title = item.commit?.message?.split("\n")[0]?.trim();
    if (!title) continue;
    const line = item.html_url
      ? "- " + title + " ([commit](" + item.html_url + "))"
      : "- " + title;
    groups[categorize(title)].push(line);
  }

  const section = (title: string, key: string) =>
    "## " + title + "\n" +
    (groups[key].length ? groups[key].join("\n") : "- لا توجد تغييرات مصنفة في هذه المجموعة.");

  const tick = String.fromCharCode(96);
  return [
    "# ZIKR Android v" + version,
    "Release tag: " + tick + "v" + version + tick,
    "",
    "إصدار رسمي جديد مبني من أحدث commit على الفرع main بعد اجتياز مسار الإصدار.",
    "",
    section("الإضافات والتطويرات", "features"),
    "",
    section("الإصلاحات", "fixes"),
    "",
    section("التحسينات والتغييرات الداخلية", "improvements"),
    "",
    "## معلومات الإصدار",
    "- Android version: " + tick + version + tick,
    "- Android versionCode: " + tick + versionCode + tick,
    "- Application ID: " + tick + "com.zikr.app" + tick,
    "- Target SDK: " + tick + "36" + tick,
    "- Preparation base commit: " + tick + baseSha + tick,
    "- Previous stable tag: " + tick + (previousTag ?? "none") + tick,
    "- Assets expected: signed APK + signed AAB + SHA256SUMS",
    "",
    "> سيتم نشر الـRelease للجمهور فقط بعد نجاح بناء Android والتحقق من التوقيع والنسخ.",
  ].join("\n");
}

/**
 * Build all release metadata from one immutable main snapshot and update main
 * exactly once. The non-force ref update is the final fast-forward guard:
 * if another writer advances main, GitHub rejects this commit rather than
 * overwriting or silently tagging somebody else's changes.
 */

type GitHubWorkflowRun = {
  id?: number;
  head_sha?: string;
  status?: string;
  conclusion?: string | null;
  html_url?: string;
  created_at?: string;
  updated_at?: string;
};

type GitHubWorkflowRuns = { workflow_runs?: GitHubWorkflowRun[] };

export type AndroidReleaseSigningPreflight = {
  mainSha: string;
  status: "not_run" | "queued" | "in_progress" | "waiting" | "completed";
  conclusion: string | null;
  ready: boolean;
  url: string | null;
  runId: number | null;
  updatedAt: string | null;
};

async function getCurrentMainSha(): Promise<string> {
  const ref = await githubJson<GitHubRef>("/repos/" + REPO + "/git/ref/heads/main");
  const sha = ref.object?.sha;
  if (!sha) throw new Error("تعذر تحديد أحدث commit على main.");
  return sha;
}

/**
 * Signing readiness must come from a protected-environment preflight run
 * against the exact current main SHA. A success for an older SHA is stale.
 */
export async function getAndroidReleaseSigningPreflightStatus(): Promise<AndroidReleaseSigningPreflight> {
  const mainSha = await getCurrentMainSha();
  const workflow = "android-release-signing-preflight.yml";
  const response = await githubJson<GitHubWorkflowRuns>(
    "/repos/" + REPO + "/actions/workflows/" + workflow + "/runs?event=workflow_dispatch&branch=main&per_page=20",
  );
  const candidates = (response.workflow_runs ?? [])
    .filter(run => run.head_sha === mainSha)
    .sort((a, b) => Date.parse(b.updated_at ?? b.created_at ?? "") - Date.parse(a.updated_at ?? a.created_at ?? ""));
  const latest = candidates[0];
  const updatedAt = latest?.updated_at ?? latest?.created_at ?? null;
  const ageMs = updatedAt ? Date.now() - Date.parse(updatedAt) : Number.POSITIVE_INFINITY;
  const recent = Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 6 * 60 * 60 * 1000;
  const ready = Boolean(latest?.status === "completed" && latest.conclusion === "success" && recent);

  return {
    mainSha,
    status: (latest?.status as AndroidReleaseSigningPreflight["status"]) ?? "not_run",
    conclusion: latest?.conclusion ?? null,
    ready,
    url: latest?.html_url ?? null,
    runId: latest?.id ?? null,
    updatedAt,
  };
}

export async function requestAndroidReleaseSigningPreflight() {
  const status = await getAndroidReleaseSigningPreflightStatus();
  if (status.status === "queued" || status.status === "in_progress" || status.status === "waiting") {
    return {
      mainSha: status.mainSha,
      workflowUrl: status.url ?? "https://github.com/" + REPO + "/actions/workflows/android-release-signing-preflight.yml",
    };
  }
  await dispatchGitHubWorkflow("android-release-signing-preflight.yml", {
    target_sha: status.mainSha,
  });
  return {
    mainSha: status.mainSha,
    workflowUrl: "https://github.com/" + REPO + "/actions/workflows/android-release-signing-preflight.yml",
  };
}

export async function dispatchPreparedAndroidReleaseTagSigning(tag: string, commitSha: string) {
  if (!/^v\d+\.\d+\.\d+$/.test(tag) || !/^[0-9a-f]{40}$/.test(commitSha)) {
    throw new Error("بيانات إعادة إرسال توقيع Android غير صالحة.");
  }
  const currentMainSha = await getCurrentMainSha();
  if (currentMainSha !== commitSha) {
    throw new Error("تغير main بعد تجهيز الإصدار؛ لن أرسل الوسم على commit مختلف عن commit الإصدار المسجل.");
  }
  await dispatchGitHubWorkflow("sign-android-release-tag.yml", {
    tag,
    commit_sha: commitSha,
  });
  return {
    tag,
    commitSha,
    workflowUrl: "https://github.com/" + REPO + "/actions/workflows/sign-android-release-tag.yml",
  };
}


type GitHubTagObject = {
  tag?: string;
  object?: { sha?: string; type?: string };
  verification?: { verified?: boolean; reason?: string };
};

const ACTIVE_WORKFLOW_STATUSES = new Set([
  "queued",
  "in_progress",
  "waiting",
  "requested",
  "pending",
]);

async function cancelWorkflowRunsForReleaseCommit(commitSha: string) {
  for (const workflow of [
    "sign-android-release-tag.yml",
    "publish-android-release-assets.yml",
  ]) {
    const result = await githubJson<GitHubWorkflowRuns>(
      "/repos/" + REPO + "/actions/workflows/" + workflow + "/runs?per_page=100",
    );
    const activeRuns = (result.workflow_runs ?? []).filter(
      run => run.head_sha === commitSha && ACTIVE_WORKFLOW_STATUSES.has(run.status ?? ""),
    );

    for (const run of activeRuns) {
      if (!run.id) {
        throw new Error("تعذر تحديد رقم تشغيل GitHub Actions العالق؛ لم يتم حذف أي Release أو Tag.");
      }

      try {
        await githubJson(
          "/repos/" + REPO + "/actions/runs/" + run.id + "/cancel",
          { method: "POST" },
        );
      } catch (error) {
        const latest = await getOptionalJson<GitHubWorkflowRun>(
          "/repos/" + REPO + "/actions/runs/" + run.id,
        );
        if (latest?.status !== "completed") {
          throw new Error(
            "تعذر إيقاف تشغيل GitHub Actions رقم " + run.id +
            " بأمان: " + (error instanceof Error ? error.message : "خطأ غير معروف"),
          );
        }
      }

      let completed = false;
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const latest = await getOptionalJson<GitHubWorkflowRun>(
          "/repos/" + REPO + "/actions/runs/" + run.id,
        );
        if (latest?.status === "completed") {
          completed = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!completed) {
        throw new Error(
          "ما زال تشغيل GitHub Actions رقم " + run.id +
          " يعمل بعد طلب الإيقاف؛ لم يتم حذف أي Release أو Tag.",
        );
      }
    }
  }
}

async function inspectStuckAndroidRelease(tag: string, commitSha: string) {
  const encodedTag = encodeURIComponent(tag);
  const [release, tagRef] = await Promise.all([
    getOptionalJson<GitHubRelease>(
      "/repos/" + REPO + "/releases/tags/" + encodedTag,
    ),
    getOptionalJson<GitHubRef>(
      "/repos/" + REPO + "/git/ref/tags/" + encodedTag,
    ),
  ]);

  if (release) {
    if (release.tag_name !== tag) {
      throw new Error("رفض الحذف لأن GitHub أعاد Release بوسم مختلف عن العملية المحددة.");
    }
    if (release.draft !== true || release.prerelease === true || release.immutable === true) {
      throw new Error("هذا Release منشور أو غير قابل للحذف؛ لن يتم حذف Release أو Tag منشور.");
    }
    if (
      release.target_commitish !== commitSha &&
      release.target_commitish !== "main"
    ) {
      throw new Error("رفض حذف Draft Release لأن مصدره لا يطابق commit الإصدار المسجل.");
    }
    if (!release.id) {
      throw new Error("تعذر تحديد معرّف Draft Release؛ لم يتم حذف أي عنصر.");
    }
  }

  if (tagRef) {
    const tagObjectSha = tagRef.object?.sha;
    if (tagRef.object?.type !== "tag" || !tagObjectSha) {
      throw new Error("رفض حذف Tag غير مشروح أو غير مكتمل؛ الوسم يجب أن يكون Annotated GPG Tag.");
    }
    const tagObject = await githubJson<GitHubTagObject>(
      "/repos/" + REPO + "/git/tags/" + encodeURIComponent(tagObjectSha),
    );
    if (
      (tagObject.tag && tagObject.tag !== tag) ||
      tagObject.verification?.verified !== true ||
      tagObject.verification.reason !== "valid" ||
      tagObject.object?.type !== "commit" ||
      tagObject.object.sha !== commitSha
    ) {
      throw new Error("رفض حذف Tag لأن توقيعه أو commit الهدف لا يطابق بيانات الإصدار المسجلة.");
    }
  }

  return { release, tagRef };
}

/**
 * Recover only a stale, unpublished Android release for the exact operation
 * recorded by the admin control plane. Published/immutable releases and tags
 * with a different or unverifiable target are never removed.
 */
export async function recreateStuckAndroidRelease(tag: string, commitSha: string) {
  if (!/^v\\d+\\.\\d+\\.\\d+$/.test(tag) || !/^[0-9a-f]{40}$/.test(commitSha)) {
    throw new Error("بيانات استرداد إصدار Android غير صالحة.");
  }

  const currentMainSha = await getCurrentMainSha();
  if (currentMainSha !== commitSha) {
    throw new Error(
      "تغير main عن commit الإصدار المسجل؛ لن يتم حذف أو إعادة إنشاء إصدار قديم على مصدر مختلف.",
    );
  }

  // Inspect once before stopping runners so an immutable published release is
  // rejected without affecting any in-flight production job.
  await inspectStuckAndroidRelease(tag, commitSha);
  await cancelWorkflowRunsForReleaseCommit(commitSha);

  // Re-read after cancellation to guard against a concurrent release update.
  const { release, tagRef } = await inspectStuckAndroidRelease(tag, commitSha);

  if (release?.id) {
    await githubJson(
      "/repos/" + REPO + "/releases/" + release.id,
      { method: "DELETE" },
    );
    const remainingRelease = await getOptionalJson<GitHubRelease>(
      "/repos/" + REPO + "/releases/tags/" + encodeURIComponent(tag),
    );
    if (remainingRelease) {
      throw new Error("لم يؤكد GitHub حذف Draft Release؛ تم إيقاف الاسترداد قبل حذف الـTag.");
    }
  }

  if (tagRef) {
    await githubJson(
      "/repos/" + REPO + "/git/refs/tags/" + encodeURIComponent(tag),
      { method: "DELETE" },
    );
    const remainingTag = await getOptionalJson<GitHubRef>(
      "/repos/" + REPO + "/git/ref/tags/" + encodeURIComponent(tag),
    );
    if (remainingTag) {
      throw new Error("لم يؤكد GitHub حذف الـTag؛ لم تتم إعادة إنشاء الإصدار.");
    }
  }

  let dispatchError: string | null = null;
  try {
    await dispatchPreparedAndroidReleaseTagSigning(tag, commitSha);
  } catch (error) {
    dispatchError = error instanceof Error ? error.message.slice(0, 300) : "تعذر إعادة إرسال مهمة توقيع الإصدار.";
  }

  return {
    tag,
    commitSha,
    deletedRelease: Boolean(release),
    deletedTag: Boolean(tagRef),
    workflowUrl: "https://github.com/" + REPO + "/actions/workflows/sign-android-release-tag.yml",
    dispatchError,
  };
}

async function createAtomicMainCommit(baseSha: string, files: Record<string, string>) {
  const baseCommit = await githubJson<GitHubGitCommit>(
    "/repos/" + REPO + "/git/commits/" + baseSha,
  );
  const baseTreeSha = baseCommit.tree?.sha;
  if (!baseTreeSha) throw new Error("تعذر تحديد Git tree للـcommit الأساسي.");

  const entries = await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const blob = await githubJson<{ sha?: string }>(
        "/repos/" + REPO + "/git/blobs",
        {
          method: "POST",
          body: JSON.stringify({
            content: encodeBase64(content),
            encoding: "base64",
          }),
        },
      );
      if (!blob.sha) throw new Error("تعذر إنشاء Git blob للملف: " + path);
      return { path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );

  const tree = await githubJson<{ sha?: string }>(
    "/repos/" + REPO + "/git/trees",
    {
      method: "POST",
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: entries,
      }),
    },
  );
  if (!tree.sha) throw new Error("تعذر إنشاء Git tree موحد لملفات الإصدار.");

  const commit = await githubJson<{ sha?: string }>(
    "/repos/" + REPO + "/git/commits",
    {
      method: "POST",
      body: JSON.stringify({
        message: "release: prepare Android " + files[".release-tag"].trim() + " atomically",
        tree: tree.sha,
        parents: [baseSha],
      }),
    },
  );
  if (!commit.sha) throw new Error("تعذر إنشاء commit موحد لبيانات الإصدار.");

  const latestRef = await githubJson<GitHubRef>(
    "/repos/" + REPO + "/git/ref/heads/main",
  );
  if (latestRef.object?.sha !== baseSha) {
    throw new Error(
      "تغير فرع main أثناء تجهيز الإصدار. لم يتم تحديث الفرع؛ أعد الفحص قبل المحاولة مرة أخرى.",
    );
  }

  await githubJson(
    "/repos/" + REPO + "/git/refs/heads/main",
    {
      method: "PATCH",
      body: JSON.stringify({
        sha: commit.sha,
        force: false,
      }),
    },
  );

  const verifiedRef = await githubJson<GitHubRef>(
    "/repos/" + REPO + "/git/ref/heads/main",
  );
  if (verifiedRef.object?.sha !== commit.sha) {
    throw new Error("تم إنشاء commit الإصدار لكن تعذر تأكيد انتقال main إلى نفس الـcommit.");
  }

  return commit.sha;
}

export async function prepareAndroidRelease() {
  const baseSha = await getCurrentMainSha();
  const preflight = await getAndroidReleaseSigningPreflightStatus();
  if (!preflight.ready || preflight.mainSha !== baseSha) {
    throw new Error("لم ينجح فحص مفتاح توقيع Git لهذا الـcommit. شغّل فحص التوقيع من مركز الإصدار وانتظر نجاحه قبل إنشاء أي commit أو tag.");
  }

  const [
    buildGradle,
    packageText,
    footerText,
    releaseTagText,
    iosProjectText,
    iosInfoText,
  ] = await Promise.all([
    getTextFile("android/app/build.gradle", baseSha),
    getTextFile("package.json", baseSha),
    getTextFile("src/components/layout/footer.tsx", baseSha),
    getTextFile(".release-tag", baseSha),
    getTextFile("ios/App/App.xcodeproj/project.pbxproj", baseSha),
    getTextFile("ios/App/App/Info.plist", baseSha),
  ]);

  const packageJson = JSON.parse(packageText) as { version?: string };
  const current = parseAndroidVersion(buildGradle);
  const packageVersion = String(packageJson.version ?? "");
  const currentTag = releaseTagText.trim();

  if (packageVersion !== current.versionName) {
    throw new Error(
      "تعارض إصدار التطبيق: package.json=" + packageVersion +
      " بينما Android versionName=" + current.versionName + ".",
    );
  }
  if (currentTag !== "v" + current.versionName) {
    throw new Error(
      "تعارض وسم الإصدار الحالي: .release-tag=" + currentTag +
      " بينما الإصدار الحالي يجب أن يكون v" + current.versionName + ".",
    );
  }

  assertAllVersionsMatch(
    footerText,
    /const APP_VERSION = "([^"]+)";/g,
    current.versionName,
    1,
    "نسخة Footer",
  );
  assertAllVersionsMatch(
    iosProjectText,
    /MARKETING_VERSION = ([^;]+);/g,
    current.versionName,
    2,
    "iOS MARKETING_VERSION",
  );
  assertAllVersionsMatch(
    iosProjectText,
    /CURRENT_PROJECT_VERSION = ([^;]+);/g,
    String(current.versionCode),
    2,
    "iOS CURRENT_PROJECT_VERSION",
  );
  assertAllVersionsMatch(
    iosInfoText,
    /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/g,
    current.versionName,
    1,
    "iOS CFBundleShortVersionString",
  );
  assertAllVersionsMatch(
    iosInfoText,
    /<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/g,
    String(current.versionCode),
    1,
    "iOS CFBundleVersion",
  );

  const nextVersion = bumpPatch(current.versionName);
  const nextVersionCode = current.versionCode + 1;
  if (!Number.isSafeInteger(nextVersionCode)) {
    throw new Error("Android versionCode تجاوز الحد الآمن للأرقام.");
  }
  const tag = "v" + nextVersion;
  const notesPath = "docs/releases/" + nextVersion + ".md";

  const releases = await githubJson<GitHubRelease[]>(
    "/repos/" + REPO + "/releases?per_page=100&page=1",
  );

  if (releases.some(release => release.tag_name === tag)) {
    throw new Error("الإصدار " + tag + " موجود بالفعل على GitHub.");
  }

  // Old drafts for other versions may be abandoned recovery records. They must
  // never block a new release; the exact-tag duplicate check above is the lock
  // that prevents creating a second draft for this version.

  if (await getOptionalTextFile(notesPath, baseSha)) {
    throw new Error("ملف ملاحظات الإصدار موجود مسبقاً: " + notesPath);
  }

  const latestStable = releases
    .filter(release => !release.draft && !release.prerelease && release.tag_name)
    .sort((a, b) => Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? ""))[0];

  let commits: GitHubCommit[] = [];
  if (latestStable?.tag_name) {
    const compare = await githubJson<{ commits?: GitHubCommit[] }>(
      "/repos/" + REPO + "/compare/" + encodeURIComponent(latestStable.tag_name) + "..." + baseSha,
    );
    commits = (compare.commits ?? []).slice(-50);
  } else {
    commits = await githubJson<GitHubCommit[]>(
      "/repos/" + REPO + "/commits?sha=" + encodeURIComponent(baseSha) + "&per_page=50",
    );
  }

  const notes = buildReleaseNotes(
    nextVersion,
    nextVersionCode,
    baseSha,
    commits,
    latestStable?.tag_name ?? null,
  );

  const nextBuild = replaceMatchesExactly(
    replaceMatchesExactly(
      buildGradle,
      /\bversionCode\s+\d+\b/g,
      "versionCode " + nextVersionCode,
      1,
      "Android versionCode",
    ),
    /\bversionName\s+"[^"]+"/g,
    'versionName "' + nextVersion + '"',
    1,
    "Android versionName",
  );
  const nextPackage = replaceMatchesExactly(
    packageText,
    /"version"\s*:\s*"[^"]+"/g,
    '"version": "' + nextVersion + '"',
    1,
    "package.json version",
  );
  const nextFooter = replaceMatchesExactly(
    footerText,
    /const APP_VERSION = "[^"]+";/g,
    'const APP_VERSION = "' + nextVersion + '";',
    1,
    "Footer APP_VERSION",
  );
  const nextReleaseTag = tag + "\n";
  const nextIosProject = replaceMatchesExactly(
    replaceMatchesExactly(
      iosProjectText,
      /MARKETING_VERSION = [^;]+;/g,
      "MARKETING_VERSION = " + nextVersion + ";",
      2,
      "iOS MARKETING_VERSION",
    ),
    /CURRENT_PROJECT_VERSION = [^;]+;/g,
    "CURRENT_PROJECT_VERSION = " + nextVersionCode + ";",
    2,
    "iOS CURRENT_PROJECT_VERSION",
  );
  const nextIosInfo = replaceMatchesExactly(
    replaceMatchesExactly(
      iosInfoText,
      /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]+(<\/string>)/g,
      "$1" + nextVersion + "$2",
      1,
      "iOS CFBundleShortVersionString",
    ),
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]+(<\/string>)/g,
    "$1" + nextVersionCode + "$2",
    1,
    "iOS CFBundleVersion",
  );

  const files: Record<string, string> = {
    "android/app/build.gradle": nextBuild,
    "package.json": nextPackage,
    "src/components/layout/footer.tsx": nextFooter,
    ".release-tag": nextReleaseTag,
    "ios/App/App.xcodeproj/project.pbxproj": nextIosProject,
    "ios/App/App/Info.plist": nextIosInfo,
    [notesPath]: notes + "\n",
  };

  const preparedCommitSha = await createAtomicMainCommit(baseSha, files);

  // The server action dispatches the protected signer after it records the
  // prepared commit. This leaves a recoverable operation if dispatch fails.
  return {
    tag,
    version: nextVersion,
    versionCode: nextVersionCode,
    commitSha: preparedCommitSha,
    releaseId: null,
    releaseUrl: "https://github.com/" + REPO + "/actions/workflows/sign-android-release-tag.yml",
    notes,
  };
}
