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

type Release = GitHubRelease;

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
  const [releasesResult, settingResult] = await Promise.all([
    getReleases(),
    readAdminRows<{ value: SiteSettingValue }>(
      "/rest/v1/site_settings?select=value&key=eq.android_release&limit=1",
    ),
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
