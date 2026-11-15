export function isGeneralAudienceVideoMetadata(metadata: unknown): boolean {
  if (metadata === null || metadata === undefined) return true;
  if (typeof metadata !== "object" || Array.isArray(metadata)) return false;

  const audience = (metadata as Record<string, unknown>).audience;
  return audience === null || audience === undefined || audience === "general";
}
