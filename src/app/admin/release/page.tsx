export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { getAdminHealth } from "@/features/admin/services/platform";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { getLatestStableAndroidRelease } from "@/features/releases/services/github-android-release";
import { getAndroidReleaseSigningPreflightStatus } from "@/features/releases/services/github-release-manager";
import { createAndroidReleaseAction, retryAndroidReleaseSigningAction, runAndroidReleaseSigningPreflightAction } from "./actions";

export const metadata: Metadata = { title: "مركز الإصدار | الأدمن" };

const checks = [
  ["التحقق الآلي", "GitHub Actions → ZIKR / Quality Gate"],
  ["بناء الإنتاج", "Vercel / controlled production release"],
  ["سلامة الترحيلات", "pnpm supabase:migrations:check"],
  ["سلامة المسارات", "pnpm routes:check"],
  ["جاهزية الهاتف", "pnpm mobile:check"],
  ["إصدار Android", "APK + AAB + SHA256SUMS + توقيع"],
] as const;

type Operation = {
  status?: string;
  tag?: string;
  version?: string;
  versionCode?: number;
  commitSha?: string;
  releaseId?: number | null;
  releaseUrl?: string | null;
  startedAt?: string;
  startedBy?: string | null;
  note?: string;
  signingDispatchError?: string | null;
};

export default async function AdminReleasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPermission("release.manage");

  const health = await getAdminHealth();
  const [operationRows, latestAndroidRelease, signingPreflight] = await Promise.all([
    supabaseServerAdminRequest<Array<{ value?: unknown }>>(
      "/rest/v1/admin_settings?key=eq.android_release_operation&select=value&limit=1",
      { method: "GET" },
    ).catch(() => []),
    getLatestStableAndroidRelease().catch(() => null),
    getAndroidReleaseSigningPreflightStatus().catch(() => null),
  ]);

  const operation = (operationRows?.[0]?.value ?? null) as Operation | null;
  const params = await searchParams;
  const operationStartedAt = Date.parse(operation?.startedAt ?? "");
  const operationIsActive = Boolean(
    (operation?.status === "building" || operation?.status === "signing") &&
      Number.isFinite(operationStartedAt) &&
      Date.now() - operationStartedAt < 6 * 60 * 60 * 1000,
  );
  const operationIsStale = Boolean(
    (operation?.status === "building" || operation?.status === "signing") &&
      Number.isFinite(operationStartedAt) &&
      Date.now() - operationStartedAt >= 6 * 60 * 60 * 1000,
  );
  const operationNeedsReview = Boolean(
    operation?.status === "signing_dispatch_failed" ||
      ((operation?.status === "building" || operation?.status === "signing") && !Number.isFinite(operationStartedAt)),
  );

  const releaseError = typeof params.android_release_error === "string" ? params.android_release_error.slice(0, 300) : null;

  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "غير متاح";
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "غير متاح خارج Vercel";

  return (
    <Container className="py-10 space-y-6" dir="rtl">
      <header>
        <p className="text-xs tracking-[0.18em] text-brand-cream/30">إدارة الإصدار</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-gold">مركز الإصدار</h1>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-brand-cream/50">
          لوحة متابعة للإصدار المستقر ومتطلبات إطلاق Android. إنشاء إصدار جديد
          متوقف حتى يتوفر مسار محمي يوقّع Git tag تشفيريًا وتتحقق CI من التوقيع
          والهوية قبل تجهيز الإصدار.
        </p>
      </header>

      {releaseError ? (
        <section role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/5 p-5 text-sm leading-7 text-red-200">
          تعذر إنشاء إصدار Android: {releaseError}
        </section>
      ) : null}

      <section id="android-signing-preflight" role="status" className="rounded-2xl border border-brand-gold/15 bg-black/15 p-5 text-sm leading-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-brand-gold">التحقق من توقيع Git</h2>
            <p className="mt-1 text-brand-cream/70">
              {signingPreflight?.ready
                ? "نجح فحص مفتاح التوقيع المحمي على أحدث commit من main."
                : signingPreflight?.status === "in_progress" || signingPreflight?.status === "queued" || signingPreflight?.status === "waiting"
                  ? "فحص التوقيع يعمل حاليًا؛ افتح نتيجة GitHub ثم حدّث هذه الصفحة."
                  : signingPreflight?.conclusion === "failure"
                    ? "فشل فحص التوقيع. افتح سجل GitHub لمعرفة المفتاح أو المتغير الناقص."
                    : "لم ينجح فحص مفتاح توقيع Git بعد. لن يتم إنشاء commit أو tag حتى يمر الفحص."}
            </p>
            {signingPreflight?.mainSha ? (
              <p className="mt-1 break-all font-mono text-xs text-brand-cream/45">main: {signingPreflight.mainSha}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={runAndroidReleaseSigningPreflightAction}>
              <button
                type="submit"
                className="rounded-xl border border-brand-gold/30 px-4 py-2 text-sm font-semibold text-brand-gold hover:bg-brand-gold/10"
                disabled={operationIsActive || operationNeedsReview}
              >
                فحص مفتاح التوقيع
              </button>
            </form>
            {signingPreflight?.url ? (
              <a href={signingPreflight.url} target="_blank" rel="noreferrer noopener" className="text-xs text-brand-gold underline">
                نتيجة الفحص على GitHub
              </a>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-xs text-brand-cream/45">
          بيئة GitHub المحمية <code>android-release-signing</code> تحتاج سرّي
          <code>ANDROID_RELEASE_TAG_GPG_PRIVATE_KEY</code> و<code>ANDROID_RELEASE_TAG_GPG_PASSPHRASE</code>،
          والمتغيرات <code>ANDROID_RELEASE_TAG_GPG_FINGERPRINT</code> و<code>ANDROID_RELEASE_SIGNING_EMAIL</code> و<code>ANDROID_RELEASE_SIGNING_NAME</code> و<code>ANDROID_RELEASE_SIGNING_GITHUB_USER</code>.
          يجب تسجيل المفتاح العام في حساب GitHub المحدد في متغير ANDROID_RELEASE_SIGNING_GITHUB_USER بنفس البريد والبصمة.
        </p>
      </section>

      {operationIsStale ? (
        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-7 text-amber-100/80">
          توجد عملية قديمة مسجلة باسم <span className="font-mono">{operation?.tag}</span>،
          لكنها تجاوزت مهلة البناء ولا تُعد عملية نشطة. المسودات القديمة لإصدارات أخرى
          لن تمنع إنشاء إصدار أحدث، وسيظل منع تكرار الوسم نفسه فعالًا.
        </section>
      ) : null}

      {operationNeedsReview ? (
        <section role="alert" className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-sm leading-7 text-amber-100">
          {operation?.status === "signing_dispatch_failed"
            ? "بيانات الإصدار محفوظة على main، لكن لم يتم تأكيد إرسال طلب التوقيع. أعد إرسال العملية نفسها دون إنشاء Tag أو commit أو رقم إصدار جديد."
            : "وقت بدء العملية السابقة غير صالح؛ تم إيقاف الإطلاق احتياطيًا حتى تتم مراجعة حالتها."}
          {operation?.status === "signing_dispatch_failed" ? (
            <form action={retryAndroidReleaseSigningAction} className="mt-3">
              <button type="submit" className="rounded-lg border border-amber-200/30 px-4 py-2 font-semibold hover:bg-amber-100/10">
                إعادة إرسال توقيع نفس الإصدار
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-brand-gold/15 bg-black/15 p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-brand-gold">إصدار Android جديد</h2>
            <p className="mt-1 text-sm leading-7 text-brand-cream/45">
              يجهّز الإصدار من أحدث main بعد نجاح فحص المفتاح، ثم يوقّع Runner الوسم ويتحقق GitHub منه قبل البناء.
            </p>
          </div>
          <form action={createAndroidReleaseAction}>
            <button
              type="submit"
              className="rounded-xl bg-brand-gold px-6 py-3 font-bold text-black hover:bg-brand-gold/90 disabled:cursor-not-allowed disabled:bg-brand-gold/25 disabled:text-black/45"
              disabled={!signingPreflight?.ready || operationIsActive || operationNeedsReview}
              aria-describedby="android-signing-preflight"
            >
              {operationIsActive
                ? "عملية الإصدار قيد التنفيذ"
                : operationNeedsReview
                  ? "راجع العملية السابقة"
                  : signingPreflight?.ready
                    ? "إصدار Android جديد"
                    : "الإصدار ينتظر فحص التوقيع"}
            </button>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-brand-gold/10 bg-black/10 p-4">
            <p className="text-xs text-brand-cream/35">حالة العملية</p>
            <p className="mt-2 font-semibold text-brand-cream/80">
              {operationIsActive
                ? "توقيع Git ثم بناء APK/AAB والتحقق"
                : operationIsStale
                  ? "عملية سابقة متوقفة — جاهز لإصدار أحدث"
                  : operationNeedsReview
                    ? "تحتاج العملية السابقة إلى مراجعة"
                    : "محجوب: توقيع الوسم غير مهيأ"}
            </p>
          </div>
          <div className="rounded-xl border border-brand-gold/10 bg-black/10 p-4">
            <p className="text-xs text-brand-cream/35">آخر عملية مسجلة</p>
            <p className="mt-2 font-mono text-sm text-brand-gold">{operation?.tag ?? "لا توجد عملية سابقة"}</p>
          </div>
          <div className="rounded-xl border border-brand-gold/10 bg-black/10 p-4">
            <p className="text-xs text-brand-cream/35">Commit آخر عملية مسجلة</p>
            <p className="mt-2 break-all font-mono text-xs text-brand-cream/60">
              {operation?.commitSha ?? commit}
            </p>
          </div>
        </div>

        {operationIsActive ? (
          <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-4 text-sm leading-7 text-sky-100/75">
            {operation?.note ?? "تم إرسال commit الإصدار إلى بيئة توقيع Git المحمية؛ ينتظر البناء تأكيد GitHub للتوقيع."}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <p className="text-xs text-brand-cream/35">الفرع الحالي</p>
          <p className="mt-2 font-mono text-sm text-brand-cream/70">{branch}</p>
        </div>
        <div className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5 md:col-span-2">
          <p className="text-xs text-brand-cream/35">Commit الواجهة الحالية</p>
          <p className="mt-2 break-all font-mono text-sm text-brand-cream/70">{commit}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <h2 className="text-lg font-semibold text-brand-gold">التحققات المطلوبة</h2>
        <div className="mt-4 space-y-2">
          {checks.map(([name, value]) => (
            <div
              key={name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-gold/8 bg-black/10 px-4 py-3"
            >
              <span className="text-sm text-brand-cream/75">{name}</span>
              <span className="font-mono text-xs text-brand-cream/35">{value}</span>
              <span className="text-[11px] text-brand-cream/25">يتم إثباته من CI/Release</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-brand-gold">أحدث Release مستقر</h2>
            <p className="mt-1 text-sm text-brand-cream/45">
              هذا هو الإصدار الذي يستخدمه قسم تحميل Android في الوضع التلقائي.
            </p>
          </div>
          {latestAndroidRelease?.html_url ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="/api/download/android"
                className="rounded-full bg-brand-gold px-4 py-2 text-xs font-bold text-black hover:bg-brand-gold/90"
              >
                تنزيل APK
              </a>
              <a
                href="/api/download/android/aab"
                className="rounded-full border border-brand-gold/30 px-4 py-2 text-xs text-brand-gold hover:bg-brand-gold/10"
              >
                تنزيل AAB
              </a>
              <a
                href={latestAndroidRelease.html_url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-full border border-brand-gold/25 px-4 py-2 text-xs text-brand-gold hover:bg-brand-gold/10"
              >
                فتح GitHub Release
              </a>
            </div>
          ) : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-brand-gold/10 bg-black/10 p-4">
            <p className="text-xs text-brand-cream/35">Tag</p>
            <p className="mt-2 font-mono text-brand-gold">{latestAndroidRelease?.tag_name ?? "لا يوجد"}</p>
          </div>
          <div className="rounded-xl border border-brand-gold/10 bg-black/10 p-4">
            <p className="text-xs text-brand-cream/35">التاريخ</p>
            <p className="mt-2 text-sm text-brand-cream/70">
              {latestAndroidRelease?.published_at
                ? new Date(latestAndroidRelease.published_at).toLocaleString("ar-EG-u-nu-latn")
                : "لا يوجد"}
            </p>
          </div>
          <div className="rounded-xl border border-brand-gold/10 bg-black/10 p-4">
            <p className="text-xs text-brand-cream/35">قاعدة البيانات</p>
            <p className="mt-2 text-sm text-emerald-300">Supabase control plane</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div
          className={
            health.database === "healthy"
              ? "rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"
              : "rounded-2xl border border-red-500/20 bg-red-500/5 p-5"
          }
        >
          <h2 className="font-semibold text-brand-gold">اتصال قاعدة البيانات</h2>
          <p className="mt-2 text-sm text-brand-cream/55">
            {health.database === "healthy"
              ? "تم الاتصال بقاعدة الإنتاج بنجاح في آخر فحص."
              : "تعذر تأكيد سلامة الاتصال في آخر فحص."}
          </p>
        </div>
        <div className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <h2 className="font-semibold text-brand-gold">الطوابير</h2>
          <p className="mt-2 text-sm text-brand-cream/55">
            فشل توليد الفيديو: {health.queuesAvailable.video ? health.queues.videoFailed : "غير متاح"}
          </p>
        </div>
      </section>
    </Container>
  );
}
