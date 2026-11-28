import { pickClip, type ClipLibraryStore } from "./clip-library";
import type { VideoGenerationInput, VideoGenerationResult, VideoProvider } from "./types";

/**
 * Serves finished, documented clips that were produced manually. It never calls an external AI service.
 * It is off unless CLIP_LIBRARY_ENABLED=true and a store is supplied.
 */
export class ClipLibraryVideoProvider implements VideoProvider {
  readonly name = "clip_library" as const;

  constructor(
    private readonly store: ClipLibraryStore | null,
    private readonly enabled: boolean,
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.enabled && this.store !== null;
  }

  async generate(input: VideoGenerationInput): Promise<VideoGenerationResult> {
    if (!this.enabled || !this.store) return { ok: false, provider: this.name, error: "clip library is disabled" };
    const rows = await this.store.listApproved();
    const clip = pickClip(rows, input);
    if (!clip) return { ok: false, provider: this.name, error: "no approved clip matches this request" };
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
    };
  }
}
