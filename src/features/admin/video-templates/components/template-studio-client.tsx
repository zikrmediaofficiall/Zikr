"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { redirectToAdminStepUp } from "@/features/admin/utils/step-up-client";

type Audience = "general" | "kids";
type Template = {
  id: string; slug: string; title: string; description: string; audience: Audience; asset_key: string;
};
type Version = {
  id: string; template_id: string; version: number; config: {
    assetKey?: string; defaultFormat?: "vertical" | "horizontal"; motion?: "slow" | "fade";
    fontPreset?: "auto" | "naskh" | "sans";
    palette?: "template" | "gold" | "emerald" | "monochrome";
    safeArea?: "standard" | "wide";
    captionStyle?: "classic" | "minimal" | "boxed";
    sourceCardStyle?: "standard" | "compact";
    audioPolicy?: "allow-tts" | "verified-audio-only";
  };
  status: "draft" | "approved" | "active" | "retired";
  is_system_seed: boolean; created_by: string | null; reviewed_by: string | null;
  reviewed_at: string | null; activated_at: string | null; created_at: string;
};
type Preview = {
  id: string; title: string; status: string; video_url: string | null;
  error_message: string | null; created_at: string; content: unknown;
};
type Payload = { templates: Template[]; versions: Version[]; previews: Preview[] };

const GENERAL_ASSETS = ["calm","dawn","emerald","gold","night","paper","rose","andalusian-arch","midnight-skyline","oasis-dawn","desert-caravan","geometric-mosaic","lantern-glow","manuscript-library","moonlit-sea","olive-grove","desert-dusk","coastal-blue","botanical","library","geometric","marble","cinematic","starfield","mountain-dawn","heritage","minimal-studio","rainy-window","watercolor-sky","old-city","desert-rose","mosaic-blue","satin-night","sunlit-arch","olive-branch","minimal-cream"];
const KIDS_ASSETS = ["kids-garden","kids-nature","kids-neighborhood","kids-workshop","kids-space","kids-ocean","kids-forest","kids-playground","kids-classroom","kids-adventure","kids-jungle","kids-robotics","kids-animals","kids-weather"];
const ASSET_LABELS: Record<string, string> = {
  calm: "هادئ", dawn: "الفجر", emerald: "زمردي", gold: "ذهبي",
  night: "ليلي", paper: "ورقي", rose: "وردي",
  "andalusian-arch": "قوس أندلسي", "midnight-skyline": "أفق ليلي", "oasis-dawn": "واحة الفجر",
  "kids-garden": "حديقة الأطفال", "kids-nature": "طبيعة الأطفال",
  "kids-neighborhood": "حيّ الأطفال", "kids-workshop": "ورشة الأطفال",
  "desert-dusk": "غروب الصحراء",
  "coastal-blue": "ساحل أزرق",
  "botanical": "حديقة زيتونية",
  "library": "مكتبة المعرفة",
  "geometric": "زخارف هندسية",
  "marble": "رخام هادئ",
  "cinematic": "إضاءة سينمائية",
  "starfield": "سماء مرصعة",
  "mountain-dawn": "قمم الفجر",
  "heritage": "طراز تراثي",
  "minimal-studio": "استوديو بسيط",
  "rainy-window": "نافذة المطر",
  "desert-caravan": "قافلة الصحراء",
  "geometric-mosaic": "فسيفساء هندسية",
  "lantern-glow": "وهج الفوانيس",
  "manuscript-library": "مكتبة المخطوطات",
  "moonlit-sea": "بحر مضاء بالقمر",
  "olive-grove": "بستان الزيتون",
  "watercolor-sky": "سماء مائية",
  "old-city": "مدينة عتيقة",
  "desert-rose": "وردة الصحراء",
  "mosaic-blue": "فسيفساء زرقاء",
  "satin-night": "ليل حريري",
  "sunlit-arch": "قوس مشمس",
  "olive-branch": "غصن زيتون",
  "minimal-cream": "استوديو عاجي",
  "kids-jungle": "أدغال الأطفال",
  "kids-robotics": "روبوتات الأطفال",
  "kids-animals": "حيوانات الأطفال",
  "kids-weather": "طقس الأطفال",
  "kids-space": "فضاء الأطفال",
  "kids-ocean": "محيط الأطفال",
  "kids-forest": "غابة الأطفال",
  "kids-playground": "ملعب الألوان",
  "kids-classroom": "فصل المعرفة",
  "kids-adventure": "مغامرة الطبيعة",
};
const ASSET_LABELS_EN: Record<string, string> = {
  calm: "Calm", dawn: "Dawn", emerald: "Emerald", gold: "Warm Gold",
  night: "Night Sky", paper: "Paper Texture", rose: "Rose",
  "andalusian-arch": "Andalusian Arch", "midnight-skyline": "Midnight Skyline", "oasis-dawn": "Oasis at Dawn",
  "desert-caravan": "Desert Caravan", "geometric-mosaic": "Geometric Mosaic", "lantern-glow": "Lantern Glow",
  "manuscript-library": "Manuscript Library", "moonlit-sea": "Moonlit Sea", "olive-grove": "Olive Grove",
  "desert-dusk": "Desert Dusk", "coastal-blue": "Coastal Blue", botanical: "Botanical Garden",
  library: "Knowledge Library", geometric: "Geometric Patterns", marble: "Quiet Marble",
  cinematic: "Cinematic Light", starfield: "Starfield", "mountain-dawn": "Mountain Dawn",
  heritage: "Heritage", "minimal-studio": "Minimal Studio", "rainy-window": "Rainy Window",
  "watercolor-sky": "Watercolor Sky", "old-city": "Old City", "desert-rose": "Desert Rose",
  "mosaic-blue": "Blue Mosaic", "satin-night": "Satin Night", "sunlit-arch": "Sunlit Arch",
  "olive-branch": "Olive Branch", "minimal-cream": "Cream Minimal",
  "kids-garden": "Kids' Garden", "kids-nature": "Nature Explorers", "kids-neighborhood": "Neighborhood",
  "kids-workshop": "Creative Workshop", "kids-space": "Space Adventure", "kids-ocean": "Ocean World",
  "kids-forest": "Forest Friends", "kids-playground": "Color Playground", "kids-classroom": "Learning Classroom",
  "kids-adventure": "Nature Quest", "kids-jungle": "Jungle Discovery", "kids-robotics": "Robotics Lab",
  "kids-animals": "Animal Friends", "kids-weather": "Weather Lab",
};
const getAssetLabel = (asset: string | undefined, isEnglish: boolean) => {
  if (!asset) return "";
  return (isEnglish ? ASSET_LABELS_EN[asset] : ASSET_LABELS[asset]) ?? asset;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة", approved: "مراجع", active: "نشط", retired: "متوقف",
};
const STATUS_STYLES: Record<string, string> = {
  draft: "border-amber-400/30 text-amber-200",
  approved: "border-sky-400/30 text-sky-200",
  active: "border-emerald-400/30 text-emerald-200",
  retired: "border-zinc-500/30 text-zinc-400",
};

export default function TemplateStudioClient({ locale }: { locale: "ar" | "en" }) {
  const isEnglish = locale === "en";
  const t = (ar: string, en: string) => isEnglish ? en : ar;
  const direction = isEnglish ? "ltr" : "rtl";
  const [data, setData] = useState<Payload>({ templates: [], versions: [], previews: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assetKey, setAssetKey] = useState("calm");
  const [defaultFormat, setDefaultFormat] = useState<"vertical" | "horizontal">("vertical");
  const [motion, setMotion] = useState<"slow" | "fade">("slow");
  const [fontPreset, setFontPreset] = useState<"auto" | "naskh" | "sans">("auto");
  const [palette, setPalette] = useState<"template" | "gold" | "emerald" | "monochrome">("template");
  const [safeArea, setSafeArea] = useState<"standard" | "wide">("standard");
  const [captionStyle, setCaptionStyle] = useState<"classic" | "minimal" | "boxed">("classic");
  const [sourceCardStyle, setSourceCardStyle] = useState<"standard" | "compact">("standard");
  const [audioPolicy, setAudioPolicy] = useState<"allow-tts" | "verified-audio-only">("allow-tts");
  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/video/templates", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || t("تعذر تحميل مكتبة القوالب.", "Unable to load the template library."));
      const next = payload as Payload;
      setData({
        templates: Array.isArray(next.templates) ? next.templates : [],
        versions: Array.isArray(next.versions) ? next.versions : [],
        previews: Array.isArray(next.previews) ? next.previews : [],
      });
      setSelectedTemplateId((current) => current || next.templates?.[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر الاتصال بمكتبة القوالب.", "Could not connect to the template library."));
    } finally {
      setLoading(false);
    }
  }, [isEnglish]);

  useEffect(() => { void load(); }, [load]);

  const selectedTemplate = useMemo(
    () => data.templates.find((item) => item.id === selectedTemplateId) ?? null,
    [data.templates, selectedTemplateId],
  );
  const availableAssets = useMemo(() => selectedTemplate?.audience === "kids" ? KIDS_ASSETS : GENERAL_ASSETS, [selectedTemplate?.audience]);
  const versionsByTemplate = useMemo(() => {
    const grouped = new Map<string, Version[]>();
    for (const version of data.versions) {
      const items = grouped.get(version.template_id) ?? [];
      items.push(version);
      grouped.set(version.template_id, items);
    }
    return grouped;
  }, [data.versions]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const active = (versionsByTemplate.get(selectedTemplate.id) ?? []).find((version) => version.status === "active");
    const configAsset = active?.config?.assetKey;
    setAssetKey(configAsset && availableAssets.includes(configAsset) ? configAsset : selectedTemplate.asset_key);
    setDefaultFormat(active?.config?.defaultFormat === "horizontal" ? "horizontal" : "vertical");
    setMotion(active?.config?.motion === "fade" ? "fade" : "slow");
    setFontPreset(active?.config?.fontPreset === "naskh" || active?.config?.fontPreset === "sans" ? active.config.fontPreset : "auto");
    setPalette(active?.config?.palette === "gold" || active?.config?.palette === "emerald" || active?.config?.palette === "monochrome" ? active.config.palette : "template");
    setSafeArea(active?.config?.safeArea === "wide" ? "wide" : "standard");
    setCaptionStyle(active?.config?.captionStyle === "minimal" || active?.config?.captionStyle === "boxed" ? active.config.captionStyle : "classic");
    setSourceCardStyle(active?.config?.sourceCardStyle === "compact" ? "compact" : "standard");
    setAudioPolicy(active?.config?.audioPolicy === "verified-audio-only" ? "verified-audio-only" : "allow-tts");
  }, [selectedTemplate, versionsByTemplate, availableAssets]);

  const mutate = useCallback(async (action: string, values: Record<string, unknown> = {}) => {
    setBusy(action + ":" + String(values.versionId ?? ""));
    setError("");
    setMessage("");
    setWarning("");
    try {
      const response = await fetch("/api/admin/video/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...values }),
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.error === "step_up_required" && redirectToAdminStepUp(payload.nextPath)) return;
      if (!response.ok) throw new Error(payload.error || t("تعذر تنفيذ العملية.", "The action could not be completed."));
      if (payload.auditRecorded !== true) {
        setWarning(t("تم تنفيذ العملية بالفعل، لكن تعذر تأكيد تسجيلها في سجل التدقيق. لا تكرر الإجراء؛ اطلب من مسؤول النظام مراجعة سجل الإدارة.", "The action completed, but its audit record could not be confirmed. Do not repeat it; ask an administrator to review the audit log."));
        await load();
        return;
      }
      setMessage(
        action === "create-version" ? t("تم إنشاء مسودة إصدار جديدة. اختبرها ثم اطلب مراجعتها من مسؤول آخر.", "A new version draft was created. Test it, then request an independent review.") :
        action === "approve-version" ? t("تم تسجيل المراجعة.", "The review was recorded.") :
        action === "activate-version" ? t("تم التفعيل أو الاسترجاع بنجاح.", "The version was activated or restored.") :
        t("تم إنشاء طلب المعاينة الداخلي. لا يُرسل إلى منصات التواصل.", "An internal preview request was created. It will not be sent to social platforms."),
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("تعذر تنفيذ العملية.", "The action could not be completed."));
    } finally {
      setBusy("");
    }
  }, [load, isEnglish]);

  const createVersion = () => {
    if (!selectedTemplate) return;
    void mutate("create-version", {
      templateId: selectedTemplate.id,
      config: { assetKey, defaultFormat, motion, fontPreset, palette, safeArea, captionStyle, sourceCardStyle, audioPolicy },
    });
  };

  const runPreview = (version: Version) => {
    void mutate("preview-version", { versionId: version.id });
  };

  const approve = (version: Version) => {
    void mutate("approve-version", { versionId: version.id });
  };

  const activate = (version: Version) => {
    void mutate("activate-version", { versionId: version.id });
  };

  return (
    <div className="space-y-8" dir={direction}>
      <header className="space-y-2">
        <p className="text-xs tracking-[0.2em] text-brand-cream/35">VIDEO FACTORY / VERSIONED TEMPLATE STUDIO</p>
        <h1 className="text-3xl font-bold text-brand-gold">{t("استوديو قوالب الفيديو", "Video Template Studio")}</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/60">
          {t("كل تعديل ينشئ إصدارًا جديدًا غير قابل للتعديل. المعاينة تُنفذ بمحرك الفيديو الفعلي وتُحفظ كطلب داخلي مع تعطيل النشر الاجتماعي، ولا يصبح الإصدار نشطًا إلا بعد مراجعة مسؤول آخر.", "Every change creates an immutable version. Previews use the production video renderer and remain internal with social publishing disabled. A version becomes active only after an independent administrator review.")}
        </p>
      </header>

      {message && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm text-emerald-200">{message}</p>}
      {warning && <p role="status" className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-sm text-amber-100">{warning}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
        <div className="rounded-2xl border border-brand-gold/15 bg-black/15 p-5">
          <h2 className="text-lg font-bold text-brand-gold">{t("إنشاء إصدار جديد", "Create a new version")}</h2>
          <p className="mt-1 text-xs leading-6 text-brand-cream/45">{t("الأصول محصورة في ملفات SVG الموجودة داخل المشروع؛ لا يقبل النظام مسارات ملفات خارج القائمة المسموح بها.", "Assets are restricted to local SVG files in this project. External or arbitrary file paths are not accepted.")}</p>
          <div className="mt-4 space-y-4">
            <label className="block text-sm text-brand-cream/75">
              {t("القالب", "Template")}
              <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                {data.templates.map((template) => <option key={template.id} value={template.id}>{isEnglish ? getAssetLabel(template.slug, true) || template.slug.replaceAll("-", " ") : template.title} — {template.audience === "kids" ? t("أطفال", "Kids") : t("عام", "General")}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm text-brand-cream/75">
                {t("الأصل المرئي", "Visual scene")}
                <select value={assetKey} onChange={(event) => setAssetKey(event.target.value)} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                  {availableAssets.map((asset) => <option key={asset} value={asset}>{getAssetLabel(asset, isEnglish)}</option>)}
                </select>
              </label>
              <label className="block text-sm text-brand-cream/75">
                {t("الاتجاه", "Format")}
                <select value={defaultFormat} onChange={(event) => setDefaultFormat(event.target.value as "vertical" | "horizontal")} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                  <option value="vertical">{t("رأسي 9:16", "Vertical 9:16")}</option>
                  <option value="horizontal">{t("أفقي 16:9", "Horizontal 16:9")}</option>
                </select>
              </label>
              <label className="block text-sm text-brand-cream/75">
                {t("الحركة", "Motion")}
                <select value={motion} onChange={(event) => setMotion(event.target.value as "slow" | "fade")} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                  <option value="slow">{t("حركة هادئة", "Gentle motion")}</option>
                  <option value="fade">{t("تلاشي تدريجي", "Soft fade")}</option>
                </select>
              </label>
            </div>
            <div className="space-y-3 rounded-xl border border-brand-gold/10 bg-black/15 p-3">
              <h3 className="text-sm font-semibold text-brand-gold">{t("التحكم في الإخراج البصري", "Visual output settings")}</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label className="block text-sm text-brand-cream/75">
                  {t("الخط العربي", "Typography")}
                  <select value={fontPreset} onChange={(event) => setFontPreset(event.target.value as typeof fontPreset)} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                    <option value="auto">{t("تلقائي حسب الجمهور", "Automatic for audience")}</option>
                    <option value="naskh">{t("نسخ واضح", "Readable Naskh")}</option>
                    <option value="sans">{t("Sans حديث", "Modern sans-serif")}</option>
                  </select>
                </label>
                <label className="block text-sm text-brand-cream/75">
                  {t("لوحة الألوان", "Color palette")}
                  <select value={palette} onChange={(event) => setPalette(event.target.value as typeof palette)} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                    <option value="template">{t("ألوان القالب الأساسية", "Original template colors")}</option>
                    <option value="gold">{t("ذهبي دافئ", "Warm gold")}</option>
                    <option value="emerald">{t("زمردي", "Emerald")}</option>
                    <option value="monochrome">{t("أحادي هادئ", "Quiet monochrome")}</option>
                  </select>
                </label>
                <label className="block text-sm text-brand-cream/75">
                  {t("المنطقة الآمنة", "Safe area")}
                  <select value={safeArea} onChange={(event) => setSafeArea(event.target.value as typeof safeArea)} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                    <option value="standard">{t("قياسية", "Standard")}</option>
                    <option value="wide">{t("هوامش أوسع للنص والمنصات", "Wider margins for captions and platforms")}</option>
                  </select>
                </label>
                <label className="block text-sm text-brand-cream/75">
                  {t("شكل الترجمة", "Caption style")}
                  <select value={captionStyle} onChange={(event) => setCaptionStyle(event.target.value as typeof captionStyle)} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                    <option value="classic">{t("كلاسيكي بحد خفيف", "Classic with a subtle outline")}</option>
                    <option value="minimal">{t("بسيط قليل الظل", "Minimal with a soft shadow")}</option>
                    <option value="boxed">{t("بطاقة خلفية للنص", "Text background card")}</option>
                  </select>
                </label>
                <label className="block text-sm text-brand-cream/75">
                  {t("بطاقة المصدر", "Source card")}
                  <select value={sourceCardStyle} onChange={(event) => setSourceCardStyle(event.target.value as typeof sourceCardStyle)} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                    <option value="standard">{t("قياسية وواضحة", "Standard and clear")}</option>
                    <option value="compact">{t("مختصرة لتوفير المساحة", "Compact to save space")}</option>
                  </select>
                </label>
                <label className="block text-sm text-brand-cream/75">
                  {t("سياسة الصوت", "Audio policy")}
                  <select value={audioPolicy} onChange={(event) => setAudioPolicy(event.target.value as typeof audioPolicy)} className="mt-2 w-full rounded-xl border border-brand-gold/15 bg-black/30 p-3">
                    <option value="allow-tts">{t("السماح بالتعليق العربي عند غياب تسجيل المصدر", "Allow Arabic narration when source audio is unavailable")}</option>
                    <option value="verified-audio-only">{t("صوت مصدر موثق أو تسجيل بشري فقط", "Verified source audio or human recording only")}</option>
                  </select>
                </label>
              </div>
              <p className="text-xs leading-6 text-brand-cream/45">
                {t("بطاقة المصدر لا يمكن إخفاؤها. وضع الصوت الموثق يمنع التعليق الصناعي في الإنتاج عند غياب تسجيل المصدر؛ المعاينة الداخلية تستخدم صوتًا تجريبيًا ولا تُنشر.", "The source card cannot be hidden. Verified-audio mode blocks synthetic narration in production when source audio is missing; internal previews use test audio and are never published.")}
              </p>
            </div>
            <button type="button" onClick={createVersion} disabled={!selectedTemplate || Boolean(busy)} className="rounded-xl bg-brand-gold px-5 py-3 text-sm font-bold text-black disabled:opacity-50">
              {busy.startsWith("create-version:") ? t("جارٍ إنشاء المسودة…", "Creating draft…") : t("إنشاء مسودة إصدار", "Create version draft")}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-brand-gold/15 bg-black/15 p-5">
          <h2 className="text-lg font-bold text-brand-gold">{t("قواعد الاعتماد", "Review and activation rules")}</h2>
          <ol className="mt-3 list-decimal space-y-2 pr-5 text-sm leading-6 text-brand-cream/65">
            <li>{t("أنشئ نسخة جديدة؛ النسخ السابقة لا تُعدَّل.", "Create a new version; previous versions are immutable.")}</li>
            <li>{t("ولّد معاينة من نفس محرك FFmpeg المستخدم في الإنتاج.", "Generate a preview with the same FFmpeg renderer used in production.")}</li>
            <li>{t("راجع الصوت والنص والخلفية والمقاس.", "Review the audio, text, background and dimensions.")}</li>
            <li>{t("مسؤول آخر يعتمد الإصدار، ثم يتم تفعيله ذريًا.", "A second administrator approves the version before atomic activation.")}</li>
            <li>{t("يمكن استرجاع نسخة سابقة دون تغيير إعداداتها.", "A previous version can be restored without changing its settings.")}</li>
          </ol>
          <p className="mt-4 text-xs leading-6 text-brand-cream/40">{t("المعاينات لا تُضاف إلى social_publish_queue، ويُمنع عامل الفيديو من إعادة مصالحتها كمنشورات.", "Previews never enter social_publish_queue, and the video worker cannot reconcile them as publishable posts.")}</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-brand-gold">{t("كتالوج القوالب والإصدارات", "Template and version catalogue")}</h2>
          <button onClick={() => void load()} disabled={loading || Boolean(busy)} className="rounded-lg border border-brand-gold/20 px-3 py-2 text-xs text-brand-cream/70 disabled:opacity-40">{t("تحديث القائمة", "Refresh list")}</button>
        </div>
        {loading ? <p className="text-sm text-brand-cream/50">{t("جارٍ تحميل القوالب…", "Loading templates…")}</p> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.templates.map((template) => {
              const versions = versionsByTemplate.get(template.id) ?? [];
              const active = versions.find((version) => version.status === "active");
              const activeAsset = active?.config?.assetKey || template.asset_key;
              return (
                <article key={template.id} className="overflow-hidden rounded-2xl border border-brand-gold/15 bg-black/15">
                  <div className="grid gap-4 p-4 sm:grid-cols-[120px_1fr]">
                    <div className="relative aspect-[9/16] max-h-56 overflow-hidden rounded-xl bg-black/30">
                      <Image src={`/video/templates/${activeAsset}.svg`} alt={t(`معاينة ${template.title}`, `Preview of ${getAssetLabel(template.slug, true)}`)} fill unoptimized sizes="120px" className="object-contain" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-brand-gold">{isEnglish ? getAssetLabel(template.slug, true) || template.slug.replaceAll("-", " ") : template.title}</h3>
                        <span className="rounded-full border border-brand-gold/15 px-2 py-1 text-[10px] text-brand-cream/55">{template.audience === "kids" ? t("أطفال", "Kids") : t("عام", "General")}</span>
                      </div>
                      <p className="text-xs leading-6 text-brand-cream/45">{isEnglish ? `A ${template.audience === "kids" ? "child-friendly" : "versatile"} ${getAssetLabel(template.slug, true).toLowerCase()} visual theme for ${template.audience === "kids" ? "safe learning and storytelling" : "reflection, education and storytelling"}.` : template.description}</p>
                      <p className="text-xs text-brand-cream/50">{t("الإصدار النشط:", "Active version:")} {active ? `v${active.version}` : t("لا يوجد", "None")}</p>
                      <p className="text-xs text-brand-cream/50">{t("الأصل:", "Scene:")} {getAssetLabel(activeAsset, isEnglish)}</p>
                      <button onClick={() => setSelectedTemplateId(template.id)} className="text-xs text-brand-gold underline">{t("تعديل إصدار جديد لهذا القالب", "Create a new version for this template")}</button>
                    </div>
                  </div>
                  <div className="border-t border-brand-gold/10 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-brand-cream/80">{t("سجل النسخ", "Version history")} ({versions.length})</h4>
                    <div className="space-y-3">
                      {versions.map((version) => (
                        <div key={version.id} className="rounded-xl border border-white/5 bg-black/20 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{t("الإصدار", "Version")} v{version.version}</span>
                            <span className={`rounded-full border px-2 py-1 text-[10px] ${STATUS_STYLES[version.status] ?? STATUS_STYLES.retired}`}>{isEnglish ? ({ draft: "Draft", approved: "Approved", active: "Active", retired: "Retired" }[version.status] ?? version.status) : (STATUS_LABELS[version.status] ?? version.status)}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-brand-cream/40">{getAssetLabel(version.config?.assetKey, isEnglish)} · {version.config?.defaultFormat === "horizontal" ? t("أفقي", "Horizontal") : t("رأسي", "Vertical")} · {version.config?.motion === "fade" ? t("تلاشي", "Fade") : t("حركة هادئة", "Gentle motion")}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={() => runPreview(version)} disabled={Boolean(busy)} className="rounded-lg border border-brand-gold/25 px-3 py-2 text-xs text-brand-gold disabled:opacity-40">{t("معاينة داخلية", "Internal preview")}</button>
                            {version.status === "draft" && <button onClick={() => approve(version)} disabled={Boolean(busy)} className="rounded-lg border border-sky-400/25 px-3 py-2 text-xs text-sky-200 disabled:opacity-40">{t("اعتماد المراجعة", "Approve review")}</button>}
                            {(version.status === "approved" || version.status === "retired") && (
                              <button onClick={() => activate(version)} disabled={Boolean(busy)} className="rounded-lg border border-emerald-400/25 px-3 py-2 text-xs text-emerald-200 disabled:opacity-40">{version.status === "retired" ? t("استرجاع الإصدار", "Restore version") : t("تفعيل الإصدار", "Activate version")}</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-brand-gold">{t("معاينات الرندر الأخيرة", "Recent render previews")}</h2>
        {data.previews.length === 0 ? <p className="text-sm text-brand-cream/45">{t("لا توجد معاينات محفوظة بعد.", "No saved previews yet.")}</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.previews.map((preview) => (
              <article key={preview.id} className="space-y-2 rounded-2xl border border-brand-gold/15 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-brand-cream">{preview.title}</h3>
                  <span className="text-xs text-brand-cream/50">{preview.status}</span>
                </div>
                {preview.video_url ? (
                  <video className="w-full rounded-xl bg-black" controls playsInline preload="metadata" src={preview.video_url} />
                ) : <p className="text-xs text-brand-cream/45">{preview.error_message || "{t("المعاينة قيد التجهيز. حدّث القائمة لاحقًا.", "The preview is being prepared. Refresh the list shortly.")}"}</p>}
                <p className="text-[10px] text-brand-cream/30" dir="ltr">{preview.id}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
