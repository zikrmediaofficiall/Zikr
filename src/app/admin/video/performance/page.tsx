export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import {
  aggregateHookStyleStats,
  EXPERIMENT_HOOK_STYLES,
  type HookExperimentInsightRow,
  type HookExperimentQueueRow,
  type HookExperimentRequestRow,
} from "@/features/videos/services/hook-experiment";

export const metadata: Metadata = { title: "أداء الفيديوهات حسب الهوك | الأدمن" };

const MIN_SAMPLES = 20;
const STYLE_LABELS: Record<(typeof EXPERIMENT_HOOK_STYLES)[number], string> = {
  question: "سؤال",
  reflection: "تأمل",
  action: "دعوة للعمل",
};

async function readRows<T>(path: string): Promise<{ rows: T[]; ok: boolean }> {
  try {
    const rows = await supabaseServerAdminRequest<T[]>(path, { method: "GET" });
    return { rows: rows ?? [], ok: true };
  } catch {
    return { rows: [], ok: false };
  }
}

export default async function AdminVideoPerformancePage() {
  await requireAdminPermission("video.manage");

  const requestsRes = await readRows<HookExperimentRequestRow>(
    "/rest/v1/video_generation_requests?content->>hookStyle=in.(question,reflection,action)&select=id,content&order=created_at.desc&limit=400",
  );
  const ids = requestsRes.rows.map((row) => row.id);
  const queueRes = ids.length
    ? await readRows<HookExperimentQueueRow>(`/rest/v1/social_publish_queue?content_id=in.(${ids.join(",")})&select=id,content_id&limit=1000`)
    : { rows: [] as HookExperimentQueueRow[], ok: true };
  const queueIds = queueRes.rows.map((row) => row.id);
  const insightsRes = queueIds.length
    ? await readRows<HookExperimentInsightRow>(`/rest/v1/social_post_insights?queue_id=in.(${queueIds.join(",")})&select=queue_id,metrics&limit=2000`)
    : { rows: [] as HookExperimentInsightRow[], ok: true };

  const readable = requestsRes.ok && queueRes.ok && insightsRes.ok;
  const stats = aggregateHookStyleStats(requestsRes.rows, queueRes.rows, insightsRes.rows);
  const tagged = requestsRes.rows.length;

  return (
    <Container className="space-y-8 py-10" dir="rtl">
      <header>
        <p className="text-xs tracking-[0.2em] text-brand-cream/30">مصنع الفيديو</p>
        <h1 className="mt-2 text-3xl font-bold text-brand-gold">أداء الفيديوهات حسب نوع الهوك</h1>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-brand-cream/50">
          قراءة فقط. تعرض مجموع المشاهدات المقاسة لكل نوع افتتاحية. تجربة الهوك تُفعَّل من متغير VIDEO_HOOK_EXPERIMENT_ENABLED في بيئة GitHub Actions الإنتاجية، وفيديوهات الأطفال خارجها دائمًا.
        </p>
      </header>

      {!readable ? (
        <div role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-7 text-red-100/85">
          تعذرت قراءة بيانات الأداء. الأرقام أدناه غير مكتملة ولا يجب الاعتماد عليها.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        {EXPERIMENT_HOOK_STYLES.map((style) => {
          const { videos, totalViews } = stats[style];
          const average = videos > 0 ? Math.round(totalViews / videos) : null;
          return (
            <div key={style} className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
              <p className="text-sm font-semibold text-brand-gold">{STYLE_LABELS[style]}</p>
              <p className="mt-1 font-mono text-xs text-brand-cream/30" dir="ltr">{style}</p>
              <p className="mt-3 text-3xl font-bold text-brand-cream">{readable && average !== null ? average.toLocaleString("ar-EG-u-nu-latn") : "غير متاح"}</p>
              <p className="mt-1 text-xs text-brand-cream/40">متوسط المشاهدات لكل فيديو</p>
              <p className="mt-3 text-xs leading-6 text-brand-cream/50">
                {videos.toLocaleString("ar-EG-u-nu-latn")} فيديو مقاس · {totalViews.toLocaleString("ar-EG-u-nu-latn")} مشاهدة
              </p>
              <p className="mt-1 text-xs text-brand-cream/40">
                {videos >= MIN_SAMPLES ? "عينة كافية للمقارنة" : `يحتاج ${(MIN_SAMPLES - videos).toLocaleString("ar-EG-u-nu-latn")} فيديو إضافيًا قبل أن تُعتمد النتيجة`}
              </p>
            </div>
          );
        })}
      </section>

      <p className="text-sm leading-7 text-brand-cream/50">
        فيديوهات موسومة بنوع هوك ضمن آخر 400 طلب: {tagged.toLocaleString("ar-EG-u-nu-latn")}. الفيديوهات القديمة بلا نوع هوك لا تدخل المقارنة، والتجربة تبدّل الأنواع بالتساوي حتى تتوفر {MIN_SAMPLES.toLocaleString("ar-EG-u-nu-latn")} عينة لكل نوع ثم تفضّل الأفضل مع استكشاف 20٪.
      </p>

      <Link href="/admin/video" className="inline-block text-sm text-brand-gold hover:underline">العودة إلى مركز الفيديو</Link>
    </Container>
  );
}
