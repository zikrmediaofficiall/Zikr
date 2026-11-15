export type MemorizationEvaluation = {
  score: number;
  summary: string;
  memorization: string;
  errors: string[];
  tajweed: string[];
  audioQuality: string;
  revisionPlan: string[];
};

/**
 * A text-only request is a study-plan request, not a recitation evaluation.
 * Never render a zero score or "no errors detected" when no audio was assessed.
 */
export function formatMemorizationEvaluation(
  evaluation: MemorizationEvaluation,
  audioProvided: boolean,
): string {
  if (!audioProvided) {
    const sections = [
      "خطة مراجعة تعليمية — لم يتم تقييم تسجيل صوتي.",
      evaluation.tajweed.length
        ? `ملاحظات تعليمية في التجويد:\n- ${evaluation.tajweed.join("\n- ")}`
        : "",
      evaluation.revisionPlan.length
        ? `خطة المراجعة:\n- ${evaluation.revisionPlan.join("\n- ")}`
        : "",
    ].filter(Boolean);
    return sections.join("\n\n");
  }

  const sections = [
    `الدرجة: ${evaluation.score}/100`,
    evaluation.summary ? `التقييم العام: ${evaluation.summary}` : "",
    evaluation.memorization ? `جودة الحفظ: ${evaluation.memorization}` : "",
    evaluation.audioQuality ? `جودة التسجيل: ${evaluation.audioQuality}` : "",
    evaluation.errors.length
      ? `أخطاء التسميع:\n- ${evaluation.errors.join("\n- ")}`
      : "أخطاء التسميع: لم تُرصد أخطاء محددة في التسجيل.",
    evaluation.tajweed.length
      ? `ملاحظات التجويد:\n- ${evaluation.tajweed.join("\n- ")}`
      : "",
    evaluation.revisionPlan.length
      ? `خطة المراجعة:\n- ${evaluation.revisionPlan.join("\n- ")}`
      : "",
  ].filter(Boolean);
  return sections.join("\n\n");
}
