import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isAllowedQuranAudioUrl,
  isSafeQuranAudioDownloadPath,
  isValidQuranAudioDownloadRequest,
} from "../../src/features/quran/services/audio-download-policy";

const supabaseUrl = "https://zqtssvlvmkzeeyqghqfk.supabase.co";
assert.equal(isAllowedQuranAudioUrl("https://server16.mp3quran.net/mishary/001.mp3", supabaseUrl), true);
assert.equal(
  isAllowedQuranAudioUrl(
    "https://zqtssvlvmkzeeyqghqfk.supabase.co/storage/v1/object/public/quran-audio/mishary/001.mp3",
    supabaseUrl,
  ),
  true,
);

for (const url of [
  "http://server16.mp3quran.net/mishary/001.mp3",
  "https://attacker.mp3quran.net/mishary/001.mp3",
  "https://server16.mp3quran.net.evil.example/mishary/001.mp3",
  "https://evil.example/mishary/001.mp3",
  "https://server16.mp3quran.net:8443/mishary/001.mp3",
  "https://user:pass@server16.mp3quran.net/mishary/001.mp3",
  "https://server16.mp3quran.net/mishary/001.mp3?token=secret",
  "https://server16.mp3quran.net/mishary/../001.mp3",
  "https://server16.mp3quran.net/mishary/%2e%2e/001.mp3",
  "https://zqtssvlvmkzeeyqghqfk.supabase.co/storage/v1/object/public/other-bucket/001.mp3",
]) {
  assert.equal(isAllowedQuranAudioUrl(url, supabaseUrl), false, url);
}

assert.equal(isSafeQuranAudioDownloadPath("quran-audio/alafasy/1.mp3"), true);
assert.equal(isSafeQuranAudioDownloadPath("quran-audio/ar.alafasy/114.mp3"), true);
for (const path of [
  "../private/1.mp3",
  "/quran-audio/alafasy/1.mp3",
  "quran-audio/../../private/1.mp3",
  "quran-audio/%2F/1.mp3",
  "quran-audio/alafasy/0.mp3",
  "quran-audio/alafasy/115.mp3",
  "quran-audio/alafasy/1.mp3/extra",
  "quran-audio/alafasy\\1.mp3",
]) {
  assert.equal(isSafeQuranAudioDownloadPath(path), false, path);
}

assert.equal(isValidQuranAudioDownloadRequest(1, "alafasy"), true);
assert.equal(isValidQuranAudioDownloadRequest(114, "ar.alafasy"), true);
for (const [surahId, reciterCode] of [
  [0, "alafasy"],
  [115, "alafasy"],
  [1.5, "alafasy"],
  [1, "../alafasy"],
  [1, "bad/code"],
  [1, "bad code"],
]) {
  assert.equal(isValidQuranAudioDownloadRequest(surahId, reciterCode), false);
}

const previousWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
const indexKey = "zikr:quran-audio-downloads";
const store = new Map<string, string>();
store.set(
  indexKey,
  JSON.stringify({
    "alafasy:1": {
      key: "alafasy:1",
      surahId: 1,
      reciterCode: "alafasy",
      sourceUrl: "https://server16.mp3quran.net/mishary/001.mp3",
      storage: "native",
      path: "quran-audio/alafasy/1.mp3",
      downloadedAt: "2026-11-15T00:00:00.000Z",
    },
  }),
);
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
    zikrNative: {
      isNative: true,
      getFileInfo: async () => ({ size: 1_234_567 }),
    },
  },
});

try {
  const { getQuranAudioUsage } = await import("../../src/features/quran/services/offline-audio");
  assert.deepEqual(await getQuranAudioUsage(), { count: 1, bytes: 1_234_567 });
  const savedIndex = JSON.parse(store.get(indexKey) ?? "{}");
  assert.equal(savedIndex["alafasy:1"].sizeBytes, 1_234_567);
} finally {
  if (previousWindowDescriptor) {
    Object.defineProperty(globalThis, "window", previousWindowDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "window");
  }
}

const nativeBridgeSource = readFileSync("src/components/layout/native-capacitor-bridge.tsx", "utf8");
assert.ok(nativeBridgeSource.includes("isAllowedQuranAudioUrl(url)"));
assert.ok(nativeBridgeSource.includes("isSafeQuranAudioDownloadPath(path)"));
assert.ok(nativeBridgeSource.includes("stat?."));

const offlineAudioSource = readFileSync("src/features/quran/services/offline-audio.ts", "utf8");
assert.ok(offlineAudioSource.includes("isAllowedQuranAudioUrl(sourceUrl)"));
assert.ok(offlineAudioSource.includes("getFileInfo"));

const quranServerSource = readFileSync("src/features/quran/services/quran-server.ts", "utf8");
assert.ok(quranServerSource.includes("isAllowedQuranAudioUrl"));
assert.ok(quranServerSource.includes("isValidQuranAudioDownloadRequest"));

console.log("QURAN_AUDIO_DOWNLOAD_POLICY_TEST_PASSED");
