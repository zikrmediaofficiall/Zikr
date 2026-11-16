const SUSPICIOUS_RELIGIOUS_ATTRIBUTION = /(?<![\p{L}\p{M}])(?:قال الله|قال تعالى|قال رسول الله|رسول الله|قال النبي|عن النبي|حديث قدسي|حديث نبوي|رضي الله عنه|صلى الله عليه وسلم|عليه السلام)(?![\p{L}\p{M}])/u;

export function hasSuspiciousReligiousAttribution(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u0640\u064B-\u065F\u0670]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return SUSPICIOUS_RELIGIOUS_ATTRIBUTION.test(normalized);
}
