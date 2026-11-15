export type MemorizationEvaluation = {
  score: number;
  summary: string;
  memorization: string;
  errors: string[];
  tajweed: string[];
  audioQuality: string;
  revisionPlan: string[];
};

export function parseMemorizationEvaluation(raw: string): MemorizationEvaluation | null {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        parsed = JSON.parse(cleaned.slice(first, last + 1));
      } catch {
        parsed = null;
      }
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const value = parsed as Record<string, unknown>;
  const arrayOfStrings = (input: unknown) =>
    Array.isArray(input)
      ? input
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];
  const score = Number(value.score);
  if (!Number.isFinite(score)) return null;
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    summary: typeof value.summary === "string" ? value.summary.trim().slice(0, 600) : "",
    memorization: typeof value.memorization === "string" ? value.memorization.trim().slice(0, 400) : "",
    errors: arrayOfStrings(value.errors),
    tajweed: arrayOfStrings(value.tajweed),
    audioQuality: typeof value.audioQuality === "string" ? value.audioQuality.trim().slice(0, 300) : "",
    revisionPlan: arrayOfStrings(value.revisionPlan),
  };
}

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

/**
 * Never surface unvalidated model prose as an evaluation. A malformed text-only
 * response falls back to a local study plan; a malformed audio response reports
 * that no score was issued and asks for a new recording.
 */
export function formatMemorizationEvaluationResponse(raw: string, audioProvided: boolean): string {
  const evaluation = parseMemorizationEvaluation(raw);
  if (evaluation) return formatMemorizationEvaluation(evaluation, audioProvided);

  if (audioProvided) {
    return "تعذر إعداد تقييم موثوق من التسجيل. لم تُصدر درجة أو أخطاء على الأداء. حاول تسجيل المقطع مرة أخرى.";
  }

  return [
    "خطة مراجعة تعليمية — لم يتم تقييم تسجيل صوتي.",
    "قسّم المقرر إلى مقاطع قصيرة، واقرأ كل مقطع من المصحف بتأنٍ.",
    "أعد تسميع كل مقطع دون النظر، ثم راجع مواضع التوقف والكلمات التي تحتاج إلى تثبيت.",
    "كرّر المراجعة في اليوم التالي، واجمع المقاطع المتقنة في تسميع واحد.",
  ].join("\n\n");
}
