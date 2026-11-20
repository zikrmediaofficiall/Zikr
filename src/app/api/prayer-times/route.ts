import { NextRequest, NextResponse } from 'next/server';
import { consumePrayerTimesRateLimit } from '@/features/prayer/services/rate-limit';
import { getTrustedClientAddress } from '@/lib/request/client-address';

const ALADHAN_API_BASE = 'https://api.aladhan.com/v1';
const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_CITY_LENGTH = 120;
const MAX_COUNTRY_LENGTH = 120;
const MAX_ADDRESS_LENGTH = 240;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isValidCoordinate(value: string | null, min: number, max: number): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function isValidDate(value: string | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function isBoundedText(value: string | null, maxLength: number): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  return value.trim().length <= maxLength;
}

/**
 * GET /api/prayer-times
 *
 * Proxies the public Aladhan API without allowing arbitrary upstream URLs.
 * Supported modes are coordinates, city/country, or address.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const latitude = searchParams.get('latitude')?.trim() ?? '';
  const longitude = searchParams.get('longitude')?.trim() ?? '';
  const city = searchParams.get('city')?.trim() ?? '';
  const country = searchParams.get('country')?.trim() ?? '';
  const address = searchParams.get('address')?.trim() ?? '';
  const date = searchParams.get('date')?.trim() ?? '';
  const method = searchParams.get('method')?.trim() || '4';

  const modes = [
    Boolean(city),
    Boolean(address),
    Boolean(latitude || longitude),
  ].filter(Boolean).length;
  if (modes !== 1) {
    return NextResponse.json(
      { error: 'Provide exactly one location mode: city, address, or latitude and longitude.' },
      { status: 400 },
    );
  }

  if ((latitude || longitude) && (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180))) {
    return NextResponse.json({ error: 'Invalid latitude or longitude.' }, { status: 400 });
  }
  if (city && !isBoundedText(city, MAX_CITY_LENGTH)) {
    return NextResponse.json({ error: 'City is missing or too long.' }, { status: 400 });
  }
  if (city && country && !isBoundedText(country, MAX_COUNTRY_LENGTH)) {
    return NextResponse.json({ error: 'Country is too long.' }, { status: 400 });
  }
  if (address && !isBoundedText(address, MAX_ADDRESS_LENGTH)) {
    return NextResponse.json({ error: 'Address is missing or too long.' }, { status: 400 });
  }
  if (date && !isValidDate(date)) {
    return NextResponse.json({ error: 'Date must be a valid YYYY-MM-DD value.' }, { status: 400 });
  }
  if (!/^\d{1,2}$/.test(method) || Number(method) < 0 || Number(method) > 99) {
    return NextResponse.json({ error: 'Invalid calculation method.' }, { status: 400 });
  }

  try {
    const clientAddress = getTrustedClientAddress(
      request.headers.get('x-real-ip'),
      request.headers.get('x-forwarded-for'),
    );
    const allowed = await consumePrayerTimesRateLimit(clientAddress);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many prayer-time lookups. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
      );
    }
  } catch (error) {
    console.error('[prayer-times-api] Shared rate limiter unavailable:', error);
    return NextResponse.json(
      { error: 'Prayer-times lookup is temporarily unavailable.' },
      { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } },
    );
  }

  const endpoint = city
    ? 'timingsByCity'
    : address
      ? 'timingsByAddress'
      : 'timings';
  const upstreamDate = date
    ? `${date.slice(8, 10)}-${date.slice(5, 7)}-${date.slice(0, 4)}`
    : null;
  const endpointPath = upstreamDate ? `${endpoint}/${upstreamDate}` : endpoint;
  const params = new URLSearchParams({ method });
  if (city) {
    params.set('city', city);
    params.set('country', country || 'Egypt');
  } else if (address) {
    params.set('address', address);
  } else {
    params.set('latitude', latitude);
    params.set('longitude', longitude);
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const upstreamFetchOptions = upstreamDate
      ? { next: { revalidate: 3600 } }
      : { cache: 'no-store' as const };
    const upstream = await fetch(`${ALADHAN_API_BASE}/${endpointPath}?${params.toString()}`, {
      headers: { 'User-Agent': 'Zikr-App/1.0 (Prayer Times)' },
      signal: controller.signal,
      ...upstreamFetchOptions,
    });

    if (!upstream.ok) {
      console.error(`[prayer-times-api] Aladhan API error: ${upstream.status}`);
      return NextResponse.json(
        { error: 'Prayer-times provider is unavailable.' },
        { status: 502 },
      );
    }

    let data: unknown;
    try {
      data = await upstream.json();
    } catch {
      return NextResponse.json(
        { error: 'Prayer-times provider returned invalid data.' },
        { status: 502 },
      );
    }

    const responseCacheHeaders = upstreamDate
      ? {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'max-age=3600',
        }
      : {
          'Cache-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
        };
    return NextResponse.json(data, { headers: responseCacheHeaders });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Prayer-times provider timed out.' },
        { status: 504 },
      );
    }
    console.error('[prayer-times-api] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
