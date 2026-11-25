export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { SITE_CATALOG } from "@/lib/navigation/catalog";

export const metadata: Metadata = {
  title: "استوديو الموقع والتطبيق | ZIKR OMNIS",
  description: "عرض بنية الموقع والقوائم والأقسام وروابط إدارة التطبيق في مكان واحد.",
};

const STUDIO_LINKS = [
  { href: "/admin/sections", label: "أقسام الموقع وظهورها", note: "إدارة ظهور الأقسام في الصفحة الرئيسية." },
  { href: "/admin/omnis/pages", label: "منشئ الصفحات والمكونات", note: "صفحات من مكونات محددة بنسخ ومعاينة ونشر وتراجع." },
  { href: "/admin/settings", label: "الإعدادات المركزية", note: "إعدادات typed بنسخ وتراجع." },
  { href: "/admin/android", label: "تطبيق Android", note: "الإصدارات والتوقيع والروابط وجاهزية النشر." },
  { href: "/admin/seo", label: "SEO والفهرسة", note: "بيانات الصفحات المنظمة والخرائط." },
] as const;

export default async function OmnisSiteStudioPage() {
  await requireAdminPermission("system.manage");
  const totalItems = SITE_CATALOG.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← العودة إلى مركز القيادة</Link>
        <h1 className="text-3xl font-bold text-brand-gold">استوديو الموقع والتطبيق</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          عرض للقراءة فقط لبنية القوائم والصفحات المعرفة في الكود ({SITE_CATALOG.length} مجموعة و{totalItems} صفحة). التعديل يتم من الأدوات المالكة أدناه حتى يبقى لكل إعداد مصدر حقيقة واحد وسجل تدقيق.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="أدوات الإدارة">
        {STUDIO_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-xl border border-brand-gold/10 bg-black/15 p-4 transition hover:border-brand-gold/30">
            <p className="font-semibold text-brand-gold">{item.label}</p>
            <p className="mt-2 text-xs leading-6 text-brand-cream/50">{item.note}</p>
          </Link>
        ))}
      </section>

      <section className="space-y-4" aria-label="بنية القوائم">
        <h2 className="text-lg font-bold text-brand-gold">بنية القوائم</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {SITE_CATALOG.map((group) => (
            <article key={group.id} className="rounded-2xl border border-brand-gold/10 bg-black/15 p-5">
              <h3 className="font-bold text-brand-cream">{group.ar} <span className="text-xs font-normal text-brand-cream/40" dir="ltr">{group.en}</span></h3>
              <p className="mt-1 text-xs leading-6 text-brand-cream/45">{group.descriptionAr}</p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {group.items.map((item) => (
                  <li key={item.href} className="flex items-center justify-between gap-3 border-b border-brand-gold/5 pb-1.5 last:border-0">
                    <span className="text-brand-cream/75">{item.ar}</span>
                    <Link href={item.href} className="font-mono text-brand-gold/70 hover:text-brand-gold" dir="ltr">{item.href}</Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </Container>
  );
}
