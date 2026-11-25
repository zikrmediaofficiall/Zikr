export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { SourceLogo } from "@/features/admin/video-sources/components/source-logo";

export const metadata: Metadata = { title: "مصادر فيديو ZIKR | الأدمن" };

type AgentSource = {
  id: string;
  name: string;
  source_type: string;
  base_url: string | null;
  fetch_url: string | null;
  enabled: boolean;
  requires_api_key: boolean;
  last_checked_at: string | null;
  next_run_at: string | null;
};

function safeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function safeEndpointLabel(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    // Never expose query strings or fragments: source URLs may contain signed tokens.
    return url.origin + url.pathname;
  } catch {
    return null;
  }
}

function formatDate(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "لم يتم الاختبار بعد";
  return new Date(value).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

function typeLabel(value: string): string {
  const labels: Record<string, string> = {
    quran: "القرآن الكريم",
    hadith: "الحديث",
    stories: "القصص",
    story: "القصص",
    dua: "الأدعية",
    adhkar: "الأذكار",
  };
  return labels[value.toLowerCase()] || value;
}

export default async function VideoFactorySourcesPage() {
  await requireAdminPermission("video.manage");

  let sources: AgentSource[] = [];
  let loadError = "";
  try {
    sources = await supabaseServerAdminRequest<AgentSource[]>(
      "/rest/v1/content_agent_sources?select=id,name,source_type,base_url,fetch_url,enabled,requires_api_key,last_checked_at,next_run_at&order=source_type.asc,name.asc&limit=100",
      { method: "GET", cache: "no-store" },
    ) ?? [];
  } catch (error) {
    console.error("[admin/video/sources] source inventory failed:", error);
    loadError = "تعذر تحميل سجل مصادر البيانات من قاعدة البيانات. لم يتم استبداله ببيانات تجريبية.";
  }

  const enabledCount = sources.filter((source) => source.enabled).length;
  const needsKeyCount = sources.filter((source) => source.requires_api_key && !source.enabled).length;

  return (
    <Container className="space-y-7 py-10 text-right" dir="rtl">
      <nav aria-label="تنقل مصادر الفيديو" className="flex flex-wrap gap-2">
        <Link href="/admin/video" className="rounded-xl border border-brand-gold/15 px-3 py-2 text-sm text-brand-cream/65 hover:text-brand-gold">مصنع الفيديو</Link>
        <Link href="/admin/video/studio" className="rounded-xl border border-brand-gold/20 px-3 py-2 text-sm text-brand-gold">استوديو الإنشاء</Link>
        <Link href="/admin/sources" className="rounded-xl border border-brand-gold/15 px-3 py-2 text-sm text-brand-cream/65 hover:text-brand-gold">حوكمة المصادر</Link>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-brand-cream/30">VIDEO FACTORY / VERIFIED INPUTS</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-gold">مصادر بيانات الفيديو</h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-brand-cream/55">
            حالة كل مزوّد تُقرأ من سجل الإنتاج. لا تظهر المصادر غير المهيأة على أنها متصلة، ولا يتم تفعيل مصدر يتطلب مفتاح API قبل توفيره والتحقق منه.
          </p>
        </div>
        <Link href="/admin/video/studio" className="rounded-xl bg-brand-gold px-4 py-2.5 text-sm font-bold text-brand-emeraldDeep">إنشاء فيديو من مصدر موثق</Link>
      </header>

      {loadError && <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{loadError}</div>}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
          <p className="text-xs text-brand-cream/40">مصادر مسجلة</p>
          <p className="mt-2 text-3xl font-bold text-brand-gold">{sources.length.toLocaleString("ar-EG")}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5">
          <p className="text-xs text-brand-cream/40">مفعّلة في الإنتاج</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{enabledCount.toLocaleString("ar-EG")}</p>
        </div>
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
          <p className="text-xs text-brand-cream/40">تحتاج مفتاح API</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{needsKeyCount.toLocaleString("ar-EG")}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {sources.map((source) => {
          const origin = safeOrigin(source.base_url);
          const statusLabel = source.enabled ? "مفعّل" : source.requires_api_key ? "متوقف — يتطلب مفتاح API" : "غير مفعّل";
          const statusClass = source.enabled ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : source.requires_api_key ? "border-amber-500/25 bg-amber-500/10 text-amber-200" : "border-slate-500/25 bg-slate-500/10 text-slate-300";
          const fetchEndpoint = safeEndpointLabel(source.fetch_url);
          return (
            <article key={source.id} className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
              <div className="flex items-start gap-4">
                <SourceLogo src={origin ? origin + "/favicon.ico" : null} label={source.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-brand-cream/90">{source.name}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusClass}`}>{statusLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-brand-cream/45">{typeLabel(source.source_type)}</p>
                  {origin && <a href={origin} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-xs text-brand-gold/75 hover:text-brand-gold" dir="ltr">{origin}</a>}
                </div>
              </div>
              <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                  <dt className="text-[11px] text-brand-cream/35">آخر تحقق</dt>
                  <dd className="mt-1 text-xs text-brand-cream/75">{formatDate(source.last_checked_at)}</dd>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.025] p-3">
                  <dt className="text-[11px] text-brand-cream/35">الفحص القادم</dt>
                  <dd className="mt-1 text-xs text-brand-cream/75">{formatDate(source.next_run_at)}</dd>
                </div>
              </dl>
              {source.requires_api_key && !source.enabled && (
                <p className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/5 p-3 text-xs leading-6 text-amber-100/80">
                  يتطلب هذا المصدر مفتاح API محفوظًا في إعدادات الخادم. يظل متوقفًا حتى إضافة المفتاح واجتياز اختبار الاتصال.
                </p>
              )}
              {fetchEndpoint && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs text-brand-cream/45 hover:text-brand-gold">تفاصيل نقطة جلب البيانات</summary>
                  <a href={fetchEndpoint} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-xs text-brand-cream/55 hover:text-brand-gold" dir="ltr">{fetchEndpoint}</a>
                </details>
              )}
            </article>
          );
        })}
      </section>

      {!loadError && sources.length === 0 && (
        <div className="rounded-2xl border border-brand-gold/10 bg-black/15 p-10 text-center text-sm text-brand-cream/45">لا توجد مصادر مسجلة في قاعدة البيانات.</div>
      )}
    </Container>
  );
}
