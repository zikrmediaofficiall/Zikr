/**
 * Content-Security-Policy builder. Scripts are allowed by per-request nonce
 * plus 'strict-dynamic' (so the ad/analytics loaders started by trusted code
 * still work). 'unsafe-inline' and the host list stay only as a fallback for
 * old browsers: browsers that understand nonces ignore them.
 */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const SCRIPT_HOSTS = "https://pagead2.googlesyndication.com https://partner.googleadservices.com https://www.googletagservices.com https://adservice.google.com https://fundingchoicesmessages.google.com https://www.googletagmanager.com https://va.vercel-scripts.com";

export function buildContentSecurityPolicy(nonce: string): string {
  const dev = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  const script = `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev} 'unsafe-inline' ${SCRIPT_HOSTS};`;
  return `default-src 'self'; ${script} style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://*.supabase.co https://res.cloudinary.com https://i.ytimg.com https://img.youtube.com https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.googleusercontent.com https://*.gstatic.com https://yt3.ggpht.com https://*.fbcdn.net https://*.fbsbx.com; media-src 'self' blob: https://*.supabase.co https://res.cloudinary.com https://cdn.islamic.network https://www.islamcan.com https://everyayah.com https://quranaudio.pages.dev https://*.mp3quran.net https://download.quranicaudio.com https://archive.org https://*.archive.org https://server6.mp3quran.net https://server8.mp3quran.net https://stream.radiojar.com https://qurango.net; connect-src 'self' https://ep2.adtrafficquality.google https://va.vercel-scripts.com https://*.supabase.co https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://generativelanguage.googleapis.com https://api.hadith.gading.dev https://ummahapi.com https://api.aladhan.com https://api.alquran.cloud https://everyayah.com https://quranaudio.pages.dev https://*.mp3quran.net https://download.quranicaudio.com https://archive.org https://*.archive.org https://pagead2.googlesyndication.com https://adservice.google.com https://fundingchoicesmessages.google.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://ep1.adtrafficquality.google https://mp3quran.net https://api.quran.com https://www.hisnmuslim.com https://mp3quran.net/api; frame-src 'self' https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://www.google.com https://www.googletagmanager.com https://www.youtube.com https://www.youtube-nocookie.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com https://accounts.google.com; font-src 'self' data: https://fonts.gstatic.com;`;
}
