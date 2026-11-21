import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const radio = readFileSync("src/features/audio/services/radio.ts", "utf8");
const page = readFileSync("src/app/radio/page.tsx", "utf8");

assert.match(radio, /export type RadioCategory = "quran" \| "reciter"/);
assert.match(radio, /id: "quran-shatri"/);
assert.match(radio, /id: "quran-kandari"/);
assert.doesNotMatch(radio, /id: "tawasheeh-/);
assert.match(radio, /streamUrl: "https:\/\/qurango\.net\/radio\/mishary_alafasi"/);
assert.match(page, /id: 'reciter', label: 'إذاعات القرّاء'/);
assert.doesNotMatch(page, /id: 'tawasheeh'/);

for (const key of ["zikr_radio_current_station_v1", "zikr_radio_volume_v1", "zikr_radio_recent_v1"]) {
  assert.ok(page.includes(key), "Radio settings must be stored per device: " + key);
}
assert.match(page, /window\.localStorage\.getItem/);
assert.match(page, /window\.localStorage\.setItem/);
assert.match(page, /Math\.max\(0, Math\.min\(1, rawVolume\)\)/);
assert.match(page, /audioRef\.current = null;\s*releaseAudio\(previous\)/);
assert.match(page, /useEffect\(\(\) => \(\) => \{\s*const audio = audioRef\.current;\s*audioRef\.current = null;\s*releaseAudio\(audio\);/);
assert.match(page, /if \(audioRef\.current !== audio\) return/);
assert.match(page, /audio\.addEventListener\('stalled'/);
assert.match(page, /audio\.removeAttribute\('src'\)/);
assert.match(page, /if \(!audio\) \{\s*playRadioChannel\(current\)/);
assert.match(page, /Browsers require a user gesture before audible autoplay is allowed/);

const errorIndex = page.indexOf("{error && (");
const currentIndex = page.indexOf("{current && (");
assert.ok(errorIndex >= 0 && currentIndex > errorIndex, "First-play stream errors must be visible even when no previous station exists.");

console.log("Radio category, per-device preference, stream error and audio cleanup contracts passed.");
