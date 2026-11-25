export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { saveRevenueMonthAction } from "./actions";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { MANUAL_REVENUE_KEY, MIN_COHORT, manualRevenueTotals, parseManualRevenue, revenueReport, suppressSmallCohorts, totalsByPlatform, weeklyTrend, type InsightRow } from "@/features/admin/omnis/growth-report";

export const metadata: Metadata = { title: "النمو والجمهور والإيرادات | ZIKR OMNIS" };

async function load() {
  try {
    const [insights, subs] = await Promise.all([
      supabaseServerAdminRequest<InsightRow[]>("/rest/v1/social_post_insights?select=queue_id,platform,metrics,captured_at&order=captured_at.desc&limit=5000", { method: "GET" }),
      supabaseServerAdminRequest<Array<{ platform: string | null }>>("/rest/v1/push_subscriptions?select=platform&is_active=is.true&limit=5000", { method: "GET" }),
    ]);
    const counts: Record<string, number> = {};
    for (const s of subs) counts[s.platform ?? "unknown"] = (counts[s.platform ?? "unknown"] ?? 0) + 1;
    const rev = await supabaseServerAdminRequest<Array<{ value?: unknown }>>(`/rest/v1/site_settings?key=eq.${MANUAL_REVENUE_KEY}&select=value&limit=1`, { method: "GET" }).catch(() => []);
    return { insights, counts, manual: parseManualRevenue(rev?.[0]?.value), error: null as string | null };
  } catch {
    return { insights: [] as InsightRow[], counts: {} as Record<string, number>, manual: [] as ReturnType<typeof parseManualRevenue>, error: "تعذرت قراءة البيانات." };
  }
}

const fmt = (n: number) => n.toLocaleString("en");

export default async function OmnisGrowthPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdminPermission("system.manage");
  const { insights, counts, manual, error } = await load();
  const { ok, error: formError } = await searchParams;
  const manualTotals = manualRevenueTotals(manual);
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
        <p className="text-xs text-brand-cream/40">{revenue.note} يمكنك إدخال إيراد كل شهر يدويًا من لوحة AdSense أو YouTube: الفعلي والتقديري منفصلان، والعملات لا تُجمع معًا، وكل رقم هنا مُدخل منك وليس مسحوبًا تلقائيًا.</p>
        {ok ? <p role="status" className="text-xs text-emerald-200">{ok}</p> : null}
        {formError ? <p role="alert" className="text-xs text-red-200">{formError}</p> : null}
        <form action={saveRevenueMonthAction} className="flex flex-wrap items-end gap-2 text-xs">
          <input name="month" dir="ltr" placeholder="2026-11" required pattern="\d{4}-\d{2}" className="w-28 rounded-lg border border-brand-gold/15 bg-black/30 px-2 py-1.5" />
          <input name="actual" dir="ltr" type="number" step="0.01" min="0" placeholder="الفعلي" className="w-28 rounded-lg border border-brand-gold/15 bg-black/30 px-2 py-1.5" />
          <input name="estimated" dir="ltr" type="number" step="0.01" min="0" placeholder="التقديري" className="w-28 rounded-lg border border-brand-gold/15 bg-black/30 px-2 py-1.5" />
          <input name="currency" dir="ltr" defaultValue="USD" maxLength={3} className="w-16 rounded-lg border border-brand-gold/15 bg-black/30 px-2 py-1.5" />
          <button className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 font-semibold text-brand-gold">حفظ الشهر</button>
        </form>
        {manual.length ? (
          <table className="w-full max-w-xl text-start text-xs"><thead><tr className="text-brand-cream/50"><th>الشهر</th><th>الفعلي</th><th>التقديري</th><th>العملة</th></tr></thead>
            <tbody>{manual.slice(0, 12).map((r) => <tr key={r.month}><td dir="ltr">{r.month}</td><td>{r.actual ?? "—"}</td><td>{r.estimated ?? "—"}</td><td>{r.currency}</td></tr>)}</tbody>
            <tfoot>{Object.entries(manualTotals).map(([c, t]) => <tr key={c} className="text-brand-gold"><td>المجموع</td><td>{t.actual}</td><td>{t.estimated}</td><td>{c}</td></tr>)}</tfoot></table>
        ) : null}
      </section>
    </Container>
  );
}
