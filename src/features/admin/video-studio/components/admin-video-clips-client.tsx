"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type ClipCategory = "quran" | "hadith" | "dua" | "adhkar" | "story" | "kids" | "general";
type Clip = {
  id: string;
  title: string;
  category: ClipCategory;
  audience: "general" | "kids";
  video_url: string;
  cloudinary_public_id: string;
  width: number;
  height: number;
  duration_seconds: number;
  audio_muted: boolean;
  source_kind: string;
  rights_license: string;
  rights_evidence: string;
  rights_reviewer: string;
  rights_reviewed_at: string;
  status: "pending" | "approved" | "retired";
  times_used: number;
  created_at: string;
};

type ClipForm = {
  title: string;
  category: ClipCategory;
  audience: "general" | "kids";
  videoUrl: string;
  cloudinaryPublicId: string;
  width: string;
  height: string;
  durationSeconds: string;
  sourceKind: "flow_manual" | "owned_original" | "stock_licensed" | "other_documented";
  rightsLicense: string;
  rightsEvidence: string;
  audioMuted: boolean;
};

const INITIAL_FORM: ClipForm = {
  title: "",
  category: "general",
  audience: "general",
  videoUrl: "",
  cloudinaryPublicId: "",
  width: "1080",
  height: "1920",
  durationSeconds: "8",
  sourceKind: "flow_manual",
  rightsLicense: "",
  rightsEvidence: "",
  audioMuted: false,
};

const CATEGORY_LABELS: Record<ClipCategory, string> = {
  quran: "القرآن الكريم",
  hadith: "الحديث",
  dua: "الأدعية",
  adhkar: "الأذكار",
  story: "القصص",
  kids: "الأطفال",
  general: "عام",
};

function errorMessage(value: unknown, fallback: string): string {
  if (value && typeof value === "object" && "error" in value && typeof value.error === "string") {
    return value.error;
  }
  return fallback;
}

export function AdminVideoClipsClient() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [form, setForm] = useState<ClipForm>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadClips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/video-clips", { cache: "no-store" });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(data, "تعذر تحميل مكتبة المقاطع."));
      const rows = data && typeof data === "object" && "clips" in data && Array.isArray(data.clips)
        ? data.clips as Clip[]
        : [];
      setClips(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل مكتبة المقاطع.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClips();
  }, [loadClips]);

  async function createClip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/video-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          width: Number(form.width),
          height: Number(form.height),
          durationSeconds: Number(form.durationSeconds),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(data, "تعذر حفظ المقطع."));
      setForm(INITIAL_FORM);
      setNotice("تم تسجيل المقطع بحالة «بانتظار المراجعة». لن يدخل التوليد قبل اعتماده.");
      await loadClips();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ المقطع.");
    } finally {
      setSaving(false);
    }
  }

  async function updateClip(id: string, action: "approve" | "retire") {
    setActiveAction(id + ":" + action);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/video-clips", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(data, "تعذر تحديث حالة المقطع."));
      setNotice(action === "approve" ? "تم اعتماد المقطع." : "تمت إحالة المقطع للتقاعد.");
      await loadClips();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "تعذر تحديث حالة المقطع.");
    } finally {
      setActiveAction(null);
    }
  }

  const pendingCount = clips.filter((clip) => clip.status === "pending").length;
  const approvedCount = clips.filter((clip) => clip.status === "approved").length;

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6" dir="rtl">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-brand-gold">VIDEO FACTORY V2</p>
        <h1 className="text-2xl font-bold text-brand-cream">مكتبة المقاطع الجاهزة</h1>
        <p className="max-w-3xl text-sm leading-7 text-brand-cream/70">
          سجّل المقاطع التي رفعتها يدويًا إلى Cloudinary، مثل مقاطع Google Flow. لا يتم رفع الفيديو من هذه الصفحة،
          ولا يدخل أي مقطع إلى التوليد قبل توثيق الحقوق واعتماده.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-brand-cream/10 bg-brand-cream/5 p-4">
          <p className="text-xs text-brand-cream/60">إجمالي السجلات</p>
          <p className="mt-1 text-2xl font-semibold text-brand-cream">{clips.length}</p>
        </div>
        <div className="rounded-xl border border-brand-cream/10 bg-brand-cream/5 p-4">
          <p className="text-xs text-brand-cream/60">بانتظار المراجعة</p>
          <p className="mt-1 text-2xl font-semibold text-brand-cream">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-brand-cream/10 bg-brand-cream/5 p-4">
          <p className="text-xs text-brand-cream/60">مقاطع معتمدة</p>
          <p className="mt-1 text-2xl font-semibold text-brand-cream">{approvedCount}</p>
        </div>
      </div>

      {error ? <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div> : null}
      {notice ? <div role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{notice}</div> : null}

      <form onSubmit={createClip} className="space-y-4 rounded-2xl border border-brand-cream/10 bg-brand-cream/[0.03] p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-brand-cream">تسجيل مقطع جديد</h2>
          <p className="mt-1 text-xs text-brand-cream/60">المطلوب رابط Cloudinary الأصلي ومعرّف Public ID المطابق له.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-brand-cream/80">
            <span>اسم المقطع</span>
            <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream" />
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80">
            <span>التصنيف</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ClipCategory, audience: e.target.value === "kids" ? "kids" : form.audience })} className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream">
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80">
            <span>الجمهور</span>
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as "general" | "kids" })} className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream">
              <option value="general">عام</option>
              <option value="kids">الأطفال</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80">
            <span>طريقة الحصول على المقطع</span>
            <select value={form.sourceKind} onChange={(e) => setForm({ ...form, sourceKind: e.target.value as ClipForm["sourceKind"] })} className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream">
              <option value="flow_manual">Google Flow – رفع يدوي</option>
              <option value="owned_original">أصل مملوك لـ ZIKR</option>
              <option value="stock_licensed">مخزون بترخيص</option>
              <option value="other_documented">مصدر موثق آخر</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80 sm:col-span-2">
            <span>رابط الفيديو من Cloudinary</span>
            <input required type="url" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://res.cloudinary.com/..." className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-left text-brand-cream" dir="ltr" />
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80 sm:col-span-2">
            <span>Cloudinary Public ID</span>
            <input required value={form.cloudinaryPublicId} onChange={(e) => setForm({ ...form, cloudinaryPublicId: e.target.value })} placeholder="folder/clip-name" className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-left text-brand-cream" dir="ltr" />
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80">
            <span>العرض بالبكسل</span>
            <input required type="number" min={720} max={3840} value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream" dir="ltr" />
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80">
            <span>الارتفاع بالبكسل</span>
            <input required type="number" min={720} max={3840} value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream" dir="ltr" />
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80">
            <span>المدة بالثواني</span>
            <input required type="number" min={2} max={60} step="0.1" value={form.durationSeconds} onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })} className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream" dir="ltr" />
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80">
            <span>الترخيص</span>
            <input required maxLength={200} value={form.rightsLicense} onChange={(e) => setForm({ ...form, rightsLicense: e.target.value })} placeholder="ملكية أصلية / شروط Flow / اسم الترخيص" className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream" />
          </label>
          <label className="space-y-1 text-sm text-brand-cream/80 sm:col-span-2">
            <span>مرجع إثبات الحقوق</span>
            <textarea required maxLength={500} rows={2} value={form.rightsEvidence} onChange={(e) => setForm({ ...form, rightsEvidence: e.target.value })} placeholder="رابط الشروط أو رقم التصدير أو مرجع إثبات الملكية" className="w-full rounded-lg border border-brand-cream/15 bg-black/20 px-3 py-2 text-brand-cream" />
          </label>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-brand-cream/10 p-3 text-sm text-brand-cream/80">
          <input type="checkbox" required checked={form.audioMuted} onChange={(e) => setForm({ ...form, audioMuted: e.target.checked })} className="mt-1" />
          <span>أؤكد أن ملف الفيديو نفسه مكتوم الصوت؛ سيُضاف مسار التعليق الصوتي المعتمد منفصلًا أثناء التركيب.</span>
        </label>
        <button type="submit" disabled={saving} className="rounded-lg bg-brand-gold px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
          {saving ? "جارٍ الحفظ..." : "حفظ بانتظار المراجعة"}
        </button>
      </form>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-brand-cream">سجل المقاطع</h2>
          <button type="button" onClick={() => void loadClips()} disabled={loading} className="rounded-lg border border-brand-cream/15 px-3 py-2 text-sm text-brand-cream disabled:opacity-50">
            {loading ? "جارٍ التحديث..." : "تحديث القائمة"}
          </button>
        </div>
        {loading ? <p className="text-sm text-brand-cream/60">جارٍ تحميل المقاطع...</p> : clips.length === 0 ? <p className="rounded-xl border border-brand-cream/10 p-4 text-sm text-brand-cream/60">لا توجد مقاطع مسجلة حتى الآن.</p> : (
          <div className="space-y-3">
            {clips.map((clip) => (
              <article key={clip.id} className="rounded-xl border border-brand-cream/10 bg-brand-cream/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold text-brand-cream">{clip.title}</h3>
                    <p className="text-xs text-brand-cream/60">{CATEGORY_LABELS[clip.category]} · {clip.audience === "kids" ? "الأطفال" : "عام"} · {clip.width}×{clip.height} · {clip.duration_seconds}s</p>
                    <p className="break-all text-xs text-brand-cream/50" dir="ltr">{clip.cloudinary_public_id}</p>
                    <p className="text-xs text-brand-cream/60">الحقوق: {clip.rights_license} · المراجع: {clip.rights_reviewer}</p>
                    <p className="text-xs text-brand-cream/60">الاستخدام: {clip.times_used} · الحالة: {clip.status === "approved" ? "معتمد" : clip.status === "pending" ? "بانتظار المراجعة" : "متقاعد"}</p>
                  </div>
                  <div className="flex gap-2">
                    {clip.status === "pending" ? (
                      <button type="button" onClick={() => void updateClip(clip.id, "approve")} disabled={activeAction !== null} className="rounded-lg bg-brand-gold px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">
                        {activeAction === clip.id + ":approve" ? "جارٍ الاعتماد..." : "اعتماد"}
                      </button>
                    ) : null}
                    {clip.status !== "retired" ? (
                      <button type="button" onClick={() => void updateClip(clip.id, "retire")} disabled={activeAction !== null} className="rounded-lg border border-red-300/30 px-3 py-2 text-xs text-red-200 disabled:opacity-50">
                        {activeAction === clip.id + ":retire" ? "جارٍ التقاعد..." : "إحالة للتقاعد"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
