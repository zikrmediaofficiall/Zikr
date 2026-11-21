import dynamic from 'next/dynamic';
import { cookies, headers } from 'next/headers';
import { Footer } from './footer';
import { Navbar } from './navbar';
import { LanguageProvider } from './language-provider';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@/lib/i18n';
import { EditorialDepth } from '@/components/content/editorial-depth';
import { EditorialUtilityDepth } from '@/components/content/editorial-utility-depth';
import { ContentExpansion } from '@/components/content/content-expansion';
import { getSiteSetting } from '@/features/site-content/services/site-content';

const InstallPrompt = dynamic(
  () => import('./install-prompt').then((module) => module.InstallPrompt),
);
const OfflineIndicator = dynamic(
  () => import('@/features/offline/components/offline-indicator').then((module) => module.OfflineIndicator),
);
const NotificationPermissionBanner = dynamic(
  () =>
    import('./notification-permission-banner').then(
      (module) => module.NotificationPermissionBanner,
    ),
);

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const cookieLocale = cookieStore.get('zikr-locale')?.value ?? null;
  const initialLocale: Locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const pathname = requestHeaders.get('x-zikr-pathname') ?? '';
  const socialSettings = await getSiteSetting('social');

  const smartLinkExcludedPrefixes = [
    "/admin", "/auth", "/kids", "/quran", "/mushaf", "/hadith",
    "/dua", "/adhkar", "/prayer-times", "/qibla", "/tasbeeh",
    "/wird", "/memorization", "/spiritual-ai", "/prophets", "/stories",
    "/articles", "/about",
    "/companions", "/battles", "/conquests", "/tafsir", "/reciters",
    "/audio", "/radio", "/tawasheeh", "/poetry", "/videos/",
  ];
  const showSmartLink =
    pathname !== "" &&
    pathname !== "/" &&
    pathname !== "/videos" &&
    !smartLinkExcludedPrefixes.some(
      prefix => pathname === prefix || pathname.startsWith(prefix),
    );

  return (
    <LanguageProvider initialLocale={initialLocale}>
      <div className={pathname.startsWith("/admin") || pathname.startsWith("/auth") || pathname.startsWith("/kids") ? "min-h-screen" : "min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0"}>
        <a
          href="#main-content"
          className="sr-only z-[100] rounded-md bg-background px-4 py-3 text-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {initialLocale === 'ar' ? 'تخطي إلى المحتوى' : 'Skip to content'}
        </a>
        <Navbar />
        <main id="main-content" tabIndex={-1}>
          {children}
          <EditorialDepth pathname={pathname} />
          <EditorialUtilityDepth pathname={pathname} />
          <ContentExpansion pathname={pathname} />
        </main>
        <Footer socialLinks={{
          facebookPageUrl: socialSettings?.facebookPageUrl,
          youtubeChannelUrl: socialSettings?.youtubeChannelUrl,
          instagramUrl: socialSettings?.instagramUrl,
          twitterUrl: socialSettings?.twitterUrl,
          xUrl: socialSettings?.xUrl,
        }} showSmartLink={showSmartLink} />
        {/* Non-critical client integrations stay code-split from the shell. */}
        <NotificationPermissionBanner />
        <InstallPrompt />
        <OfflineIndicator />
      </div>
    </LanguageProvider>
  );
}
