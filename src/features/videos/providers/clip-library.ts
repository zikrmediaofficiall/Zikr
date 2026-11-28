import type { VideoGenerationInput } from "./types";

export type ClipCategory = "quran" | "hadith" | "dua" | "adhkar" | "story" | "kids" | "general";
export type ClipSourceKind = "flow_manual" | "owned_original" | "stock_licensed" | "other_documented";

export type ClipLibraryRow = {
  id: string;
  title: string;
  category: ClipCategory;
  audience: "general" | "kids";
  video_url: string;
  width: number;
  height: number;
  duration_seconds: number;
  audio_muted: boolean;
  source_kind: ClipSourceKind;
  rights_license: string;
  rights_evidence: string;
  rights_reviewer: string;
  rights_reviewed_at: string;
  status: "pending" | "approved" | "retired";
  times_used: number;
  created_at: string;
};

export const CLIP_TARGET_HEIGHT = 720;
export const CLIP_TARGET_SECONDS = 8;

export type ClipValidation = { ok: true } | { ok: false; reason: string };

/** A clip may enter the pipeline only when it is documented, muted, https-hosted and at least 720p on its short side. */
export function validateClipRow(row: ClipLibraryRow): ClipValidation {
  if (row.status !== "approved") return { ok: false, reason: "clip is not approved" };
  if (!/^https:\/\//i.test(row.video_url)) return { ok: false, reason: "clip URL must use https" };
  if (!row.audio_muted) return { ok: false, reason: "clip audio must be muted before use" };
  if (Math.min(row.width, row.height) < CLIP_TARGET_HEIGHT) return { ok: false, reason: "clip is below the 720p target" };
  if (!(row.duration_seconds >= 2 && row.duration_seconds <= 60)) return { ok: false, reason: "clip duration is out of range" };
  for (const field of [row.rights_license, row.rights_evidence, row.rights_reviewer, row.rights_reviewed_at]) {
    if (!field || !field.trim()) return { ok: false, reason: "clip rights documentation is incomplete" };
  }
  return { ok: true };
}

function wantedCategory(input: VideoGenerationInput): ClipCategory {
  if (input.audience === "kids") return "kids";
  const category = input.category.trim().toLowerCase();
  const known: ClipCategory[] = ["quran", "hadith", "dua", "adhkar", "story"];
  return (known as string[]).includes(category) ? (category as ClipCategory) : "general";
}

/**
 * Deterministic, balanced pick: audience must match, the category must match (or the clip is general),
 * the least-used clip wins, older clips win ties, and the id breaks any remaining tie.
 */
export function pickClip(rows: readonly ClipLibraryRow[], input: VideoGenerationInput): ClipLibraryRow | null {
  const audience = input.audience ?? "general";
  const wanted = wantedCategory(input);
  const eligible = rows.filter((row) =>
    validateClipRow(row).ok &&
    row.audience === audience &&
    (row.category === wanted || row.category === "general") &&
    (!input.format || (input.format === "vertical" ? row.height >= row.width : row.width >= row.height)),
  );
  if (!eligible.length) return null;
  return [...eligible].sort((a, b) =>
    (a.category === wanted ? 0 : 1) - (b.category === wanted ? 0 : 1) ||
    a.times_used - b.times_used ||
    a.created_at.localeCompare(b.created_at) ||
    a.id.localeCompare(b.id),
  )[0];
}

export interface ClipLibraryStore {
  listApproved(): Promise<ClipLibraryRow[]>;
  markUsed(id: string): Promise<void>;
}
