import { safeApiFetch } from '@/lib/services/http';
import { ServiceError } from '@/lib/types/common';
import { parsePrayerCoordinate } from './prayer-location-validation';

// Use local API proxy to avoid CORS and crawl issues
const API_BASE = '/api/prayer-times';
const CACHE_TTL_MS = 60_000;
const MAX_PRAYER_TIMES_CACHE_ENTRIES = 100;

const prayerTimesCache = new Map<string, { expiresAt: number; data: PrayerTimesResponse | null }>();
const prayerTimesInFlight = new Map<string, Promise<PrayerTimesResponse | null>>();

function prunePrayerTimesCache(now: number): void {
  for (const [key, entry] of prayerTimesCache) {
    if (entry.expiresAt <= now) prayerTimesCache.delete(key);
  }

  while (prayerTimesCache.size >= MAX_PRAYER_TIMES_CACHE_ENTRIES) {
    const oldestKey = prayerTimesCache.keys().next().value;
    if (oldestKey === undefined) break;
    prayerTimesCache.delete(oldestKey);
  }
}

function isValidPrayerDate(date: string | undefined): boolean {
  if (date === undefined) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

function isValidCalculationMethod(method: number): boolean {
  return Number.isInteger(method) && method >= 0 && method <= 99;
}

export interface PrayerTime {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
}

export interface PrayerTimesResponse {
  code: number;
  status: string;
  data: {
    timings: PrayerTime;
    date: {
      readable: string;
      timestamp: string;
      gregorian: {
        date: string;
        format: string;
        day: string;
        weekday: { en: string; ar: string };
        month: { number: number; en: string; ar: string };
        year: string;
      };
      hijri: {
        date: string;
        format: string;
        day: string;
        weekday: { en: string; ar: string };
        month: { number: number; en: string; ar: string };
        year: string;
        designation: { abbreviated: string; expanded: string };
      };
    };
    meta: {
      latitude: number;
      longitude: number;
      timezone: string;
      method: { id: number; name: string; params: Record<string, unknown> };
      latitudeAdjustmentMethod: string;
      midnightMethod: string;
      school: string;
      offset: Record<string, number>;
    };
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function isValidPrayerTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate the provider payload before exposing it to UI/countdown/native
 * scheduling consumers. A 200 response with an empty or partial data object
 * is not a usable prayer-time result.
 */
function isValidPrayerTimesResponse(value: unknown): value is PrayerTimesResponse {
  const response = asRecord(value);
  const data = asRecord(response?.data);
  const timings = asRecord(data?.timings);
  const date = asRecord(data?.date);
  const hijri = asRecord(date?.hijri);
  const hijriMonth = asRecord(hijri?.month);
  const meta = asRecord(data?.meta);
  const method = asRecord(meta?.method);

  if (
    response?.code !== 200 ||
    typeof response.status !== "string" ||
    response.status.toUpperCase() !== "OK" ||
    !timings ||
    !date ||
    !hijri ||
    !hijriMonth ||
    !meta ||
    !method
  ) {
    return false;
  }

  const requiredPrayerTimes = [
    "Fajr",
    "Sunrise",
    "Dhuhr",
    "Asr",
    "Sunset",
    "Maghrib",
    "Isha",
    "Imsak",
    "Midnight",
  ];
  if (!requiredPrayerTimes.every((key) =>
    typeof timings[key] === "string" &&
    parsePrayerTimeMinutes(timings[key] as string) !== null
  )) {
    return false;
  }

  const latitude = meta.latitude;
  const longitude = meta.longitude;
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    isValidPrayerTimeZone(meta.timezone) &&
    typeof method.name === "string" &&
    Boolean(method.name.trim()) &&
    typeof meta.school === "string" &&
    Boolean(meta.school.trim()) &&
    typeof hijri.day === "string" &&
    /^\d{1,2}$/.test(hijri.day) &&
    typeof hijri.year === "string" &&
    /^\d{3,4}$/.test(hijri.year) &&
    typeof hijriMonth.ar === "string" &&
    Boolean(hijriMonth.ar.trim())
  );
}

export interface CityCoordinates {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

function buildPrayerCacheKey(
  latitude: number,
  longitude: number,
  date: string | undefined,
  method: number,
): string {
  return [latitude.toFixed(6), longitude.toFixed(6), date ?? 'today', method].join('|');
}

async function fetchPrayerTimesUncached(
  latitude: number,
  longitude: number,
  date: string | undefined,
  method: number,
): Promise<PrayerTimesResponse | null> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    method: method.toString(),
  });

  if (date) params.append('date', date);

  const { data } = await safeApiFetch<unknown>(`${API_BASE}?${params.toString()}`);
  return isValidPrayerTimesResponse(data) ? data : null;
}

/**
 * Fetch prayer times for a specific date and location
 */
export async function getPrayerTimes(
  latitude: number,
  longitude: number,
  date?: string,
  method: number = 4,
): Promise<PrayerTimesResponse | null> {
  const validLatitude = parsePrayerCoordinate(latitude, -90, 90);
  const validLongitude = parsePrayerCoordinate(longitude, -180, 180);
  if (
    validLatitude === null ||
    validLongitude === null ||
    !isValidPrayerDate(date) ||
    !isValidCalculationMethod(method)
  ) {
    return null;
  }

  const cacheKey = buildPrayerCacheKey(validLatitude, validLongitude, date, method);
  const now = Date.now();
  const cached = prayerTimesCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    prayerTimesCache.delete(cacheKey);
    prayerTimesCache.set(cacheKey, cached);
    return cached.data;
  }
  if (cached) prayerTimesCache.delete(cacheKey);

  const existingRequest = prayerTimesInFlight.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const data = await fetchPrayerTimesUncached(validLatitude, validLongitude, date, method);
      prunePrayerTimesCache(Date.now());
      prayerTimesCache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    } catch (error) {
      console.error('[prayer-times] Failed to fetch prayer times:', error);
      if (error instanceof ServiceError) return null;
      throw error;
    } finally {
      prayerTimesInFlight.delete(cacheKey);
    }
  })();

  prayerTimesInFlight.set(cacheKey, request);
  return request;
}

/**
 * Fetch prayer times by city name
 */
export async function getPrayerTimesByCity(
  city: string,
  country?: string,
  date?: string,
  method: number = 4,
): Promise<PrayerTimesResponse | null> {
  const cleanCity = city.trim();
  const cleanCountry = country?.trim() ?? "";
  if (
    !cleanCity ||
    cleanCity.length > 120 ||
    cleanCountry.length > 120 ||
    !isValidPrayerDate(date) ||
    !isValidCalculationMethod(method)
  ) {
    return null;
  }

  const cacheKey = [
    'city',
    cleanCity.toLowerCase(),
    cleanCountry.toLowerCase(),
    date ?? 'today',
    method,
  ].join('|');
  const now = Date.now();
  const cached = prayerTimesCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    prayerTimesCache.delete(cacheKey);
    prayerTimesCache.set(cacheKey, cached);
    return cached.data;
  }
  if (cached) prayerTimesCache.delete(cacheKey);

  const existingRequest = prayerTimesInFlight.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const params = new URLSearchParams({ method: method.toString() });
      if (date) params.append('date', date);

      if (cleanCountry) {
        params.append('city', cleanCity);
        params.append('country', cleanCountry);
      } else {
        params.append('address', cleanCity);
      }

      const { data } = await safeApiFetch<unknown>(`${API_BASE}?${params.toString()}`);
      const result = isValidPrayerTimesResponse(data) ? data : null;
      prunePrayerTimesCache(Date.now());
      prayerTimesCache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
      return result;
    } catch (error) {
      console.error('[prayer-times] Failed to fetch prayer times by city:', error);
      if (error instanceof ServiceError) return null;
      throw error;
    } finally {
      prayerTimesInFlight.delete(cacheKey);
    }
  })();

  prayerTimesInFlight.set(cacheKey, request);
  return request;
}

/**
 * Get next prayer time from the current time
 */
export function getNextPrayer(
  timings: PrayerTime,
  currentTime: Date = new Date(),
  timeZone?: string,
): { name: string; time: string; minutesUntil: number } | null {
  // Sunrise and sunset are display times, not salah prayers; they must
  // never replace Dhuhr or Maghrib in the next-prayer countdown.
  const prayers = [
    { name: 'Fajr', time: timings.Fajr },
    { name: 'Dhuhr', time: timings.Dhuhr },
    { name: 'Asr', time: timings.Asr },
    { name: 'Maghrib', time: timings.Maghrib },
    { name: 'Isha', time: timings.Isha },
  ];

  const now = getMinutesOfDayInTimeZone(currentTime, timeZone);

  for (const prayer of prayers) {
    const prayerMinutes = parsePrayerTimeMinutes(prayer.time);
    if (prayerMinutes === null) continue;
    if (prayerMinutes > now) {
      return { name: prayer.name, time: prayer.time, minutesUntil: prayerMinutes - now };
    }
  }

  const fajrTotalMinutes = parsePrayerTimeMinutes(timings.Fajr);
  if (fajrTotalMinutes === null) return null;
  return {
    name: 'Fajr',
    time: timings.Fajr,
    minutesUntil: 24 * 60 - now + fajrTotalMinutes,
  };
}

/**
 * Get current prayer time
 */
export function getCurrentPrayer(
  timings: PrayerTime,
  currentTime: Date = new Date(),
  timeZone?: string,
): { name: string; time: string } | null {
  const prayers = [
    { name: 'Fajr', time: timings.Fajr },
    { name: 'Dhuhr', time: timings.Dhuhr },
    { name: 'Asr', time: timings.Asr },
    { name: 'Maghrib', time: timings.Maghrib },
    { name: 'Isha', time: timings.Isha },
  ];

  const now = getMinutesOfDayInTimeZone(currentTime, timeZone);

  for (let i = prayers.length - 1; i >= 0; i--) {
    const prayerMinutes = parsePrayerTimeMinutes(prayers[i].time);
    if (prayerMinutes === null) continue;
    if (prayerMinutes <= now) return prayers[i];
  }
  return null;
}

export function getMinutesOfDayInTimeZone(currentTime: Date, timeZone?: string): number {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(currentTime);
      const hour = Number(parts.find((part) => part.type === "hour")?.value);
      const minute = Number(parts.find((part) => part.type === "minute")?.value);
      if (Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isInteger(minute) && minute >= 0 && minute <= 59) {
        return hour * 60 + minute;
      }
    } catch {
      // Fall back to the device clock if the API returns an invalid timezone.
    }
  }
  return currentTime.getHours() * 60 + currentTime.getMinutes();
}

export const getPrayerTimesByCoordinates = getPrayerTimes;

export function parsePrayerTimeMinutes(timeStr: string): number | null {
  if (typeof timeStr !== "string") return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:$|\s)/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatPrayerTime(timeStr: string): string {
  const minutesAfterMidnight = parsePrayerTimeMinutes(timeStr);
  if (minutesAfterMidnight === null) return timeStr;
  const hours = Math.floor(minutesAfterMidnight / 60).toString().padStart(2, '0');
  const minutes = (minutesAfterMidnight % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function convertTo12Hour(timeStr: string, ar: boolean = true): string {
  const minutesAfterMidnight = parsePrayerTimeMinutes(timeStr);
  if (minutesAfterMidnight === null) return timeStr;
  let hours = Math.floor(minutesAfterMidnight / 60);
  const minutes = (minutesAfterMidnight % 60).toString().padStart(2, '0');
  const isPM = hours >= 12;
  hours = hours % 12 || 12;
  const suffix = ar ? (isPM ? 'م' : 'ص') : isPM ? 'PM' : 'AM';
  return `${hours}:${minutes} ${suffix}`;
}

export function getPrayerNameAr(englishName: string): string {
  const names: Record<string, string> = {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Sunset: 'الغروب',
    Maghrib: 'المغرب',
    Isha: 'العشاء',
    Imsak: 'الإمساك',
    Midnight: 'منتصف الليل',
  };
  return names[englishName] || englishName;
}

export const CALCULATION_METHODS: Record<number, string> = {
  0: 'Shia Ithna-Ashari, Leva Institute, Qum',
  1: 'University of Islamic Sciences, Karachi',
  2: 'Islamic Society of North America (ISNA)',
  3: 'Muslim World League',
  4: 'Umm Al-Qura University, Makkah',
  5: 'Egyptian General Authority of Survey',
  7: 'Institute of Geophysics, University of Tehran',
  8: 'Gulf Region',
  9: 'Kuwait',
  10: 'Qatar',
  11: 'Majlis Ugama Islam Singapura, Singapore',
  12: 'Union Organization Islamic de France',
  13: 'Diyanet İşleri Başkanlığı, Turkey (experimental)',
  14: 'Spiritual Administration of Muslims of Russia',
  15: 'Moonsighting Committee Worldwide (Moonsighting.com)',
  16: 'Dubai (experimental)',
  17: 'Jabatan Kemajuan Islam Malaysia (JAKIM)',
  18: 'Tunisia',
  19: 'Algeria',
  20: 'Kementerian Agama Republik Indonesia',
  21: 'Morocco',
  22: 'Comunidade Islamica de Lisboa (Portugal)',
  23: 'Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan',
  99: 'Custom',
};
