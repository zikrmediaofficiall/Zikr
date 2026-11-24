export const DEFAULT_DAILY_PROMO_VIDEO_TARGET = 2;
export const MAX_DAILY_PROMO_VIDEO_TARGET = 8;

export type PromotionalVideoConcept = {
  key: string;
  featureKey: "quran" | "adhkar" | "duas" | "hadith" | "prayer-times" | "kids" | "app-download" | "all-in-one";
  featurePath: string;
  ctaPath: string;
  title: string;
  description: string;
  hook: string;
  narration: string;
  visualTheme: "gold" | "dawn" | "emerald" | "night" | "paper" | "rose" | "calm";
  variationIndex?: number;
};

/** Original product-awareness scripts; they make no religious attribution or performance promises. */
export const ZIKR_PROMOTIONAL_VIDEO_CONCEPTS: readonly PromotionalVideoConcept[] = [
  {
    key: "one-quiet-minute", featureKey: "quran", featurePath: "/quran", ctaPath: "/api/download/android",
    title: "دقيقة هدوء وسط يومك", description: "اكتشف القرآن في منصة ذِكر.",
    hook: "تقدر تلاقي دقيقة هدوء وسط اليوم؟",
    narration: "وسط زحمة اليوم، خُد دقيقة هدوء. افتح منصة ذِكر واختار آية تقرأها على مهل وبالوقت اللي يناسبك. ابدأ بخطوة بسيطة، واكتشف الموقع بنفسك. حمّل تطبيق ذِكر لأندرويد من الرابط الموجود في الوصف.",
    visualTheme: "dawn",
  },
  {
    key: "small-steady-step", featureKey: "adhkar", featurePath: "/adhkar", ctaPath: "/api/download/android",
    title: "ابدأ بخطوة صغيرة", description: "تصفّح الأذكار في منصة ذِكر.",
    hook: "مش لازم تبدأ بخطة كبيرة.",
    narration: "مش لازم تبدأ بخطة كبيرة. افتح ذِكر وتصفح الأذكار على مهلك، وارجع للموقع وقت ما تحب. اختار ما يناسب وقتك، واكتشف الأقسام بنفسك. حمّل تطبيق ذِكر لأندرويد من الرابط الموجود في الوصف.",
    visualTheme: "gold",
  },
  {
    key: "your-own-pace", featureKey: "duas", featurePath: "/dua", ctaPath: "/api/download/android",
    title: "على وقتك وبإيقاعك", description: "تعرّف على قسم الأدعية في ذِكر.",
    hook: "خلي وقتك للذكر بطريقتك.",
    narration: "كل واحد له وقته وإيقاعه. في منصة ذِكر تقدر تتصفح قسم الأدعية وتختار ما تقرأه بهدوء. افتح الموقع وشوف القسم بنفسك، وحمّل تطبيق ذِكر لأندرويد من الرابط في الوصف لو تحب يكون أقرب لك.",
    visualTheme: "emerald",
  },
  {
    key: "open-a-door", featureKey: "hadith", featurePath: "/hadith", ctaPath: "/api/download/android",
    title: "تصفّح مكتبة الحديث", description: "اكتشف قسم الحديث في منصة ذِكر.",
    hook: "لما تبحث عن حديث، ابدأ من مصدر واضح.",
    narration: "في منصة ذِكر تقدر تتصفح قسم الحديث وتقرأ التفاصيل المعروضة لكل مادة. افتح الموقع وشوف المكتبة بنفسك، وخد وقتك في القراءة. حمّل تطبيق ذِكر لأندرويد من الرابط الموجود في الوصف.",
    visualTheme: "night",
  },
  {
    key: "choose-your-reading", featureKey: "prayer-times", featurePath: "/prayer-times", ctaPath: "/api/download/android",
    title: "مواقيت الصلاة في مكان واحد", description: "تعرّف على صفحة مواقيت الصلاة في ذِكر.",
    hook: "عايز تراجع مواقيت الصلاة؟",
    narration: "افتح منصة ذِكر وتعرّف على صفحة مواقيت الصلاة. راجع الإعدادات المتاحة واختر ما يناسب موقعك، ثم اكتشف بقية أقسام الموقع. حمّل تطبيق ذِكر لأندرويد من الرابط الموجود في الوصف.",
    visualTheme: "paper",
  },
  {
    key: "carry-zikr-with-you", featureKey: "kids", featurePath: "/kids", ctaPath: "/api/download/android",
    title: "مساحة للأطفال والعائلة", description: "اكتشف مساحة الأطفال في موقع ذِكر.",
    hook: "في البيت أطفال؟ تعرّفوا على مساحة ذِكر المخصصة لهم.",
    narration: "في موقع ذِكر مساحة للأطفال فيها محتوى وأنشطة مناسبة للعائلة. افتحوا الصفحة معًا وتصفحوا ما هو متاح، وخلي ولي الأمر قريبًا أثناء استخدام الأجهزة. حمّل تطبيق ذِكر لأندرويد من الرابط في الوصف.",
    visualTheme: "rose",
  },
  {
    key: "browse-with-care", featureKey: "app-download", featurePath: "/about", ctaPath: "/api/download/android",
    title: "ذِكر على أندرويد", description: "نزّل تطبيق ذِكر من رابط الإصدار الرسمي.",
    hook: "تحب تفتح ذِكر من موبايلك؟",
    narration: "تقدر تتصفح منصة ذِكر من الموقع، ولو بتستخدم أندرويد افتح رابط التنزيل الرسمي الموجود في وصف الفيديو. نزّل التطبيق من المصدر الرسمي، وتعرّف على القرآن والأذكار والأدعية الموجودة في ذِكر.",
    visualTheme: "calm",
  },
  {
    key: "a-gentle-start", featureKey: "all-in-one", featurePath: "/", ctaPath: "/api/download/android",
    title: "منصة ذِكر في جولة واحدة", description: "جولة تعريفية بأقسام موقع ذِكر وتطبيقه.",
    hook: "قرآن وأذكار وأدعية؛ ابدأ جولة في ذِكر.",
    narration: "من الصفحة الرئيسية في ذِكر، تقدر تنتقل لأقسام القرآن والأذكار والأدعية والحديث ومواقيت الصلاة ومساحة الأطفال. تصفح الموقع واكتشف كل قسم بنفسك. حمّل تطبيق ذِكر لأندرويد من الرابط الرسمي الموجود في الوصف.",
    visualTheme: "dawn",
  },
] as const;

export function resolveDailyPromoVideoTarget(configured: string | undefined, dailyVideoTarget: number): number {
  const overallTarget = Number.isFinite(dailyVideoTarget) ? Math.max(0, Math.floor(dailyVideoTarget)) : 0;
  if (configured === undefined || configured.trim() === "") return Math.min(DEFAULT_DAILY_PROMO_VIDEO_TARGET, overallTarget);
  const parsed = Number(configured);
  if (!Number.isFinite(parsed)) return Math.min(DEFAULT_DAILY_PROMO_VIDEO_TARGET, overallTarget);
  return Math.min(MAX_DAILY_PROMO_VIDEO_TARGET, overallTarget, Math.max(0, Math.floor(parsed)));
}

export function isDailyPromoVideoSlot(slot: number, target: number): boolean {
  return Number.isSafeInteger(slot) && slot >= 0 && Number.isSafeInteger(target) && target > 0 && slot < target;
}

export function selectDailyPromotionalVideoSlots(dailyVideoTarget: number, configuredTarget?: string): number[] {
  const dailyTarget = Number.isSafeInteger(dailyVideoTarget) ? Math.max(0, dailyVideoTarget) : 0;
  const promoTarget = resolveDailyPromoVideoTarget(configuredTarget, dailyTarget);
  if (dailyTarget === 0 || promoTarget === 0) return [];
  const eligible = Array.from({ length: dailyTarget }, (_, slot) => slot).filter((slot) => slot % 7 !== 5);
  const count = Math.min(promoTarget, eligible.length);
  return Array.from({ length: count }, (_, index) => eligible[Math.floor(((index + 1) * eligible.length) / (count + 1))]);
}

export function selectDailyPromotionalVideoConcept(dayIndex: number, slot: number): PromotionalVideoConcept {
  const seed = Math.abs(Math.trunc(dayIndex)) * DEFAULT_DAILY_PROMO_VIDEO_TARGET + Math.max(0, Math.trunc(slot));
  const base = ZIKR_PROMOTIONAL_VIDEO_CONCEPTS[seed % ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.length];
  const variationIndex = Math.floor(seed / ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.length) % PROMO_COPY_VARIATIONS.length;
  const variation = PROMO_COPY_VARIATIONS[variationIndex];
  const sentences = base.narration.split(". ");
  const narration = [sentences[0], variation.insert, ...sentences.slice(1)].filter(Boolean).join(". ");
  return { ...base, hook: variation.hook, narration, variationIndex };
}

const PROMO_COPY_VARIATIONS = [
  { hook: "حابب تبدأ جولة في ذِكر؟", insert: "ابدأ من الصفحة المعروضة وتعرّف على التفاصيل بنفسك" },
  { hook: "تدور على لحظة هادية؟", insert: "خُد جولة قصيرة، واختار وقتك للتصفح" },
  { hook: "اكتشف ذِكر بطريقتك", insert: "افتح الموقع من الموبايل أو المتصفح واكتشف الأقسام المتاحة" },
  { hook: "جاهز لجولة بسيطة؟", insert: "لو حبيت، ارجع للرابط الرسمي الموجود في الوصف" },
  { hook: "ابدأ من المكان اللي يناسبك", insert: "خليك على راحتك في التصفح واختار القسم المناسب لك" },
  { hook: "خلّيها جولة قصيرة", insert: "دي فرصة تتعرّف على واجهة ذِكر خطوة بخطوة" },
  { hook: "اكتشف صفحة جديدة في ذِكر", insert: "احفظ رابط الصفحة وارجع لها وقت ما يناسبك" },
  { hook: "كل جولة تبدأ بخطوة", insert: "ممكن تبدأ من الموقع وتتنقل بين صفحاته براحتك" },
] as const;

export function resolvePromotionalVideoConcept(key: unknown): PromotionalVideoConcept | null {
  if (typeof key !== "string" || !key.trim()) return null;
  return ZIKR_PROMOTIONAL_VIDEO_CONCEPTS.find((concept) => concept.key === key) ?? null;
}
