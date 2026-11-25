import type { NextConfig } from 'next';
import { PRODUCTION_URL } from './src/lib/site';

const canonicalClientSiteUrl = PRODUCTION_URL;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    NEXT_PUBLIC_SITE_URL: canonicalClientSiteUrl,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingExcludes: {
    '/*': ['./.env.local', './.env.*.local'],
  },
  compress: true,
  images: {
    unoptimized: false,
    remotePatterns: [
      { protocol: 'https', hostname: 'supabase.co' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: '*.fbcdn.net' },
      { protocol: 'https', hostname: '*.fbsbx.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(self), camera=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      ],
    },
    {
      source: '/api/:path*',
      headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
    },
    {
      source: '/static/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/:path*.svg',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
  ],
  rewrites: async () => [
    { source: '/sitemap-content/:id.xml', destination: '/sitemap-content/:id' },
  ],
  redirects: async () => [
    { source: '/home', destination: '/', permanent: false },
    { source: '/bookmarks', destination: '/favorites', permanent: false },
    { source: '/auth/signup', destination: '/auth/register', permanent: false },
    { source: '/prayer', destination: '/prayer-times', permanent: true },
    { source: '/islamic-conquests', destination: '/conquests', permanent: true },
    { source: '/battles/qaynuqa', destination: '/battles/banu-qaynuqa', permanent: false },
    { source: '/battles/nadir', destination: '/battles/banu-nadir', permanent: false },
    { source: '/battles/qurayza', destination: '/battles/banu-qurayza', permanent: false },
    { source: '/battles/mutah', destination: '/battles/mu-tah', permanent: false },
    { source: '/battles/salasel', destination: '/battles/dhat-salasil', permanent: false },
    { source: '/prophets/dhul-kifl', destination: '/prophets/dhulkifl', permanent: true },
    { source: '/prophets/zakariyya', destination: '/prophets/zakariya', permanent: true },
  ],
  productionBrowserSourceMaps: false,
  trailingSlash: false,
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
    optimizePackageImports: ['lucide-react'],
    inlineCss: true,
  },
};

export default nextConfig;
