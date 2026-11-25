export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { SITE_CATALOG } from "@/lib/navigation/catalog";
import { BRAND_TOKENS, DEFAULT_BRAND_COLORS, SITE_EXPERIENCE_KEY, THEME_PRESETS, contrastRatio, parseSiteExperience } from "@/lib/omnis/site-experience";
import { saveLabelAction, saveThemeAction } from "./actions";

export const metadata: Metadata = { title: "تجربة الموقع | ZIKR OMNIS" };

const input = "w-full rounded-lg border border-brand-gold/15 bg-black/30 px-3 py-2 text-sm";
const btn = "rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 text-xs font-semibold text-brand-gold";

export default async function ExperiencePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdminPermission("system.manage");
  const { ok, error } = await searchParams;
  let setting = parseSiteExperience(null);
  try {
    const rows = await supabaseServerAdminRequest<Array<{ value?: unknown }>>(`/rest/v1/site_settings?key=eq.${SITE_EXPERIENCE_KEY}&select=value&limit=1`, { method: "GET" });
    setting = parseSiteExperience(rows?.[0]?.value);
  } catch { /* show defaults */ }
  const colors = setting.colors ?? DEFAULT_BRAND_COLORS;
  const items = SITE_CATALOG.flatMap((g) => g.items);
  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← OMNIS</Link>
        <h1 className="text-3xl font-bold text-brand-gold">تجربة الموقع: الثيمات والتسميات</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          يغيّر ألوان العلامة (الزمردي والذهبي والكريمي) المستخدمة عبر فئات brand في الموقع، ويعيد تسمية روابط القوائم. لا يُحفظ ثيم لا يحقق حدود التباين (النص الفاتح 7:1 على الخلفية، والذهبي 4.5:1). ألوان مكتوبة مباشرة داخل بعض الصفحات لا تتغير، والرجوع للافتراضي بضغطة. الظهور والترتيب من <Link href="/admin/sections" className="underline">/admin/sections</Link>.
        </p>
      </header>
      {ok ? <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm">{ok}</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm">{error}</p> : null}
      <section className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <h2 className="font-bold text-brand-gold">ثيمات جاهزة</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(THEME_PRESETS).map(([id, p]) => (
            <form key={id} action={saveThemeAction} className="space-y-2 rounded-xl border border-brand-gold/10 p-3">
              <input type="hidden" name="preset" value={id} />
              <div className="flex gap-1">{BRAND_TOKENS.map((t) => <span key={t} className="h-6 w-6 rounded" style={{ background: p.colors[t] }} />)}</div>
              <p className="text-sm">{p.label}</p>
              <p className="text-xs text-brand-cream/45">تباين النص: {contrastRatio(p.colors.cream, p.colors.emeraldDeep).toFixed(1)}:1</p>
              <button className={btn}>{id === "default" ? "رجوع للافتراضي" : "تطبيق"}</button>
            </form>
          ))}
        </div>
        <form action={saveThemeAction} className="grid gap-2 md:grid-cols-3">
          <input type="hidden" name="preset" value="custom" />
          {BRAND_TOKENS.map((t) => (
            <label key={t} className="space-y-1 text-xs">{t}
              <input name={`color_${t}`} dir="ltr" defaultValue={colors[t]} pattern="#[0-9A-Fa-f]{6}" className={input} />
            </label>
          ))}
          <div className="md:col-span-3"><button className={btn}>حفظ ألوان مخصصة</button></div>
        </form>
      </section>
      <section className="space-y-3 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
        <h2 className="font-bold text-brand-gold">تسميات القوائم</h2>
        <p className="text-xs text-brand-cream/50">تظهر في القائمة العلوية وقائمة الجوال. اترك الحقلين فارغين للرجوع للاسم الأصلي (حتى 40 حرفًا، بدون روابط أو رموز).</p>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.href}>
              <form action={saveLabelAction} className="grid items-center gap-2 md:grid-cols-[10rem_1fr_1fr_auto]">
                <input type="hidden" name="href" value={item.href} />
                <span dir="ltr" className="text-xs text-brand-cream/50">{item.href}</span>
                <input name="ar" defaultValue={setting.labels[item.href]?.ar ?? ""} placeholder={item.ar} maxLength={40} className={input} />
                <input name="en" dir="ltr" defaultValue={setting.labels[item.href]?.en ?? ""} placeholder={item.en} maxLength={40} className={input} />
                <button className={btn}>حفظ</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
