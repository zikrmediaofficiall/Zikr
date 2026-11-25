export type PublishSource = { verified: boolean | null; url: string | null } | null | undefined;

/** Returns an Arabic error message when the linked source cannot back a publication, otherwise null. */
export function publishSourceProblem(source: PublishSource): string | null {
  if (!source) return "المصدر المرتبط غير موجود. اربط مصدرًا موثوقًا قبل النشر.";
  if (source.verified !== true) return "لا يمكن النشر من مصدر غير موثّق. وثّق المصدر من صفحة المصادر أولًا.";
  return null;
}
