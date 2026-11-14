export function isKidsVideoGenerationRequestContent(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const content = value as Record<string, unknown>;
  if (content.audience === "kids") return true;
  // Preserve the legacy story shape only when no audience was recorded. An
  // explicitly general (or otherwise non-Kids) story must never enter the Kids feed.
  return content.audience === undefined &&
    content.sourceType === "story" &&
    content.type === "story";
}
