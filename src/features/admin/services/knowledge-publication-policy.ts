export type KnowledgePublicationKind = "biography" | "hadith";

export type KnowledgePublicationInput = {
  kind: KnowledgePublicationKind;
  published: boolean;
  wasPublished?: boolean;
  arabicText: string | null | undefined;
  source: string | null | undefined;
  grade?: string | null | undefined;
};

/**
 * New biographical records must carry an Arabic biography and an explicit
 * source before first publication. Existing published legacy records are
 * grandfathered so editing them does not silently unpublish or block them;
 * their missing references remain an owner content-remediation task.
 *
 * Hadith publication always requires Arabic text, a reference and a grade.
 */
export function validateKnowledgePublication(
  input: KnowledgePublicationInput,
): string | null {
  if (!input.published) return null;

  const arabicText = input.arabicText?.trim() ?? "";
  const source = input.source?.trim() ?? "";
  const grade = input.grade?.trim() ?? "";

  if (input.kind === "biography" && input.wasPublished) return null;

  if (!arabicText) return "النص العربي مطلوب قبل النشر.";
  if (!source) return "المصدر أو المرجع مطلوب قبل النشر.";
  if (input.kind === "hadith" && !grade) {
    return "درجة الحديث مطلوبة قبل النشر.";
  }

  return null;
}

export function mergeKnowledgeSourceMetadata(
  existing: Record<string, unknown> | null | undefined,
  source: string | null | undefined,
): Record<string, unknown> {
  const metadata = { ...(existing ?? {}) };
  const normalizedSource = source?.trim();
  if (normalizedSource) metadata.source = normalizedSource;
  return metadata;
}
