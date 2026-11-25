export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import inventory from "@/features/admin/omnis/db-inventory.generated.json";

export const metadata: Metadata = { title: "استوديو قاعدة البيانات والـ API | ZIKR OMNIS" };

export default async function OmnisDatabaseStudioPage() {
  await requireAdminPermission("system.manage");
  const noPolicy = inventory.tables.filter((t) => t.policies === 0);
  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← OMNIS</Link>
        <h1 className="text-3xl font-bold text-brand-gold">استوديو قاعدة البيانات والـ API</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">
          جرد ثابت مولَّد من ملفات الترحيل ومسارات API في المستودع (للقراءة فقط، لا اتصال بقاعدة البيانات الحية). {inventory.migrationCount} ترحيلًا، آخرها {inventory.latestMigration}.
          الجرد يعكس الملفات وليس حالة التطبيق الحية؛ ملفات OMNIS الجديدة قد لا تكون مطبّقة بعد. التحديث: node scripts/generate-db-inventory.mjs.
        </p>
      </header>
      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">الجداول ({inventory.tables.length})</h2>
        <p className="text-xs text-brand-cream/50">{noPolicy.length} جدولًا بلا سياسات RLS (وصول عبر مفتاح الخدمة فقط): {noPolicy.map((t) => t.table).join("، ")}</p>
        <div className="overflow-x-auto rounded-2xl border border-brand-gold/10">
          <table className="w-full text-sm">
            <thead className="bg-black/30 text-xs text-brand-cream/50"><tr><th className="p-2 text-right">الجدول</th><th className="p-2 text-right">أُنشئ في</th><th className="p-2 text-right">RLS</th><th className="p-2 text-right">السياسات</th></tr></thead>
            <tbody>
              {inventory.tables.map((t) => (
                <tr key={t.table} className="border-t border-brand-gold/5">
                  <td className="p-2 font-mono" dir="ltr">{t.table}</td>
                  <td className="p-2 font-mono text-xs text-brand-cream/50" dir="ltr">{t.createdIn}</td>
                  <td className="p-2">{t.rls ? "نعم" : "لا"}</td>
                  <td className="p-2">{t.policies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-2">
        <h2 className="font-bold text-brand-gold">مسارات API ({inventory.routes.length})</h2>
        <ul className="grid gap-1 text-xs sm:grid-cols-2">
          {inventory.routes.map((r) => (
            <li key={r.path} className="rounded-lg border border-brand-gold/10 bg-black/15 p-2"><span className="font-mono" dir="ltr">{r.path}</span> <span className="text-brand-cream/50">{r.methods.join(" ")}</span></li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
