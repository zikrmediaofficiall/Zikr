export const DEFAULT_WEEKLY_PROMO_VIDEO_TARGET = 2;
export const MAX_WEEKLY_PROMO_VIDEO_TARGET = 2;
export const DEFAULT_PROMO_VIDEO_TIME_ZONE = "Africa/Cairo";

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

export type PromotionalVideoSlot = {
  localDate: string;
  slot: 0 | 1;
  timeZone: string;
  scheduledAt: string;
};

const PROMO_WEEKLY_SCHEDULE = [
  { slot: 0 as const, weekday: 3, hour: 18 }, // Wednesday, 18:00
  { slot: 1 as const, weekday: 5, hour: 16 }, // Friday, 16:00
] as const;

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

export function resolveWeeklyPromoVideoTarget(configured: string | undefined): number {
  if (configured === undefined || configured.trim() === "") return DEFAULT_WEEKLY_PROMO_VIDEO_TARGET;
  const parsed = Number(configured);
  if (!Number.isFinite(parsed)) return DEFAULT_WEEKLY_PROMO_VIDEO_TARGET;
  return Math.min(MAX_WEEKLY_PROMO_VIDEO_TARGET, Math.max(0, Math.floor(parsed)));
}

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute") };
}

function localDateTimeToUtc(year: number, month: number, day: number, hour: number, timeZone: string): Date | null {
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, 0, 0, 0);
  let guess = desiredAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = localDateParts(new Date(guess), timeZone);
    const representedAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, 0, 0);
    const adjustment = desiredAsUtc - representedAsUtc;
    if (adjustment === 0) {
      return local.year === year && local.month === month && local.day === day && local.hour === hour && local.minute === 0
        ? new Date(guess)
        : null;
    }
    guess += adjustment;
  }
  return null;
}

/** Resolve one approved weekly slot to its UTC instant, including the timezone's DST offset. */
export function resolvePromotionalVideoScheduledAt(localDate: string, slot: number, timeZone = DEFAULT_PROMO_VIDEO_TIME_ZONE): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  const schedule = PROMO_WEEKLY_SCHEDULE.find((entry) => entry.slot === slot);
  if (!match || !schedule) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() + 1 !== month || calendarDate.getUTCDate() !== day || calendarDate.getUTCDay() !== schedule.weekday) return null;
  return localDateTimeToUtc(year, month, day, schedule.hour, timeZone);
}

/** Returns the next future promo slots, not more than the configured weekly quota. */
export function selectUpcomingWeeklyPromoSlots(
  now: Date,
  timeZone = DEFAULT_PROMO_VIDEO_TIME_ZONE,
  target = DEFAULT_WEEKLY_PROMO_VIDEO_TARGET,
  minimumLeadMinutes = 60,
): PromotionalVideoSlot[] {
  if (!Number.isFinite(now.getTime())) throw new Error("A valid current time is required for promo scheduling.");
  if (!Number.isInteger(target) || target < 0 || target > MAX_WEEKLY_PROMO_VIDEO_TARGET) throw new Error("Promo weekly target must be an integer between zero and two.");
  if (!Number.isFinite(minimumLeadMinutes) || minimumLeadMinutes < 0) throw new Error("Promo generation lead time must be non-negative.");
  // Validate the zone even when no slot is found in the search window.
  new Intl.DateTimeFormat("en-US", { timeZone }).format(now);
  if (target === 0) return [];
  const localNow = localDateParts(now, timeZone);
  const localToday = Date.UTC(localNow.year, localNow.month - 1, localNow.day);
  const minimumPublishTime = now.getTime() + minimumLeadMinutes * 60_000;
  const slots: PromotionalVideoSlot[] = [];
  for (let dayOffset = 0; dayOffset < 14 && slots.length < target; dayOffset += 1) {
    const date = new Date(localToday + dayOffset * 86_400_000);
    const weekday = date.getUTCDay();
    const schedule = PROMO_WEEKLY_SCHEDULE.find((entry) => entry.weekday === weekday);
    if (!schedule) continue;
    const localDate = date.toISOString().slice(0, 10);
    const scheduledAt = resolvePromotionalVideoScheduledAt(localDate, schedule.slot, timeZone);
    if (!scheduledAt || scheduledAt.getTime() <= minimumPublishTime) continue;
    slots.push({ localDate, slot: schedule.slot, timeZone, scheduledAt: scheduledAt.toISOString() });
  }
  return slots;
}

export function selectPromotionalVideoConcept(dayIndex: number, slot: number): PromotionalVideoConcept {
  const seed = Math.abs(Math.trunc(dayIndex)) * DEFAULT_WEEKLY_PROMO_VIDEO_TARGET + Math.max(0, Math.trunc(slot));
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
