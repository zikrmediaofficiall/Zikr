export function isKidsVideoGenerationRequestContent(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const content = value as Record<string, unknown>;
  return content.audience === "kids" ||
    (content.sourceType === "story" && content.type === "story");
}
