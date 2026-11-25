"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/layout/language-provider";
import { isInAppClient } from "@/lib/native-app";

type AppVersion = {
  version?: string;
  tag?: string;
  apkUrl?: string;
  aabUrl?: string;
  releaseUrl?: string;
  publishedAt?: string | null;
  name?: string;
  aabName?: string | null;
  sha256Url?: string | null;
};

export default function AndroidReleaseCard() {
  const { isEnglish } = useLanguage();
  const [release, setRelease] = useState<AppVersion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  useEffect(() => { setInApp(isInAppClient()); }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/app-version", { cache: "no-store" })
      .then(async response => {
        const data = (await response.json()) as AppVersion & { error?: string };
        if (!response.ok) throw new Error(data.error || "تعذر جلب الإصدار");
        if (mounted) setRelease(data);
      })
      .catch(err => {
        if (mounted) setError(err instanceof Error ? err.message : "تعذر جلب الإصدار");
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (inApp) return null;

  return (
    <section
      id="android-download"
      className="scroll-mt-24 rounded-2xl border border-brand-gold/20 bg-brand-emerald/10 p-8 text-center space-y-4"
      aria-labelledby="android-download-title"
    >
      <p className="text-xs tracking-[0.18em] text-brand-gold/70">
        {isEnglish ? "OFFICIAL ANDROID APP" : "تطبيق Android الرسمي"}
      </p>
      <h2 id="android-download-title" className="text-2xl font-bold text-brand-gold">
        {isEnglish ? "Download ZIKR for Android" : "حمّل تطبيق ذِكرٌ لنظام Android"}
      </h2>
      <p className="text-brand-cream/70 leading-7">
        {isEnglish
          ? "Downloads always point to the latest stable release after signature, source-commit and SHA-256 verification. APK is for direct installation; AAB is for store distribution."
          : "يتم توجيه التنزيل تلقائيًا إلى أحدث إصدار مستقر بعد التحقق من التوقيع وCommit المصدر وبصمات SHA-256. ملف APK للتثبيت المباشر، وAAB للنشر عبر المتاجر."}
      </p>

      {release ? (
        <div className="grid gap-3 sm:grid-cols-3 text-right" dir="rtl">
          <div className="rounded-xl border border-brand-gold/10 bg-black/15 p-4">
            <p className="text-xs text-brand-cream/35">{isEnglish ? "Version" : "الإصدار"}</p>
            <p className="mt-1 font-mono text-lg text-brand-gold">{release.version ?? release.tag}</p>
          </div>
          <div className="rounded-xl border border-brand-gold/10 bg-black/15 p-4">
            <p className="text-xs text-brand-cream/35">{isEnglish ? "Package" : "الحزمة"}</p>
            <p className="mt-1 text-sm text-brand-cream/70">{release.aabName ?? "APK + AAB"}</p>
          </div>
          <div className="rounded-xl border border-brand-gold/10 bg-black/15 p-4">
            <p className="text-xs text-brand-cream/35">{isEnglish ? "Publication" : "حالة النشر"}</p>
            <p className="mt-1 text-sm text-emerald-300">{isEnglish ? "Verified stable release" : "إصدار مستقر موثّق"}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-3">
        <a
          href={release?.apkUrl ?? "/api/download/android"}
          className="inline-flex items-center justify-center rounded-full bg-brand-gold px-8 py-3 font-bold text-black hover:bg-brand-gold/90 transition-colors"
        >
          {isEnglish ? "Download latest APK" : "تنزيل أحدث APK"}
        </a>
        <a
          href={release?.aabUrl ?? "/api/download/android/aab"}
          className="inline-flex items-center justify-center rounded-full border border-brand-gold/30 px-6 py-3 font-bold text-brand-gold hover:bg-brand-gold/10 transition-colors"
        >
          {isEnglish ? "Download AAB" : "تنزيل AAB"}
        </a>
        {release?.releaseUrl ? (
          <a
            href={release.releaseUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center rounded-full border border-brand-gold/20 px-6 py-3 text-sm text-brand-gold/80 hover:bg-brand-gold/10 transition-colors"
          >
            {isEnglish ? "Release notes" : "ملاحظات الإصدار"}
          </a>
        ) : null}
      </div>

      {release?.sha256Url ? (
        <a
          href={release.sha256Url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-brand-gold/20 px-4 py-2 text-xs text-brand-gold/80 underline-offset-4 hover:bg-brand-gold/10 hover:underline"
        >
          {isEnglish ? "Download SHA-256 checksums" : "تحميل ملف بصمات SHA-256"}
        </a>
      ) : null}

      {error ? (
        <p className="text-sm text-amber-200/80">{error}</p>
      ) : (
        <p className="text-xs text-brand-cream/50">
          {isEnglish
            ? "Only published stable files are downloadable. APK/AAB signatures, source provenance and checksums are verified before publication."
            : "لا تُتاح إلا الملفات المنشورة المستقرة. يتم التحقق من توقيع APK/AAB ومصدر البناء والبصمات قبل النشر."}
        </p>
      )}
    </section>
  );
}
