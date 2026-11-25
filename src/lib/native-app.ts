/**
 * The Android app loads this site inside a Capacitor WebView. Android WebView
 * user agents carry the "; wv)" token (Chrome browsers do not). Used to hide
 * "download the app" prompts and the website-style footer inside the app.
 */
export function isInAppUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /;\s*wv\)/i.test(userAgent) || /\bZikrApp\b/.test(userAgent);
}

/** Client-side check (Capacitor global or WebView user agent). */
export function isInAppClient(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.()) || isInAppUserAgent(window.navigator.userAgent);
}
