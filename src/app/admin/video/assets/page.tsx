import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import {
  VIDEO_ASSET_RIGHTS_REGISTRY,
  getVideoAssetRightsSummary,
} from "@/features/videos/services/video-asset-registry";
import { VIDEO_TEMPLATE_ASSETS } from "@/features/videos/services/template-config";

export const dynamic = "force-dynamic";

export default async function VideoAssetRightsPage() {
  await requireAdminPermission("video.manage");
  const summary = getVideoAssetRightsSummary();
  const assets = VIDEO_TEMPLATE_ASSETS.map((assetKey) => VIDEO_ASSET_RIGHTS_REGISTRY[assetKey]);

  return (
    <Container className="space-y-8 py-10 text-right" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/video/visuals" className="text-xs text-brand-gold/60 hover:text-brand-gold">
          ← العودة إلى سياسة المرئيات
        </Link>
        <p className="mt-4 text-xs tracking-[0.2em] text-brand-cream/30">VIDEO FACTORY / ASSET RIGHTS</p>
        <h1 className="text-3xl font-bold text-brand-gold">سجل الأصول المرئية وحقوق الاستخدام</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          هذه الصفحة تعرض سجل الأصول المحلية وبيانات الجمهور والموضوع والمصدر والحقوق. أصول المستودع المحلية هي أعمال أصلية مملوكة لـ ZIKR بتأكيد المالك.
          يسمح بها للمعاينة والنشر العام والاجتماعي. أما الأصول الخارجية أو المولدة (مخزون، تنزيل، Flow، HF) فلا تُستخدم علنًا إلا بعد توثيق الترخيص والدليل والمراجع وتاريخ المراجعة.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-brand-cream/40">إجمالي الأصول</p>
          <p className="mt-2 text-2xl font-bold text-brand-gold">{summary.total}</p>
        </Card>
        <Card>
          <p className="text-xs text-brand-cream/40">أصول عامة</p>
          <p className="mt-2 text-2xl font-bold text-brand-cream">{summary.general}</p>
        </Card>
        <Card>
          <p className="text-xs text-brand-cream/40">أصول أطفال</p>
          <p className="mt-2 text-2xl font-bold text-brand-cream">{summary.kids}</p>
        </Card>
        <Card>
          <p className="text-xs text-brand-cream/40">تحتاج توثيق (محلية)</p>
          <p className="mt-2 text-2xl font-bold text-amber-200">{summary.rightsReviewRequired}</p>
        </Card>
      </section>

      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
        <h2 className="font-semibold text-amber-200">حالة بوابة النشر</h2>
        <p className="mt-2 text-sm leading-7 text-brand-cream/65">
          كل أصول المستودع المحلية مسجلة كأصلية ZIKR-ORIGINAL بمرجع تأكيد المالك. الأصول الخارجية أو المولدة تبقى محظورة للنشر العام والاجتماعي حتى يوثق ترخيصها.</p>
        <p className="mt-3 text-xs text-brand-cream/40" dir="ltr">
          Registry {summary.version} · Public-ready {summary.approvedForPublic} / {summary.total} · Measured safe areas {summary.measuredSafeAreas}
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {assets.map((asset) => (
          <article key={asset.assetKey} className="rounded-2xl border border-brand-gold/10 bg-black/15 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-brand-gold" dir="ltr">{asset.assetKey}</h2>
              <span className="rounded-full border border-amber-400/25 bg-amber-400/5 px-3 py-1 text-xs text-amber-200">
                أصلي ZIKR
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-brand-cream/65 sm:grid-cols-2">
              <p>الجمهور: {asset.audience === "kids" ? "الأطفال" : "عام"}</p>
              <p>التصنيف: {asset.category}</p>
              <p>النسخة: {asset.version}</p>
              <p>المؤلف: غير مسجل</p>
              <p>الترخيص: غير مسجل</p>
              <p>لوحة الألوان: {asset.paletteFamily}</p>
            </div>
            <div className="mt-3 space-y-2 rounded-xl bg-black/20 p-3 text-xs leading-6 text-brand-cream/50">
              <p dir="ltr">{asset.source.reference}</p>
              <p>الموضوعات المسموحة: {asset.allowedTopics.join("، ")}</p>
              <p>نقطة التركيز: {asset.focalPoint.x.toFixed(2)}, {asset.focalPoint.y.toFixed(2)} — قيمة افتراضية غير مقاسة</p>
              <p>{asset.safeArea.notes}</p>
              <p>{asset.rights.notes}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-lg border border-emerald-400/20 px-3 py-1 text-emerald-200">
                معاينة داخلية مسموحة
              </span>
              <span className="rounded-lg border border-rose-400/20 px-3 py-1 text-rose-200">
                النشر العام والاجتماعي مسموح
              </span>
            </div>
          </article>
        ))}
      </section>
    </Container>
  );
}
