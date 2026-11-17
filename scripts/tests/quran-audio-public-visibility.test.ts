import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(
  "supabase/migrations/20261117010000_restrict_quran_audio_public_columns.sql",
  "utf8",
);
assert.match(
  migration,
  /REVOKE ALL PRIVILEGES ON TABLE public\.quran_audio\s+FROM PUBLIC, anon, authenticated/i,
  "browser roles must lose broad table privileges on the Quran audio catalogue",
);
assert.match(
  migration,
  /GRANT SELECT \(id, surah_id, reciter_id, audio_url, source_url, retrieved_at\)[\s\S]*?TO anon, authenticated/i,
  "anonymous and authenticated users must receive only the public Quran audio projection",
);
assert.match(
  migration,
  /GRANT SELECT, INSERT, UPDATE, DELETE[\s\S]*?TO service_role/i,
  "server-side audio import and read paths must retain their required privileges",
);

const quranServer = readFileSync(
  "src/features/quran/services/quran-server.ts",
  "utf8",
);
const publicRecord = quranServer.match(/export type QuranAudioRecord = \{([\s\S]*?)\};/);
assert.ok(publicRecord, "the public Quran audio response type must exist");
assert.doesNotMatch(
  publicRecord[1],
  /storage_/,
  "public Quran audio response types must not contain Storage lifecycle fields",
);
assert.ok(
  quranServer.includes("publicFallbackPath: string = path"),
  "Quran server reads must support a separately scoped anonymous fallback projection",
);
assert.ok(
  quranServer.includes("supabaseServerAnonRequest<T>(publicFallbackPath, options)"),
  "anonymous fallbacks must use the public projection rather than the service-role query",
);
assert.ok(
  quranServer.includes("select=audio_url,source_url,retrieved_at&limit=1"),
  "anonymous Quran audio reads must select only public playback fields",
);
const audioFunction = quranServer.slice(
  quranServer.indexOf("export async function getQuranAudioFromDb("),
);
assert.ok(audioFunction.includes("audio_url: row.storage_url"));
assert.ok(audioFunction.includes("source_url: row?.source_url ?? null"));
assert.doesNotMatch(audioFunction, /storage_path:/);
assert.doesNotMatch(audioFunction, /\.\.\.row/);

const route = readFileSync("src/app/api/quran/audio/route.ts", "utf8");
assert.doesNotMatch(
  route,
  /storage_path/,
  "the public Quran audio endpoint must not return internal Storage object paths",
);

const exporter = readFileSync("scripts/export-offline-content.mjs", "utf8");
assert.ok(
  exporter.includes(
    "['quran_audio', 'quran_audio', 'select=id,surah_id,reciter_id,audio_url,source_url,retrieved_at'",
  ),
  "public offline snapshots must export only the playback catalogue projection",
);
assert.ok(
  !exporter.includes("['quran_audio', 'quran_audio', 'select=*'"),
  "the offline exporter must not serialize every internal Quran audio column",
);

const offlineDb = readFileSync("src/lib/offline-db.ts", "utf8");
assert.ok(
  offlineDb.includes("name: 'quranAudio', keyPath: 'id'") &&
    offlineDb.includes("keyPath: 'surah_id'") &&
    offlineDb.includes("keyPath: 'reciter_id'"),
  "the public projection must preserve the offline store's primary and lookup keys",
);

const migrationValidator = readFileSync("scripts/validate-migrations.mjs", "utf8");
assert.ok(
  migrationValidator.includes("QURAN_AUDIO_PUBLIC_COLUMN_PRIVILEGE_PASSED"),
  "the canonical migration replay must verify effective public column privileges",
);

console.log("QURAN_AUDIO_PUBLIC_VISIBILITY_TEST_PASSED");
