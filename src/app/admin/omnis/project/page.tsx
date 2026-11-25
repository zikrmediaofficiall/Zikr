export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { OMNIS_CENTERS } from "@/features/admin/omnis/registry";
import { OMNIS_DEPENDENCY_DEFINITIONS, OMNIS_MODULE_DEPENDENCIES } from "@/features/admin/omnis/module-dependencies";
import { analyzeOmnisResourceImpact, OMNIS_RESOURCE_CATEGORY_LABELS } from "@/features/admin/omnis/resource-index";
import { getOmnisProjectResourceIndex } from "@/features/admin/services/omnis-project-index";

export const metadata: Metadata = {
  title: "مستكشف المشروع | ZIKR OMNIS",
  description: "فهرس صفحات وخدمات ومكونات وواجهات ZIKR مع خريطة الاعتماديات وتحليل أثر التغيير.",
};

type PageProps = { searchParams: Promise<{ q?: string; path?: string }> };

export default async function OmnisProjectExplorerPage({ searchParams }: PageProps) {
  await requireAdminPermission("system.manage");
  const params = await searchParams;
  const index = await getOmnisProjectResourceIndex();
  const query = (params.q ?? "").trim().toLowerCase().slice(0, 120);
  const resourcePath = (params.path ?? "").trim().slice(0, 500);
  const impact = resourcePath ? analyzeOmnisResourceImpact(resourcePath, index.importGraph) : null;
  const resources = index.resources.filter((item) => !query || item.path.toLowerCase().includes(query)).slice(0, 80);
  const dependencyLabels = new Map(OMNIS_DEPENDENCY_DEFINITIONS.map((item) => [item.id, item.label]));
  const centerLabels = new Map(OMNIS_CENTERS.map((item) => [item.id, item.title]));

  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← العودة إلى مركز القيادة</Link>
        <h1 className="text-3xl font-bold text-brand-gold">مستكشف المشروع</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">فهرس مباشر من GitHub للصفحات والمكونات والخدمات وواجهات API وملفات CI والترحيلات والاختبارات. تُولَّد خريطة الاستيراد من ملفات TypeScript وJavaScript في نفس Commit أثناء البناء، وتُعرض الاختبارات التي تستورد المورد بصورة مباشرة أو انتقالية.</p>
      </header>

      {!index.available ? (
        <div role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100/80">{index.error}</div>
      ) : null}
      {index.available && !index.complete ? (
        <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-100/75">{index.error}</div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-brand-gold/10 bg-black/15 p-4"><p className="text-xs text-brand-cream/40">موارد مفهرسة</p><p className="mt-2 text-2xl font-bold text-brand-gold">{index.available ? index.total : "—"}</p></article>
        <article className="rounded-xl border border-brand-gold/10 bg-black/15 p-4"><p className="text-xs text-brand-cream/40">الصفحات وواجهات API</p><p className="mt-2 text-2xl font-bold text-brand-cream">{index.available ? index.counts.page + index.counts.api : "—"}</p></article>
        <article className="rounded-xl border border-brand-gold/10 bg-black/15 p-4"><p className="text-xs text-brand-cream/40">الخدمات والمكونات</p><p className="mt-2 text-2xl font-bold text-brand-cream">{index.available ? index.counts.service + index.counts.component + index.counts.library : "—"}</p></article>
        <article className="rounded-xl border border-brand-gold/10 bg-black/15 p-4"><p className="text-xs text-brand-cream/40">الترحيلات والاختبارات وCI</p><p className="mt-2 text-2xl font-bold text-brand-cream">{index.available ? index.counts.migration + index.counts.test + index.counts.workflow : "—"}</p></article>
      </section>

      {index.available ? (
        <div className="space-y-1">
          <p className="text-[11px] text-brand-cream/35" dir="ltr">Branch: {index.branch} · Commit: {index.commitSha?.slice(0, 12)} · Indexed: {new Date(index.generatedAt).toLocaleString("en-GB")} · Showing up to 500 resources</p>
          <p className="text-[11px] text-brand-cream/45">
            خريطة الاستيراد: {index.importGraphAvailable
              ? `${index.importGraph?.files.length ?? 0} ملفًا و${index.importGraph?.edgeCount ?? 0} علاقة داخلية مؤكدة لنفس Commit`
              : index.importGraphError ?? "غير متاحة"}
          </p>
        </div>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <h2 className="text-lg font-bold text-brand-gold">بحث الموارد</h2>
        <form method="get" className="flex flex-wrap gap-2">
          <input name="q" defaultValue={params.q ?? ""} maxLength={120} placeholder="ابحث باسم ملف أو مسار" className="min-w-0 flex-1 rounded-lg border border-brand-gold/15 bg-black/20 px-3 py-2 text-sm text-brand-cream" />
          <button type="submit" className="rounded-lg border border-brand-gold/25 bg-brand-gold/10 px-4 py-2 text-xs font-semibold text-brand-gold">بحث</button>
        </form>
        {!index.available ? null : resources.length === 0 ? <p className="text-xs text-brand-cream/40">لا توجد موارد مطابقة ضمن الموارد المفهرسة.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-right text-xs">
              <thead><tr className="border-b border-brand-gold/10 text-brand-gold/65"><th className="px-2 py-3">المورد</th><th className="px-2 py-3">النوع</th><th className="px-2 py-3">فتح المصدر</th></tr></thead>
              <tbody>{resources.map((item) => (
                <tr key={item.path} className="border-b border-brand-gold/5 last:border-0">
                  <td className="max-w-[38rem] break-all px-2 py-3 font-mono text-brand-cream/70" dir="ltr">{item.path}</td>
                  <td className="px-2 py-3 text-brand-cream/45">{OMNIS_RESOURCE_CATEGORY_LABELS[item.category]}</td>
                  <td className="px-2 py-3"><a href={"https://github.com/zikrmediaofficiall/Zikr/blob/" + index.commitSha + "/" + item.path} target="_blank" rel="noreferrer" className="text-brand-gold underline">GitHub</a></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <h2 className="text-lg font-bold text-brand-gold">تحليل الأثر قبل التغيير</h2>
        <p className="text-xs leading-6 text-brand-cream/45">أدخل مسارًا داخل المستودع. عند توفر خريطة الاستيراد المطابقة للـ Commit سيُحسب المستوردون المباشرون والانتقاليون والاختبارات المرتبطة؛ أما الترحيلات والموارد غير البرمجية فتستخدم قواعد الملكية النطاقية.</p>
        <form method="get" className="flex flex-wrap gap-2">
          <input name="path" defaultValue={resourcePath} maxLength={500} placeholder="مثال: src/features/video/services/generator.ts" className="min-w-0 flex-1 rounded-lg border border-brand-gold/15 bg-black/20 px-3 py-2 text-sm text-brand-cream" dir="ltr" />
          <button type="submit" className="rounded-lg border border-brand-gold/25 bg-brand-gold/10 px-4 py-2 text-xs font-semibold text-brand-gold">تحليل الأثر</button>
        </form>
        {impact ? (
          <div className="space-y-3 rounded-xl border border-brand-gold/10 bg-black/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><code className="text-xs text-brand-gold" dir="ltr">{impact.path}</code><span className={impact.confidence === "import-graph" ? "text-[10px] text-emerald-200" : "text-[10px] text-amber-200"}>{impact.confidence === "import-graph" ? "علاقات استيراد مؤكدة من نفس Commit" : "تقدير حسب نطاق المسار"}</span></div>
            <p className="text-xs leading-6 text-brand-cream/60">{impact.explanation}</p>
            <div><p className="text-xs text-brand-cream/35">المراكز المالكة مباشرة</p><p className="mt-1 text-sm text-brand-cream/75">{impact.directModules.map((id) => centerLabels.get(id) ?? id).join("، ") || "غير محدد؛ يلزم تعيين مالك يدويًا"}</p></div>
            <div><p className="text-xs text-brand-cream/35">المراكز المتأثرة عبر الاعتماديات المشتركة</p><p className="mt-1 text-sm leading-6 text-brand-cream/75">{impact.affectedModules.map((id) => centerLabels.get(id) ?? id).join("، ") || "لا توجد علاقات مسجلة لهذا المسار"}</p></div>
            <div><p className="text-xs text-brand-cream/35">الاعتماديات المشتركة</p><p className="mt-1 text-sm text-brand-cream/60">{impact.sharedDependencies.map((id) => dependencyLabels.get(id) ?? id).join("، ") || "لا توجد"}</p></div>
            {impact.confidence === "import-graph" ? (
              <>
                <div>
                  <p className="text-xs text-brand-cream/35">الملفات المتأثرة عبر الاستيراد ({impact.impactedFiles.length})</p>
                  <div className="mt-1 max-h-40 space-y-1 overflow-auto rounded-lg border border-brand-gold/10 p-2">
                    {impact.impactedFiles.map((path) => <code key={path} className="block break-all text-[10px] text-brand-cream/60" dir="ltr">{path}</code>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-brand-cream/35">الاختبارات التي تستورد المورد ({impact.relatedTests.length})</p>
                  <div className="mt-1 space-y-1">
                    {impact.relatedTests.length
                      ? impact.relatedTests.map((path) => <code key={path} className="block break-all text-[10px] text-emerald-100/70" dir="ltr">{path}</code>)
                      : <p className="text-xs text-brand-cream/45">لم يُعثر على ملف اختبار يستورد هذا المورد في الرسم الحالي.</p>}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : resourcePath ? (
          <p role="alert" className="text-xs text-amber-200">مسار غير صالح. استخدم مسارًا نسبيًا من دون مقاطع traversal أو شرطة عكسية.</p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <h2 className="text-lg font-bold text-brand-gold">خريطة اعتماديات مراكز OMNIS</h2>
        <p className="text-xs leading-6 text-brand-cream/45">هذه علاقات ملكية واعتماديات معتمدة في السجل المعماري الحالي، وليست خريطة import graph لكل ملف.</p>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {OMNIS_MODULE_DEPENDENCIES.map((relation) => (
            <article key={relation.moduleId} className="rounded-lg border border-brand-gold/10 bg-black/10 p-3">
              <h3 className="text-xs font-semibold text-brand-cream/75">{centerLabels.get(relation.moduleId) ?? relation.moduleId}</h3>
              <p className="mt-1 text-[11px] leading-5 text-brand-cream/45">{relation.dependencyIds.map((id) => dependencyLabels.get(id) ?? id).join(" · ") || "لا توجد اعتماديات مسجلة"}</p>
            </article>
          ))}
        </div>
      </section>
    </Container>
  );
}
