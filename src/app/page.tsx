import Link from 'next/link';
import { cookies } from 'next/headers';
import { Container } from '@/components/ui/container';
import { getSiteSetting, getSectionVisibility, getSectionDisplayOrder } from '@/features/site-content/services/site-content';
import { getArticles } from '@/features/articles/services/articles';
import { getVideos } from '@/features/videos/services/videos';
import { HomeInteractive } from '@/features/home/components/home-interactive';
import { SITE_CATALOG, CATALOG_ITEMS, getCatalogItemKey } from '@/lib/navigation/catalog';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AndroidReleaseCard from '@/components/platform/android-release-card';

export const dynamic = 'force-dynamic';

const QUICK_ACTIONS = [
  { href: '/quran', ar: 'القرآن', en: 'Quran', icon: 'BookOpen', tone: 'قراءة وتلاوة', toneEn: 'Read and listen' },
  { href: '/hadith', ar: 'الحديث', en: 'Hadith', icon: 'ScrollText', tone: 'السنة والمصادر', toneEn: 'Sunnah and sources' },
  { href: '/adhkar', ar: 'الأذكار', en: 'Adhkar', icon: 'Sparkles', tone: 'الورد اليومي', toneEn: 'Daily remembrance' },
  { href: '/prayer-times', ar: 'الصلاة', en: 'Prayer', icon: 'Clock3', tone: 'المواقيت والتنبيهات', toneEn: 'Times and alerts' },
  { href: '/audio', ar: 'الصوت', en: 'Audio', icon: 'Headphones', tone: 'أذان وذكر وتلاوات', toneEn: 'Adhan, dhikr, recitations' },
  { href: '/kids', ar: 'الأطفال', en: 'Kids', icon: 'Gamepad2', tone: 'تعلم ولعب', toneEn: 'Learn and play' },
] as const;

const DAILY_TOOLS = [
  { href: '/wird', ar: 'الورد اليومي', en: 'Daily Wird', icon: 'Sun', text: 'خطة بسيطة للقراءة والذكر والاستمرارية.', textEn: 'Build a steady reading and remembrance routine.' },
  { href: '/qibla', ar: 'القبلة', en: 'Qibla', icon: 'Navigation', text: 'حدد اتجاه القبلة من جهازك.', textEn: 'Find the Qibla direction using your device.' },
  { href: '/memorization', ar: 'الحفظ', en: 'Memorization', icon: 'Brain', text: 'قسّم الحفظ والمراجعة إلى جلسات قابلة للمتابعة.', textEn: 'Organize memorization and revision into trackable sessions.' },
  { href: '/tasbeeh', ar: 'التسبيح', en: 'Tasbeeh', icon: 'CircleDot', text: 'عداد بسيط للذكر مع حفظ التقدم على جهازك.', textEn: 'A simple remembrance counter that keeps your progress on this device.' },
  { href: '/offline-library', ar: 'المكتبة بلا إنترنت', en: 'Offline Library', icon: 'Download', text: 'ارجع للمحتوى المحفوظ عند ضعف الاتصال.', textEn: 'Return to saved resources when your connection is limited.' },
] as const;

const GUIDED_PATHS = [
  {
    href: '/quran',
    ar: 'ابدأ بالقرآن',
    en: 'Start with Quran',
    textAr: 'اقرأ أو استمع ثم افتح التفسير عند الحاجة، بدون تشتيت بين أكثر من مسار.',
    textEn: 'Read or listen, then open tafsir when you need context without losing the flow.',
    icon: 'BookOpen',
  },
  {
    href: '/adhkar',
    ar: 'ثبّت وردك اليومي',
    en: 'Build a daily practice',
    textAr: 'اجعل أذكار الصباح والمساء والورد اليومي نقطة ثابتة في يومك.',
    textEn: 'Make morning, evening adhkar and your daily wird part of a consistent routine.',
    icon: 'Sparkles',
  },
  {
    href: '/memorization',
    ar: 'ابنِ خطة حفظ',
    en: 'Build a memorization plan',
    textAr: 'قسّم الحفظ والمراجعة إلى جلسات قصيرة يمكن متابعتها وتطويرها.',
    textEn: 'Break memorization and review into short sessions you can track and improve.',
    icon: 'Brain',
  },
] as const;

function safeSocialUrl(value: string | null | undefined, allowedHosts: readonly string[]): string | null {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || !allowedHosts.some((allowed) => host === allowed || host.endsWith('.' + allowed))) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveIcon(name: string): LucideIcon {
  const candidate = (Icons as unknown as Record<string, unknown>)[name];
  return (typeof candidate === 'function' || (typeof candidate === 'object' && candidate !== null)) ? (candidate as LucideIcon) : Icons.Circle;
}

function formatVideoDuration(seconds: number | undefined): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function safeThumbnailBackground(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString().replace(/"/g, '%22') : null;
  } catch {
    return null;
  }
}

const dailyVerse = 'إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ';

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = cookieStore.get('zikr-locale')?.value === 'en' ? 'en' : 'ar';
  const isEnglish = locale === 'en';
  const dir = isEnglish ? 'ltr' : 'rtl';
  const [homepageSetting, socialSetting, sectionVisibility, sectionOrder] = await Promise.all([
    getSiteSetting('homepage'),
    getSiteSetting('social'),
    getSectionVisibility(),
    getSectionDisplayOrder(),
  ]);
  const isSectionVisible = (href: string) => sectionVisibility[getCatalogItemKey(href)] !== false;
  const orderIndex = new Map(sectionOrder.map((key, index) => [key, index]));
  const bySectionOrder = <T extends { href: string }>(items: T[]) => [...items].sort((a, b) => (orderIndex.get(getCatalogItemKey(a.href)) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(getCatalogItemKey(b.href)) ?? Number.MAX_SAFE_INTEGER));
  const socialChannels = [
    {
      key: 'facebook',
      label: 'Facebook',
      url: safeSocialUrl(socialSetting?.facebookPageUrl, ['facebook.com']),
      descriptionAr: 'تابع المنشورات والتحديثات اليومية.',
      descriptionEn: 'Follow daily posts and updates.',
    },
    {
      key: 'youtube',
      label: 'YouTube',
      url: safeSocialUrl(socialSetting?.youtubeChannelUrl, ['youtube.com', 'youtu.be']),
      descriptionAr: 'شاهد الفيديوهات والتلاوات والمحتوى المرئي.',
      descriptionEn: 'Watch videos, recitations and visual content.',
    },
    {
      key: 'instagram',
      label: 'Instagram',
      url: safeSocialUrl(socialSetting?.instagramUrl, ['instagram.com']),
      descriptionAr: 'تابع الصور والمقاطع القصيرة.',
      descriptionEn: 'Follow photos and short-form updates.',
    },
    {
      key: 'x',
      label: 'X',
      url: safeSocialUrl(socialSetting?.xUrl ?? socialSetting?.twitterUrl, ['x.com', 'twitter.com']),
      descriptionAr: 'تابع الأخبار والتنبيهات المختصرة.',
      descriptionEn: 'Follow short updates and announcements.',
    },
  ].filter((channel): channel is typeof channel & { url: string } => Boolean(channel.url));
  const showPrayerTimes = homepageSetting?.showPrayerTimes !== false && isSectionVisible('/prayer-times');
  const showQuickStart = homepageSetting?.showQuickStart !== false;
  const showJourneys = homepageSetting?.showJourneys !== false;
  const showGuidedPaths = homepageSetting?.showGuidedPaths !== false;
  const showEditorialLibrary = homepageSetting?.showEditorialLibrary !== false && isSectionVisible('/articles');
  const showDailyTools = homepageSetting?.showDailyTools !== false;
  const showDailyVerse = homepageSetting?.showDailyVerse !== false && isSectionVisible('/quran');
  const showFeaturedVideos = isSectionVisible('/videos');
  const homeTitle =
    !isEnglish && homepageSetting?.title?.trim()
      ? homepageSetting.title.trim()
      : 'ذِكرٌ';
  const homeBody =
    !isEnglish && homepageSetting?.body?.trim()
      ? homepageSetting.body.trim()
      : isEnglish
        ? 'A focused Islamic knowledge and worship platform.'
        : 'منصة إسلامية مرتبة للقراءة والذكر والتعلّم والعمل.';

  const visibleQuickActions = bySectionOrder(QUICK_ACTIONS.filter(item => {
    if (!isSectionVisible(item.href)) return false;
    if (item.href === '/quran') return homepageSetting?.showQuran !== false;
    if (item.href === '/hadith') return homepageSetting?.showHadith !== false;
    return true;
  }));
  const visibleDailyTools = bySectionOrder(DAILY_TOOLS.filter((item) => isSectionVisible(item.href)));
  const visibleGuidedPaths = bySectionOrder(GUIDED_PATHS.filter((item) => isSectionVisible(item.href)));

  // The public catalog is the same source used by navigation and admin visibility controls.
  const visibleGroups = SITE_CATALOG
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => isSectionVisible(item.href))
        .sort((a, b) => (orderIndex.get(getCatalogItemKey(a.href)) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(getCatalogItemKey(b.href)) ?? Number.MAX_SAFE_INTEGER)),
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => {
      const aOrder = Math.min(...a.items.map((item) => orderIndex.get(getCatalogItemKey(item.href)) ?? Number.MAX_SAFE_INTEGER));
      const bOrder = Math.min(...b.items.map((item) => orderIndex.get(getCatalogItemKey(item.href)) ?? Number.MAX_SAFE_INTEGER));
      return aOrder - bOrder;
    });

  const [articles, featuredVideos] = await Promise.all([
    getArticles(undefined, 9),
    getVideos(undefined, 4),
  ]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-emeraldDeep text-brand-cream">
      <section
        className="relative overflow-hidden border-b border-brand-gold/15 bg-[radial-gradient(circle_at_50%_8%,rgba(199,168,107,0.18),transparent_34%),radial-gradient(circle_at_12%_44%,rgba(14,75,69,0.36),transparent_28%),linear-gradient(180deg,#06140f_0%,#0A2A1E_55%,#072e2a_100%)]"
        aria-label={isEnglish ? 'Home page' : 'الصفحة الرئيسية'}
      >
        <Container className="relative z-10 pb-8 pt-8 sm:pb-12 sm:pt-12">
          <div className="mx-auto grid w-full min-w-0 max-w-6xl grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(300px,0.92fr)]" dir={dir}>
            <div className="w-full min-w-0 text-center lg:text-right">
            <p className="text-xs font-semibold tracking-[0.22em] text-brand-gold/50">
              {isEnglish ? 'ZIKR PLATFORM' : 'منصة ذِكر'}
            </p>
            <div
              className="mx-auto my-4 h-px w-28 bg-gradient-to-r from-transparent via-brand-gold/45 to-transparent"
              aria-hidden="true"
            />
            <h1
              className="text-5xl font-bold text-brand-gold sm:text-7xl"
              style={{ fontFamily: 'var(--font-amiri), var(--font-noto-arabic)' }}
            >
              {homeTitle}
            </h1>
            <p
              className="mx-auto mt-4 w-full min-w-0 max-w-3xl break-words text-base leading-8 text-brand-cream/65 sm:text-lg"
              style={{ fontFamily: 'var(--font-amiri), var(--font-noto-arabic)' }}
            >
              {homeBody}
            </p>
            <form action="/search" method="get" role="search" className="mx-auto mt-7 w-full min-w-0 max-w-3xl" dir={dir}>
              <label htmlFor="home-search" className="sr-only">
                {isEnglish ? 'Search ZIKR' : 'البحث في ذِكر'}
              </label>
              <div className="flex gap-2 rounded-2xl border border-brand-gold/20 bg-black/20 p-1.5 shadow-[0_14px_50px_rgba(0,0,0,0.16)]">
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  placeholder={isEnglish ? 'Search Quran, hadith, stories…' : 'ابحث في القرآن، الحديث، القصص…'}
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-brand-cream outline-none placeholder:text-brand-cream/35"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl bg-brand-gold px-5 py-3 text-sm font-bold text-brand-emeraldDeep transition hover:bg-brand-goldSoft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
                >
                  {isEnglish ? 'Search' : 'بحث'}
                </button>
              </div>
            </form>
            <div className="mt-5 flex w-full min-w-0 flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href="/sections" className="inline-flex w-full max-w-full justify-center break-words rounded-xl bg-brand-gold px-5 py-3 text-center text-sm font-bold text-brand-emeraldDeep shadow-lg shadow-black/15 transition hover:bg-brand-goldSoft sm:w-auto">
                {isEnglish ? 'Explore all sections' : 'استكشف كل أقسام ذِكر'}
              </Link>
              <Link href="/wird" className="inline-flex w-full max-w-full justify-center break-words rounded-xl border border-brand-gold/30 bg-black/15 px-5 py-3 text-center text-sm font-semibold text-brand-cream transition hover:border-brand-gold/60 hover:text-brand-gold sm:w-auto">
                {isEnglish ? 'Start a daily routine' : 'ابدأ وردك اليومي'}
              </Link>
            </div>
            <div className="mt-5 flex w-full min-w-0 flex-wrap justify-center gap-2 text-[11px] text-brand-cream/50 lg:justify-start">
              {[isEnglish ? 'Quran and verified references' : 'قرآن ومراجع قابلة للتحقق', isEnglish ? 'Reading, audio and daily tools' : 'قراءة وصوت وأدوات يومية', isEnglish ? 'A focused Kids experience' : 'تجربة مخصصة للأطفال'].map((item) => (
                <span key={item} className="rounded-full border border-brand-gold/10 bg-black/15 px-3 py-1.5">{item}</span>
              ))}
            </div>
            </div>
            <div className="relative mx-auto w-full min-w-0 max-w-[320px] sm:max-w-[380px] lg:max-w-[440px]">
              <div
                aria-hidden="true"
                className="aspect-[9/10] rounded-[2rem] border border-brand-gold/20 bg-[#0b251d] bg-center bg-no-repeat shadow-[0_28px_90px_rgba(0,0,0,.36)]"
                style={{
                  backgroundImage: "linear-gradient(180deg,rgba(4,18,13,.02),rgba(4,18,13,.4)),url('/banners/homepage/home-visual.svg')",
                  backgroundSize: "100% 100%, contain",
                  backgroundRepeat: "no-repeat, no-repeat",
                  backgroundPosition: "center, center",
                }}
              />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-brand-gold/25 bg-[#061610]/85 p-4 shadow-xl backdrop-blur-sm sm:inset-x-6 sm:bottom-6">
                <p className="text-[10px] font-semibold tracking-[0.2em] text-brand-gold/60">{isEnglish ? "A CALMER WAY TO LEARN" : "معرفة وذكر في تجربة واحدة"}</p>
                <p className="mt-2 break-words text-lg font-bold leading-8 text-brand-cream sm:text-xl">{isEnglish ? "Read, listen, reflect and keep your daily practice close." : "اقرأ، واستمع، وتدبّر، واجعل وردك اليومي أقرب إليك."}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-brand-cream/70">
                  <span className="rounded-full border border-brand-gold/20 px-3 py-1.5">{isEnglish ? "Quran" : "القرآن"}</span>
                  <span className="rounded-full border border-brand-gold/20 px-3 py-1.5">{isEnglish ? "Knowledge" : "المعرفة"}</span>
                  <span className="rounded-full border border-brand-gold/20 px-3 py-1.5">{isEnglish ? "Daily practice" : "الورد اليومي"}</span>
                </div>
              </div>
              <div className="absolute -top-3 left-5 rounded-xl border border-brand-gold/25 bg-[#0b2b22]/95 px-4 py-2 text-xs font-semibold text-brand-gold shadow-lg sm:left-8">{isEnglish ? "Explore at your own pace" : "اكتشف على مهل"}</div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-brand-gold/10 px-3 py-7 sm:px-4 sm:py-9">
        <Container className="max-w-5xl">
          <AndroidReleaseCard />
        </Container>
      </section>

      <main>
        <section
          className="border-b border-brand-gold/10 px-3 py-8 sm:px-4 sm:py-10"
          aria-labelledby="quick-start-heading"
          hidden={!showQuickStart || visibleQuickActions.length === 0}
        >
          <Container>
            <div className="mb-5 flex items-end justify-between gap-4" dir={dir}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/45">
                  {isEnglish ? 'Quick start' : 'ابدأ بسرعة'}
                </p>
                <h2 id="quick-start-heading" className="mt-2 text-2xl font-bold text-brand-gold">
                  {isEnglish ? 'The six most useful entry points' : 'أهم ستة مداخل في المنصة'}
                </h2>
              </div>
              <Link href="/sections" className="text-sm text-brand-gold/65 hover:text-brand-gold">
                {isEnglish ? 'All sections' : 'كل الأقسام'}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {visibleQuickActions.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group min-h-40 rounded-2xl border border-brand-gold/15 bg-gradient-to-br from-white/[.035] to-black/25 p-4 text-center shadow-[0_12px_32px_rgba(0,0,0,.12)] transition duration-200 hover:-translate-y-1 hover:border-brand-gold/40 hover:shadow-[0_18px_42px_rgba(0,0,0,.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
                  dir={dir}
                >
                  {(() => {
                    const ActionIcon = resolveIcon(action.icon);
                    return <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-gold/15 bg-brand-gold/5 text-brand-gold" aria-hidden="true"><ActionIcon className="h-6 w-6" /></span>;
                  })()}
                  <h3 className="mt-3 font-bold text-brand-cream group-hover:text-brand-gold">
                    {isEnglish ? action.en : action.ar}
                  </h3>
                  <p className="mt-1 text-[11px] leading-5 text-brand-cream/40">
                    {isEnglish ? action.toneEn : action.tone}
                  </p>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <section className="border-b border-brand-gold/10 px-3 py-6 sm:px-4 sm:py-8" aria-label={isEnglish ? "Local time and prayer times" : "الوقت ومواقيت الصلاة"}>
          <Container>
            <HomeInteractive locale={locale} showPrayerTimes={showPrayerTimes} />
          </Container>
        </section>

        <section
          className="border-b border-brand-gold/10 bg-[#061d18]/80 px-3 py-9 sm:px-4 sm:py-12"
          aria-labelledby="featured-videos-heading"
          hidden={!showFeaturedVideos || featuredVideos.length === 0}
          style={{ contentVisibility: 'auto', containIntrinsicSize: '0 560px' }}
        >
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4" dir={dir}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/50">{isEnglish ? 'Watch and listen' : 'شاهد واستمع'}</p>
                <h2 id="featured-videos-heading" className="mt-2 text-2xl font-bold text-brand-gold">{isEnglish ? 'Recently published videos' : 'أحدث الفيديوهات المنشورة'}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-brand-cream/55">{isEnglish ? 'Explore recent visual content from the ZIKR library, with a clear path to the original page.' : 'تعرّف على أحدث المحتوى المرئي في مكتبة ذِكر، وافتح صفحة كل فيديو لمراجعة تفاصيله ومصدره.'}</p>
              </div>
              <Link href="/videos" className="rounded-xl border border-brand-gold/25 px-4 py-2.5 text-sm font-semibold text-brand-gold transition hover:bg-brand-gold/10">{isEnglish ? 'All videos' : 'كل الفيديوهات'}</Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {featuredVideos.map((video) => {
                const thumbnail = safeThumbnailBackground(video.thumbnailUrl);
                const duration = formatVideoDuration(video.duration);
                return (
                  <Link key={video.id} href={'/videos/' + video.slug} className="group overflow-hidden rounded-2xl border border-brand-gold/15 bg-black/25 shadow-[0_16px_42px_rgba(0,0,0,.2)] transition duration-200 hover:-translate-y-1 hover:border-brand-gold/45 hover:shadow-[0_22px_54px_rgba(0,0,0,.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold" dir={dir}>
                    <div className="relative aspect-[9/12] overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(199,168,107,.22),transparent_35%),linear-gradient(145deg,#10372d,#07140f)]" style={thumbnail ? { backgroundImage: `linear-gradient(180deg,rgba(3,15,11,.02)_15%,rgba(3,15,11,.92)_100%),url("${thumbnail}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/5 transition group-hover:from-black/65" />
                      <span className="absolute right-3 top-3 rounded-full border border-brand-gold/25 bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-brand-gold/90">{isEnglish ? 'Published' : 'منشور'}</span>
                      {duration ? <span className="absolute left-3 top-3 rounded-md bg-black/65 px-2 py-1 text-[11px] font-semibold text-white tabular-nums">{duration}</span> : null}
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <h3 className="line-clamp-2 text-base font-bold leading-7 text-white group-hover:text-brand-gold">{video.title}</h3>
                        {video.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">{video.description}</p> : null}
                        <p className="mt-3 text-[11px] font-semibold text-brand-gold/85">{isEnglish ? 'Watch video' : 'مشاهدة الفيديو'} ←</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>

        <section
          className="border-b border-brand-gold/10 px-3 py-9 sm:px-4 sm:py-12"
          aria-labelledby="journeys-heading"
          hidden={!showJourneys || visibleGroups.length === 0}
        >
          <Container>
            <div dir={dir}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/45">
                {isEnglish ? 'Organized journeys' : 'مسارات مرتبة'}
              </p>
              <h2 id="journeys-heading" className="mt-2 text-2xl font-bold text-brand-gold">
                {isEnglish ? 'Choose a subject, not a pile of links' : 'اختر مسارًا بدل قائمة روابط طويلة'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-brand-cream/55">
                {isEnglish
                  ? 'All eight main groups are visible here. Open any group to browse the complete directory of related sections.'
                  : 'المجموعات الثماني ظاهرة هنا، ولكل مجموعة روابط أساسية، ويمكنك فتح دليل الأقسام لرؤية جميع المسارات.'}
              </p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {visibleGroups.map(group => (
                <article
                  key={group.id}
                  className="rounded-3xl border border-brand-gold/14 bg-brand-emerald/18 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.14)] sm:p-6"
                  dir={dir}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      {(() => {
                        const GroupIcon = resolveIcon(group.icon);
                        return <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-gold/15 bg-brand-gold/5 text-brand-gold" aria-hidden="true"><GroupIcon className="h-6 w-6" /></span>;
                      })()}
                      <h3 className="mt-3 text-xl font-bold text-brand-gold">
                        {isEnglish ? group.en : group.ar}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-brand-cream/55">
                        {isEnglish ? group.descriptionEn : group.descriptionAr}
                      </p>
                    </div>
                    <Link
                      href={'/sections#' + group.id}
                      className="shrink-0 rounded-xl border border-brand-gold/20 px-3 py-2 text-xs text-brand-gold/70 hover:border-brand-gold/40 hover:text-brand-gold"
                    >
                      {isEnglish ? 'Explore' : 'استكشف'}
                    </Link>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {group.items.slice(0, 3).map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="rounded-2xl border border-brand-gold/10 bg-black/15 p-3 hover:border-brand-gold/30"
                      >
                        <div className="flex items-center gap-2">
                          {(() => {
                            const ItemIcon = resolveIcon(item.icon);
                            return <ItemIcon className="h-4 w-4 shrink-0 text-brand-gold/80" aria-hidden="true" />;
                          })()}
                          <p className="text-sm font-bold text-brand-cream">{isEnglish ? item.en : item.ar}</p>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-brand-cream/45">
                          {isEnglish ? item.descriptionEn : item.descriptionAr}
                        </p>
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>


        <section
          className="border-b border-brand-gold/10 bg-brand-emerald/6 px-3 py-9 sm:px-4 sm:py-12"
          aria-labelledby="guided-heading"
          hidden={!showGuidedPaths || visibleGuidedPaths.length === 0}
        >
          <Container>
            <div className="flex items-end justify-between gap-4" dir={dir}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/55">
                  {isEnglish ? 'Guided starts' : 'بدايات مقترحة'}
                </p>
                <h2 id="guided-heading" className="mt-2 text-2xl font-bold text-brand-gold">
                  {isEnglish ? 'Choose the next step that fits you' : 'اختار الخطوة التالية المناسبة لك'}
                </h2>
              </div>
              <Link href="/platform" className="text-sm text-brand-gold/70 transition hover:text-brand-gold">
                {isEnglish ? 'How ZIKR works' : 'كيف تعمل ذِكر'}
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {visibleGuidedPaths.map(path => (
                <Link
                  key={path.href}
                  href={path.href}
                  className="group rounded-3xl border border-brand-gold/13 bg-black/12 p-5 transition hover:-translate-y-0.5 hover:border-brand-gold/35"
                  dir={dir}
                >
                  {(() => {
                    const PathIcon = resolveIcon(path.icon);
                    return <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-brand-gold/15 bg-brand-gold/5 text-brand-gold" aria-hidden="true"><PathIcon className="h-6 w-6" /></span>;
                  })()}
                  <h3 className="mt-4 text-lg font-bold text-brand-cream group-hover:text-brand-gold">
                    {isEnglish ? path.en : path.ar}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-brand-cream/55">
                    {isEnglish ? path.textEn : path.textAr}
                  </p>
                  <span className="mt-4 inline-block text-xs font-semibold text-brand-gold/65">
                    {isEnglish ? 'Open path →' : 'ابدأ المسار ←'}
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <section
          className="border-b border-brand-gold/10 bg-[#0a332b]/45 px-3 py-9 sm:px-4 sm:py-12"
          aria-labelledby="editorial-heading"
          hidden={!showEditorialLibrary}
          style={{ contentVisibility: 'auto', containIntrinsicSize: '0 560px' }}
        >
          <Container>
            <div className="flex items-end justify-between gap-4" dir={dir}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/45">
                  {isEnglish ? 'Editorial library' : 'المكتبة التحريرية'}
                </p>
                <h2 id="editorial-heading" className="mt-2 text-2xl font-bold text-brand-gold">
                  {isEnglish ? 'New material to read and revisit' : 'محتوى جديد للقراءة والمراجعة'}
                </h2>
              </div>
              <Link href="/articles" className="text-sm text-brand-gold/65 hover:text-brand-gold">
                {isEnglish ? 'Open library' : 'فتح المكتبة'}
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {articles.slice(0, 9).map(article => (
                <Link
                  key={article.slug}
                  href={'/articles/' + article.slug}
                  className="group rounded-2xl border border-brand-gold/12 bg-black/15 p-5 hover:border-brand-gold/35"
                  dir={dir}
                >
                  <span className="text-[10px] uppercase tracking-[0.16em] text-brand-gold/45">
                    ZIKR EDITORIAL
                  </span>
                  <h3 className="mt-3 line-clamp-2 text-lg font-bold text-brand-cream group-hover:text-brand-gold">
                    {article.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-7 text-brand-cream/50">
                    {article.summary}
                  </p>
                  <span className="mt-4 inline-block text-xs text-brand-gold/60">
                    {isEnglish ? 'Read article →' : 'اقرأ المقال ←'}
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <section
          className="border-b border-brand-gold/10 bg-[#071d18]/70 px-3 py-9 sm:px-4 sm:py-12"
          aria-labelledby="social-heading"
          hidden={!isSectionVisible('/videos')}
        >
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4" dir={dir}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/50">
                  {isEnglish ? 'Stay connected' : 'ابقَ على تواصل'}
                </p>
                <h2 id="social-heading" className="mt-2 text-2xl font-bold text-brand-gold">
                  {isEnglish ? 'Follow ZIKR beyond the website' : 'تابع ذِكر على منصات التواصل'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-brand-cream/55">
                  {isEnglish
                    ? 'Choose an official channel, or open the media hub to browse published videos and posts.'
                    : 'اختر القناة الرسمية التي تفضلها، أو افتح مركز المحتوى المرئي لمشاهدة الفيديوهات والمنشورات المنشورة.'}
                </p>
              </div>
              <Link href="/videos" className="rounded-xl border border-brand-gold/25 px-4 py-2.5 text-sm font-semibold text-brand-gold transition hover:bg-brand-gold/10">
                {isEnglish ? 'Open media hub' : 'افتح مركز الفيديوهات والسوشيال'}
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {socialChannels.map((channel) => (
                <a
                  key={channel.key}
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-32 flex-col justify-between rounded-2xl border border-brand-gold/15 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-brand-gold/40 hover:bg-brand-gold/[.04]"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-brand-cream group-hover:text-brand-gold">{channel.label}</span>
                    <span className="rounded-full border border-brand-gold/20 px-2 py-1 text-[10px] text-brand-gold/60">{isEnglish ? 'Official' : 'رسمي'}</span>
                  </span>
                  <span className="mt-4 text-xs leading-6 text-brand-cream/50">
                    {isEnglish ? channel.descriptionEn : channel.descriptionAr}
                  </span>
                  <span className="mt-3 text-xs font-semibold text-brand-gold/75">
                    {isEnglish ? 'Open channel ↗' : 'افتح القناة ↗'}
                  </span>
                </a>
              ))}
              {!socialChannels.length ? (
                <Link href="/videos" className="col-span-2 rounded-2xl border border-brand-gold/15 bg-black/20 p-5 text-sm leading-7 text-brand-cream/65 transition hover:border-brand-gold/40 lg:col-span-4">
                  {isEnglish ? 'Browse ZIKR videos and media' : 'تصفح فيديوهات ذِكر والمحتوى المرئي المنشور'}
                </Link>
              ) : null}
            </div>
          </Container>
        </section>

        <section
          className="border-b border-brand-gold/10 bg-brand-emerald/10 px-3 py-9 sm:px-4 sm:py-12"
          aria-labelledby="tools-heading"
          hidden={!showDailyTools || visibleDailyTools.length === 0}
          style={{ contentVisibility: 'auto', containIntrinsicSize: '0 420px' }}
        >
          <Container>
            <div dir={dir}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/45">
                {isEnglish ? 'Daily tools' : 'الأدوات اليومية'}
              </p>
              <h2 id="tools-heading" className="mt-2 text-2xl font-bold text-brand-gold">
                {isEnglish ? 'Useful utilities without clutter' : 'أدوات مفيدة بدون ازدحام'}
              </h2>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {visibleDailyTools.map(tool => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="rounded-2xl border border-brand-gold/12 bg-black/15 p-4 hover:border-brand-gold/35"
                  dir={dir}
                >
                  {(() => {
                    const ToolIcon = resolveIcon(tool.icon);
                    return <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-gold/15 bg-brand-gold/5 text-brand-gold" aria-hidden="true"><ToolIcon className="h-5 w-5" /></span>;
                  })()}
                  <h3 className="mt-3 font-bold text-brand-gold">{isEnglish ? tool.en : tool.ar}</h3>
                  <p className="mt-2 text-xs leading-6 text-brand-cream/50">{isEnglish ? tool.textEn : tool.text}</p>
                </Link>
              ))}
            </div>
            <p className="mt-5 text-xs leading-6 text-brand-cream/35" dir={dir}>
              {isEnglish
                ? 'The homepage deliberately avoids repeating the entire navigation tree. Use Sections for the complete map.'
                : 'الصفحة الرئيسية لا تكرر شجرة الموقع كاملة عمدًا؛ استخدم دليل الأقسام للوصول إلى كل شيء.'}
              {' · '}
              {CATALOG_ITEMS.length} {isEnglish ? 'organized paths' : 'مسارًا منظمًا'}
            </p>
          </Container>
        </section>

        <section hidden={!showDailyVerse} className="bg-[radial-gradient(circle_at_50%_10%,rgba(199,168,107,0.08),transparent_44%)] px-3 py-10 sm:px-4 sm:py-14" aria-labelledby="verse-heading">
          <Container className="mx-auto max-w-4xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-gold/45">
              {isEnglish ? 'Daily reflection' : 'تدبر اليوم'}
            </p>
            <h2 id="verse-heading" className="mt-2 text-2xl font-bold text-brand-gold">
              {isEnglish ? 'A verse to keep close' : 'آية للتدبر والعمل'}
            </h2>
            <blockquote className="mt-6 rounded-3xl border border-brand-gold/12 bg-black/15 p-6 sm:p-10" dir="rtl">
              <p className="text-xl font-bold leading-loose text-brand-cream sm:text-3xl" style={{ fontFamily: 'var(--font-amiri)' }}>
                “{dailyVerse}”
              </p>
              <cite className="mt-4 block text-sm not-italic text-brand-gold/55">
                Surah Al-Isra — Verse 9
              </cite>
            </blockquote>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/quran" className="rounded-xl bg-brand-gold px-6 py-3 text-sm font-bold text-brand-emeraldDeep hover:bg-brand-goldSoft">
                {isEnglish ? 'Read Quran' : 'اقرأ القرآن'}
              </Link>
              <Link href="/adhkar" className="rounded-xl border border-brand-gold/25 px-6 py-3 text-sm text-brand-cream/75 hover:border-brand-gold hover:text-brand-gold">
                {isEnglish ? 'Open Adhkar' : 'افتح الأذكار'}
              </Link>
            </div>
          </Container>
        </section>
      </main>
    </div>
  );
}
