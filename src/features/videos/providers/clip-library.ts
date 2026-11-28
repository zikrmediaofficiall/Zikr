import type { VideoGenerationInput } from "./types";
import { assertCloudinaryVideoUrl } from "../services/video-media-url";

export type ClipCategory = "quran" | "hadith" | "dua" | "adhkar" | "story" | "kids" | "general";
export type ClipSourceKind = "flow_manual" | "owned_original" | "stock_licensed" | "other_documented";

export type ClipLibraryRow = {
  id: string;
  title: string;
  category: ClipCategory;
  audience: "general" | "kids";
  video_url: string;
  cloudinary_public_id: string;
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

const CLIP_CATEGORIES = new Set<ClipCategory>(["quran", "hadith", "dua", "adhkar", "story", "kids", "general"]);
const CLIP_AUDIENCES = new Set(["general", "kids"]);
const CLIP_SOURCES = new Set<ClipSourceKind>(["flow_manual", "owned_original", "stock_licensed", "other_documented"]);

/**
 * A clip enters the render pipeline only when its Cloudinary tenant, public ID,
 * media facts, audience and rights-review evidence all match the approved row.
 */
export function validateClipRow(
  row: ClipLibraryRow,
  cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME,
): ClipValidation {
  if (!row || row.status !== "approved") return { ok: false, reason: "clip is not approved" };
  if (!CLIP_CATEGORIES.has(row.category) || !CLIP_AUDIENCES.has(row.audience)) {
    return { ok: false, reason: "clip category or audience is invalid" };
  }
  if (row.category === "kids" && row.audience !== "kids") {
    return { ok: false, reason: "Kids clips must be isolated to the Kids audience" };
  }
  if (row.audio_muted !== true) return { ok: false, reason: "clip audio must be muted before use" };
  if (!Number.isInteger(row.width) || !Number.isInteger(row.height) ||
      Math.min(row.width, row.height) < CLIP_TARGET_HEIGHT) {
    return { ok: false, reason: "clip is below the 720p target" };
  }
  if (!(Number.isFinite(row.duration_seconds) && row.duration_seconds >= 2 && row.duration_seconds <= 60)) {
    return { ok: false, reason: "clip duration is out of range" };
  }
  if (!Number.isSafeInteger(row.times_used) || row.times_used < 0) {
    return { ok: false, reason: "clip usage counter is invalid" };
  }
  if (!CLIP_SOURCES.has(row.source_kind)) return { ok: false, reason: "clip source kind is invalid" };

  for (const field of [row.rights_license, row.rights_evidence, row.rights_reviewer]) {
    if (typeof field !== "string" || !field.trim()) {
      return { ok: false, reason: "clip rights documentation is incomplete" };
    }
  }
  if (typeof row.rights_reviewed_at !== "string" || !Number.isFinite(Date.parse(row.rights_reviewed_at))) {
    return { ok: false, reason: "clip rights review timestamp is invalid" };
  }
  if (typeof row.cloudinary_public_id !== "string" || !row.cloudinary_public_id.trim()) {
    return { ok: false, reason: "Cloudinary public ID is missing" };
  }

  try {
    const safeUrl = new URL(assertCloudinaryVideoUrl(row.video_url, "Clip library", cloudName));
    if (!/\.(mp4|webm|mov|m4v)$/i.test(safeUrl.pathname)) {
      return { ok: false, reason: "clip must be a Cloudinary video asset" };
    }
    if (safeUrl.search || safeUrl.hash) {
      return { ok: false, reason: "clip URL must be a canonical Cloudinary delivery URL" };
    }
    const segments = safeUrl.pathname.split("/").filter(Boolean);
    const uploadIndex = segments.indexOf("upload");
    if (uploadIndex < 0) return { ok: false, reason: "clip URL is not a Cloudinary upload asset" };
    let assetSegments = segments.slice(uploadIndex + 1);
    if (assetSegments[0] && /^v\d+$/.test(assetSegments[0])) assetSegments = assetSegments.slice(1);
    const assetPublicId = assetSegments.join("/").replace(/\.(mp4|webm|mov|m4v)$/i, "");
    if (assetPublicId !== row.cloudinary_public_id.trim()) {
      return { ok: false, reason: "Cloudinary public ID does not match the clip URL" };
    }
  } catch {
    return { ok: false, reason: "clip URL must belong to the configured Cloudinary cloud" };
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
 * Deterministic, balanced pick: exact category first, then least-used, then
 * oldest, then ID. Audience and orientation are strict filters.
 */
export function pickClip(
  rows: readonly ClipLibraryRow[],
  input: VideoGenerationInput,
  cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME,
): ClipLibraryRow | null {
  const audience = input.audience ?? "general";
  const wanted = wantedCategory(input);
  const eligible = rows.filter((row) =>
    validateClipRow(row, cloudName).ok &&
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
