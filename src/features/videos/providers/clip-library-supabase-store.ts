import { supabaseServerAdminRequest } from "../../../lib/supabase/admin-rest";
import type { ClipLibraryRow, ClipLibraryStore } from "./clip-library";

const CLIP_LIBRARY_SELECT = [
  "id", "title", "category", "audience", "video_url", "cloudinary_public_id",
  "width", "height", "duration_seconds", "audio_muted", "source_kind",
  "rights_license", "rights_evidence", "rights_reviewer", "rights_reviewed_at",
  "status", "times_used", "created_at",
].join(",");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Worker-only service-role adapter. The clip table is intentionally inaccessible
 * to anon/authenticated clients; the feature remains off until its migration is
 * explicitly applied and CLIP_LIBRARY_ENABLED is enabled.
 */
export class SupabaseClipLibraryStore implements ClipLibraryStore {
  async listApproved(): Promise<ClipLibraryRow[]> {
    const rows = await supabaseServerAdminRequest<unknown[]>(
      "/rest/v1/video_clip_library?select=" + encodeURIComponent(CLIP_LIBRARY_SELECT) +
        "&status=eq.approved&order=times_used.asc,created_at.asc,id.asc&limit=100",
      { method: "GET", timeoutMs: 12000, retries: 1 },
    );
    if (!Array.isArray(rows)) throw new Error("Supabase clip library returned an invalid row list.");
    return rows as ClipLibraryRow[];
  }

  async markUsed(id: string): Promise<void> {
    if (!UUID_PATTERN.test(id)) throw new Error("Clip library returned an invalid clip ID.");
    await supabaseServerAdminRequest<unknown>(
      "/rest/v1/rpc/mark_video_clip_library_used",
      {
        method: "POST",
        headers: { "Content-Profile": "public", Prefer: "return=minimal" },
        body: JSON.stringify({ p_clip_id: id }),
        timeoutMs: 12000,
      },
    );
  }
}
