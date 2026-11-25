export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { MIN_COHORT, revenueReport, suppressSmallCohorts, totalsByPlatform, weeklyTrend, type InsightRow } from "@/features/admin/omnis/growth-report";

export const metadata: Metadata = { title: "النمو والجمهور والإيرادات | ZIKR OMNIS" };

async function load() {
  try {
    const [insights, subs] = await Promise.all([
      supabaseServerAdminRequest<InsightRow[]>("/rest/v1/social_post_insights?select=queue_id,platform,metrics,captured_at&order=captured_at.desc&limit=5000", { method: "GET" }),
      supabaseServerAdminRequest<Array<{ platform: string | null }>>("/rest/v1/push_subscriptions?select=platform&is_active=is.true&limit=5000", { method: "GET" }),
    ]);
    const counts: Record<string, number> = {};
    for (const s of subs) counts[s.platform ?? "unknown"] = (counts[s.platform ?? "unknown"] ?? 0) + 1;
    return { insights, counts, error: null as string | null };
  } catch {
    return { insights: [] as InsightRow[], counts: {} as Record<string, number>, error: "تعذرت قراءة البيانات." };
  }
}

const fmt = (n: number) => n.toLocaleString("en");

export default async function OmnisGrowthPage() {
  await requireAdminPermission("system.manage");
  const { insights, counts, error } = await load();
  const totals = totalsByPlatform(insights);
  const trend = weeklyTrend(insights);
  const audience = suppressSmallCohorts(counts);
  const revenue = revenueReport(null);
  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← OMNIS</Link>
        <h1 className="text-3xl font-bold text-brand-gold">النمو والجمهور والإيرادات</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">أداء المنشورات حسب المنصة (آخر لقطة لكل منشور فقط، دون عدّ مزدوج)، واتجاه أسبوعي، وحجم الجمهور بإخفاء الفئات الأقل من {MIN_COHORT}، وحالة الإيرادات. تفاصيل SEO والفهرسة في <Link href="/admin/seo" className="underline">صفحة SEO</Link> وأداء الفيديو في <Link href="/admin/video/performance" className="underline">أداء الفيديو</Link>.</p>
      </header>
      {error ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">{error}</p> : null}
      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">المنصات</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {totals.map((t) => (
            <li key={t.platform} className="rounded-2xl border border-brand-gold/10 bg-black/15 p-4 text-sm">
              <p className="font-semibold text-brand-cream" dir="ltr">{t.platform}</p>
              <p className="text-xs text-brand-cream/60">{fmt(t.posts)} منشور · {fmt(t.views)} مشاهدة · {fmt(t.likes)} إعجاب · {fmt(t.comments)} تعليق</p>
            </li>
          ))}
          {!totals.length ? <li className="text-xs text-brand-cream/40">لا توجد بيانات.</li> : null}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">الاتجاه الأسبوعي</h2>
        <ul className="space-y-1 text-sm">
          {trend.map((p) => <li key={p.week} className="flex justify-between rounded-lg border border-brand-gold/10 bg-black/15 px-3 py-2"><span dir="ltr">{p.week}</span><span>{fmt(p.posts)} منشور · {fmt(p.views)} مشاهدة</span></li>)}
        </ul>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">الجمهور (مشتركو الإشعارات النشطون)</h2>
        <p className="text-sm text-brand-cream/70">{Object.keys(audience).length ? Object.entries(audience).map(([k, v]) => `${k}: ${v ?? `أقل من ${MIN_COHORT}`}`).join("، ") : "لا مشتركين نشطين حاليًا."}</p>
        <p className="text-xs text-brand-cream/40">لا توجد شرائح جمهور تفصيلية: التطبيق لا يجمع بيانات ديموغرافية، وبيانات GA4 تحترم Consent Mode.</p>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">الإيرادات</h2>
        <p className="text-sm text-brand-cream/70">الفعلي: {revenue.actual ?? "غير متاح"} · التقديري: {revenue.estimated ?? "غير متاح"}</p>
        <p className="text-xs text-brand-cream/40">{revenue.note}</p>
      </section>
    </Container>
  );
}
