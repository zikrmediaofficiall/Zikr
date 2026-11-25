export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { pipelineFor, pipelineSummary, type StageKey, type VideoRow } from "@/features/admin/omnis/video-pipeline";

export const metadata: Metadata = { title: "خط إنتاج الفيديو | ZIKR OMNIS" };

const LABEL: Record<StageKey, string> = { script: "النص", render: "التصيير", thumbnail: "الصورة المصغرة", publish: "النشر" };
const COLOR = { done: "text-emerald-200/90", pending: "text-brand-cream/45", blocked: "text-red-200/90" } as const;
const WORD = { done: "تم", pending: "بانتظار", blocked: "متعثر" } as const;

export default async function VideoPipelinePage() {
  await requireAdminPermission("system.manage");
  let rows: VideoRow[] = [];
  let error: string | null = null;
  try {
    rows = await supabaseServerAdminRequest<VideoRow[]>("/rest/v1/video_generation_requests?select=id,title,status,content,video_url,thumbnail_url,youtube_id,facebook_id,published_at,error_message,generation_attempts,next_retry_at,created_at&order=created_at.desc&limit=200", { method: "GET" });
  } catch {
    error = "تعذرت قراءة طلبات الفيديو.";
  }
  const summary = pipelineSummary(rows);
  const open = rows.map(pipelineFor).filter((v) => v.stuckStage).slice(0, 60);
  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← OMNIS</Link>
        <h1 className="text-3xl font-bold text-brand-gold">خط إنتاج الفيديو</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">رؤية واحدة لآخر 200 طلب عبر مراحل النص والتصيير والصورة المصغرة والنشر، مع المتعثر منها. للقراءة فقط. المشاهد والصوت ليست أعمدة مستقلة في الجدول فلا تُعرض كمراحل منفصلة. التفاصيل والإجراءات في <Link href="/admin/video" className="underline">لوحة الفيديو</Link>.</p>
      </header>
      {error ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">{error}</p> : null}
      <p className="text-sm text-brand-cream/70">المجموع {summary.total} · مكتمل {summary.complete} · متعثر بخطأ {summary.blocked} · عالق عند: {(Object.keys(LABEL) as StageKey[]).map((k) => `${LABEL[k]} ${summary.stuckBy[k]}`).join("، ")}</p>
      <ul className="space-y-2 text-sm">
        {open.map((v) => (
          <li key={v.id} className="rounded-xl border border-brand-gold/10 bg-black/15 p-3">
            <p className="font-semibold">{v.title}</p>
            <p className="mt-1 flex flex-wrap gap-3 text-xs">{(Object.keys(LABEL) as StageKey[]).map((k) => <span key={k} className={COLOR[v.stages[k]]}>{LABEL[k]}: {WORD[v.stages[k]]}</span>)}</p>
            {v.blocker ? <p className="mt-1 text-xs text-red-200/80" dir="auto">{v.blocker}</p> : null}
          </li>
        ))}
        {!open.length && !error ? <li className="text-xs text-brand-cream/40">لا طلبات عالقة.</li> : null}
      </ul>
    </Container>
  );
}
