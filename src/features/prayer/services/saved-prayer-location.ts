import { parsePrayerCoordinate } from "./prayer-location-validation";

export type SavedPrayerLocation = {
  id?: string;
  city: string;
  country?: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  isDefault?: boolean;
  updatedAt?: string | null;
};

const LOCAL_KEY = "zikr_prayer_location_v2";

export function normalizeSavedPrayerLocation(value: unknown): SavedPrayerLocation | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const latitude = parsePrayerCoordinate(item.latitude ?? item.lat, -90, 90);
  const longitude = parsePrayerCoordinate(item.longitude ?? item.lon, -180, 180);
  const city = typeof item.city === "string" ? item.city.trim() : "";
  const country = typeof item.country === "string" ? item.country.trim() : "";
  const timezone = typeof item.timezone === "string" ? item.timezone.trim() : "";

  if (
    !city ||
    city.length > 120 ||
    country.length > 120 ||
    !timezone ||
    timezone.length > 100 ||
    latitude === null ||
    longitude === null
  ) {
    return null;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date(0));
  } catch {
    return null;
  }

  return {
    id: typeof item.id === "string" ? item.id : undefined,
    city,
    country: country || null,
    latitude,
    longitude,
    timezone,
    isDefault: item.isDefault !== false,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : null,
  };
}

export function loadLocalPrayerLocation(): SavedPrayerLocation | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeSavedPrayerLocation(JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "null"));
  } catch {
    return null;
  }
}

export function saveLocalPrayerLocation(location: SavedPrayerLocation): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeSavedPrayerLocation(location);
  if (!normalized) return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(normalized));
  } catch {
    // Local persistence is best-effort for signed-out users.
  }
}

export async function getSavedPrayerLocation(): Promise<SavedPrayerLocation | null> {
  try {
    const response = await fetch("/api/prayer-location", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as { location?: unknown };
      const location = normalizeSavedPrayerLocation(payload.location);
      if (location) {
        saveLocalPrayerLocation(location);
        return location;
      }
      if (payload.location === null) return loadLocalPrayerLocation();
    }
  } catch {
    // Anonymous/offline path falls back to local storage.
  }

  return loadLocalPrayerLocation();
}

export async function persistPrayerLocation(location: SavedPrayerLocation): Promise<void> {
  const normalized = normalizeSavedPrayerLocation(location);
  if (!normalized) return;

  saveLocalPrayerLocation(normalized);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("zikr:prayer-location-updated", { detail: normalized }));
  }

  try {
    const response = await fetch("/api/prayer-location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
    if (response.ok) {
      const payload = (await response.json()) as { location?: unknown };
      const saved = normalizeSavedPrayerLocation(payload.location);
      if (saved) {
        saveLocalPrayerLocation(saved);
        window.dispatchEvent(new CustomEvent("zikr:prayer-location-saved", { detail: saved }));
      }
    }
  } catch {
    // Keep the local copy so signed-out and offline users never lose their selection.
  }
}
