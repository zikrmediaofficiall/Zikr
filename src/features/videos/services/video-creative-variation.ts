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

export type VideoHookStyle = "balanced" | "question" | "reflection" | "action";
const STYLED_OPENING_HOOKS: Record<Exclude<VideoHookStyle, "balanced">, Record<string, string[]>> = {
  question: {
    quran: ["أي كلمة في الآية تستحق أن تتأملها اليوم؟", "ما المعنى الذي تقف عنده في هذه الآية؟", "كيف تفهم الآية في سياقها الصحيح؟"],
    hadith: ["كيف نطبق هذا الحديث في موقف يومي؟", "ما العمل الذي يدعونا إليه هذا الحديث؟", "هل ننتبه لهذا المعنى في تعاملاتنا؟"],
    dua: ["متى تحتاج أن تردد هذا الدعاء؟", "هل تعرف معنى الكلمات التي ترددها؟", "ما المناسبة التي يذكرك بها هذا الدعاء؟"],
    adhkar: ["ما الذكر الذي تحب أن تثبته في يومك؟", "هل تمنح الذكر وقتًا هادئًا وحاضرًا؟", "متى يكون هذا الذكر أقرب إلى روتينك؟"],
    story: ["ما التفصيلة التي غيّرت مسار القصة؟", "ما الدليل الذي يوضح هذه الحادثة؟", "ماذا نتعلم بعد فهم سياق القصة؟"],
    other: ["ما الخطوة الصغيرة التي تستطيع تنفيذها اليوم؟", "هل يمكن لفكرة واحدة أن تغيّر عادة؟", "ما الذي يستحق أن تبدأ به الآن؟"],
    kids: ["ما الذي تتوقع أن يفعله الأصدقاء بعد ذلك؟", "هل لاحظت المشكلة التي تحتاج إلى حل؟", "أي اختيار آمن ستقترحه على أبطال القصة؟"],
  },
  reflection: {
    quran: ["تمهّل مع التلاوة، واترك للمعنى وقته.", "قراءة هادئة، ثم تأمل في المعنى دون استعجال.", "خذ لحظة صمت بعد سماع الآية."],
    hadith: ["اقرأ الحديث كاملًا، ثم تأمل معناه.", "المعنى يزداد وضوحًا حين نفهم سياقه.", "دع التوجيه النبوي يراجع سلوكًا من يومك."],
    dua: ["اجعل للدعاء لحظة حضور وطمأنينة.", "ردد الدعاء بتأنٍ، وافهم كلماته.", "لحظة دعاء بعيدة عن ضجيج اليوم."],
    adhkar: ["الذكر حضور قبل أن يكون تكرارًا.", "خفف السرعة، وامنح كل كلمة حقها.", "اجعل وردك وقتًا ثابتًا وهادئًا."],
    story: ["افهم تسلسل الأحداث قبل استخلاص العبرة.", "وراء كل موقف سياق يوضح معناه.", "تأمل ما ثبت من القصة وما نتعلمه منها."],
    other: ["أحيانًا تبدأ العادة الجيدة بخطوة هادئة.", "مساحة قصيرة للتفكير قد تغيّر قرارك.", "لا تستعجل النتيجة؛ ابدأ بوعي."],
    kids: ["لنهدأ قليلًا ونلاحظ ما يحدث في القصة.", "كل محاولة آمنة تعلمنا شيئًا جديدًا.", "خذ وقتك في ملاحظة التفاصيل الجميلة."],
  },
  action: {
    quran: ["اختر معنى صحيحًا من الآية واجعله عملًا اليوم.", "احفظ الآية وارجع إلى تفسير موثوق لمعناها.", "شارك التلاوة مع الإشارة إلى السورة والآية."],
    hadith: ["اختر تطبيقًا عمليًا للحديث اليوم.", "راجع المصدر والدرجة، ثم شارك الفائدة.", "حوّل المعنى إلى تصرف واضح في يومك."],
    dua: ["احفظ الدعاء وارجع إلى مصدره عند الحاجة.", "تعلم موضع الدعاء ومعناه قبل مشاركته.", "ردد الدعاء في وقته وعلّم أسرتك مصدره."],
    adhkar: ["ثبّت ذكرًا صحيحًا في وردك اليومي.", "احفظ الذكر مع مصدره ووقته.", "ابدأ بورد صغير تستطيع المحافظة عليه."],
    story: ["راجع المرجع قبل نقل تفاصيل القصة.", "شارك الدرس مع ذكر المصدر والسياق.", "استخرج خطوة عملية دون إضافة أحداث غير موثقة."],
    other: ["اختر فعلًا واحدًا وابدأ به اليوم.", "اكتب خطوتك القادمة واجعلها قابلة للقياس.", "شارك الفكرة مع تجربة عملية صادقة."],
    kids: ["جرّبوا خطوة آمنة بمساعدة شخص بالغ.", "ارسموا ما تعلمتموه واحكوا الفكرة لأسرتكم.", "اختاروا عادة لطيفة وطبقوها معًا."],
  },
};

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
  style?: VideoHookStyle;
}): string {
  const style = input.style ?? "balanced";
  const category = input.category.trim().toLowerCase();
  const hooks = style === "balanced"
    ? input.audience === "kids"
      ? KIDS_HOOKS
      : OPENING_HOOKS[category] ?? OPENING_HOOKS.other
    : STYLED_OPENING_HOOKS[style][input.audience === "kids" ? "kids" : category]
      ?? STYLED_OPENING_HOOKS[style].other;
  const seed = style === "balanced" ? input.id : input.id + ":" + style;
  return hooks[stableIndex(seed, hooks.length)];
}

export function resolveDeterministicVideoMotion(id: string): "fade" | "slow" {
  return stableIndex(id, 2) === 0 ? "fade" : "slow";
}
