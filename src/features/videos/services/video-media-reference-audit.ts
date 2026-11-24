type ReferenceQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

type ReferenceQuery = {
  select(columns: string): ReferenceQuery;
  or(filters: string): ReferenceQuery;
  not(column: string, operator: "is", value: null): ReferenceQuery;
  order(column: string, options: { ascending: boolean }): ReferenceQuery;
  range(from: number, to: number): Promise<ReferenceQueryResult>;
};

type DynamicSupabaseClient = {
  from(table: string): ReferenceQuery;
};

export type GeneratedVideoReferenceHit = {
  table: string;
  column: string;
  recordId: string;
  matches: string[];
};

type ReferencePattern = {
  table: string;
  column: string;
  orderBy: string;
  kind: "text" | "json";
};

const PAGE_SIZE = 1000;
const MAX_ROWS_PER_PATTERN = 5000;
const MAX_QURAN_AUDIO_METADATA_ROWS = 25000;
const MAX_ENCODING_DEPTH = 5;

const TEXT_COLUMNS: ReadonlyArray<[string, string, string]> = [
  ["kids_content", "video_url", "id"],
  ["kids_content", "featured_image_url", "id"],
  ["media_assets", "url", "id"],
  ["media_assets", "storage_path", "id"],
  ["social_sync_jobs", "source_media_url", "id"],
  ["social_sync_jobs", "source_media_path", "id"],
  ["social_sync_jobs", "thumbnail_url", "id"],
  ["social_sync_jobs", "source_url", "id"],
  ["social_sync_jobs", "description", "id"],
  ["social_sync_jobs", "last_error", "id"],
  ["youtube_feed_cache", "video_url", "video_id"],
  ["youtube_feed_cache", "thumbnail_url", "video_id"],
  ["youtube_feed_cache", "description", "video_id"],
  ["content_agent_queue", "source_url", "id"],
  ["content_agent_queue", "body", "id"],
  ["content_agent_queue", "error_message", "id"],
  ["content_sources", "url", "id"],
  ["content_library", "cover_url", "id"],
  ["content_library", "body_ar", "id"],
  ["content_library", "body_en", "id"],
  ["content_library", "summary_ar", "id"],
  ["content_library", "summary_en", "id"],
  ["kids_games", "description_ar", "id"],
  ["kids_games", "description_en", "id"],
  ["kids_games", "short_description_ar", "id"],
  ["kids_games", "cover_url", "id"],
  ["kids_games", "icon_url", "id"],
  ["kids_game_levels", "description_ar", "id"],
  ["kids_game_levels", "objective_ar", "id"],
  ["kids_game_levels", "objective_en", "id"],
  ["kids_game_questions", "prompt_ar", "id"],
  ["kids_game_questions", "question_ar", "id"],
  ["kids_game_questions", "question_en", "id"],
  ["kids_game_questions", "explanation_ar", "id"],
  ["kids_game_questions", "explanation_en", "id"],
  ["articles", "featured_image_url", "id"],
  ["articles", "summary", "id"],
  ["articles", "summary_ar", "id"],
  ["articles", "summary_en", "id"],
  ["articles", "content", "id"],
  ["articles", "content_ar", "id"],
  ["articles", "content_en", "id"],
  ["battles", "featured_image_url", "id"],
  ["battles", "thumbnail_url", "id"],
  ["battle_events", "content_ar", "id"],
  ["battle_events", "content_en", "id"],
  ["companions", "featured_image_url", "id"],
  ["companions", "thumbnail_url", "id"],
  ["companion_stories", "content_ar", "id"],
  ["companion_stories", "content_en", "id"],
  ["conquests", "featured_image_url", "id"],
  ["conquests", "thumbnail_url", "id"],
  ["conquest_events", "content_ar", "id"],
  ["conquest_events", "content_en", "id"],
  ["prophets", "featured_image_url", "id"],
  ["prophets", "thumbnail_url", "id"],
  ["profiles", "avatar_url", "id"],
  ["profiles", "bio", "id"],
  ["quran_audio", "storage_path", "id"],
  ["quran_audio", "audio_url", "id"],
  ["site_audio_assets", "storage_path", "id"],
  ["quran_audio", "storage_url", "id"],
  ["quran_audio", "source_url", "id"],
  ["quran_ayahs", "audio_url", "id"],
  ["quran_reciters", "thumbnail_url", "id"],
  ["quran_reciters", "base_url_template", "id"],
  ["scholars", "thumbnail_url", "id"],
  ["scholars", "website_url", "id"],
  ["scholars", "youtube_url", "id"],
  ["scholars", "bio_ar", "id"],
  ["scholars", "bio_en", "id"],
  ["social_platform_profiles", "avatar_url", "platform"],
  ["social_platform_profiles", "cover_url", "platform"],
  ["social_platform_profiles", "page_url", "platform"],
  ["social_platform_profiles", "description", "platform"],
  ["social_platform_profiles", "website", "platform"],
  ["tawasheeh", "audio_url", "id"],
  ["tawasheeh", "thumbnail_url", "id"],
  ["tawasheeh", "description_ar", "id"],
  ["tawasheeh", "description_en", "id"],
  ["notifications", "body", "id"],
  ["pinned_messages", "body", "id"],
  ["pinned_messages", "cta_href", "id"],
  ["hadith_books", "source", "id"],
  ["prophet_sections", "content_ar", "id"],
  ["prophet_sections", "content_en", "id"],
  ["quran_tafsir", "source_url", "id"],
  ["stories", "content", "id"],
  ["stories", "summary", "id"],
];

const JSON_COLUMNS: ReadonlyArray<[string, string, string]> = [
  ["admin_queue_alert_deliveries", "payload", "alert_key"],
  ["videos", "metadata", "id"],
  ["admin_settings", "value", "key"],
  ["articles", "metadata", "id"],
  ["battles", "metadata", "id"],
  ["companions", "metadata", "id"],
  ["competitions", "metadata", "id"],
  ["conquests", "metadata", "id"],
  ["content_agent_queue", "metadata", "id"],
  ["content_library", "metadata", "id"],
  ["content_library", "seo", "id"],
  ["content_library", "media", "id"],
  ["content_revisions", "snapshot", "id"],
  ["kids_games", "config", "id"],
  ["kids_games", "metadata", "id"],
  ["kids_game_levels", "config", "id"],
  ["kids_game_questions", "options", "id"],
  ["kids_game_questions", "options_ar", "id"],
  ["kids_game_questions", "options_en", "id"],
  ["content_translation_queue", "source_payload", "id"],
  ["content_translation_queue", "draft_payload", "id"],
  ["duas", "metadata", "id"],
  ["kids_content", "quiz_data", "id"],
  ["kids_content", "metadata", "id"],
  ["kids_game_results", "metadata", "id"],
  ["media_assets", "metadata", "id"],
  ["notifications", "metadata", "id"],
  ["prophets", "metadata", "id"],
  ["push_runtime_settings", "value", "key"],
  ["quran_audio", "metadata", "id"],
  ["quran_reciters", "metadata", "id"],
  ["scholars", "metadata", "id"],
  ["site_settings", "value", "key"],
  ["stories", "metadata", "id"],
  ["user_behavior", "metadata", "id"],
  ["content_agent_runs", "details", "id"],
  ["kids_achievements", "criteria", "id"],
  ["video_template_versions", "config", "id"],
  ["tawasheeh", "metadata", "id"],
];

const ENCODED_REFERENCE_FILTERS = [
  "%automated%",
  "%auto-%",
  "%61%75%74%6f%2d%",
  "%2561%2575%2574%256f%252d%",
];

const patterns: ReferencePattern[] = [
  ...TEXT_COLUMNS.map(([table, column, orderBy]) => ({ table, column, orderBy, kind: "text" as const })),
  ...JSON_COLUMNS.map(([table, column, orderBy]) => ({ table, column, orderBy, kind: "json" as const })),
];

function collectCandidateReferences(value: unknown, candidates: ReadonlySet<string>): string[] {
  const hits = new Set<string>();
  const visit = (entry: unknown): void => {
    if (entry === null || entry === undefined) return;
    if (Array.isArray(entry)) {
      for (const item of entry) visit(item);
      return;
    }
    if (typeof entry === "object") {
      for (const [key, item] of Object.entries(entry as Record<string, unknown>)) {
        visit(key);
        visit(item);
      }
      return;
    }
    if (typeof entry !== "string" || !entry.trim()) return;
    const variants = new Set([entry]);
    let decoded = entry;
    for (let pass = 0; pass < MAX_ENCODING_DEPTH; pass += 1) {
      try {
        const next = decodeURIComponent(decoded);
        if (next === decoded) break;
        variants.add(next);
        decoded = next;
      } catch {
        break;
      }
    }
    for (const variant of variants) {
      for (const candidate of candidates) {
        const encodedSegments = candidate.split("/").map(encodeURIComponent).join("/");
        if (
          variant === candidate ||
          variant.includes(candidate) ||
          variant.includes(encodedSegments) ||
          variant.includes(encodeURIComponent(candidate))
        ) hits.add(candidate);
      }
    }
  };
  visit(value);
  return [...hits];
}

export function findGeneratedVideoReferences(value: unknown, candidateValues: Iterable<string>): string[] {
  const candidates = new Set([...candidateValues].map((value) => value.trim()).filter(Boolean));
  return collectCandidateReferences(value, candidates);
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  work: (value: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    for (;;) {
      const current = index++;
      if (current >= values.length) return;
      results[current] = await work(values[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function scanPattern(
  client: DynamicSupabaseClient,
  pattern: ReferencePattern,
  candidates: ReadonlySet<string>,
  excludedRecordIds: ReadonlySet<string>,
): Promise<GeneratedVideoReferenceHit[]> {
  const maxRows = pattern.table === "quran_audio" && pattern.column === "metadata"
    ? MAX_QURAN_AUDIO_METADATA_ROWS
    : MAX_ROWS_PER_PATTERN;
  const found: GeneratedVideoReferenceHit[] = [];
  const maxPages = Math.ceil(maxRows / PAGE_SIZE);
  for (let page = 0; page <= maxPages; page += 1) {
    const offset = page * PAGE_SIZE;
    const selectedColumns = pattern.orderBy === pattern.column
      ? pattern.column
      : pattern.column + "," + pattern.orderBy;
    let query = client.from(pattern.table).select(selectedColumns);
    if (pattern.kind === "json") {
      query = query.not(pattern.column, "is", null);
    } else {
      const filters = ENCODED_REFERENCE_FILTERS
        .map((filter) => `${pattern.column}.ilike.${filter}`)
        .join(",");
      query = query.or(filters);
    }
    const { data, error } = await query
      .order(pattern.orderBy, { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Generated-video reference inventory failed for ${pattern.table}.${pattern.column}: ${error.message}`);
    }
    if (!Array.isArray(data)) {
      throw new Error(`Generated-video reference inventory was incomplete for ${pattern.table}.${pattern.column}.`);
    }
    if (data.length > 0) {
      for (const row of data as Array<Record<string, unknown>>) {
        const recordId = String(row[pattern.orderBy] ?? "unknown");
        if (excludedRecordIds.has(recordId)) continue;
        const matches = collectCandidateReferences(row[pattern.column], candidates);
        if (matches.length) {
          found.push({
            table: pattern.table,
            column: pattern.column,
            recordId,
            matches,
          });
        }
      }
    }
    if (data.length < PAGE_SIZE) return found;
    if (offset + data.length >= maxRows) {
      throw new Error(`Generated-video reference inventory reached the safety cap for ${pattern.table}.${pattern.column}; refusing deletion.`);
    }
  }
  throw new Error(`Generated-video reference inventory exceeded its bounded scan for ${pattern.table}.${pattern.column}.`);
}

export async function findUnmanagedGeneratedVideoReferences(
  supabaseClient: unknown,
  candidateValues: Iterable<string>,
  excludedRecords: Record<string, ReadonlySet<string>> = {},
): Promise<GeneratedVideoReferenceHit[]> {
  const candidates = new Set([...candidateValues].map((value) => value.trim()).filter(Boolean));
  if (candidates.size === 0) return [];
  const client = supabaseClient as DynamicSupabaseClient;
  const batches = await mapWithConcurrency(patterns, 6, (pattern) =>
    scanPattern(client, pattern, candidates, excludedRecords[pattern.table + "." + pattern.column] ?? excludedRecords[pattern.table] ?? new Set<string>()),
  );
  return batches.flat();
}
