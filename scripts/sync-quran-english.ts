import { assertCanonicalSupabaseProjectUrl } from "./lib/canonical-supabase-project.mjs";

const API_BASE = "https://api.alquran.cloud/v1";
const EDITION = "en.pickthall";
const PAGE_SIZE = 1_000;
const REQUEST_TIMEOUT_MS = 20_000;
const PROVIDER_DELAY_MS = 1_100;
const MAX_RETRIES = 3;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(name + " is required before Quran translation sync can access production.");
  return value;
}

const supabaseUrl = assertCanonicalSupabaseProjectUrl(required("SUPABASE_URL"));
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");

type SurahRow = { id: number; ayahs_count: number };
type MissingAyahRow = { surah_id: number; ayah_number: number; text_ar: string };
type ProviderAyah = { numberInSurah: number; text: string };
type ProviderSurah = {
  number: number;
  ayahs: ProviderAyah[];
  edition: { identifier: string; language: string; format: string };
};
type ProviderEnvelope = { code: number; status: string; data: ProviderSurah };
type TranslationPayload = { ayah_number: number; text_ar: string; text_en: string };

let lastProviderRequestAt = 0;

async function supabase<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(supabaseUrl + path, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      apikey: serviceRoleKey,
      Authorization: "Bearer " + serviceRoleKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error("Supabase " + response.status + ": " + (await response.text()).slice(0, 500));
  }
  const raw = await response.text();
  return (raw.trim() ? JSON.parse(raw) : {}) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProviderSlot(): Promise<void> {
  const waitMs = Math.max(0, PROVIDER_DELAY_MS - (Date.now() - lastProviderRequestAt));
  if (waitMs > 0) await sleep(waitMs);
}

async function fetchTranslatedSurah(surahId: number): Promise<ProviderSurah> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    await waitForProviderSlot();
    lastProviderRequestAt = Date.now();
    try {
      const response = await fetch(API_BASE + "/surah/" + surahId + "/" + EDITION, {
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.status === 404 || response.status === 204) {
        throw new Error("The upstream Quran source does not contain the requested " + EDITION + " surah " + surahId + ".");
      }
      if (!response.ok) {
        const details = (await response.text()).slice(0, 300);
        const error = new Error("AlQuranCloud " + response.status + ": " + (details || "request failed"));
        if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES - 1) {
          const retryAfter = Number(response.headers.get("retry-after") ?? 0);
          await sleep(retryAfter > 0 ? retryAfter * 1_000 : 1_500 * 2 ** attempt);
          lastError = error;
          continue;
        }
        throw error;
      }

      const payload = await response.json() as ProviderEnvelope;
      const data = payload?.data;
      if (payload.code !== 200 || payload.status !== "OK" || !data) {
        throw new Error("AlQuranCloud returned an unsuccessful response for surah " + surahId + ".");
      }
      if (data.number !== surahId || data.edition?.identifier !== EDITION ||
          data.edition?.language !== "en" || data.edition?.format !== "text" ||
          !Array.isArray(data.ayahs)) {
        throw new Error("Upstream Quran edition or surah identity did not match the requested source.");
      }
      return data;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /\b429\b|\b500\b|\b502\b|\b503\b|\b504\b|timed out|network|fetch failed/i.test(message);
      if (!retryable || attempt === MAX_RETRIES - 1) throw error;
      await sleep(1_500 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function loadMissingAyahs(): Promise<Map<number, MissingAyahRow[]>> {
  const all: MissingAyahRow[] = [];
  for (let offset = 0; offset <= 6_236; offset += PAGE_SIZE) {
    const page = await supabase<MissingAyahRow[]>(
      "/rest/v1/quran_ayahs?select=surah_id,ayah_number,text_ar" +
        "&or=(text_en.is.null,text_en.eq.)" +
        "&order=surah_id.asc,ayah_number.asc&limit=" + PAGE_SIZE + "&offset=" + offset,
    );
    if (!Array.isArray(page) || page.length > PAGE_SIZE) {
      throw new Error("Unexpected Quran translation backlog response.");
    }
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  if (all.length > 6_236) throw new Error("Quran translation backlog exceeded the canonical 6,236 verse count.");

  const grouped = new Map<number, MissingAyahRow[]>();
  const seen = new Set<string>();
  for (const row of all) {
    if (!Number.isInteger(row.surah_id) || row.surah_id < 1 || row.surah_id > 114 ||
        !Number.isInteger(row.ayah_number) || row.ayah_number < 1 || !row.text_ar?.trim()) {
      throw new Error("The Quran backlog contains an invalid Arabic source row.");
    }
    const key = row.surah_id + ":" + row.ayah_number;
    if (seen.has(key)) throw new Error("The Quran backlog contains duplicate verse " + key + ".");
    seen.add(key);
    const group = grouped.get(row.surah_id) ?? [];
    group.push(row);
    grouped.set(row.surah_id, group);
  }
  return grouped;
}

function mapProviderVerses(
  surahId: number,
  expectedAyahCount: number,
  sourceRows: MissingAyahRow[],
  provider: ProviderSurah,
): TranslationPayload[] {
  if (provider.ayahs.length !== expectedAyahCount) {
    throw new Error("Surah " + surahId + " translation count mismatch: expected " +
      expectedAyahCount + ", received " + provider.ayahs.length + ".");
  }
  const byNumber = new Map<number, string>();
  for (const ayah of provider.ayahs) {
    if (!Number.isInteger(ayah.numberInSurah) || ayah.numberInSurah < 1 ||
        ayah.numberInSurah > expectedAyahCount || !ayah.text?.trim() ||
        byNumber.has(ayah.numberInSurah)) {
      throw new Error("Surah " + surahId + " contains malformed or duplicate English verses.");
    }
    byNumber.set(ayah.numberInSurah, ayah.text.trim());
  }
  if (byNumber.size !== expectedAyahCount) {
    throw new Error("Surah " + surahId + " provider response is incomplete.");
  }

  return sourceRows.map((source) => {
    const textEn = byNumber.get(source.ayah_number);
    if (!textEn) throw new Error("Missing " + EDITION + " translation for " +
      surahId + ":" + source.ayah_number + ".");
    return { ayah_number: source.ayah_number, text_ar: source.text_ar, text_en: textEn };
  });
}

async function writeSurahBatch(surahId: number, rows: TranslationPayload[]): Promise<number> {
  const result = await supabase<number>("/rest/v1/rpc/admin_sync_quran_english_batch", {
    method: "POST",
    body: JSON.stringify({ p_surah_id: surahId, p_edition: EDITION, p_ayahs: rows }),
  });
  const updated = Number(result);
  if (!Number.isInteger(updated) || updated < 0 || updated > rows.length) {
    throw new Error("Quran translation RPC returned an invalid update count for surah " + surahId + ".");
  }
  return updated;
}

async function main(): Promise<void> {
  const [surahs, missingBySurah] = await Promise.all([
    supabase<SurahRow[]>("/rest/v1/quran_surahs?select=id,ayahs_count&order=id.asc"),
    loadMissingAyahs(),
  ]);
  if (!Array.isArray(surahs) || surahs.length !== 114) {
    throw new Error("Canonical Quran catalogue must contain exactly 114 surahs.");
  }
  const counts = new Map(surahs.map((surah) => [surah.id, surah.ayahs_count]));
  const missing = [...missingBySurah.values()].reduce((total, rows) => total + rows.length, 0);
  if (!missing) {
    console.info("[quran-sync] Every Quran verse already has English text.");
    return;
  }
  console.info("[quran-sync] Importing named upstream edition " + EDITION + " for " + missing + " verses.");

  let updatedTotal = 0;
  let concurrentlyFilled = 0;
  for (const [surahId, sourceRows] of [...missingBySurah.entries()].sort((a, b) => a[0] - b[0])) {
    const expectedAyahCount = counts.get(surahId);
    if (!expectedAyahCount || expectedAyahCount < 1 || expectedAyahCount > 286) {
      throw new Error("Invalid canonical verse count for surah " + surahId + ".");
    }
    const provider = await fetchTranslatedSurah(surahId);
    const payload = mapProviderVerses(surahId, expectedAyahCount, sourceRows, provider);
    const updated = await writeSurahBatch(surahId, payload);
    updatedTotal += updated;
    concurrentlyFilled += payload.length - updated;
    console.info("[quran-sync] Surah " + surahId + ": " + updated + "/" + payload.length +
      " empty translations filled; existing manual values preserved.");
  }
  console.info("[quran-sync] Completed: " + updatedTotal + " rows imported, " +
    concurrentlyFilled + " rows left untouched because another writer filled them.");
}

void main().catch((error) => {
  console.error("[quran-sync] Failed:", error);
  process.exitCode = 1;
});
