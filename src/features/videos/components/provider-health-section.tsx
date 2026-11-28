import { getVideoEngineConfig } from "@/features/videos/providers/types";
import {
  missingRequiredSecretNames,
  summarizeProviderHealth,
  type ProviderRequestRow,
} from "@/features/videos/services/provider-health";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function readRecentRequests(): Promise<{ rows: ProviderRequestRow[]; ok: boolean }> {
  try {
    const rows = await supabaseServerAdminRequest<ProviderRequestRow[]>(
      "/rest/v1/video_generation_requests?select=provider,status,error_message,render_duration_ms,updated_at&order=updated_at.desc&limit=300",
      { method: "GET" },
    );
    return { rows: rows ?? [], ok: true };
  } catch {
    return { rows: [], ok: false };
  }
}

/** Server component. The parent admin page must already enforce video.manage. */
export async function ProviderHealthSection() {
  const engine = getVideoEngineConfig();
  const { rows, ok } = await readRecentRequests();
  const health = summarizeProviderHealth(rows);
  const missing = missingRequiredSecretNames(process.env);
  const enabled: Record<string, boolean> = {
    template: true,
    clip_library: engine.clipLibraryEnabled,
    hf_wan: engine.hfWanEnabled && engine.aiEnabled,
    hf_ltx_fast: engine.hfLtxFastEnabled && engine.aiEnabled,
    comfyui: engine.comfyUiEnabled && engine.aiEnabled,
    free_api: engine.freeApiEnabled && engine.aiEnabled,
  };

  return (
    <section className="space-y-6" dir="rtl">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-brand-gold">صحة مزودات الفيديو</h2>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          قراءة فقط من آخر 300 طلب. الأسرار تُعرض بأسمائها الناقصة فقط، ولا تظهر قيمها. الهدف اليومي الحالي: {engine.dailyLimit} فيديو.
        </p>
      </header>

      {!ok ? <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">تعذر قراءة سجل الطلبات.</p> : null}

      <section className="rounded-2xl border border-brand-gold/10 p-5 text-sm text-brand-cream/70">
        <h2 className="mb-2 font-semibold text-brand-gold">اكتمال الأسرار</h2>
        {missing.length ? (
          <p>ناقص في بيئة الموقع الحالية: {missing.join("، ")} (قد تكون موجودة في بيئة GitHub Actions فقط).</p>
        ) : (
          <p>كل الأسماء المطلوبة موجودة في بيئة الموقع.</p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {Object.entries(enabled).map(([name, on]) => {
          const h = health.find((item) => item.provider === name);
          return (
            <article key={name} className="rounded-2xl border border-brand-gold/10 p-5 text-sm text-brand-cream/70">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-base text-brand-cream">{name}</h3>
                <span className={on ? "text-emerald-300" : "text-brand-cream/40"}>{on ? "مفعّل" : "متوقف"}</span>
              </div>
              {h ? (
                <dl className="mt-3 grid grid-cols-2 gap-2">
                  <dt>الطلبات</dt><dd>{h.total}</dd>
                  <dt>نسبة النجاح</dt><dd>{h.successRate === null ? "لا بيانات" : `${h.successRate}%`}</dd>
                  <dt>متوسط المدة</dt><dd>{h.avgDurationSec === null ? "لا بيانات" : `${h.avgDurationSec} ث`}</dd>
                  <dt>آخر نجاح</dt><dd dir="ltr">{h.lastSuccessAt ?? "-"}</dd>
                  <dt>آخر فشل</dt><dd dir="ltr">{h.lastFailureAt ?? "-"}</dd>
                  {h.lastError ? <><dt>آخر خطأ</dt><dd dir="ltr" className="break-words">{h.lastError}</dd></> : null}
                </dl>
              ) : (
                <p className="mt-3 text-brand-cream/40">لا طلبات حديثة.</p>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}
