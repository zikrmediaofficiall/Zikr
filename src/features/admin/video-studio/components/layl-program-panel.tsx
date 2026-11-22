"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { redirectToAdminStepUp } from "@/features/admin/utils/step-up-client";
import {
  LAYL_EPISODES, LAYL_PROGRAM_ID, LAYL_PROGRAM_TITLE, LAYL_VOICE_PROFILE, LAYL_VISUAL_THEME,
  type LaylEpisode,
} from "@/features/videos/data/layl-program";

type VideoRequest = {
  id: string; title: string; status: string; video_url: string | null;
  error_message: string | null; created_at: string; content: unknown;
};

function requestContent(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function statusLabel(status: string) {
  switch (status) {
    case "pending": return "في انتظار التوليد";
    case "processing": return "جاري إنتاج الصوت والفيديو";
    case "completed": return "اكتملت الحلقة";
    case "failed": return "فشل التوليد";
    case "retry_wait": return "في انتظار إعادة المحاولة";
    default: return status || "غير معروف";
  }
}

export default function LaylProgramPanel() {
  const [activeEpisodeNumber, setActiveEpisodeNumber] = useState(1);
  const [scripts, setScripts] = useState<Record<number, string>>(() =>
    Object.fromEntries(LAYL_EPISODES.map((episode) => [episode.number, episode.script])),
  );
  const [items, setItems] = useState<VideoRequest[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const activeEpisode = useMemo(
    () => LAYL_EPISODES.find((episode) => episode.number === activeEpisodeNumber) ?? LAYL_EPISODES[0],
    [activeEpisodeNumber],
  );
  const episodeRequests = useMemo(
    () => items.filter((item) => requestContent(item.content).seriesId === LAYL_PROGRAM_ID)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
    [items],
  );
  const latestRequest = episodeRequests.find(
    (item) => Number(requestContent(item.content).episodeNumber) === activeEpisode.number,
  ) ?? null;
  const isQueueActive = episodeRequests.some((item) => ["pending", "processing", "retry_wait"].includes(item.status));

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const response = await fetch("/api/admin/video-generation", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "تعذر تحميل حالة حلقات ليل.");
      setItems(Array.isArray(payload.items) ? payload.items as VideoRequest[] : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر الاتصال بطابور الفيديو.");
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);
  useEffect(() => {
    if (!isQueueActive) return;
    const timer = window.setInterval(() => { void loadQueue(); }, 15000);
    return () => window.clearInterval(timer);
  }, [isQueueActive, loadQueue]);

  const updateScript = (value: string) => {
    setScripts((current) => ({ ...current, [activeEpisode.number]: value }));
    setMessage(""); setWarning(""); setError("");
  };

  const generateEpisode = async () => {
    const narration = (scripts[activeEpisode.number] ?? "").replace(/\s+/g, " ").trim();
    if (narration.length < 300 || narration.length > 2500) {
      setError("نص الحلقة لازم يكون بين 300 و2500 حرف عشان يناسب الإلقاء والمراجعة.");
      return;
    }
    setBusy(true); setError(""); setWarning(""); setMessage("");
    try {
      const response = await fetch("/api/admin/videos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: LAYL_PROGRAM_TITLE + " | الموسم الأول | الحلقة " + activeEpisode.number + ": " + activeEpisode.title,
          description: activeEpisode.description,
          category: "other",
          narration,
          content: {
            workflow: "layl-program", seriesId: LAYL_PROGRAM_ID, seriesTitle: LAYL_PROGRAM_TITLE,
            seasonNumber: 1, episodeNumber: activeEpisode.number, episodeTitle: activeEpisode.title,
            voiceProfile: LAYL_VOICE_PROFILE, language: "ar-EG", audience: "general",
            contentFormat: "weekly_program_episode", videoFormat: "vertical", resolution: "1080x1920",
            visualTheme: LAYL_VISUAL_THEME, visualBackground: activeEpisode.visualBackground, sourceType: "editorial",
            sourceLabel: activeEpisode.referenceLabel, sourceUrl: activeEpisode.referenceUrl,
            editorialNote: activeEpisode.editorialNote, skipSocialPublish: true,
            approvalStatus: "awaiting_human_review",
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.error === "step_up_required" && redirectToAdminStepUp(payload.nextPath)) return;
      if (!response.ok) throw new Error(payload.error || "تعذر إرسال الحلقة إلى محرك الإنتاج.");
      if (payload.auditRecorded !== true) {
        setWarning("تم إرسال الطلب، لكن لم يصل تأكيد سجل التدقيق. راجع سجل الإدارة قبل تكرار أي إجراء.");
      } else {
        setMessage("اتسجل طلب الحلقة " + activeEpisode.number + ". سيُنشأ الصوت المصري والفيديو داخل ZIKR، وسيظهر هنا عند اكتماله.");
      }
      await loadQueue();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء طلب الحلقة.");
    } finally {
      setBusy(false);
    }
  };

  const recentByEpisode = (episode: LaylEpisode) => episodeRequests.find(
    (item) => Number(requestContent(item.content).episodeNumber) === episode.number,
  );

  return (
    <Card className="space-y-6 border border-brand-gold/25 bg-gradient-to-br from-[#071a2b] via-[#0c2631] to-[#101e2c] p-4 md:p-6">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.22em] text-brand-gold/75">ZIKR ORIGINAL PROGRAM</p>
          <h2 className="text-2xl font-bold text-brand-gold md:text-3xl">دقيقتين مع ليل</h2>
          <p className="max-w-3xl text-sm leading-7 text-brand-cream/75">اختار حلقة من الموسم الأول، راجع النص وعدّله، وبعدها أنشئ التعليق الصوتي المصري والفيديو الرأسي من نفس لوحة التحكم.</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-brand-gold/30 px-3 py-1 text-brand-cream/80">8 حلقات في الموسم الأول</span>
            <span className="rounded-full border border-brand-gold/30 px-3 py-1 text-brand-cream/80">صوت مصري بتقنية Neural</span>
            <span className="rounded-full border border-brand-gold/30 px-3 py-1 text-brand-cream/80">حتى 120 ثانية للحلقة</span>
            <span className="rounded-full border border-brand-gold/30 px-3 py-1 text-brand-cream/80">مراجعة قبل النشر</span>
          </div>
        </div>
        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-3xl border border-brand-gold/30 bg-[#061322] p-3 shadow-xl shadow-black/30">
          <Image src="/icons/icon-512.png" alt="ليل، الشخصية الكرتونية لبرنامج دقيقتين مع ليل" width={144} height={144} className="h-full w-full rounded-2xl object-cover" priority />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {LAYL_EPISODES.map((episode) => {
          const request = recentByEpisode(episode);
          const selected = episode.number === activeEpisodeNumber;
          const episodeClass = selected
            ? "rounded-xl border border-brand-gold/70 bg-brand-gold/10 p-3 text-right transition"
            : "rounded-xl border border-brand-gold/15 bg-black/10 p-3 text-right transition hover:bg-brand-gold/5";
          const statusClass = "mt-2 block text-xs " + (
            request?.status === "completed" ? "text-emerald-300"
              : request?.status === "failed" ? "text-red-300" : "text-brand-cream/45"
          );
          return (
            <button key={episode.number} type="button"
              onClick={() => { setActiveEpisodeNumber(episode.number); setError(""); setMessage(""); setWarning(""); }}
              className={episodeClass}>
              <span className="block text-xs text-brand-gold/70">الحلقة {episode.number}</span>
              <span className="mt-1 block text-sm font-semibold text-brand-cream">{episode.title}</span>
              <span className={statusClass}>{request ? statusLabel(request.status) : "سيناريو جاهز"}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-brand-gold/70">الحلقة {activeEpisode.number} · الموسم الأول</p>
            <h3 className="text-xl font-bold text-brand-cream">{activeEpisode.title}</h3>
            <p className="text-sm leading-7 text-brand-cream/65">{activeEpisode.hook}</p>
          </div>
          <div className="rounded-xl border border-brand-gold/15 bg-black/15 p-3">
            <p className="text-xs font-semibold text-brand-gold">المرجع التحريري</p>
            <a href={activeEpisode.referenceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-brand-cream underline decoration-brand-gold/40 underline-offset-4">{activeEpisode.referenceLabel}</a>
            <p className="mt-2 text-xs leading-6 text-brand-cream/45">{activeEpisode.editorialNote}</p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="layl-episode-script" className="text-sm font-semibold text-brand-cream">سيناريو التعليق الصوتي — قابل للتعديل</label>
              <span className="text-xs text-brand-cream/45">{(scripts[activeEpisode.number] ?? "").length} حرف</span>
            </div>
            <textarea id="layl-episode-script" value={scripts[activeEpisode.number] ?? ""}
              onChange={(event) => updateScript(event.target.value)} rows={13} maxLength={2500}
              className="w-full rounded-xl border border-brand-gold/20 bg-[#061322]/80 px-4 py-3 text-sm leading-8 text-brand-cream outline-none focus:border-brand-gold/60" />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-brand-gold/20 bg-black/15 p-4">
            <h4 className="font-bold text-brand-gold">إعدادات الإنتاج</h4>
            <dl className="mt-3 space-y-3 text-sm">
              <div><dt className="text-xs text-brand-cream/45">الصوت</dt><dd className="mt-1 text-brand-cream">مصري رجالي — Shakir Neural</dd></div>
              <div><dt className="text-xs text-brand-cream/45">المدة القصوى</dt><dd className="mt-1 text-brand-cream">120 ثانية</dd></div>
              <div><dt className="text-xs text-brand-cream/45">المقاس</dt><dd className="mt-1 text-brand-cream">1080 × 1920 · 9:16</dd></div>
              <div><dt className="text-xs text-brand-cream/45">العلامة</dt><dd className="mt-1 text-brand-cream">أيقونة تطبيق ZIKR فقط</dd></div>
              <div><dt className="text-xs text-brand-cream/45">النشر</dt><dd className="mt-1 text-amber-200">داخلي؛ يحتاج مراجعة واعتمادًا</dd></div>
            </dl>
            <Button className="mt-5 w-full" onClick={() => void generateEpisode()} disabled={busy}>
              {busy ? "جارٍ إنشاء طلب الحلقة…" : "ولّد الحلقة بالصوت المصري"}
            </Button>
            <p className="mt-3 text-xs leading-6 text-brand-cream/45">الصوت مولّد بتقنية Neural باستخدام الصوت المصري Shakir، مش تسجيل بشري حقيقي. الفيديو بيتكوّن محليًا من قالب ليل وحركة الكاميرا والترجمة، من غير مولّد فيديو خارجي. كل يوم أحد بيجهّز النظام الحلقة التالية بعد اكتمال اللي قبلها؛ وتفضل داخل ZIKR للمراجعة من غير نشر تلقائي.</p>
          </div>
          <div className="rounded-xl border border-brand-gold/15 bg-black/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold text-brand-cream">حالة الحلقة</h4>
              <button type="button" onClick={() => void loadQueue()} disabled={loadingQueue} className="text-xs text-brand-gold underline underline-offset-4">{loadingQueue ? "تحديث..." : "تحديث"}</button>
            </div>
            {latestRequest ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-brand-cream/75">{statusLabel(latestRequest.status)}</p>
                {latestRequest.error_message && <p className="text-xs leading-6 text-red-300">{latestRequest.error_message}</p>}
                {latestRequest.video_url && latestRequest.status === "completed" && (
                  <div className="space-y-2">
                    <video controls playsInline preload="metadata" className="w-full rounded-lg border border-brand-gold/20" src={latestRequest.video_url} />
                    <a href={latestRequest.video_url} target="_blank" rel="noreferrer" className="inline-block text-xs text-brand-gold underline underline-offset-4">فتح ملف الفيديو</a>
                  </div>
                )}
                <p className="text-[11px] text-brand-cream/35">رقم الطلب: {latestRequest.id}</p>
              </div>
            ) : <p className="mt-3 text-xs leading-6 text-brand-cream/45">لم يتم إنشاء طلب لهذه الحلقة حتى الآن.</p>}
          </div>
        </aside>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      {warning && <p role="status" className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">{warning}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-brand-gold/15 pt-4 text-xs text-brand-cream/50">
        <Link href="/admin/video/requests" className="text-brand-gold underline underline-offset-4">مراجعة طابور الفيديو</Link>
        <Link href="/admin/automation" className="text-brand-gold underline underline-offset-4">تشغيل عامل الفيديو ومراقبة المهام</Link>
        <span>سيتم تحديث الطابور تلقائيًا كل 15 ثانية أثناء الإنتاج.</span>
      </div>
    </Card>
  );
}
