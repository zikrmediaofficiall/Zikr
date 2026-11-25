"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildKidsSeriesEpisode } from "@/features/videos/data/kids-story-factory";
import { DEFAULT_PROMO_VIDEO_TIME_ZONE, ZIKR_PROMOTIONAL_VIDEO_CONCEPTS, selectUpcomingWeeklyPromoSlots } from "@/features/videos/data/promotional-video-campaign";
import { HADY_SHOW, SEASON_ONE } from "@/features/videos/shows/hady-show";

type Candidate = {
  id: string; prophetId: string; prophetAr: string; beatSequence: number; title: string; summary: string;
  sourceReferences: string[]; sourceUrls: string[]; excludedDetails: string[];
};
type SourceOption = { id: string; category: string; title: string; text: string; sourceLabel: string; sourceUrl: string; audience?: string | null };
type Status = { loading: boolean; error: string; message: string };
const blankStatus: Status = { loading: false, error: "", message: "" };
const inputClass = "mt-2 w-full rounded-lg border border-brand-gold/20 bg-black/30 px-3 py-2 text-brand-cream";
const cardClass = "space-y-4 border-brand-gold/20 bg-black/10 p-5";

async function submitRequest(
  body: { title: string; description: string; category: "other"; narration: string; content: Record<string, unknown> },
  setStatus: (status: Status) => void,
) {
  setStatus({ loading: true, error: "", message: "" });
  try {
    const response = await fetch("/api/admin/videos/create", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (payload.error === "step_up_required" && typeof payload.nextPath === "string") {
      window.location.assign(payload.nextPath);
      return;
    }
    if (!response.ok) throw new Error(payload.error || "تعذر إنشاء طلب الفيديو.");
    setStatus({
      loading: false,
      error: "",
      message: payload.auditRecorded === true
        ? "تم تسجيل الطلب في سجل الإدارة وإرساله إلى طابور التوليد."
        : "تم إنشاء الطلب، لكن سجل التدقيق لم يؤكد التسجيل. راجع سجل الإدارة قبل إعادة المحاولة.",
    });
  } catch (error) {
    setStatus({ loading: false, error: error instanceof Error ? error.message : "حدث خطأ غير متوقع.", message: "" });
  }
}

function Result({ status }: { status: Status }) {
  return <div aria-live="polite" className="space-y-2">
    {status.error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{status.error}</p>}
    {status.message && <p role="status" className="rounded-lg border border-brand-gold/20 bg-brand-gold/5 p-3 text-sm text-brand-cream">{status.message}</p>}
  </div>;
}

function KidsGenerator() {
  const [sequence, setSequence] = useState("1");
  const [status, setStatus] = useState(blankStatus);
  const number = Number(sequence);
  const episode = useMemo(() => Number.isSafeInteger(number) && number > 0 && number <= 100000 ? buildKidsSeriesEpisode(number) : null, [number]);
  async function create() {
    if (!episode) return;
    await submitRequest({
      title: episode.title,
      description: episode.description,
      category: "other",
      narration: episode.text,
      content: {
        renderer: "template", workflow: "kids-series", audience: "kids", factorySequence: number,
        sourceId: episode.sourceId, seriesId: episode.seriesId, seriesTitle: episode.seriesTitle,
        seasonNumber: episode.seasonNumber, episodeNumber: episode.episodeNumber,
        learningObjective: episode.learningObjective, ageGroup: episode.ageGroup,
        visualTheme: episode.visualTheme, generationMode: episode.generationMode,
        contentFormat: "series_episode", videoFormat: "vertical", resolution: "1080x1920", language: "ar",
      },
    }, setStatus);
  }
  return <Card className={cardClass}>
    <div><h3 className="text-lg font-bold text-brand-gold">قصص الأطفال — توليد تسلسلي</h3>
      <p className="mt-1 text-sm leading-6 text-brand-cream/60">النص باللهجة المصرية، بسيناريو وقيمة تربوية ومشهد مناسب للعمر. الفحص الآلي يراجع النص والرسومات وبيانات السلسلة قبل الإتاحة.</p></div>
    <label className="block text-sm text-brand-cream/70">رقم الحلقة
      <input type="number" min="1" max="100000" value={sequence} onChange={(event) => setSequence(event.target.value)} className={inputClass}/>
    </label>
    {episode && <div className="rounded-lg border border-brand-gold/15 bg-black/15 p-3">
      <p className="font-semibold text-brand-cream">{episode.title}</p>
      <p className="mt-1 text-xs text-brand-cream/50">{episode.seriesTitle} · الموسم {episode.seasonNumber} · الحلقة {episode.episodeNumber} · {episode.ageGroup}</p>
      <p className="mt-2 text-sm leading-7 text-brand-cream/75">{episode.text}</p>
      <p className="mt-2 text-xs text-brand-gold">الهدف التعليمي: {episode.learningObjective} · المشهد: {episode.visualTheme}</p>
    </div>}
    <Result status={status}/>
    <Button onClick={() => void create()} disabled={!episode || status.loading}>{status.loading ? "جارٍ إنشاء الطلب…" : "توليد حلقة الأطفال"}</Button>
  </Card>;
}

function PromoGenerator() {
  const [campaign, setCampaign] = useState(ZIKR_PROMOTIONAL_VIDEO_CONCEPTS[0]?.key ?? "");
  const [slot, setSlot] = useState("0");
  const [status, setStatus] = useState(blankStatus);
  const slots = useMemo(() => selectUpcomingWeeklyPromoSlots(new Date(), DEFAULT_PROMO_VIDEO_TIME_ZONE, 2, 60), []);
  const concept = ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.find((entry) => entry.key === campaign) ?? ZIKR_PROMOTIONAL_VIDEO_CONCEPTS[0];
  const selectedSlot = slots[Number(slot)];
  async function create() {
    if (!concept || !selectedSlot) return;
    await submitRequest({
      title: concept.title, description: concept.description, category: "other", narration: concept.narration,
      content: {
        renderer: "template", workflow: "promo-campaign", campaignKey: concept.key,
        localDate: selectedSlot.localDate, slot: selectedSlot.slot,
        videoFormat: "vertical", resolution: "1080x1920", language: "ar",
      },
    }, setStatus);
  }
  return <Card className={cardClass}>
    <div><h3 className="text-lg font-bold text-brand-gold">الحملات الترويجية لذِكر</h3>
      <p className="mt-1 text-sm leading-6 text-brand-cream/60">فيديو أصلي يعرّف بأقسام الموقع والتطبيق، مع افتتاحية ودعوة واضحة للتنزيل وموعد ثابت بتوقيت القاهرة مرتين أسبوعيًا.</p></div>
    <label className="block text-sm text-brand-cream/70">فكرة الحملة
      <select value={campaign} onChange={(event) => setCampaign(event.target.value)} className={inputClass}>
        {ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.map((entry) => <option key={entry.key} value={entry.key}>{entry.title}</option>)}
      </select>
    </label>
    <label className="block text-sm text-brand-cream/70">موعد النشر
      <select value={slot} onChange={(event) => setSlot(event.target.value)} disabled={!slots.length} className={inputClass}>
        {slots.map((entry, index) => <option key={entry.localDate + ":" + entry.slot} value={String(index)}>
          {entry.localDate} · {entry.slot === 0 ? "الأربعاء 18:00" : "الجمعة 16:00"} بتوقيت القاهرة
        </option>)}
      </select>
    </label>
    {concept && <div className="rounded-lg border border-brand-gold/15 bg-black/15 p-3">
      <p className="font-semibold text-brand-gold">{concept.hook}</p><p className="mt-2 text-sm leading-7 text-brand-cream/75">{concept.narration}</p>
    </div>}
    {!slots.length && <p className="text-sm text-amber-200">لا يوجد موعد ترويجي مستقبلي متاح في نافذة الجدولة.</p>}
    <Result status={status}/>
    <Button onClick={() => void create()} disabled={!selectedSlot || status.loading}>{status.loading ? "جارٍ إعداد الحملة…" : "إنشاء الحملة وحجز موعدها"}</Button>
  </Card>;
}

function ProphetGenerator() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [references, setReferences] = useState<string[]>([]);
  const [scriptReviewed, setScriptReviewed] = useState(false);
  const [detailsRemoved, setDetailsRemoved] = useState(false);
  const [childSafe, setChildSafe] = useState(false);
  const [visualsReviewed, setVisualsReviewed] = useState(false);
  const [status, setStatus] = useState(blankStatus);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/admin/video-generation/prophet-candidates", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "تعذر تحميل مرشحات قصص الأنبياء.");
        setItems(Array.isArray(body.candidates) ? body.candidates : []);
      })
      .catch((error) => { if (!controller.signal.aborted) setStatus({ loading: false, error: error instanceof Error ? error.message : "تعذر تحميل المرشحات.", message: "" }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => { setReferences([]); setScriptReviewed(false); setDetailsRemoved(false); setChildSafe(false); setVisualsReviewed(false); }, [selectedId]);
  const candidate = items.find((entry) => entry.id === selectedId);
  const checksComplete = Boolean(candidate) && candidate!.sourceReferences.length > 0 &&
    candidate!.sourceReferences.every((reference) => references.includes(reference)) &&
    scriptReviewed && detailsRemoved && childSafe && visualsReviewed;
  async function create() {
    if (!candidate) return;
    await submitRequest({
      title: candidate.title,
      description: "مشهد من سلسلة قصص الأنبياء بالصلصال — ملخص بحثي يحتاج اعتماد المصدر والمراجعة.",
      category: "other",
      narration: candidate.summary,
      content: {
        renderer: "template", workflow: "prophet-story", prophetId: candidate.prophetId, beatSequence: candidate.beatSequence,
        verifiedReferences: references, scriptReviewed, unsupportedDetailsRemoved: detailsRemoved,
        childSafetyReviewed: childSafe, symbolicClayVisualsReviewed: visualsReviewed,
        videoFormat: "vertical", resolution: "1080x1920", language: "ar",
      },
    }, setStatus);
  }
  return <Card className={cardClass}>
    <div><h3 className="text-lg font-bold text-brand-gold">قصص الأنبياء بالصلصال — اعتماد بشري</h3>
      <p className="mt-1 text-sm leading-6 text-brand-cream/60">كل عنصر هنا مرشح بحث وليس حلقة معتمدة. لا يسمح النظام بالإنتاج حتى مراجعة المراجع والتفاصيل وسلامة الأطفال والرسومات الرمزية يدويًا.</p></div>
    <label className="block text-sm text-brand-cream/70">اختيار النبي والمشهد
      <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={loading || !items.length} className={inputClass}>
        <option value="">{loading ? "جارٍ تحميل المرشحات…" : "اختر مشهدًا"}</option>
        {items.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}
      </select>
    </label>
    {candidate && <div className="space-y-3 rounded-lg border border-brand-gold/15 bg-black/15 p-3">
      <p className="font-semibold text-brand-cream">{candidate.title}</p>
      <p className="text-sm leading-7 text-brand-cream/75">{candidate.summary}</p>
      {candidate.sourceReferences.map((reference, index) => <label key={reference} className="flex items-start gap-2 text-sm text-brand-cream/70">
        <input type="checkbox" checked={references.includes(reference)} onChange={(event) => setReferences((current) => event.target.checked ? [...new Set([...current, reference])] : current.filter((item) => item !== reference))}/>
        <span>{reference} — <a href={candidate.sourceUrls[index]} target="_blank" rel="noreferrer" className="text-brand-gold underline">فتح المرجع</a></span>
      </label>)}
      <div className="space-y-2 text-sm text-brand-cream/70">
        <label className="flex gap-2"><input type="checkbox" checked={scriptReviewed} onChange={(event) => setScriptReviewed(event.target.checked)}/> راجعت ملخص المشهد ومنعت أي أقوال غير مثبتة.</label>
        <label className="flex gap-2"><input type="checkbox" checked={detailsRemoved} onChange={(event) => setDetailsRemoved(event.target.checked)}/> استبعدت التفاصيل المختلف عليها أو غير المثبتة.</label>
        <label className="flex gap-2"><input type="checkbox" checked={childSafe} onChange={(event) => setChildSafe(event.target.checked)}/> راجعت ملاءمة وسلامة المحتوى للأطفال.</label>
        <label className="flex gap-2"><input type="checkbox" checked={visualsReviewed} onChange={(event) => setVisualsReviewed(event.target.checked)}/> راجعت رسومات رمزية بلا تجسيد لنبي أو صحابي أو ظل أو هيئة بشرية.</label>
      </div>
      {candidate.excludedDetails.length > 0 && <details className="text-xs text-brand-cream/55"><summary className="cursor-pointer text-brand-gold">التفاصيل المستبعدة</summary><ul className="mt-2 list-disc space-y-1 pr-5">{candidate.excludedDetails.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
    </div>}
    <Result status={status}/>
    <Button onClick={() => void create()} disabled={!checksComplete || status.loading}>{status.loading ? "جارٍ التحقق…" : "اعتماد المراجعة وبدء إنتاج المشهد"}</Button>
  </Card>;
}

const HADY_PARTS = [
  { id: "hook", title: "الافتتاحية — 24 إلى 48 كلمة" },
  { id: "advice", title: "النصيحة — 55 إلى 90 كلمة" },
  { id: "story", title: "القصة — 105 إلى 160 كلمة" },
  { id: "reflection", title: "التأمل — 34 إلى 62 كلمة" },
  { id: "closing", title: "الخاتمة — 18 إلى 38 كلمة" },
] as const;

function HadyGenerator() {
  const [theme, setTheme] = useState<string>(SEASON_ONE[0]?.theme ?? "patience");
  const [sourceCategory, setSourceCategory] = useState<"hadith" | "story">("hadith");
  const [sources, setSources] = useState<SourceOption[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [loadingSources, setLoadingSources] = useState(false);
  const [title, setTitle] = useState(SEASON_ONE[0]?.titleAr ?? HADY_SHOW.titleAr);
  const [parts, setParts] = useState<Record<string, string>>({ hook: "", advice: "", story: "", reflection: "", closing: "" });
  const [reviewed, setReviewed] = useState(false);
  const [status, setStatus] = useState(blankStatus);
  useEffect(() => {
    const controller = new AbortController();
    setLoadingSources(true); setSourceId("");
    void fetch("/api/admin/video-generation/sources?category=" + sourceCategory, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "تعذر تحميل مصادر الحلقة.");
        setSources((Array.isArray(body.sources) ? body.sources as SourceOption[] : []).filter((entry) => entry.audience !== "kids"));
      })
      .catch((error) => { if (!controller.signal.aborted) setStatus({ loading: false, error: error instanceof Error ? error.message : "تعذر تحميل المصادر.", message: "" }); })
      .finally(() => { if (!controller.signal.aborted) setLoadingSources(false); });
    return () => controller.abort();
  }, [sourceCategory]);
  const selectedSource = sources.find((entry) => entry.id === sourceId);
  const ready = reviewed && Boolean(selectedSource) && title.trim().length >= 3 && HADY_PARTS.every((part) => parts[part.id]?.trim());
  async function create() {
    if (!selectedSource) return;
    const narration = HADY_PARTS.map((part) => parts[part.id] ?? "").join("\n\n");
    await submitRequest({
      title, description: "حلقة من برنامج " + HADY_SHOW.titleAr + " — نص مصري ومصدر منشور موثق.",
      category: "other", narration,
      content: {
        renderer: "template", workflow: "hady-program", humanReviewed: reviewed,
        theme, week: SEASON_ONE.find((item) => item.theme === theme)?.week ?? 1,
        sourceCategory, sourceId, segments: HADY_PARTS.map((part) => ({ id: part.id, text: parts[part.id] ?? "" })),
        videoFormat: "vertical", resolution: "1080x1920", language: "ar",
      },
    }, setStatus);
  }
  return <Card className={cardClass}>
    <div><h3 className="text-lg font-bold text-brand-gold">{HADY_SHOW.titleAr} — إنتاج الحلقة</h3>
      <p className="mt-1 text-sm leading-6 text-brand-cream/60">برنامج مصري أسبوعي. اكتب الأجزاء الخمسة، واستخدم نصًا مصريًا ومصدرًا منشورًا. لن يبدأ الرندر إلا بعد المراجعة البشرية وفحص المصدر والمدة.</p></div>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block text-sm text-brand-cream/70">موضوع الحلقة
        <select value={theme} onChange={(event) => { setTheme(event.target.value); const topic = SEASON_ONE.find((item) => item.theme === event.target.value); if (topic) setTitle(topic.titleAr); }} className={inputClass}>
          {SEASON_ONE.map((item) => <option key={item.theme} value={item.theme}>{item.titleAr}</option>)}
        </select>
      </label>
      <label className="block text-sm text-brand-cream/70">العنوان
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} className={inputClass}/>
      </label>
      <label className="block text-sm text-brand-cream/70">نوع المصدر
        <select value={sourceCategory} onChange={(event) => setSourceCategory(event.target.value as "hadith" | "story")} className={inputClass}>
          <option value="hadith">حديث منشور</option><option value="story">قصة أو سيرة منشورة</option>
        </select>
      </label>
      <label className="block text-sm text-brand-cream/70">المصدر
        <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} disabled={loadingSources || !sources.length} className={inputClass}>
          <option value="">{loadingSources ? "جارٍ تحميل المصادر…" : "اختر مصدرًا منشورًا"}</option>
          {sources.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} — {entry.sourceLabel}</option>)}
        </select>
      </label>
    </div>
    {HADY_PARTS.map((part) => <label key={part.id} className="block text-sm text-brand-cream/70">{part.title}
      <textarea rows={3} maxLength={2500} value={parts[part.id] ?? ""} onChange={(event) => setParts((current) => ({ ...current, [part.id]: event.target.value }))} className={inputClass + " leading-7"} placeholder="اكتب الجزء باللهجة المصرية. النصوص الدينية تُنقل حرفيًا من المصدر ولا يعاد تأليفها."/>
    </label>)}
    <label className="flex items-start gap-2 text-sm text-brand-cream/70">
      <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)}/>
      راجعت النص كاملًا مع المصدر، وتأكدت من عدم وجود اقتباس ديني غير موثق أو فتوى.
    </label>
    <Result status={status}/>
    <Button onClick={() => void create()} disabled={!ready || status.loading}>{status.loading ? "جارٍ فحص الحلقة…" : "اعتماد وإنتاج حلقة هادي"}</Button>
  </Card>;
}

export default function AdvancedVideoGenerators() {
  return <section className="space-y-4" aria-label="مولدات الفيديو المتخصصة">
    <div><p className="text-xs uppercase tracking-[0.2em] text-brand-cream/40">SPECIAL VIDEO GENERATORS</p>
      <h2 className="text-xl font-bold text-brand-gold">مولدات الفيديو المتخصصة</h2>
      <p className="text-sm leading-6 text-brand-cream/55">مولد مستقل لكل مسار مع مصدره وصوته وقالب المشاهد المناسب له.</p></div>
    <div className="grid gap-4 xl:grid-cols-2"><KidsGenerator/><PromoGenerator/><ProphetGenerator/><HadyGenerator/></div>
  </section>;
}
