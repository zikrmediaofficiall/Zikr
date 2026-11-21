import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import { CURATED_AUDIO_LIBRARY, getCuratedAudioByStoragePath } from "@/lib/audio/curated-library";

export type SiteAudioAsset = {
  id: string;
  kind: "adhan" | "salawat" | "dhikr";
  title: string | null;
  url: string;
  updatedAt: string | null;
  isPrimary: boolean;
  isHuman: boolean;
  sourceUrl: string | null;
  sourceName: string | null;
  license: string | null;
  attribution: string | null;
  isCurated: boolean;
};

const DEFAULT_CURATED_KEYS = new Set([
  "adhan:beautiful",
  "salawat:muhammad-pbuh",
  "dhikr:subhanallah-1",
]);

function getCuratedFallbackLibrary(): SiteAudioAsset[] {
  return CURATED_AUDIO_LIBRARY.map(audio => ({
    id: "curated:" + audio.key,
    kind: audio.kind,
    title: audio.title,
    url: audio.webUrl,
    updatedAt: null,
    isPrimary: DEFAULT_CURATED_KEYS.has(audio.key),
    isHuman: true,
    sourceUrl: audio.sourceUrl,
    sourceName: audio.sourceName,
    license: audio.license,
    attribution: audio.attribution ?? null,
    isCurated: true,
  }));
}

function resolveAudio(storagePath: string, db: ReturnType<typeof createAdminClient>) {
  const curated = getCuratedAudioByStoragePath(storagePath);
  if (curated) {
    return {
      url: curated.webUrl,
      isHuman: true,
      sourceUrl: curated.sourceUrl,
      sourceName: curated.sourceName,
      license: curated.license,
      attribution: curated.attribution ?? null,
      isCurated: true,
    };
  }

  if (/^https?:\/\//i.test(storagePath)) {
    return {
      url: storagePath,
      isHuman: false,
      sourceUrl: storagePath,
      sourceName: "مصدر خارجي",
      license: null,
      attribution: null,
      isCurated: false,
    };
  }

  return {
    url: db.storage.from("site-audio").getPublicUrl(storagePath).data.publicUrl,
    isHuman: false,
    sourceUrl: null,
    sourceName: null,
    license: null,
    attribution: null,
    isCurated: false,
  };
}

export async function getSiteAudioLibrary(): Promise<SiteAudioAsset[]> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("site_audio_assets")
      .select("id,kind,title,storage_path,is_primary,updated_at,created_at")
      .in("kind", ["adhan", "salawat", "dhikr"])
      .order("kind", { ascending: true })
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    // A successful empty result is authoritative (for example, when an
    // administrator intentionally unpublished all assets). Use the curated
    // catalogue only when the database service is unavailable, not when it
    // returns an empty published list.
    if (error) throw error;

    return (data ?? []).map(asset => {
      const resolved = resolveAudio(asset.storage_path, db);
      return {
        id: asset.id,
        kind: asset.kind as SiteAudioAsset["kind"],
        title: asset.title ?? null,
        updatedAt: asset.updated_at ?? null,
        isPrimary: Boolean(asset.is_primary),
        ...resolved,
      };
    });
  } catch (error) {
    console.error(
      "[site-audio] Database catalogue unavailable; serving the bundled rights-reviewed catalogue:",
      error instanceof Error ? error.message : "unknown error",
    );
    return getCuratedFallbackLibrary();
  }
}

export async function getPrimarySiteAudioAssets(): Promise<Record<string, SiteAudioAsset>> {
  const library = await getSiteAudioLibrary();
  return Object.fromEntries(library.filter(asset => asset.isPrimary).map(asset => [asset.kind, asset]));
}
