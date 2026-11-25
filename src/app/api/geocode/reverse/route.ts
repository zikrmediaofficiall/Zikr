import { unstable_cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { consumeNominatimGlobalRateLimit, consumeReverseGeocodeClientRateLimit } from '@/features/geocoding/services/rate-limit';
import { getTrustedClientAddress } from '@/lib/request/client-address';
import { buildNominatimReverseUrl } from '@/lib/location/nominatim';
import { getServerEnv } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function coordinate(value: string | null, min: number, max: number): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

class NominatimRateLimitError extends Error {
  constructor() {
    super('The shared Nominatim request limit was reached.');
    this.name = 'NominatimRateLimitError';
  }
}

type ReverseGeocodeResult = {
  city: string;
  country: string;
  label: string;
};

const getCachedReverseGeocode = unstable_cache(
  async (baseUrl: string, lat: number, lon: number): Promise<ReverseGeocodeResult> => {
    // This global token is consumed only on a cache miss, keeping the public
    // Nominatim service below its one-request-per-second application-wide cap.
    if (!(await consumeNominatimGlobalRateLimit())) {
      throw new NominatimRateLimitError();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const upstream = await fetch(buildNominatimReverseUrl(baseUrl, lat, lon), {
        headers: { 'User-Agent': 'Zikr-App/1.0 (Prayer location)' },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!upstream.ok) {
        throw new Error('Nominatim returned HTTP ' + upstream.status);
      }

      const payload = await upstream.json() as {
        address?: Record<string, string | undefined>;
        display_name?: string;
      };
      const address = payload.address ?? {};
      const city = address.city || address.town || address.municipality || address.village || address.county || '';
      const country = address.country || '';
      const label = [city, country].filter(Boolean).join('، ') || payload.display_name?.split(',').slice(0, 2).join('، ') || '';

      return { city, country, label };
    } finally {
      clearTimeout(timeout);
    }
  },
  ['nominatim-reverse-geocode-v1'],
  { revalidate: 86400, tags: ['nominatim-reverse-geocode'] },
);

export async function GET(request: NextRequest) {
  const lat = coordinate(request.nextUrl.searchParams.get('lat'), -90, 90);
  const lon = coordinate(request.nextUrl.searchParams.get('lon'), -180, 180);
  if (lat === null || lon === null) {
    return NextResponse.json(
      { error: 'Invalid coordinates.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const clientIdentifier = getTrustedClientAddress(
      request.headers.get('x-real-ip'),
      request.headers.get('x-forwarded-for'),
    );
    const clientAllowed = await consumeReverseGeocodeClientRateLimit(clientIdentifier);
    if (!clientAllowed) {
      return NextResponse.json(
        { error: 'Too many location lookups. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
      );
    }
  } catch (error) {
    console.error('[api/geocode/reverse] Shared client rate limiter unavailable:', error);
    return NextResponse.json(
      { error: 'Location lookup is temporarily unavailable.' },
      { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const baseUrl = getServerEnv().NOMINATIM_BASE_URL;
    // The response is only used for city-level labels (zoom 10), so four
    // decimal places provide stable cache keys without material location drift.
    const result = await getCachedReverseGeocode(
      baseUrl,
      Number(lat.toFixed(4)),
      Number(lon.toFixed(4)),
    );
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  } catch (error) {
    if (error instanceof NominatimRateLimitError || (error instanceof Error && error.name === 'NominatimRateLimitError')) {
      return NextResponse.json(
        { error: 'Location lookup is busy. Please retry shortly.' },
        { status: 429, headers: { 'Retry-After': '1', 'Cache-Control': 'no-store' } },
      );
    }
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    console.error('[api/geocode/reverse] Upstream lookup failed:', error);
    return NextResponse.json(
      { error: timedOut ? 'Location lookup timed out.' : 'Location name unavailable.' },
      { status: timedOut ? 504 : 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
