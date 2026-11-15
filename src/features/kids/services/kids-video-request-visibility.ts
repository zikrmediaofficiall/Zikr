import { isKidsVideoContentMarker } from "@/features/videos/services/video-audience-visibility";

export function isKidsVideoGenerationRequestContent(value: unknown): boolean {
  return isKidsVideoContentMarker(value);
}
