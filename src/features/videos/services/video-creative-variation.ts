import {
  VIDEO_TEMPLATE_ASSETS,
  isVideoTemplateAssetAllowedForAudience,
  type VideoTemplateAsset,
  type VideoTemplateAudience,
} from "./template-config";

const LEGACY_VIDEO_SCENES = ["calm", "dawn", "night", "gold", "emerald", "paper", "rose"] as const;
export const GENERAL_VIDEO_SCENES = LEGACY_VIDEO_SCENES;
export const KIDS_VIDEO_SCENES = LEGACY_VIDEO_SCENES;
export type VideoScene = (typeof LEGACY_VIDEO_SCENES)[number];

export function isVideoSceneAllowedForAudience(scene: unknown, _audience: unknown): scene is VideoScene {
  return typeof scene === "string" && (LEGACY_VIDEO_SCENES as readonly string[]).includes(scene);
}

function stableIndex(seed: string, length: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % Math.max(1, length);
}

const OPENING_HOOKS: Record<string, string[]> = {
 quran:["وقّف لحظة مع الآية دي، ومتستعجلش معناها.","إيه المعنى اللي ممكن يفضل معاك بعد القراءة دي؟","اقرا الآية، وبعدين لاحظ الكلمة اللي وقّفتك.","اتأمل المعنى ده بهدوء قبل ما تكمّل يومك.","آية بنقراها كتير، وفي معناها حاجة تستاهل التأمل.","سيب القراءة دي تدّيك لحظة مراجعة صادقة.","ابدأ من النص، وبعدين خد وقتك مع المعنى.","إيه الفكرة اللي هتفضل معاك بعد الآية دي؟"],
 hadith:["إزاي نحوّل المعنى ده لعمل النهارده؟","حديث موثّق ومعنى يستاهل نقف عنده.","خد من الحديث ده خطوة عملية واحدة.","مش المهم نسمع المعنى بس، المهم نطبّقه.","فين بيظهر التوجيه ده في تفاصيل يومنا؟","اقرا النص كامل، وبعدين اختار تطبيق بسيط.","فكرة واحدة من الحديث ده ممكن تغيّر تصرّف.","خلّينا نحوّل القراءة لأثر نشوفه في تعاملنا."],
 dua:["خد لحظة هادية، وردّد الدعاء براحتك.","خلّي للدعاء ده مساحة في يومك.","اقرا الدعاء كامل، ومتستعجلش الكلمات.","لحظة دعاء بعيد عن دوشة اليوم.","احفظ الدعاء وارجع لمصدره وقت ما تحتاجه.","دعاء تقراه بقلب حاضر ووقت هادي.","ابدأ بالدعاء، وسيب لنفسك فرصة للتأمل.","إمتى بتحتاج تفتكر الدعاء ده؟"],
 adhkar:["دقيقة ذكر ممكن تبقى بداية حلوة ليومك.","ردّد الذكر بهدوء، وركّز في معناه.","متخلّيش الورد سباق مع الوقت.","ابدأ لحظتك بذكر حاضر، مش بقراءة مستعجلة.","احفظ الذكر الصحيح وارجع لمرجعه.","استراحة قصيرة بترتّب إيقاع يومك.","اختار وقت ثابت وخلّي الذكر عادة.","كل تكرار فرصة لحضور القلب، مش مجرد عدّ."],
 story:["في تفصيلة في القصة دي تستاهل انتباهك.","إيه اللي اتغيّر لما الحدث وصل للحظة دي؟","تابع التسلسل لحد ما العبرة تظهر.","ابدأ من الحدث، ومتتخطّاش اللي بيوضّحه المصدر.","القصة مش مجرد عنوان؛ السياق هو اللي بيشرحها.","إيه القرار اللي عمل الفرق في الحكاية دي؟","تفصيلة واحدة ممكن تساعدك تفهم باقي الأحداث.","اسمع لحد النهاية، وبعدين راجع الدرس اللي خرجت بيه."],
 stories:["في تفصيلة في القصة دي تستاهل انتباهك.","إيه اللي اتغيّر لما الحدث وصل للحظة دي؟","تابع التسلسل لحد ما العبرة تظهر.","ابدأ من الحدث، ومتتخطّاش اللي بيوضّحه المصدر.","القصة مش مجرد عنوان؛ السياق هو اللي بيشرحها.","إيه القرار اللي عمل الفرق في الحكاية دي؟","تفصيلة واحدة ممكن تساعدك تفهم باقي الأحداث.","اسمع لحد النهاية، وبعدين راجع الدرس اللي خرجت بيه."],
 other:["فكرة واحدة ممكن تساعدك ترتّب يومك.","خد من الرسالة دي خطوة صغيرة تقدر تطبّقها.","إيه التغيير البسيط اللي تقدر تبدأ بيه النهارده؟","اسمع لحد النهاية، واختار اللي يناسب ظروفك.","متدوّرش على الكمال؛ ابدأ بخطوة واضحة.","رسالة قصيرة، وبعدها مساحة للتفكير والعمل.","سيب الفكرة تتحوّل لعادة نافعة.","إيه اللي تقدر تعمله أحسن بعد الدقيقة دي؟"],
 video:["فكرة واحدة ممكن تساعدك ترتّب يومك.","خد من الرسالة دي خطوة صغيرة تقدر تطبّقها.","إيه التغيير البسيط اللي تقدر تبدأ بيه النهارده؟","اسمع لحد النهاية، واختار اللي يناسب ظروفك.","متدوّرش على الكمال؛ ابدأ بخطوة واضحة.","رسالة قصيرة، وبعدها مساحة للتفكير والعمل.","سيب الفكرة تتحوّل لعادة نافعة.","إيه اللي تقدر تعمله أحسن بعد الدقيقة دي؟"],
};
const KIDS_HOOKS=["جاهز نكتشف إيه اللي هيحصل؟","يلا نتابع الحكاية خطوة بخطوة!","مغامرة جديدة وفكرة نتعلّمها سوا!","إيه توقّعك للخطوة الجاية؟","تعالوا ندوّر على الإجابة جوه القصة.","درس صغير نقدر نطبّقه النهارده.","لاحظت التفصيلة الذكية دي؟","كمّل للآخر، وقولّنا اتعلّمت إيه!"];

export function resolveDeterministicVideoScene(input: {
  id: string;
  category: string;
  audience?: unknown;
}): VideoScene {
  const category = input.category.trim().toLowerCase();
  const choices: Record<string, readonly VideoScene[]> = {
    quran: ["night", "dawn", "paper", "gold", "emerald"],
    hadith: ["paper", "gold", "night", "dawn", "emerald"],
    dua: ["rose", "dawn", "emerald", "gold", "calm"],
    adhkar: ["emerald", "rose", "night", "dawn", "paper"],
    story: ["dawn", "gold", "night", "paper", "emerald"],
    stories: ["dawn", "gold", "night", "paper", "emerald"],
    other: LEGACY_VIDEO_SCENES,
  };
  const bucket = choices[category] ?? choices.other;
  return bucket[stableIndex(input.id, bucket.length)];
}

export function resolveDeterministicVideoVisualTheme(input: {
  id: string;
  category: string;
  audience?: unknown;
}): VideoTemplateAsset {
  const audience: VideoTemplateAudience = input.audience === "kids" ? "kids" : "general";
  const candidates = VIDEO_TEMPLATE_ASSETS.filter((asset) =>
    isVideoTemplateAssetAllowedForAudience(asset, audience),
  );
  if (!candidates.length) throw new Error("No approved local video scene exists for the requested audience.");
  return candidates[stableIndex(input.id + ":" + input.category.trim().toLowerCase(), candidates.length)];
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
