export const CURRENT_VIDEO_RENDERER_VERSION = "2026-11-21-visual-catalog-v11";

export function versionedTemplateLabel(slug: string, version: number): string {
  return `${slug}@${version}+renderer:${CURRENT_VIDEO_RENDERER_VERSION}`;
}
