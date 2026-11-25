import Link from "next/link";
import { Download, Settings } from "lucide-react";
import { Container } from "@/components/ui/container";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { MobileNav } from "./mobile-nav";
import { AuthNavActions } from "./auth-nav-actions";
import { LanguageToggle } from "./language-toggle";
import { LanguageAwareNav, type NavLink } from "./language-aware-nav";
import { getRequestLocale } from "@/lib/i18n/server";
import { getCatalogItem, getCatalogItemKey } from "@/lib/navigation/catalog";

const PRIMARY_NAVIGATION_HREFS = [
  "/quran",
  "/adhkar",
  "/prayer-times",
  "/stories",
  "/audio",
  "/kids",
] as const;

const links: NavLink[] = [
  ...PRIMARY_NAVIGATION_HREFS.map((href) => {
    const item = getCatalogItem(href);
    return {
      href,
      label: item?.ar ?? href,
      labelEn: item?.en ?? href,
      icon: item?.icon,
    };
  }),
  { href: "/sections", label: "كل الأقسام", labelEn: "All sections", icon: "Grid3X3" },
];

export async function Navbar({ hiddenHrefs = [], sectionOrder = [], labelOverrides = {} }: { hiddenHrefs?: string[]; sectionOrder?: string[]; labelOverrides?: Record<string, { ar?: string; en?: string }> }) {
  const locale = await getRequestLocale();
  const isEnglish = locale === "en";
  const hidden = new Set(hiddenHrefs);
  const orderIndex = new Map(sectionOrder.map((key, index) => [key, index]));
  const visibleLinks = links.filter((link) => !hidden.has(link.href)).map((link) => ({ ...link, label: labelOverrides[link.href]?.ar ?? link.label, labelEn: labelOverrides[link.href]?.en ?? link.labelEn })).sort((a, b) => (orderIndex.get(getCatalogItemKey(a.href)) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(getCatalogItemKey(b.href)) ?? Number.MAX_SAFE_INTEGER));
  let user = null;
  let isAdmin = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        isAdmin = profile?.role === "admin";
      }
    } catch (error) {
      console.error("[navbar] Auth lookup failed:", error);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-gold/15 bg-brand-emeraldDeep/95 backdrop-blur-md">
      <Container className="flex min-h-16 items-center justify-between gap-3 py-2">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2"
          aria-label={isEnglish ? "ZIKR - Home" : "ذِكرٌ - الرئيسية"}
        >
          <span className="text-2xl font-bold tracking-tight text-brand-gold transition-opacity group-hover:opacity-80">
            {isEnglish ? "ZIKR" : "ذِكرٌ"}
          </span>
          <span className="hidden pt-1 font-mono text-xs tracking-widest text-brand-gold/55 sm:block">
            ZIKR
          </span>
        </Link>

        <LanguageAwareNav links={visibleLinks} />

        <Link
          href="/api/download/android"
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-brand-gold px-3 py-2 text-xs font-bold text-black transition hover:bg-brand-gold/90 lg:inline-flex"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {isEnglish ? "Download app" : "تحميل التطبيق"}
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageToggle />
          <Link
            href="/settings"
            aria-label={isEnglish ? "Settings" : "الإعدادات"}
            className="rounded-xl p-2 text-brand-cream/75 transition-colors hover:bg-brand-gold/8 hover:text-brand-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold"
          >
            <Settings className="h-5 w-5" aria-hidden="true" />
          </Link>
          <MobileNav isAuthenticated={Boolean(user)} hiddenHrefs={hiddenHrefs} sectionOrder={sectionOrder} labelOverrides={labelOverrides} />
          <AuthNavActions initialUser={user} initialIsAdmin={isAdmin} />
        </div>
      </Container>
    </header>
  );
}
