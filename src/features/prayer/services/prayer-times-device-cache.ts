import type { PrayerTimesResponse } from "./prayer-times";
import { formatDateInTimeZone } from "./prayer-notification-schedule";

const DEVICE_PRAYER_TIMES_KEY = "zikr_prayer_times_today_v1";

type DevicePrayerTimesSnapshot = {
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  dateKey: string;
  savedAt: string;
  data: PrayerTimesResponse;
};

function currentDateKey(timezone: string): string | null {
  try {
    return formatDateInTimeZone(new Date(), timezone);
  } catch {
    return null;
  }
}

function validSnapshot(value: unknown): value is DevicePrayerTimesSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const data = record.data as PrayerTimesResponse | undefined;
  if (
    typeof record.city !== "string" ||
    !record.city.trim() ||
    typeof record.latitude !== "number" ||
    !Number.isFinite(record.latitude) ||
    record.latitude < -90 ||
    record.latitude > 90 ||
    typeof record.longitude !== "number" ||
    !Number.isFinite(record.longitude) ||
    record.longitude < -180 ||
    record.longitude > 180 ||
    typeof record.timezone !== "string" ||
    typeof record.dateKey !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(record.dateKey) ||
    typeof record.savedAt !== "string" ||
    !data ||
    data.code !== 200 ||
    data.status !== "OK" ||
    !data.data?.timings ||
    !data.data?.meta ||
    !data.data?.date?.hijri
  ) return false;

  const timings = data.data.timings;
  return [
    timings.Fajr,
    timings.Sunrise,
    timings.Dhuhr,
    timings.Asr,
    timings.Sunset,
    timings.Maghrib,
    timings.Isha,
    timings.Imsak,
    timings.Midnight,
  ].every((time) => typeof time === "string" && /^\d{1,2}:\d{2}(?:$|\s)/.test(time));
}

function readSnapshot(): DevicePrayerTimesSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEVICE_PRAYER_TIMES_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!validSnapshot(parsed)) return null;
    const today = currentDateKey(parsed.timezone);
    return today && today === parsed.dateKey ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDevicePrayerTimes(
  city: string,
  latitude: number,
  longitude: number,
  data: PrayerTimesResponse,
): boolean {
  if (typeof window === "undefined") return false;
  const timezone = data.data.meta.timezone;
  const dateKey = currentDateKey(timezone);
  if (
    !dateKey ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(data.data.meta.latitude - latitude) > 0.0001 ||
    Math.abs(data.data.meta.longitude - longitude) > 0.0001
  ) return false;

  const snapshot: DevicePrayerTimesSnapshot = {
    city: city.trim().slice(0, 120) || "الموقع المحفوظ",
    latitude,
    longitude,
    timezone,
    dateKey,
    savedAt: new Date().toISOString(),
    data,
  };
  try {
    window.localStorage.setItem(DEVICE_PRAYER_TIMES_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function getDevicePrayerTimesForLocation(
  latitude: number,
  longitude: number,
): DevicePrayerTimesSnapshot | null {
  const snapshot = readSnapshot();
  if (!snapshot) return null;
  return Math.abs(snapshot.latitude - latitude) <= 0.000001 &&
    Math.abs(snapshot.longitude - longitude) <= 0.000001
    ? snapshot
    : null;
}

export function getDevicePrayerTimesForCity(city: string): DevicePrayerTimesSnapshot | null {
  const snapshot = readSnapshot();
  if (!snapshot) return null;
  return snapshot.city.trim().toLocaleLowerCase() === city.trim().toLocaleLowerCase()
    ? snapshot
    : null;
}
