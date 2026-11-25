export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { buildCloudServiceChecks } from "@/features/admin/omnis/cloud-services";
import { assertSupabaseConnection } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "مركز الخدمات السحابية | ZIKR OMNIS" };

export default async function OmnisCloudPage() {
  await requireAdminPermission("system.manage");
  const checks = buildCloudServiceChecks(process.env);
  let dbReachable = false;
  try {
    dbReachable = (await assertSupabaseConnection()) === true;
  } catch {
    dbReachable = false;
  }
  return (
    <Container className="space-y-7 py-8 md:py-10" dir="rtl">
      <header className="space-y-3">
        <Link href="/admin/omnis" className="text-xs text-brand-gold/70 hover:text-brand-gold">← OMNIS</Link>
        <h1 className="text-3xl font-bold text-brand-gold">مركز الخدمات السحابية</h1>
        <p className="max-w-4xl text-sm leading-7 text-brand-cream/55">حالة إعداد Vercel وSupabase والتخزين للقراءة فقط. تُعرض حالة الإعداد ومعرّفات غير سرية فقط، ولا تُعرض أي قيم سرية. لا تغييرات من هنا. حالة GitHub وسير العمل في صفحة الصحة، والفروع وطلبات الدمج في مركز تطوير الكود.</p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.key} className="rounded-2xl border border-brand-gold/10 bg-black/15 p-4 text-sm">
            <p className="font-semibold text-brand-cream">{c.label}</p>
            <p className={c.ok ? "text-emerald-200/90" : "text-red-200/85"}>{c.ok ? "مضبوط" : "ناقص"}</p>
            <p className="mt-1 text-xs text-brand-cream/50" dir="auto">{c.detail}</p>
          </li>
        ))}
        <li className="rounded-2xl border border-brand-gold/10 bg-black/15 p-4 text-sm">
          <p className="font-semibold text-brand-cream">اتصال قاعدة البيانات</p>
          <p className={dbReachable ? "text-emerald-200/90" : "text-red-200/85"}>{dbReachable ? "متاح" : "تعذر الاتصال"}</p>
        </li>
      </ul>
    </Container>
  );
}
