export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { audienceSizes, listCampaigns, type PushCampaign } from "@/features/notifications/services/push-campaign-store";
import { createCampaignAction, transitionCampaignAction } from "./actions";

export const metadata: Metadata = { title: "حملات الإشعارات | ZIKR OMNIS" };

const input = "w-full rounded-lg border border-brand-gold/15 bg-black/30 px-3 py-2 text-sm";
const btn = "rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 text-xs font-semibold text-brand-gold";

export default async function OmnisPushPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdminPermission("system.manage");
  const { ok, error } = await searchParams;
  let campaigns: PushCampaign[] = [];
  let sizes: { total: number; byPlatform: Record<string, number> } | null = null;
  let loadError: string | null = null;
  try {
    [campaigns, sizes] = await Promise.all([listCampaigns(), audienceSizes()]);
  } catch {
    loadError = "تعذرت قراءة الحملات. إن لم تُطبَّق ملفات الترحيل بعد فهذا متوقع.";
  }
  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/android" className="text-xs text-brand-gold/70 hover:text-brand-gold">← تطبيق Android</Link>
        <h1 className="text-3xl font-bold text-brand-gold">حملات الإشعارات</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          مسودات حملات إشعارات للمستخدمين مع اعتماد مشرف ثانٍ (لا يعتمد المنشئ حملته) وحد يومي. هذه الصفحة تسجّل وتعتمد فقط: <strong>لا يوجد مرسِل متصل بها ولا يُرسل أي إشعار</strong>. الإرسال الفعلي لجمهور التطبيق قرار للمالك ويحتاج مرسِلًا يُبنى ويُعتمد لاحقًا.
          {sizes ? ` المشتركون النشطون حاليًا: ${sizes.total} (${Object.entries(sizes.byPlatform).map(([k, v]) => `${k}: ${v}`).join("، ") || "لا توزيع"}).` : ""}
        </p>
      </header>
      {ok ? <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100/90">{ok}</p> : null}
      {error || loadError ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">{error ?? loadError}</p> : null}
      <form action={createCampaignAction} className="space-y-2 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <h2 className="font-bold text-brand-gold">حملة جديدة (مسودة)</h2>
        <input name="title" placeholder="العنوان (حتى 80)" required maxLength={80} className={input} />
        <textarea name="body" placeholder="النص (حتى 240)" required maxLength={240} rows={3} className={input} />
        <input name="link" dir="ltr" placeholder="/quran (اختياري، مسار داخلي)" className={input} />
        <select name="audience" className={input}><option value="all">الجميع</option><option value="android">Android</option><option value="web">الويب</option></select>
        <button type="submit" className={btn}>حفظ كمسودة</button>
      </form>
      <ul className="space-y-3 text-sm">
        {campaigns.map((c) => (
          <li key={c.id} className="space-y-2 rounded-xl border border-brand-gold/10 bg-black/15 p-4">
            <div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{c.title}</span><span className="text-xs text-brand-cream/50">{c.audience} · {c.status} · {new Date(c.created_at).toLocaleString("ar-EG")}</span></div>
            <p className="text-brand-cream/70">{c.body}</p>
            <form action={transitionCampaignAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={c.id} />
              {c.status === "draft" ? (<><button name="to" value="approved" className={btn}>اعتماد (مشرف آخر)</button><button name="to" value="rejected" className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-200">رفض</button></>) : null}
              {c.status === "draft" || c.status === "approved" ? <button name="to" value="cancelled" className="rounded-lg border border-brand-gold/20 px-3 py-1.5 text-xs">إلغاء</button> : null}
            </form>
          </li>
        ))}
        {!campaigns.length && !loadError ? <li className="text-xs text-brand-cream/40">لا حملات.</li> : null}
      </ul>
    </Container>
  );
}
