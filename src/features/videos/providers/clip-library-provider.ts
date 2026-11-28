import { pickClip, type ClipLibraryStore } from "./clip-library";
import type { VideoGenerationInput, VideoGenerationResult, VideoProvider } from "./types";

/**
 * Serves finished, reviewed Cloudinary clips. This provider never calls an AI
 * service and stays unavailable unless CLIP_LIBRARY_ENABLED and a store exist.
 */
export class ClipLibraryVideoProvider implements VideoProvider {
  readonly name = "clip_library" as const;

  constructor(
    private readonly store: ClipLibraryStore | null,
    private readonly enabled: boolean,
    private readonly cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.enabled && this.store !== null;
  }

  async generate(input: VideoGenerationInput): Promise<VideoGenerationResult> {
    if (!this.enabled || !this.store) {
      return { ok: false, provider: this.name, error: "clip library is disabled" };
    }
    const rows = await this.store.listApproved();
    const clip = pickClip(rows, input, this.cloudName);
    if (!clip) {
      return { ok: false, provider: this.name, error: "no approved Cloudinary clip matches this request" };
    }
    await this.store.markUsed(clip.id);
    return {
      ok: true,
      provider: this.name,
      videoUrl: clip.video_url,
      providerJobId: clip.id,
      durationSeconds: clip.duration_seconds,
      width: clip.width,
      height: clip.height,
      audioPresent: false,
      clipLibraryRights: {
        clipId: clip.id,
        category: clip.category,
        audience: clip.audience,
        sourceKind: clip.source_kind,
        cloudinaryPublicId: clip.cloudinary_public_id,
        license: clip.rights_license,
        evidence: clip.rights_evidence,
        reviewedBy: clip.rights_reviewer,
        reviewedAt: clip.rights_reviewed_at,
        audioMuted: clip.audio_muted,
        width: clip.width,
        height: clip.height,
        durationSeconds: clip.duration_seconds,
      },
    };
  }
}
