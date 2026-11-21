"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavGroup } from "@/features/admin/components/admin-sidebar";

const SPECIAL_LABELS: Record<string, string> = {
  "/admin/security/step-up": "التحقق الإضافي",
};

export function AdminRouteBreadcrumbs({ groups }: { groups: AdminNavGroup[] }) {
  const pathname = usePathname();
  if (!pathname || pathname === "/admin") return null;

  const candidates = groups.flatMap((group) =>
    group.items.map((item) => ({ group, item })),
  );
  const match = candidates
    .filter(({ item }) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.item.href.length - a.item.href.length)[0];

  if (!match) return null;

  const isExact = pathname === match.item.href;
  const currentLabel = isExact ? match.item.label : SPECIAL_LABELS[pathname] ?? "تفاصيل";
  const parentItem = isExact ? null : match.item;
  const showParent = Boolean(parentItem && parentItem.href !== pathname && parentItem.href !== "/admin");
  const showGroup = match.group.group !== currentLabel;

  return (
    <nav
      aria-label="مسار التنقل الإداري"
      dir="rtl"
      className="flex flex-wrap items-center gap-2 border-b border-brand-gold/8 px-4 py-3 text-xs text-brand-cream/45 sm:px-6 lg:px-8"
    >
      <Link href="/admin" className="transition hover:text-brand-gold">لوحة الإدارة</Link>
      {showGroup ? (
        <>
          <span aria-hidden="true">/</span>
          <span className="text-brand-cream/55">{match.group.group}</span>
        </>
      ) : null}
      {showParent ? (
        <>
          <span aria-hidden="true">/</span>
          <Link href={parentItem!.href} className="transition hover:text-brand-gold">{parentItem!.label}</Link>
        </>
      ) : null}
      <span aria-hidden="true">/</span>
      <span className="font-medium text-brand-cream/75" aria-current="page">{currentLabel}</span>
    </nav>
  );
}
