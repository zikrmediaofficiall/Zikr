import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookmarkButton } from '@/features/quran/components/bookmark-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { getAyahFromDb, getSurahMetaFromDb, getTafsirRecordFromDb } from '@/features/quran/services/quran-server';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { ShareButton } from '@/components/ui/share-button';
import { pageMetadata } from '@/lib/site';
import { parsePositiveIntegerRouteSegment } from '@/lib/route-params';
import { getRequestLocale } from '@/lib/i18n/server';

export const revalidate = 3600;

interface AyahPageProps {
  params: Promise<{ surah: string; ayah: string }>;
}

export async function generateMetadata({ params }: AyahPageProps): Promise<Metadata> {
  const [p, locale] = await Promise.all([params, getRequestLocale()]);
  const isEnglish = locale === "en";
  const dir = isEnglish ? "ltr" : "rtl";
  const surahId = parsePositiveIntegerRouteSegment(p.surah);
  const ayahId = parsePositiveIntegerRouteSegment(p.ayah);

  const surahMeta = surahId !== null && ayahId !== null && surahId <= 114
    ? await getSurahMetaFromDb(surahId, locale)
    : null;
  
  return pageMetadata({
    title: surahMeta && ayahId !== null
      ? (isEnglish ? `${surahMeta.name} · Verse ${ayahId}` : `سورة ${surahMeta.name} - الآية ${ayahId}`)
      : (isEnglish ? `Verse ${p.ayah}` : `الآية ${p.ayah}`),
    description: isEnglish ? "Read the Arabic verse and its attributed English translation." : 'عرض الآية وتفسيرها من داخل صفحة السورة في منصة ذِكرٌ.',
    path: `/quran/${p.surah}/${p.ayah}`,
    // Individual verses are useful detail screens, but the complete surah is
    // the public SEO landing page. Avoid flooding the index with thousands of
    // near-duplicate detail URLs.
    noindex: true,
  });
}

export default async function AyahPage({ params }: AyahPageProps) {
  const [p, locale] = await Promise.all([params, getRequestLocale()]);
  const isEnglish = locale === "en";
  const dir = isEnglish ? "ltr" : "rtl";
  const surahId = parsePositiveIntegerRouteSegment(p.surah);
  const ayahId = parsePositiveIntegerRouteSegment(p.ayah);

  if (surahId === null || surahId > 114 || ayahId === null) return notFound();

  const [dbSurahMeta, dbAyah, dbTafsirRecord] = await Promise.all([
    getSurahMetaFromDb(surahId, locale),
    getAyahFromDb(surahId, ayahId, locale),
    getTafsirRecordFromDb(surahId, ayahId),
  ]);

  const surahMeta = dbSurahMeta;
  const ayah = dbAyah;
  const tafsir = isEnglish ? dbTafsirRecord?.tafsir_en ?? null : dbTafsirRecord?.tafsir_ar ?? null;
  const tafsirSource = dbTafsirRecord?.source_url ?? null;
  const tafsirAuthor = dbTafsirRecord?.author ?? (isEnglish ? "Tafsir source" : "التفسير الميسر");
  const tafsirRetrievedAt = dbTafsirRecord?.retrieved_at ?? null;

  
  if (!surahMeta || !ayah) return notFound();

  return (
    <Container className='space-y-8 py-8 sm:py-12 max-w-4xl' dir={dir}>
      <div className="flex justify-between items-center">
        <nav className='arabic-muted text-sm'>
          <Link href='/'>{isEnglish ? "Home" : "الرئيسية"}</Link> / <Link href='/quran'>{isEnglish ? "Quran" : "القرآن"}</Link> /{' '}
          <Link href={`/quran/${surahMeta.number}`}>{isEnglish ? surahMeta.name : `سورة ${surahMeta.name}`}</Link> / {isEnglish ? "Verse" : "الآية"} {ayah.numberInSurah}
        </nav>
        <Link href={`/quran/${surahMeta.number}`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="ml-2 h-4 w-4" />
            {isEnglish ? "Back to surah" : "العودة للسورة"}
          </Button>
        </Link>
      </div>

      <Card className="shadow-lg border-brand-gold/20">
        <CardHeader className="text-center bg-muted/30 border-b">
          <CardTitle className="text-2xl text-brand-gold">
            {isEnglish ? `${surahMeta.name} — Verse ${ayah.numberInSurah}` : `سورة ${surahMeta.name} — الآية ${ayah.numberInSurah}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-10">
          <p className='text-4xl leading-loose text-right font-arabic' dir="rtl">
            {ayah.textAr ?? ayah.text}
          </p>
          {isEnglish ? (
            <div className="mt-6 rounded-xl bg-brand-emerald/10 p-4 text-left" dir="ltr">
              {ayah.translationAvailable && ayah.textEn ? (
                <>
                  <p className="text-lg leading-8 text-brand-cream/85">{ayah.textEn}</p>
                  {ayah.textEnEdition === "en.pickthall" ? <p className="mt-2 text-xs text-brand-cream/45">Marmaduke Pickthall · en.pickthall</p> : null}
                </>
              ) : <p className="text-sm text-brand-cream/55">English translation is not available for this verse yet. The Arabic text remains visible.</p>}
            </div>
          ) : null}

          <div className='mt-8 flex items-center justify-between pt-6 border-t'>
            <div className="flex gap-4">
              <BookmarkButton keyRef={`quran:${surahId}:${ayah.numberInSurah}`} itemType="quran" />
              <ShareButton
                title={isEnglish ? `${surahMeta.name} — Verse ${ayah.numberInSurah}` : `سورة ${surahMeta.name} — الآية ${ayah.numberInSurah}`}
                text={isEnglish && ayah.translationAvailable ? String(ayah.textEn) : (ayah.textAr ?? ayah.text)}
                label={isEnglish ? "Share" : "مشاركة"}
                sharedLabel={isEnglish ? "Share options opened." : "تم فتح خيارات المشاركة."}
                copiedLabel={isEnglish ? "Verse text and link copied." : "تم نسخ نص الآية والرابط."}
                errorLabel={isEnglish ? "Unable to share or copy this verse." : "تعذرت مشاركة الآية أو نسخ الرابط."}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {isEnglish ? `Juz ${ayah.juz} | Page ${ayah.page}` : `الجزء ${ayah.juz} | الصفحة ${ayah.page}`}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-brand-gold border-r-4 border-brand-gold pr-4">{isEnglish ? "Tafsir" : "التفسير الميسر"}</h2>
        <Card>
          <CardContent className="p-8">
            {tafsir ? (
              <>
                <p className="text-xl leading-relaxed text-right arabic-muted" dir={isEnglish ? "ltr" : "rtl"}>
                  {tafsir}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground" dir="rtl">
                  <span>{isEnglish ? "Author:" : "المؤلف:"} {tafsirAuthor}</span>
                  {tafsirRetrievedAt ? <span>{isEnglish ? "Retrieved:" : "تاريخ الجلب:"} {new Date(tafsirRetrievedAt).toLocaleDateString(isEnglish ? 'en' : 'ar-EG')}</span> : null}
                  {tafsirSource ? (
                    <a href={tafsirSource} target="_blank" rel="noreferrer" className="text-brand-gold underline underline-offset-4">
                      {isEnglish ? "Source" : "رابط المصدر"}
                    </a>
                  ) : null}
                </div>
              </>
            ) : (
              <p role="status" className="text-center text-muted-foreground italic">{isEnglish ? "No English tafsir is recorded for this verse yet." : "لا يتوفر تفسير مسجل لهذه الآية حالياً."}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
