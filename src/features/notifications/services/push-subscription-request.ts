import { isAllowedPushEndpoint } from "./push-endpoint";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizePushSubscriptionRequestBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function parsePushCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    return null;
  }
  return value;
}

export type ParsedPushSubscriptionRequest = {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_id: string | null;
  user_agent: string | null;
  platform: string | null;
};

export type ParsedPushPrayerContext = {
  location: {
    city: string;
    country: string | null;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  prayerReminders: Record<string, number | null>;
};

function boundedSubscriptionString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function validTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate the prayer context against the database RPC's exact column bounds.
 * Reject oversized optional country values instead of silently dropping them.
 */
export function parsePushPrayerContext(value: unknown): ParsedPushPrayerContext | null {
  const body = normalizePushSubscriptionRequestBody(value);
  const context = isRecord(body.prayerContext) ? body.prayerContext : null;
  const location = context && isRecord(context.location) ? context.location : null;
  if (!context || !location) return null;

  const city = boundedSubscriptionString(location.city, 160);
  const timezone = boundedSubscriptionString(location.timezone, 120);
  const latitude = parsePushCoordinate(location.latitude, -90, 90);
  const longitude = parsePushCoordinate(location.longitude, -180, 180);
  const rawCountry = location.country;
  let country: string | null = null;

  if (rawCountry !== null && rawCountry !== undefined) {
    if (typeof rawCountry !== "string") return null;
    const normalizedCountry = rawCountry.trim();
    if (normalizedCountry.length > 160) return null;
    country = normalizedCountry || null;
  }

  if (
    !city ||
    !timezone ||
    !validTimezone(timezone) ||
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  const rawReminders = context.prayerReminders;
  if (!isRecord(rawReminders)) return null;

  const prayerReminders: Record<string, number | null> = {};
  for (const prayer of ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const) {
    const reminder = rawReminders[prayer];
    if (reminder === null) {
      prayerReminders[prayer] = null;
      continue;
    }
    if (!Number.isInteger(reminder) || Number(reminder) < -60 || Number(reminder) > 60) {
      return null;
    }
    prayerReminders[prayer] = Number(reminder);
  }

  return {
    location: { city, country, latitude, longitude, timezone },
    prayerReminders,
  };
}

export function parsePushSubscriptionRequestBody(
  value: unknown,
): ParsedPushSubscriptionRequest | null {
  const body = normalizePushSubscriptionRequestBody(value);
  const subscription = isRecord(body.subscription) ? body.subscription : body;
  const keys = isRecord(subscription.keys) ? subscription.keys : {};
  const endpoint = boundedSubscriptionString(subscription.endpoint, 4096);
  const p256dh = boundedSubscriptionString(keys.p256dh, 1024);
  const auth = boundedSubscriptionString(keys.auth, 1024);

  if (
    !endpoint ||
    !isAllowedPushEndpoint(endpoint) ||
    !p256dh ||
    p256dh.length < 16 ||
    !auth ||
    auth.length < 8
  ) {
    return null;
  }

  return {
    endpoint,
    p256dh,
    auth,
    device_id: boundedSubscriptionString(body.deviceId, 256),
    user_agent: boundedSubscriptionString(body.userAgent, 1024),
    platform: boundedSubscriptionString(body.platform, 128),
  };
}
