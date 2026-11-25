export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { PageBlocksView } from "@/features/site-content/components/page-blocks-view";
import { blocksToText, isCustomPagesEnabled } from "@/features/site-content/pages/page-blocks";
import { getCustomPage, listCustomPages, listPageVersions, type CustomPage, type CustomPageVersion } from "@/features/site-content/pages/page-store";
import {
  createCustomPageAction,
  publishCustomPageVersionAction,
  saveCustomPageVersionAction,
  unpublishCustomPageAction,
} from "./actions";

export const metadata: Metadata = { title: "منشئ الصفحات والمكونات | ZIKR OMNIS" };

const SAMPLE = "## عنوان القسم\n\nفقرة تعريفية.\n\n> ملاحظة بارزة\n\n- [القرآن الكريم](/quran)\n\n[[ابدأ الآن|/quran]]";

export default async function OmnisPagesPage({ searchParams }: { searchParams: Promise<{ id?: string; ok?: string; error?: string }> }) {
  await requireAdminPermission("system.manage");
  const { id, ok, error } = await searchParams;
  let pages: CustomPage[] = [];
  let loadError: string | null = null;
  try {
    pages = await listCustomPages();
  } catch {
    loadError = "تعذرت قراءة الصفحات. إن لم تُطبَّق ملفات الترحيل بعد فهذا متوقع.";
  }
  const selected = id && !loadError ? await getCustomPage(id).catch(() => null) : null;
  const versions: CustomPageVersion[] = selected ? await listPageVersions(selected.id).catch(() => []) : [];
  const latest = versions[0];
  const published = selected?.published_version != null ? versions.find((v) => v.version === selected.published_version) : undefined;

  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis/studio" className="text-xs text-brand-gold/70 hover:text-brand-gold">← استوديو الموقع والتطبيق</Link>
        <h1 className="text-3xl font-bold text-brand-gold">منشئ الصفحات والمكونات</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          صفحات من مكوّنات محددة (عنوان، فقرة، ملاحظة، قائمة روابط، صورة Cloudinary، زر). لا يوجد HTML خام. كل حفظ ينشئ نسخة جديدة، والنشر والتراجع يختاران نسخة موجودة. الصفحات العامة على /p/الرابط ({isCustomPagesEnabled() ? "مفعّلة" : "متوقفة حتى يُضبط CUSTOM_PAGES_ENABLED"}).
        </p>
      </header>

      {ok ? <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100/90">{ok}</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">{error}</p> : null}
      {loadError ? <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-100/85">{loadError}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-3">
          <h2 className="font-bold text-brand-gold">الصفحات</h2>
          <ul className="space-y-2 text-sm">
            {pages.map((page) => (
              <li key={page.id}>
                <Link href={`/admin/omnis/pages?id=${page.id}`} className="block rounded-xl border border-brand-gold/10 bg-black/15 p-3 hover:border-brand-gold/30">
                  <span className="font-semibold text-brand-cream">{page.title}</span>
                  <span className="mt-1 block font-mono text-xs text-brand-cream/40" dir="ltr">/p/{page.slug}</span>
                  <span className="mt-1 block text-xs text-brand-cream/50">{page.published_version ? `منشورة (نسخة ${page.published_version})` : "مسودة"}</span>
                </Link>
              </li>
            ))}
            {!pages.length && !loadError ? <li className="text-xs text-brand-cream/40">لا توجد صفحات بعد.</li> : null}
          </ul>

          <form action={createCustomPageAction} className="space-y-2 rounded-2xl border border-brand-gold/10 bg-black/15 p-4">
            <h3 className="text-sm font-bold text-brand-gold">صفحة جديدة</h3>
            <input name="slug" dir="ltr" placeholder="about-us" required className="w-full rounded-lg border border-brand-gold/15 bg-black/30 px-3 py-2 text-sm" />
            <input name="title" placeholder="العنوان" required maxLength={120} className="w-full rounded-lg border border-brand-gold/15 bg-black/30 px-3 py-2 text-sm" />
            <textarea name="content" defaultValue={SAMPLE} rows={8} required className="w-full rounded-lg border border-brand-gold/15 bg-black/30 px-3 py-2 font-mono text-xs" />
            <button type="submit" className="w-full rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-3 py-2 text-sm font-semibold text-brand-gold">إنشاء كمسودة</button>
          </form>
        </aside>

        <div className="space-y-5">
          {selected && latest ? (
            <>
              <h2 className="text-xl font-bold text-brand-gold">{selected.title} <span className="font-mono text-xs font-normal text-brand-cream/40" dir="ltr">/p/{selected.slug}</span></h2>
              <form action={saveCustomPageVersionAction} className="space-y-2">
                <input type="hidden" name="id" value={selected.id} />
                <label className="block text-xs text-brand-cream/50">المحتوى (آخر نسخة: {latest.version}). الصيغة: ## عنوان، &gt; ملاحظة، - [نص](رابط)، ![وصف](رابط Cloudinary)، [[نص الزر|رابط]]، وأي نص آخر فقرة. افصل المكوّنات بسطر فارغ.</label>
                <textarea name="content" defaultValue={blocksToText(latest.blocks)} rows={14} required className="w-full rounded-lg border border-brand-gold/15 bg-black/30 px-3 py-2 font-mono text-xs" />
                <button type="submit" className="rounded-xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-2 text-sm font-semibold text-brand-gold">حفظ كنسخة جديدة</button>
              </form>

              <section aria-label="المعاينة" className="space-y-2 rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
                <h3 className="text-sm font-bold text-brand-gold">معاينة آخر نسخة (غير منشورة)</h3>
                <PageBlocksView blocks={latest.blocks} />
              </section>

              <section aria-label="النسخ" className="space-y-2">
                <h3 className="text-sm font-bold text-brand-gold">النسخ</h3>
                <ul className="space-y-2 text-sm">
                  {versions.map((v) => (
                    <li key={v.version} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-gold/10 bg-black/15 p-3">
                      <span>نسخة {v.version} · {new Date(v.created_at).toLocaleString("ar-EG")} {selected.published_version === v.version ? "· منشورة" : ""}</span>
                      {selected.published_version !== v.version ? (
                        <form action={publishCustomPageVersionAction}>
                          <input type="hidden" name="id" value={selected.id} />
                          <input type="hidden" name="version" value={v.version} />
                          <button type="submit" className="rounded-lg border border-brand-gold/30 px-3 py-1 text-xs text-brand-gold">{selected.published_version !== null && v.version < selected.published_version ? "تراجع إلى هذه النسخة" : "نشر هذه النسخة"}</button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {selected.published_version !== null ? (
                  <form action={unpublishCustomPageAction}>
                    <input type="hidden" name="id" value={selected.id} />
                    <button type="submit" className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-200">إلغاء النشر</button>
                  </form>
                ) : null}
                {published ? <p className="text-xs text-brand-cream/40">المنشور حاليًا: نسخة {published.version}.</p> : null}
              </section>
            </>
          ) : (
            <p className="text-sm text-brand-cream/50">اختر صفحة من القائمة أو أنشئ صفحة جديدة.</p>
          )}
        </div>
      </section>
    </Container>
  );
}
