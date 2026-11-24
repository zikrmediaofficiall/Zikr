import type { ShowTopicTheme } from "./topic-backgrounds";

/**
 * "Two minutes with Hady": a weekly religious programme presented by one fixed, calm,
 * young Egyptian host. Everything here is configuration; scripts are written per episode and
 * must pass validateHadyEpisode() and human review before any rendering happens.
 */
export const HADY_SHOW = {
  id: "two-minutes-with-hady",
  titleAr: "دقيقتين مع هادي",
  taglineAr: "كلمة هادية وحكاية حلوة، كل أسبوع.",
  cadence: "weekly",
  host: {
    id: "hady",
    nameAr: "هادي",
    ageRange: "25-30",
    dialect: "egyptian-colloquial",
    traitsAr: ["هادي", "دافي", "بيحكي من غير وعظ تقيل", "بيسمع قبل ما يقول", "بيبتسم وهو بيتكلم"],
    // The host speaks in the existing Egyptian story voice. Quoted Quran and Hadith text is read in
    // a separate, formal voice and shown on a quote card, never rephrased into colloquial Arabic.
    hostVoiceProfile: "egyptian_male_story",
    quoteVoiceProfiles: { quran: "quran_reciter", hadith: "hadith_male_msa" },
    artwork: {
      closed: "public/video/shows/hady/host-hady-closed.svg",
      small: "public/video/shows/hady/host-hady-small.svg",
      open: "public/video/shows/hady/host-hady-open.svg",
      faceless: "public/video/shows/hady/host-hady-faceless.svg",
    },
  },
  episode: {
    targetSeconds: 120,
    minSeconds: 105,
    maxSeconds: 135,
    // Calm delivery: about 150 words per minute, plus a short pause between segments.
    wordsPerSecond: 2.5,
    pauseSecondsPerSegment: 0.6,
    secondsPerQuote: 8,
  },
  signature: {
    openingAr: "السلام عليكم يا حبايب، معاكم هادي.",
    closingAr: "نتقابل الأسبوع الجاي بإذن الله. السلام عليكم.",
  },
  // Segment order and word budgets (host speech only; quotes are timed separately).
  segments: [
    { id: "hook", minWords: 24, maxWords: 48 },
    { id: "advice", minWords: 55, maxWords: 90 },
    { id: "story", minWords: 105, maxWords: 160 },
    { id: "reflection", minWords: 34, maxWords: 62 },
    { id: "closing", minWords: 18, maxWords: 38 },
  ],
} as const;

export type HadySegmentId = (typeof HADY_SHOW.segments)[number]["id"];

export type SeasonTopic = {
  week: number;
  theme: ShowTopicTheme;
  titleAr: string;
  /** What the story is about, in one line. The script itself is written and reviewed separately. */
  storySeedAr: string;
  /**
   * Candidate sources to start the research from. They are suggestions only: nothing here is
   * publishable until a reviewer confirms the exact text and reference against the platform database.
   */
  candidateSources: readonly { kind: "quran" | "hadith" | "seerah"; reference: string }[];
  reviewStatus: "candidate" | "approved";
};

export const SEASON_ONE: readonly SeasonTopic[] = [
  { week: 1, theme: "patience", titleAr: "الصبر مش انتظار", storySeedAr: "قصة نبي الله أيوب مع البلاء والصبر.", candidateSources: [{ kind: "quran", reference: "21:83-84" }], reviewStatus: "candidate" },
  { week: 2, theme: "gratitude", titleAr: "الشكر بيزوّد النعمة", storySeedAr: "قصة نبي الله سليمان مع النملة ودعاء الشكر.", candidateSources: [{ kind: "quran", reference: "27:18-19" }], reviewStatus: "candidate" },
  { week: 3, theme: "trust", titleAr: "إن الله معنا", storySeedAr: "هجرة النبي ﷺ ولحظة الغار مع أبي بكر.", candidateSources: [{ kind: "quran", reference: "9:40" }, { kind: "seerah", reference: "الهجرة والغار" }], reviewStatus: "candidate" },
  { week: 4, theme: "forgiveness", titleAr: "سامح وارتاح", storySeedAr: "قصة يوسف مع إخوته وقوله: لا تثريب عليكم.", candidateSources: [{ kind: "quran", reference: "12:92" }], reviewStatus: "candidate" },
  { week: 5, theme: "parents", titleAr: "بيت فيه أم وأب", storySeedAr: "الإحسان للوالدين وقصة موقف حقيقي موثّق من السيرة.", candidateSources: [{ kind: "quran", reference: "17:23-24" }], reviewStatus: "candidate" },
  { week: 6, theme: "honesty", titleAr: "الصدق بيوصّل", storySeedAr: "صدق النبي ﷺ قبل البعثة وأثره في ثقة الناس.", candidateSources: [{ kind: "hadith", reference: "الصدق يهدي إلى البر" }, { kind: "seerah", reference: "لقب الصادق الأمين" }], reviewStatus: "candidate" },
  { week: 7, theme: "hope", titleAr: "بعد العسر", storySeedAr: "قصة يعقوب ويوسف والأمل الذي لا ينقطع.", candidateSources: [{ kind: "quran", reference: "12:87" }], reviewStatus: "candidate" },
  { week: 8, theme: "humility", titleAr: "لا تصعّر خدك", storySeedAr: "وصايا لقمان لابنه عن التواضع وحسن الخلق.", candidateSources: [{ kind: "quran", reference: "31:18-19" }], reviewStatus: "candidate" },
  { week: 9, theme: "giving", titleAr: "العطاء من غير مقابل", storySeedAr: "قصة موثّقة من السيرة عن الإيثار والكرم.", candidateSources: [{ kind: "seerah", reference: "يحتاج مراجعة مصدر" }], reviewStatus: "candidate" },
  { week: 10, theme: "brotherhood", titleAr: "ويؤثرون على أنفسهم", storySeedAr: "المؤاخاة بين المهاجرين والأنصار.", candidateSources: [{ kind: "quran", reference: "59:9" }, { kind: "seerah", reference: "المؤاخاة" }], reviewStatus: "candidate" },
  { week: 11, theme: "time", titleAr: "الوقت راحة وأمانة", storySeedAr: "سورة العصر وقيمة الوقت في حياة الصحابة.", candidateSources: [{ kind: "quran", reference: "103:1-3" }], reviewStatus: "candidate" },
  { week: 12, theme: "repentance", titleAr: "الباب مفتوح", storySeedAr: "قصة التائب الذي لجأ إلى الله، من مصدر موثّق.", candidateSources: [{ kind: "quran", reference: "39:53" }], reviewStatus: "candidate" },
];
