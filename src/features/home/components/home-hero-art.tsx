// Decorative hero art, inlined so it needs no network request and is not an LCP
// candidate. Pixel-identical to /banners/homepage/home-visual.svg (ids are prefixed).
const HERO_SVG_INNER = '<defs><linearGradient id="hv-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#071812"/><stop offset=".55" stop-color="#164D40"/><stop offset="1" stop-color="#071722"/></linearGradient><radialGradient id="hv-glow"><stop stop-color="#E8CF94" stop-opacity=".56"/><stop offset="1" stop-color="#E8CF94" stop-opacity="0"/></radialGradient><pattern id="hv-stars" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M60 15 68 52 105 60 68 68 60 105 52 68 15 60 52 52Z" fill="none" stroke="#E8D5A6" stroke-opacity=".16"/></pattern><filter id="hv-blur"><feGaussianBlur stdDeviation="38"/></filter></defs><rect width="1080" height="1200" rx="70" fill="url(#hv-bg)"/><circle cx="770" cy="260" r="330" fill="url(#hv-glow)" filter="url(#hv-blur)"/><rect width="1080" height="1200" fill="url(#hv-stars)"/><g fill="none" stroke="#EAD7A5" stroke-opacity=".48"><path d="M140 1200V620a400 400 0 0 1 800 0v580" stroke-width="16"/><path d="M245 1200V650a295 295 0 0 1 590 0v550" stroke-width="7"/><path d="M345 1200V680a195 195 0 0 1 390 0v520" stroke-width="4"/></g><path d="M140 930Q540 750 940 930V1200H140Z" fill="#D9C28C" opacity=".16"/><circle cx="540" cy="400" r="132" fill="#E7C98B" opacity=".22"/><circle cx="540" cy="400" r="92" fill="none" stroke="#F5E4BB" stroke-width="5" opacity=".55"/><path d="M540 230 565 330 665 355 565 380 540 480 515 380 415 355 515 330Z" fill="#F0DCA9" opacity=".58"/><path d="M0 1020Q220 900 420 1035T1080 1000V1200H0Z" fill="#06120F" opacity=".55"/><path d="M0 1080Q270 990 540 1090T1080 1060" stroke="#EAD7A5" stroke-opacity=".24" stroke-width="5" fill="none"/>';

export function HomeHeroArt() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1080 1200"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      dangerouslySetInnerHTML={{ __html: HERO_SVG_INNER }}
    />
  );
}
