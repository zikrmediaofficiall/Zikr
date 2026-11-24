export const DEFAULT_DAILY_PROMO_VIDEO_TARGET = 2;
export const MAX_DAILY_PROMO_VIDEO_TARGET = 8;

export type PromotionalVideoConcept = {
  key: string;
  title: string;
  description: string;
  hook: string;
  narration: string;
  visualTheme: "gold" | "dawn" | "emerald" | "night" | "paper" | "rose" | "calm";
};

/** Original product-awareness scripts; they make no religious attribution or performance promises. */
export const ZIKR_PROMOTIONAL_VIDEO_CONCEPTS: readonly PromotionalVideoConcept[] = [
  {
    key: "one-quiet-minute",
    title: "دقيقة هدوء وسط يومك",
    description: "اكتشف القرآن والأذكار والأدعية في منصة ذِكر.",
    hook: "تقدر تلاقي دقيقة هدوء وسط اليوم؟",
    narration: "وسط زحمة اليوم، خُد دقيقة هدوء. افتح منصة ذِكر واختار بين القرآن والأذكار والأدعية، واقرأ على مهل وبالوقت اللي يناسبك. ابدأ بخطوة بسيطة، واكتشف الموقع بنفسك. حمّل تطبيق ذِكر لأندرويد من الرابط الموجود في الوصف.",
    visualTheme: "dawn",
  },
  {
    key: "small-steady-step",
    title: "ابدأ بخطوة صغيرة",
    description: "رسالة دعائية أصلية لا تنسب نصًا دينيًا إلى مصدر.",
    hook: "مش لازم تبدأ بخطة كبيرة.",
    narration: "مش لازم تبدأ بخطة كبيرة. افتح ذِكر، اختار قراءة قصيرة أو ذكر يناسب وقتك، وارجع له لما تحب. القرآن والأذكار والأدعية متاحة في منصة واحدة. زور موقع ذِكر، ولو تحب استخدم التطبيق؛ تنزيل أندرويد من الرابط في الوصف.",
    visualTheme: "gold",
  },
  {
    key: "your-own-pace",
    title: "على وقتك وبإيقاعك",
    description: "اكتشف محتوى ذِكر واختر ما يناسب وقتك.",
    hook: "خلي وقتك للذكر بطريقتك.",
    narration: "كل واحد له وقته وإيقاعه. في منصة ذِكر تقدر تتصفح القرآن والأذكار والأدعية، وتختار ما تقرأه بهدوء. افتح الموقع وشوف الأقسام بنفسك، وحمّل تطبيق ذِكر لأندرويد من الرابط في الوصف لو تحب يكون أقرب لك.",
    visualTheme: "emerald",
  },
  {
    key: "open-a-door",
    title: "افتح بابًا لوقت هادئ",
    description: "منصة عربية لاكتشاف القرآن والأذكار والأدعية.",
    hook: "إشعار واحد أقل، ووقت أهدأ لنفسك.",
    narration: "خفف الضوضاء لدقيقة، وافتح مساحة لقراءة هادئة. منصة ذِكر تجمع أقسامًا للقرآن والأذكار والأدعية، فتصفح ما يناسبك من غير استعجال. زر الموقع، واكتشف تطبيق ذِكر لأندرويد عبر رابط التنزيل الموجود في الوصف.",
    visualTheme: "night",
  },
  {
    key: "choose-your-reading",
    title: "اختار ما تقرأه اليوم",
    description: "ابدأ من قسم واحد في ذِكر، ثم أكمل على مهل.",
    hook: "قرآن، أذكار، أو دعاء؟ ابدأ بما يناسب يومك.",
    narration: "قرآن، أذكار، أو دعاء؟ ابدأ بالقسم اللي يناسب يومك، وخلي القراءة على مهل. في منصة ذِكر تقدر تتصفح هذه الأقسام في مكان واحد. زور الموقع لتتعرف عليها، وحمّل تطبيق ذِكر لأندرويد من الرابط في الوصف.",
    visualTheme: "paper",
  },
  {
    key: "carry-zikr-with-you",
    title: "خلي ذِكر قريب منك",
    description: "تعرف على موقع ذِكر وتطبيق Android الرسمي.",
    hook: "خلّي لحظة الذكر قريبة، حتى في الأيام المزدحمة.",
    narration: "الأيام بتجري، لكن ممكن تختار لحظة قصيرة تقرأ فيها. افتح منصة ذِكر، وتصفح القرآن والأذكار والأدعية وقت ما يناسبك. الموقع متاح للجميع، وتطبيق أندرويد له رابط تنزيل رسمي في الوصف. اكتشف ذِكر وابدأ براحتك.",
    visualTheme: "rose",
  },
  {
    key: "browse-with-care",
    title: "اقرأ بهدوء وتأنٍ",
    description: "تصفح مكتبة ذِكر العربية من الموقع أو التطبيق.",
    hook: "اقرأ على مهلك؛ مش كل حاجة لازم تتعمل بسرعة.",
    narration: "في لحظة هادئة، افتح منصة ذِكر وتصفح القرآن والأذكار والأدعية. خُد وقتك في القراءة واختار ما يناسب يومك. تقدر تزور الموقع من أي متصفح، أو تحمّل تطبيق ذِكر لأندرويد من الرابط الموجود في الوصف.",
    visualTheme: "calm",
  },
  {
    key: "a-gentle-start",
    title: "بداية أهدأ ليومك",
    description: "خطوة بسيطة للتعرف على منصة ذِكر.",
    hook: "قبل ما يكمل يومك بسرعة، خُد لحظة لنفسك.",
    narration: "قبل ما يكمل يومك بسرعة، خُد لحظة لنفسك. افتح ذِكر واختار آية أو ذكرًا أو دعاءً تقرأه بهدوء. تصفح الموقع، واكتشف تطبيق ذِكر لأندرويد من رابط التنزيل الرسمي الموجود في الوصف.",
    visualTheme: "dawn",
  },
] as const;

export function resolveDailyPromoVideoTarget(
  configured: string | undefined,
  dailyVideoTarget: number,
): number {
  const overallTarget = Number.isFinite(dailyVideoTarget)
    ? Math.max(0, Math.floor(dailyVideoTarget))
    : 0;
  if (configured === undefined || configured.trim() === "") {
    return Math.min(DEFAULT_DAILY_PROMO_VIDEO_TARGET, overallTarget);
  }
  const parsed = Number(configured);
  if (!Number.isFinite(parsed)) return Math.min(DEFAULT_DAILY_PROMO_VIDEO_TARGET, overallTarget);
  return Math.min(MAX_DAILY_PROMO_VIDEO_TARGET, overallTarget, Math.max(0, Math.floor(parsed)));
}

export function isDailyPromoVideoSlot(slot: number, target: number): boolean {
  return Number.isSafeInteger(slot) && slot >= 0 && Number.isSafeInteger(target) && target > 0 && slot < target;
}

export function selectDailyPromotionalVideoConcept(dayIndex: number, slot: number): PromotionalVideoConcept {
  const seed = Math.abs(Math.trunc(dayIndex)) * DEFAULT_DAILY_PROMO_VIDEO_TARGET + Math.max(0, Math.trunc(slot));
  return ZIKR_PROMOTIONAL_VIDEO_CONCEPTS[seed % ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.length];
}
