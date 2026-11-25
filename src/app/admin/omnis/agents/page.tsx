export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { OMNIS_AGENTS, isOmnisAgentsEnabled } from "@/features/admin/omnis/agents";
import { listProposals, type StoredProposal } from "@/features/admin/omnis/agent-store";
import { fileProposalAction, reviewProposalAction } from "./actions";

export const metadata: Metadata = { title: "الوكلاء ومراجعة الاقتراحات | ZIKR OMNIS" };

const input = "w-full rounded-lg border border-brand-gold/15 bg-black/30 px-3 py-2 text-sm";
const btn = "rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 text-xs font-semibold text-brand-gold";

export default async function OmnisAgentsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdminPermission("system.manage");
  const { ok, error } = await searchParams;
  let proposals: StoredProposal[] = [];
  let loadError: string | null = null;
  try {
    proposals = await listProposals();
  } catch {
    loadError = "تعذرت قراءة الاقتراحات. إن لم تُطبَّق ملفات الترحيل بعد فهذا متوقع.";
  }
  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← OMNIS</Link>
        <h1 className="text-3xl font-bold text-brand-gold">الوكلاء ومراجعة الاقتراحات</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          الوكلاء {isOmnisAgentsEnabled() ? "مفعّلون" : "متوقفون (OMNIS_AGENTS_ENABLED)"}. الوكيل يقرأ بنطاقه ويقترح فقط؛ لا يطبّق شيئًا. المراجعة بشرية بصلاحية الوكيل، والتطبيق الفعلي يتم يدويًا خارج هذه الصفحة ثم يُعلَّم "طُبّق". لا يوجد بعد مشغّل يستدعي نموذجًا لتوليد الاقتراحات تلقائيًا: الاقتراحات تُسجَّل عبر هذا النموذج أو واجهة الخادم.
        </p>
      </header>
      {ok ? <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100/90">{ok}</p> : null}
      {error || loadError ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">{error ?? loadError}</p> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {OMNIS_AGENTS.map((a) => (
          <div key={a.key} className="rounded-2xl border border-brand-gold/10 bg-black/15 p-4 text-xs text-brand-cream/60">
            <h2 className="text-sm font-bold text-brand-gold">{a.label}</h2>
            <p>صلاحية المراجعة: <span className="font-mono" dir="ltr">{a.permission}</span></p>
            <p>الأدوات: <span dir="ltr">{a.tools.join(", ")}</span></p>
            <p>الجداول: <span dir="ltr">{a.readTables.join(", ") || "none"}</span></p>
            <p>الميزانية اليومية: {a.dailyTokenBudget.toLocaleString("en")} توكن · {a.maxProposalsPerDay} اقتراح</p>
          </div>
        ))}
      </section>

      <form action={fileProposalAction} className="space-y-2 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <h2 className="font-bold text-brand-gold">تسجيل اقتراح لوكيل</h2>
        <select name="agent" className={input}>{OMNIS_AGENTS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select>
        <input name="title" placeholder="العنوان" required maxLength={200} className={input} />
        <input name="target" placeholder="الهدف (ملف أو جدول أو إعداد)" required maxLength={200} className={input} />
        <textarea name="diff" placeholder="التغيير المقترح (diff)" rows={6} required dir="ltr" className={`${input} font-mono`} />
        <button type="submit" className={btn}>تسجيل</button>
      </form>

      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">الاقتراحات</h2>
        <ul className="space-y-3 text-sm">
          {proposals.map((p) => (
            <li key={p.id} className="space-y-2 rounded-xl border border-brand-gold/10 bg-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">{p.title}</span><span className="text-xs text-brand-cream/50">{p.agent_key} · {p.status} · {new Date(p.created_at).toLocaleString("ar-EG")}</span></div>
              <p className="font-mono text-xs text-brand-cream/50" dir="ltr">{p.target}</p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs" dir="ltr">{p.diff}</pre>
              <form action={reviewProposalAction} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={p.id} />
                {p.status === "pending" ? (<><button name="to" value="approved" className={btn}>اعتماد</button><button name="to" value="rejected" className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-200">رفض</button></>) : null}
                {p.status === "approved" ? <button name="to" value="applied" className={btn}>تم تطبيقه يدويًا</button> : null}
              </form>
            </li>
          ))}
          {!proposals.length && !loadError ? <li className="text-xs text-brand-cream/40">لا اقتراحات.</li> : null}
        </ul>
      </section>
    </Container>
  );
}
