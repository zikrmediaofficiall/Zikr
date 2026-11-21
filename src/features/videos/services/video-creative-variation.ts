const LEGACY_VIDEO_SCENES = ["calm", "dawn", "night", "gold", "emerald", "paper", "rose"] as const;
export const GENERAL_VIDEO_SCENES = [...LEGACY_VIDEO_SCENES, "desert", "coastal", "botanical", "library", "geometric", "marble", "cinematic", "starfield", "mountain", "heritage", "minimal", "rainy"] as const;
export const KIDS_VIDEO_SCENES = ["kids-space", "kids-ocean", "kids-forest", "kids-playground", "kids-classroom", "kids-adventure"] as const;
export type VideoScene = (typeof GENERAL_VIDEO_SCENES)[number] | (typeof KIDS_VIDEO_SCENES)[number];
export function isVideoSceneAllowedForAudience(scene: unknown, audience: unknown): scene is VideoScene {
  const allowed: readonly string[] = audience === "kids" ? KIDS_VIDEO_SCENES : GENERAL_VIDEO_SCENES;
  return typeof scene === "string" && allowed.includes(scene);
}

function stableIndex(seed: string, length: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % Math.max(1, length);
}

const SCENES: Record<string, readonly VideoScene[]> = {
  quran: ["night", "dawn", "paper", "gold", "emerald", "starfield", "library", "heritage", "geometric"],
  hadith: ["paper", "gold", "night", "dawn", "calm", "library", "marble", "geometric"],
  dua: ["rose", "dawn", "emerald", "gold", "calm", "botanical", "coastal", "desert"],
  adhkar: ["emerald", "rose", "night", "dawn", "paper", "botanical", "starfield", "rainy"],
  story: ["dawn", "gold", "night", "paper", "emerald", "cinematic", "mountain", "desert", "heritage"],
  stories: ["dawn", "gold", "night", "paper", "emerald", "cinematic", "mountain", "desert", "heritage"],
  other: ["calm", "gold", "emerald", "night", "paper", "minimal", "rainy", "cinematic", "marble"],
  video: GENERAL_VIDEO_SCENES,
};

const OPENING_HOOKS: Record<string, string[]> = {
 quran:["قف لحظة مع هذه الآية، ولا تستعجل معناها.","ما المعنى الذي يمكن أن يصحبك بعد هذه القراءة؟","اقرأ الآية، ثم لاحظ الكلمة التي تستوقفك.","تأمل هذا المعنى بهدوء قبل أن تتابع يومك.","آية نقرؤها كثيرًا، وفي معناها ما يستحق التأمل.","دع هذه القراءة تمنحك لحظة مراجعة صادقة.","ابدأ من النص، ثم خذ وقتك مع المعنى.","ما الفكرة التي ستبقى معك بعد هذه الآية؟"],
 hadith:["كيف يمكن أن يتحول هذا المعنى إلى عمل اليوم؟","حديث موثق، ومعنى يستحق أن نتوقف عنده.","خذ من هذا الحديث خطوة عملية واحدة.","ليس المهم أن نسمع المعنى فقط، بل أن نطبقه.","أين يظهر هذا التوجيه في تفاصيل يومنا؟","اقرأ النص كاملًا، ثم اختر تطبيقًا بسيطًا.","فكرة واحدة من هذا الحديث قد تغيّر تصرفًا.","لنحوّل القراءة إلى أثر نراه في تعاملنا."],
 dua:["خذ لحظة هادئة، وردّد الدعاء بتأنٍ.","اجعل لهذا الدعاء مساحة من يومك.","اقرأ الدعاء كاملًا، ولا تتعجل الكلمات.","لحظة دعاء، بعيدًا عن ضجيج اليوم.","احفظ الدعاء وارجع إلى مصدره عند الحاجة.","دعاء تقرؤه بقلب حاضر ووقت هادئ.","ابدأ بالدعاء، واترك لنفسك فرصة للتأمل.","ما الوقت الذي تحتاج فيه أن تتذكر هذا الدعاء؟"],
 adhkar:["دقيقة من الذكر قد تكون بداية طيبة ليومك.","ردّد الذكر بهدوء، وانتبه إلى معناه.","لا تجعل الورد سباقًا مع الوقت.","ابدأ لحظتك بذكرٍ حاضر لا بقراءة مستعجلة.","احفظ الذكر الصحيح وارجع إلى مرجعه.","استراحة قصيرة تعيد ترتيب إيقاع يومك.","اختر وقتًا ثابتًا واجعل الذكر عادة.","كل تكرار فرصة لحضور القلب، لا لمجرد العد."],
 story:["هناك تفصيلة في هذه القصة تستحق الانتباه.","ماذا تغيّر عندما وصل الحدث إلى هذه اللحظة؟","تابع التسلسل حتى تتضح العبرة من القصة.","ابدأ من الحدث، ولا تتجاوز ما يوضحه المصدر.","القصة ليست عنوانًا فقط؛ السياق هو ما يشرحها.","ما القرار الذي صنع الفرق في هذه الحكاية؟","تفصيل واحد قد يساعدك على فهم بقية الأحداث.","استمع للنهاية، ثم راجع الدرس الذي خرجت به."],
 stories:["هناك تفصيلة في هذه القصة تستحق الانتباه.","ماذا تغيّر عندما وصل الحدث إلى هذه اللحظة؟","تابع التسلسل حتى تتضح العبرة من القصة.","ابدأ من الحدث، ولا تتجاوز ما يوضحه المصدر.","القصة ليست عنوانًا فقط؛ السياق هو ما يشرحها.","ما القرار الذي صنع الفرق في هذه الحكاية؟","تفصيل واحد قد يساعدك على فهم بقية الأحداث.","استمع للنهاية، ثم راجع الدرس الذي خرجت به."],
 other:["فكرة واحدة قد تساعدك على ترتيب يومك.","خذ من هذه الرسالة خطوة صغيرة قابلة للتطبيق.","ما التغيير البسيط الذي يمكنك البدء به اليوم؟","استمع للنهاية، واختر ما يناسب واقعك.","لا تبحث عن الكمال؛ ابدأ بخطوة واضحة.","رسالة قصيرة، ثم مساحة للتفكير والعمل.","دع الفكرة تتحول إلى عادة نافعة.","ما الذي يمكنك فعله بشكل أفضل بعد هذه الدقيقة؟"],
 video:["فكرة واحدة قد تساعدك على ترتيب يومك.","خذ من هذه الرسالة خطوة صغيرة قابلة للتطبيق.","ما التغيير البسيط الذي يمكنك البدء به اليوم؟","استمع للنهاية، واختر ما يناسب واقعك.","لا تبحث عن الكمال؛ ابدأ بخطوة واضحة.","رسالة قصيرة، ثم مساحة للتفكير والعمل.","دع الفكرة تتحول إلى عادة نافعة.","ما الذي يمكنك فعله بشكل أفضل بعد هذه الدقيقة؟"],
};
const KIDS_HOOKS=["هل أنت مستعد لاكتشاف ما سيحدث؟","هيا نتابع الحكاية خطوة بخطوة!","مغامرة جديدة وفكرة نتعلمها معًا!","ما توقعك للخطوة القادمة؟","لنبحث عن الإجابة داخل القصة.","تعلّم صغير يمكن أن نطبقه اليوم.","هل لاحظت هذه التفصيلة الذكية؟","تابع للنهاية، ثم أخبرنا ماذا تعلمت!"];

export function resolveDeterministicVideoScene(input: {
  id: string;
  category: string;
  audience?: unknown;
}): VideoScene {
  const category = input.category.trim().toLowerCase();
  if (input.audience === "kids") {
    return KIDS_VIDEO_SCENES[stableIndex(input.id, KIDS_VIDEO_SCENES.length)];
  }
  const choices = SCENES[category] ?? SCENES.other;
  return choices[stableIndex(input.id, choices.length)];
}

export function resolveDeterministicVideoHook(input: {
  id: string;
  category: string;
  audience?: unknown;
}): string {
  const hooks = input.audience === "kids"
    ? KIDS_HOOKS
    : OPENING_HOOKS[input.category.trim().toLowerCase()] ?? OPENING_HOOKS.other;
  return hooks[stableIndex(input.id, hooks.length)];
}

export function resolveDeterministicVideoMotion(id: string): "fade" | "slow" {
  return stableIndex(id, 2) === 0 ? "fade" : "slow";
}
