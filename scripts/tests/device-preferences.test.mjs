import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const radio = readFileSync("src/app/radio/page.tsx", "utf8");
const prayerLocation = readFileSync("src/features/prayer/services/saved-prayer-location.ts", "utf8");
const prayerAlerts = readFileSync("src/features/prayer/hooks/use-prayer-alert.ts", "utf8");
const adhkar = readFileSync("src/features/adhkar/components/adhkar-page.tsx", "utf8");
const profile = readFileSync("src/features/profile/components/profile-local-settings.tsx", "utf8");
const offline = readFileSync("src/app/offline-library/offline-library-client.tsx", "utf8");

for (const key of [
  "zikr_radio_current_station_v1",
  "zikr_radio_volume_v1",
  "zikr_radio_recent_v1",
]) assert.ok(radio.includes(key), "radio preference must persist on device: " + key);

assert.match(prayerLocation, /zikr_prayer_location_v2/);
assert.match(prayerLocation, /window\.localStorage\.setItem/);
assert.match(prayerLocation, /window\.localStorage\.getItem/);
assert.match(prayerAlerts, /zikr_azan_settings/);
assert.match(prayerAlerts, /localStorage\.setItem\(SETTINGS_KEY/);
assert.match(adhkar, /zikr_adhkar_counters/);
assert.match(adhkar, /zikr_adhkar_selected_category/);
assert.match(adhkar, /preferencesLoaded/);
assert.match(profile, /zikr_quran_reminder_v1/);
assert.match(profile, /saveLocalReminder\(preferences\)/);
assert.match(profile, /deviceSaved/);
assert.match(profile, /serverSaved/);
assert.match(offline, /hydrateOfflineContent/);
assert.match(offline, /discoverSitemapRoutes/);
assert.match(offline, /navigator\.storage\.persist/);

console.log("Device-local settings and offline preference persistence contracts passed.");
