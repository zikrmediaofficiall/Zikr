export type VerifiableSource = {
  url: string | null;
  license: string | null;
  attribution: string | null;
  authority_level: number | null;
};

/** A source can only be marked verified when a reader can check it and reuse is documented. */
export function sourceVerificationProblem(source: VerifiableSource | null | undefined): string | null {
  if (!source) return "المصدر غير موجود.";
  let url: URL | null = null;
  try {
    url = source.url ? new URL(source.url) : null;
  } catch {
    url = null;
  }
  if (!url || url.protocol !== "https:") return "لا يمكن توثيق مصدر بلا رابط https صالح.";
  if (!source.license?.trim() && !source.attribution?.trim()) return "أضف الترخيص أو الإسناد قبل التوثيق.";
  if (!source.authority_level || source.authority_level < 1) return "حدّد مستوى سلطة المصدر قبل التوثيق.";
  return null;
}
