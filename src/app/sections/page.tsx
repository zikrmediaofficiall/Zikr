import Link from "next/link";
import { Container } from "@/components/ui/container";
import { ArrowLeft, ArrowUpLeft, ChevronLeft, type LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { SITE_CATALOG, getCatalogItemKey } from "@/lib/navigation/catalog";
import { getSectionVisibility, getSectionDisplayOrder } from "@/features/site-content/services/site-content";
import { getRequestLocale } from "@/lib/i18n/server";

type SearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function resolveIcon(name: string): LucideIcon {
  const candidate = (Icons as unknown as Record<string, unknown>)[name];
  return (typeof candidate === "function" || (typeof candidate === "object" && candidate !== null))
    ? candidate as LucideIcon
    : Icons.Circle;
}

const toneClasses: Record<string, string> = {
  quran: "border-emerald-400/20 bg-emerald-950/30 hover:border-emerald-300/45",
  sunnah: "border-violet-300/20 bg-violet-950/20 hover:border-violet-200/45",
  worship: "border-sky-300/20 bg-sky-950/20 hover:border-sky-200/45",
  history: "border-amber-300/20 bg-amber-950/20 hover:border-amber-200/45",
  media: "border-rose-300/20 bg-rose-950/20 hover:border-rose-200/45",
  kids: "border-cyan-300/20 bg-cyan-950/20 hover:border-cyan-200/45",
  tools: "border-slate-300/20 bg-slate-900/30 hover:border-slate-200/45",
  learning: "border-teal-300/20 bg-teal-950/20 hover:border-teal-200/45",
};

export const metadata = {
  title: "دليل أقسام ذِكر | ZIKR",
  description: "خريطة منظمة وقابلة للبحث لجميع أقسام منصة ذِكر.",
};

export default async function SectionsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const [params, locale, visibility, sectionOrder] = await Promise.all([
    searchParams ?? Promise.resolve({}),
    getRequestLocale(),
    getSectionVisibility(),
    getSectionDisplayOrder(),
  ]);
  const isEnglish = locale === "en";
  const dir = isEnglish ? "ltr" : "rtl";
  const query = firstParam(params.q).trim();
  const selectedGroup = firstParam(params.group);
  const normalizedQuery = query.toLocaleLowerCase(isEnglish ? "en" : "ar");
  const orderIndex = new Map(sectionOrder.map((key, index) => [key, index]));

  const visibleGroups = SITE_CATALOG
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) =>
          visibility[getCatalogItemKey(item.href)] !== false &&
          (!normalizedQuery || [
            item.ar,
            item.en,
            item.descriptionAr,
            item.descriptionEn,
            group.ar,
            group.en,
          ].some((value) => value.toLocaleLowerCase(isEnglish ? "en" : "ar").includes(normalizedQuery))),
        )
        .sort((a, b) => (orderIndex.get(getCatalogItemKey(a.href)) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(getCatalogItemKey(b.href)) ?? Number.MAX_SAFE_INTEGER)),
    }))
    .filter((group) => group.items.length > 0 && (!selectedGroup || group.id === selectedGroup))
    .sort((a, b) => {
      const aOrder = Math.min(...a.items.map((item) => orderIndex.get(getCatalogItemKey(item.href)) ?? Number.MAX_SAFE_INTEGER));
      const bOrder = Math.min(...b.items.map((item) => orderIndex.get(getCatalogItemKey(item.href)) ?? Number.MAX_SAFE_INTEGER));
      return aOrder - bOrder;
    });

  const totalVisibleItems = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);
  const totalVisibleGroups = visibleGroups.length;
  const searchSuffix = query ? "&q=" + encodeURIComponent(query) : "";

  return (
    <Container className="py-8 sm:py-12" dir={dir}>
      <section className="relative overflow-hidden rounded-[2rem] border border-brand-gold/20 bg-[radial-gradient(circle_at_80%_0%,rgba(199,168,107,0.16),transparent_34%),linear-gradient(135deg,#0b3329,#061b15)] p-6 sm:p-10">
        <div className="relative max-w-5xl">
          <span className="inline-flex items-center rounded-full border border-brand-gold/20 bg-black/20 px-3 py-1 text-xs text-brand-gold">
            {isEnglish ? "Explore ZIKR" : "خريطة المنصة"}
          </span>
          <h1 className="mt-4 text-3xl font-bold text-brand-gold sm:text-5xl">
            {isEnglish ? "Find the right place to start" : "كل ذِكر في مكانه الصحيح"}
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-8 text-brand-cream/75 sm:text-base">
            {isEnglish
              ? "Browse the platform by topic, search by title or description, and open a focused path without navigating through duplicate links."
              : "استكشف المنصة حسب الموضوع، وابحث باسم القسم أو وصفه، وافتح المسار المناسب دون قوائم طويلة أو روابط مكررة."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-brand-cream/60">
            <span className="rounded-full border border-brand-gold/15 bg-black/15 px-3 py-1.5">
              {totalVisibleGroups} {isEnglish ? "groups" : "مجموعات ظاهرة"}
            </span>
            <span className="rounded-full border border-brand-gold/15 bg-black/15 px-3 py-1.5">
              {totalVisibleItems} {isEnglish ? "available paths" : "مسارات متاحة"}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-brand-gold/15 bg-black/15 p-4 sm:p-5" aria-label={isEnglish ? "Search sections" : "البحث في الأقسام"}>
        <form action="/sections" method="get" className="flex flex-col gap-2 sm:flex-row">
          {selectedGroup ? <input type="hidden" name="group" value={selectedGroup} /> : null}
          <label htmlFor="sections-search" className="sr-only">{isEnglish ? "Search sections" : "ابحث في الأقسام"}</label>
          <input
            id="sections-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={isEnglish ? "Search Quran, hadith, audio, stories..." : "ابحث عن القرآن أو الحديث أو الصوتيات أو القصص..."}
            className="min-h-12 min-w-0 flex-1 rounded-xl border border-brand-gold/15 bg-black/25 px-4 text-sm text-brand-cream outline-none placeholder:text-brand-cream/35 focus:border-brand-gold/45"
          />
          <button type="submit" className="min-h-12 rounded-xl bg-brand-gold px-6 py-3 text-sm font-bold text-brand-emeraldDeep transition hover:bg-brand-goldSoft">
            {isEnglish ? "Search" : "بحث"}
          </button>
          {query || selectedGroup ? (
            <Link href="/sections" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brand-gold/20 px-4 text-sm text-brand-cream/65 hover:border-brand-gold/40 hover:text-brand-gold">
              {isEnglish ? "Clear filters" : "مسح التصفية"}
            </Link>
          ) : null}
        </form>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={isEnglish ? "Filter by group" : "تصفية حسب المجموعة"}>
          <Link href={"/sections?q=" + encodeURIComponent(query)} aria-current={!selectedGroup ? "true" : undefined} className={"shrink-0 rounded-full border px-3 py-2 text-xs transition " + (!selectedGroup ? "border-brand-gold/40 bg-brand-gold/10 text-brand-gold" : "border-brand-gold/10 text-brand-cream/55 hover:border-brand-gold/30")}>
            {isEnglish ? "All groups" : "كل الأقسام"}
          </Link>
          {SITE_CATALOG.filter((group) => group.items.some((item) => visibility[getCatalogItemKey(item.href)] !== false)).map((group) => (
            <Link
              key={group.id}
              href={"/sections?group=" + encodeURIComponent(group.id) + searchSuffix}
              aria-current={selectedGroup === group.id ? "true" : undefined}
              className={"shrink-0 rounded-full border px-3 py-2 text-xs transition " + (selectedGroup === group.id ? "border-brand-gold/40 bg-brand-gold/10 text-brand-gold" : "border-brand-gold/10 text-brand-cream/55 hover:border-brand-gold/30")}
            >
              {isEnglish ? group.en : group.ar}
            </Link>
          ))}
        </div>
      </section>

      {visibleGroups.length ? (
        <div className="mt-9 space-y-10">
          {visibleGroups.map((group) => {
            const GroupIcon = resolveIcon(group.icon);
            return (
              <section id={group.id} key={group.id} aria-labelledby={group.id + "-heading"} className="scroll-mt-24">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-brand-gold">
                      <GroupIcon className="h-5 w-5" aria-hidden="true" />
                      <span className="text-xs font-semibold tracking-[0.18em] text-brand-gold/60">{group.en}</span>
                    </div>
                    <h2 id={group.id + "-heading"} className="mt-2 text-2xl font-bold text-brand-gold">
                      {isEnglish ? group.en : group.ar}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-brand-cream/65">
                      {isEnglish ? group.descriptionEn : group.descriptionAr}
                    </p>
                  </div>
                  <span className="hidden rounded-full border border-brand-cream/10 px-3 py-1 text-xs text-brand-cream/55 sm:inline-flex">
                    {group.items.length} {isEnglish ? "paths" : "مسارات"}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => {
                    const ItemIcon = resolveIcon(item.icon);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={"group rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5 " + (toneClasses[item.tone] ?? toneClasses.tools)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/15 text-brand-gold">
                            <ItemIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <ChevronLeft className="mt-1 h-4 w-4 text-brand-cream/35 transition-transform group-hover:-translate-x-1 group-hover:text-brand-gold" aria-hidden="true" />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-brand-cream group-hover:text-brand-gold">{isEnglish ? item.en : item.ar}</h3>
                        <p className="mt-2 text-sm leading-7 text-brand-cream/60">{isEnglish ? item.descriptionEn : item.descriptionAr}</p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-brand-gold/15 bg-black/15 p-8 text-center">
          <h2 className="text-lg font-bold text-brand-gold">{isEnglish ? "No matching sections" : "لا توجد أقسام مطابقة"}</h2>
          <p className="mt-2 text-sm leading-7 text-brand-cream/55">
            {isEnglish ? "Try a different search or clear the group filter." : "جرّب عبارة بحث أخرى أو امسح تصفية المجموعة."}
          </p>
          <Link href="/sections" className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-brand-gold/25 px-4 text-sm text-brand-gold hover:bg-brand-gold/10">
            {isEnglish ? "Show all sections" : "عرض كل الأقسام"}
          </Link>
        </div>
      )}

      <section className="mt-12 rounded-2xl border border-brand-gold/15 bg-brand-gold/5 p-5 sm:p-7">
        <h2 className="text-xl font-bold text-brand-gold">{isEnglish ? "One clear home for every feature" : "قاعدة التنظيم"}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-brand-cream/70">
          {isEnglish
            ? "Related features stay together in one place. Sections hidden by the platform administrators are removed from public navigation until they are enabled again."
            : "الوظائف المتشابهة تجتمع في مسار واحد. والأقسام التي يخفيها مديرو المنصة تختفي من دليل التصفح والقوائم العامة حتى إعادة تفعيلها."}
        </p>
      </section>
    </Container>
  );
}
