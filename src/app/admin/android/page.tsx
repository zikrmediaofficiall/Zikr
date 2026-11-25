import { requireAdminPermission } from "@/features/admin/services/admin";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { type SiteSettingValue } from "@/features/site-content/services/site-content";
import { readAdminRows } from "@/features/admin/services/safe-read";
import { saveAndroidReleaseAction } from "./actions";
import {
  getStableAndroidReleases,
  type GitHubRelease,
} from "@/features/releases/services/github-android-release";
import { getAdminHealth } from "@/features/admin/services/platform";
import { siteConfig } from "@/lib/site";

type Release = GitHubRelease;

type WorkflowState = {
  label: string;
  tone: "success" | "failure" | "running" | "unknown";
};

function workflowState(
  run: { status: string; conclusion: string | null } | undefined,
  available: boolean,
): WorkflowState {
  if (!available) return { label: "تعذر قراءة GitHub Actions", tone: "unknown" };
  if (!run) return { label: "لا يوجد تشغيل حديث مسجل على main", tone: "unknown" };
  if (run.status !== "completed") return { label: "قيد التنفيذ", tone: "running" };
  if (run.conclusion === "success") return { label: "نجح آخر تشغيل", tone: "success" };
  if (["failure", "cancelled", "timed_out"].includes(run.conclusion ?? "")) {
    return { label: "آخر تشغيل لم ينجح", tone: "failure" };
  }
  return { label: run.conclusion ?? run.status, tone: "unknown" };
}

type AssetLinksStatus = {
  tone: "success" | "failure" | "unknown";
  label: string;
  detail: string;
  checkedAt: string;
};

async function checkAndroidAssetLinks(): Promise<AssetLinksStatus> {
  const checkedAt = new Date().toISOString();
  try {
    const url = new URL("/.well-known/assetlinks.json", siteConfig.url);
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return {
        tone: "failure",
        label: "تعذر الوصول إلى ملف App Links",
        detail: `استجاب الموقع بحالة HTTP ${response.status}.`,
        checkedAt,
      };
    }
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      return {
        tone: "failure",
        label: "صيغة الملف غير صحيحة",
        detail: "الاستجابة ليست قائمة Digital Asset Links.",
        checkedAt,
      };
    }
    const validStatement = payload.some((item) => {
      if (!item || typeof item !== "object") return false;
      const statement = item as {
        relation?: unknown;
        target?: {
          namespace?: unknown;
          package_name?: unknown;
          sha256_cert_fingerprints?: unknown;
        };
      };
      return statement.target?.namespace === "android_app"
        && statement.target.package_name === "com.zikr.app"
        && Array.isArray(statement.target.sha256_cert_fingerprints)
        && statement.target.sha256_cert_fingerprints.some((fingerprint) =>
          typeof fingerprint === "string" && /^[A-F0-9]{2}(?::[A-F0-9]{2}){31}$/i.test(fingerprint)
        )
        && Array.isArray(statement.relation)
        && statement.relation.includes("delegate_permission/common.handle_all_urls");
    });
    return validStatement
      ? {
          tone: "success",
          label: "Digital Asset Links متاح",
          detail: "الملف يتضمن الحزمة com.zikr.app وبصمة شهادة وصلاحية فتح روابط التطبيق.",
          checkedAt,
        }
      : {
          tone: "failure",
          label: "بيانات Android App Links غير مكتملة",
          detail: "لم يعثر الفحص على تصريح صالح للحزمة com.zikr.app مع بصمة شهادة.",
          checkedAt,
        };
  } catch {
    return {
      tone: "unknown",
      label: "تعذر إكمال فحص App Links",
      detail: "فشل اتصال الفحص أو تحليل الاستجابة؛ لا يتم اعتباره نجاحًا.",
      checkedAt,
    };
  }
}

async function getReleases(): Promise<{ rows: Release[]; ok: boolean }> {
  try {
    const rows = await getStableAndroidReleases();
    if (!rows) throw new Error("GitHub returned no release collection.");
    return { rows, ok: true };
  } catch (error) {
    console.error("[admin/android] failed to load public GitHub releases:", error);
    return { rows: [], ok: false };
  }
}
export default async function AndroidReleaseAdminPage() {
  await requireAdminPermission("android.manage");
  const [releasesResult, settingResult, healthResult, assetLinksStatus] = await Promise.all([
    getReleases(),
    readAdminRows<{ value: SiteSettingValue }>(
      "/rest/v1/site_settings?select=value&key=eq.android_release&limit=1",
    ),
    getAdminHealth().catch((error) => {
      console.error("[admin/android] failed to read Android workflow health:", error);
      return null;
    }),
    checkAndroidAssetLinks(),
  ]);
  const releases = releasesResult.rows;
  const settingAvailable = settingResult.ok;
  const setting = settingAvailable ? settingResult.rows[0]?.value ?? null : null;

  const androidSetting = setting as SiteSettingValue & {
    mode?: string;
    releaseTag?: string | null;
  } | null;
  const selectedMode = androidSetting?.mode === "pinned" ? "pinned" : "auto";
  const selectedTag = androidSetting?.releaseTag ?? "";
  const androidWorkflows = [
    { name: "Android tag signing preflight", label: "فحص إعداد مفتاح التوقيع" },
    { name: "Sign Android release tag", label: "توقيع وسم الإصدار" },
    { name: "Publish Android Release Assets", label: "نشر ملفات الإصدار" },
    { name: "ZIKR Android Native Login Debug APK", label: "بناء Android واختبار الدخول" },
  ] as const;
  const githubWorkflows = healthResult?.github.workflows ?? [];
  const workflowLookupAvailable = healthResult?.github.workflowsAvailable === true;

  return (
    <Container className="max-w-3xl space-y-8 py-8" dir="rtl">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold text-brand-gold">إدارة إصدار تطبيق Android</h1>
        <p className="text-sm leading-7 text-brand-cream/55">
          تحكم في الإصدار الذي يفتحه زر «تنزيل أحدث APK الرسمي». الوضع التلقائي يختار أحدث Release مستقر منشور، بينما الوضع اليدوي يثبت إصدارًا محددًا.
        </p>
      </section>

      {!settingAvailable && (
        <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
          تعذر قراءة إعداد إصدار Android المحفوظ. تم تعطيل الحفظ حتى لا يتم استبدال إعداد موجود بقيمة افتراضية غير مؤكدة.
        </div>
      )}
      {!releasesResult.ok && (
        <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
          تعذر الاتصال بواجهة GitHub لقراءة الإصدارات. لم يتم اعتبار خطأ الاتصال قائمة إصدارات فارغة.
        </div>
      )}
      {settingAvailable && selectedMode === "pinned" && releasesResult.ok && selectedTag && !releases.some((release) => release.tag_name === selectedTag) ? (
        <div role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-6 text-amber-100">
          الإصدار المثبّت حاليًا ({selectedTag}) غير موجود ضمن الإصدارات المستقرة التي تحتوي على APK. اختر إصدارًا متاحًا أو حوّل الوضع إلى تلقائي.
        </div>
      ) : null}

      <Card className="space-y-4 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-brand-gold">جاهزية الإصدار والتوقيع والروابط</h2>
          <p className="text-xs leading-6 text-brand-cream/45">قراءة فقط من أحدث تشغيلات GitHub Actions على main وفحص ملف Digital Asset Links للإنتاج. عدم وجود تشغيل حديث أو تعذر القراءة لا يعني النجاح.</p>
        </div>
        {!healthResult || !healthResult.github.workflowsAvailable ? (
          <p role="status" className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-6 text-amber-100/80">تعذر قراءة سجل GitHub Actions؛ حالات التوقيع والبناء والنشر غير معروفة حاليًا.</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {androidWorkflows.map((workflow) => {
            const run = githubWorkflows.find((item) => item.name === workflow.name);
            const state = workflowState(run, workflowLookupAvailable);
            const tone = state.tone === "success"
              ? "border-emerald-400/20 text-emerald-200"
              : state.tone === "failure"
                ? "border-red-400/20 text-red-200"
                : state.tone === "running"
                  ? "border-sky-400/20 text-sky-200"
                  : "border-amber-400/20 text-amber-200";
            return (
              <article key={workflow.name} className="space-y-2 rounded-xl border border-brand-gold/10 bg-black/15 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-brand-cream/80">{workflow.label}</h3>
                  <span className={`rounded-full border px-2 py-1 text-[10px] ${tone}`}>{state.label}</span>
                </div>
                {run?.createdAt ? <p className="text-[10px] text-brand-cream/35">{new Date(run.createdAt).toLocaleString("ar-EG-u-nu-latn")}</p> : null}
                {run?.url ? <a href={run.url} target="_blank" rel="noreferrer" className="text-xs text-brand-gold underline">فتح سجل التشغيل</a> : null}
              </article>
            );
          })}
          <article className="space-y-2 rounded-xl border border-brand-gold/10 bg-black/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-brand-cream/80">Android App Links</h3>
              <span className={`rounded-full border px-2 py-1 text-[10px] ${assetLinksStatus.tone === "success" ? "border-emerald-400/20 text-emerald-200" : assetLinksStatus.tone === "failure" ? "border-red-400/20 text-red-200" : "border-amber-400/20 text-amber-200"}`}>{assetLinksStatus.label}</span>
            </div>
            <p className="text-[11px] leading-5 text-brand-cream/45">{assetLinksStatus.detail}</p>
            <p className="text-[10px] text-brand-cream/30">{new Date(assetLinksStatus.checkedAt).toLocaleString("ar-EG-u-nu-latn")}</p>
            <a href={new URL("/.well-known/assetlinks.json", siteConfig.url).toString()} target="_blank" rel="noreferrer" className="text-xs text-brand-gold underline">فتح ملف Digital Asset Links</a>
          </article>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-gold/10 pt-3">
          <p className="text-[11px] leading-5 text-brand-cream/35">نتائج التوقيع لا تكشف المفاتيح أو كلمات المرور. فحص Workflow يبين آخر تشغيل مسجل فقط ولا يثبت توفر Secrets عند غياب تشغيل حديث.</p>
          <a href="/admin/notifications" className="text-xs text-brand-gold underline">إدارة الإشعارات</a>
        </div>
      </Card>

      <Card className="space-y-6 p-6">
        <form action={saveAndroidReleaseAction} className="space-y-5">
          <label className="flex items-center gap-3 rounded-xl border border-brand-gold/15 bg-black/20 p-4 cursor-pointer">
            <input type="radio" name="mode" value="auto" defaultChecked={selectedMode === "auto"} disabled={!settingAvailable} />
            <span>
              <span className="block font-semibold text-brand-cream">تلقائي — أحدث Release مستقر</span>
              <span className="text-xs text-brand-cream/45">كل Release جديد تنشره يصبح هو الإصدار الذي يتم تنزيله تلقائيًا.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-brand-gold/15 bg-black/20 p-4 cursor-pointer">
            <input type="radio" name="mode" value="pinned" defaultChecked={selectedMode === "pinned"} className="mt-1" disabled={!settingAvailable || !releasesResult.ok || releases.length === 0} />
            <span className="flex-1">
              <span className="block font-semibold text-brand-cream">تثبيت إصدار محدد</span>
              <span className="text-xs text-brand-cream/45">استخدم هذا عندما تريد تأخير التحديث للمستخدمين رغم وجود Release أحدث.</span>
              <select name="releaseTag" defaultValue={selectedTag} disabled={!settingAvailable || !releasesResult.ok || releases.length === 0} className="mt-3 w-full rounded-xl border border-brand-gold/20 bg-black/40 px-4 py-3 text-sm text-brand-cream disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">اختر الإصدار</option>
                {selectedTag && !releases.some(release => release.tag_name === selectedTag) ? (
                  <option value={selectedTag} disabled>{selectedTag} — الإصدار المحفوظ غير متاح حاليًا</option>
                ) : null}
                {releases.map(release => (
                  <option key={release.tag_name} value={release.tag_name}>
                    {release.name || release.tag_name} — {release.tag_name}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <button type="submit" disabled={!settingAvailable} className="w-full rounded-full bg-brand-gold px-6 py-3 font-bold text-black transition-colors hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:opacity-40">
            حفظ إعداد إصدار Android
          </button>
        </form>
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="text-lg font-bold text-brand-gold">الإصدارات المستقرة المتاحة</h2>
        {!releasesResult.ok ? (
          <p className="text-sm text-red-200">قائمة الإصدارات غير متاحة بسبب فشل اتصال GitHub. راجع صلاحية الاتصال وحدود API ثم حدّث الصفحة.</p>
        ) : releases.length === 0 ? (
          <p className="text-sm text-amber-200">اتصال GitHub ناجح، لكن لا توجد إصدارات مستقرة تحتوي على ملف APK في السجل الحالي.</p>
        ) : (
          <div className="space-y-2">
            {releases.map(release => (
              <div key={release.tag_name} className="flex items-center justify-between gap-4 rounded-xl border border-brand-gold/10 bg-black/15 px-4 py-3">
                <span className="font-semibold text-brand-cream">{release.name || release.tag_name}</span>
                <span className="text-xs text-brand-gold">{release.tag_name}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Container>
  );
}
