import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookmarkButton } from "@/features/quran/components/bookmark-button";
import { MushafBookmark } from "@/features/quran/components/mushaf-bookmark";
import { QuranAudioPlayer } from "@/features/quran/components/audio-player";
import { MarkSurahRead } from "@/features/quran/components/mark-surah-read";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  getSurahMetaFromDb,
  getSurahFromDb,
} from "@/features/quran/services/quran-server";
import { getFavoritedRefs } from "@/app/favorites/actions";
import { getReadingProgress } from "@/features/quran/actions";
import { Badge } from "@/components/ui/badge";
import { pageMetadata } from "@/lib/site";
import { getRequestLocale } from "@/lib/i18n/server";

export const revalidate = 3600; // Surah page cache

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surah: string }>;
}): Promise<Metadata> {
  const [p, locale] = await Promise.all([params, getRequestLocale()]);
  const isEnglish = locale === "en";
  const id = Number.parseInt(p.surah, 10);
  if (Number.isNaN(id)) return { title: isEnglish ? "Surah" : "سورة", description: isEnglish ? "Quran reading and recitation" : "قراءة واستماع" };

  // Metadata must not load the complete ayah list. This keeps SEO requests cheap
  // and avoids a duplicate, timeout-prone Quran query before page rendering.
  const surahMeta = await getSurahMetaFromDb(id, locale);

  if (!surahMeta) return { title: isEnglish ? `Surah ${id}` : `سورة ${id}`, description: isEnglish ? "Quran data is temporarily unavailable" : "بيانات القرآن غير متاحة حاليًا" };

  return pageMetadata({
    title: isEnglish ? surahMeta.name : `سورة ${surahMeta.name}`,
    description: isEnglish ? "Read the Quran with its Arabic text and a clearly attributed English translation." : "قراءة وتفسير واستماع",
    path: `/quran/${id}`,
    noindex: false,
  });
}

export default async function SurahPage({
  params,
}: {
  params: Promise<{ surah: string }>;
}) {
  const [p, locale] = await Promise.all([params, getRequestLocale()]);
  const isEnglish = locale === "en";
  const dir = isEnglish ? "ltr" : "rtl";
  const id = Number.parseInt(p.surah, 10);
  if (Number.isNaN(id)) return notFound();

  const result = await getSurahFromDb(id, locale);
  if (!result) return notFound();

  // Batch-fetch all favorite states + reading progress in parallel
  const allRefs = result.ayahs.map(
    a => `quran:${result!.surah.number}:${a.numberInSurah}`
  );
  const [favoritedRefs, readingProgress] = await Promise.all([
    getFavoritedRefs(allRefs, "quran"),
    getReadingProgress(result.surah.number),
  ]);

  return (
    <Container className="space-y-6 py-8 sm:py-12" dir={dir}>
      <nav className="text-sm text-brand-cream/55">
        <Link href="/">{isEnglish ? "Home" : "الرئيسية"}</Link> / <Link href="/quran">{isEnglish ? "Quran" : "القرآن"}</Link> / {result.surah.name}
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-brand-gold/55">{isEnglish ? "The Noble Quran" : "القرآن الكريم"}</p>
            <h1 className="text-3xl font-bold text-brand-gold sm:text-4xl">
              {isEnglish ? result.surah.name : `سورة ${result.surah.name}`}
            </h1>
            {isEnglish ? <p className="text-sm text-brand-cream/50">{result.surah.englishName} · {result.surah.englishNameTranslation}</p> : null}
          </div>
          <Badge variant="outline" className="px-4 py-1 text-base">
            {result.surah.numberOfAyahs} {isEnglish ? "verses" : "آية"}
          </Badge>
        </div>
        {isEnglish ? (
          <div className="rounded-xl border border-brand-gold/15 bg-black/15 p-4 text-sm leading-6 text-brand-cream/70" dir="ltr">
            <strong className="text-brand-gold">English translation:</strong> The Meaning of the Glorious Koran, Marmaduke Pickthall (1930), edition <code>en.pickthall</code>. Arabic remains the canonical source text. Verses without an available English entry remain visible in Arabic.
          </div>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <MarkSurahRead
          surahId={result.surah.number}
          lastAyah={result.surah.numberOfAyahs}
        />
        <Link href="/wird" className="text-sm text-brand-gold hover:underline">
          {isEnglish ? "My daily wird and completion plan" : "وردي اليومي وختمتي"}
        </Link>
      </div>

      <QuranAudioPlayer surahId={result.surah.number} />

      {result.surah.number !== 1 && result.surah.number !== 9 ? (
        <div
          className="py-2 text-center font-arabic text-3xl leading-loose text-brand-gold"
          aria-label="البسملة"
          dir="rtl"
        >
          بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
        </div>
      ) : null}

      {result.ayahs.length === 0 ? (
        <Card className="p-8 text-center arabic-muted">
          لا توجد آيات متاحة لهذه السورة حاليًا.
        </Card>
      ) : (
        <div className="space-y-6">
          {result.ayahs.map(ayah => (
            <Card
              key={ayah.numberInSurah}
              id={`ayah-${ayah.numberInSurah}`}
              className="p-6 hover:shadow-md transition-shadow scroll-mt-24"
            >
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 text-right">
                    <p className="text-3xl leading-loose font-arabic" dir="rtl">
                      {ayah.textAr ?? ayah.text}
                      <span className="inline-flex items-center justify-center w-10 h-10 mr-4 rounded-full border-2 border-brand-gold text-sm font-bold text-brand-gold">
                        {ayah.numberInSurah}
                      </span>
                    </p>
                    {isEnglish ? (
                      <div className="mt-4 rounded-xl bg-brand-emerald/10 p-4 text-left" dir="ltr">
                        {ayah.translationAvailable && ayah.textEn ? (
                          <p className="text-base leading-8 text-brand-cream/85 sm:text-lg">{ayah.textEn}</p>
                        ) : (
                          <p role="status" className="text-sm leading-6 text-brand-cream/55">
                            English translation is not available for this verse yet. The original Arabic verse is shown above.
                          </p>
                        )}
                        {ayah.textEnEdition === "en.pickthall" ? (
                          <p className="mt-2 text-[11px] text-brand-cream/40">Marmaduke Pickthall · en.pickthall</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-muted flex-wrap">
                  <BookmarkButton
                    keyRef={`quran:${result.surah.number}:${ayah.numberInSurah}`}
                    itemType="quran"
                    initialSaved={favoritedRefs.has(
                      `quran:${result.surah.number}:${ayah.numberInSurah}`
                    )}
                  />
                  <MushafBookmark
                    surahId={result.surah.number}
                    ayahNumber={ayah.numberInSurah}
                    surahName={result.surah.name}
                    isCurrentBookmark={
                      readingProgress?.ayah_number === ayah.numberInSurah
                    }
                  />
                  <Link
                    className="text-sm text-brand-gold hover:underline"
                    href={`/quran/${result.surah.number}/${ayah.numberInSurah}`}
                  >
                    {isEnglish ? "Tafsir and details" : "التفسير والتفاصيل"}
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Container>
  );
}
