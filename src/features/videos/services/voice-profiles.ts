export type VideoVoiceProfile = {
  id: string;
  labelAr: string;
  mode: "recorded" | "tts";
  voice?: string;
  language: "ar";
  style: "quran" | "hadith" | "documentary" | "kids";
  rate: string;
  pitch: string;
  descriptionAr: string;
};

export const VIDEO_VOICE_PROFILES: readonly VideoVoiceProfile[] = [
  {
    id: "quran_reciter",
    labelAr: "قارئ قرآن موثّق",
    mode: "recorded",
    language: "ar",
    style: "quran",
    rate: "0%",
    pitch: "0Hz",
    descriptionAr: "تلاوة بشرية أصلية من كتالوج quran_audio؛ لا يُسمح باستبدالها بـTTS.",
  },
  {
    id: "hadith_male_msa",
    labelAr: "راوي حديث — رجل فصحى",
    mode: "tts",
    voice: "ar-SA-HamedNeural",
    language: "ar",
    style: "hadith",
    rate: "-10%",
    pitch: "-1Hz",
    descriptionAr: "صوت رجالي عربي هادئ، مخصص للنصوص الحديثية مع نص مصدر مقفل وفحص صوتي قبل الاعتماد.",
  },
  {
    id: "documentary_male_msa",
    labelAr: "راوي وثائقي — رجل فصحى",
    mode: "tts",
    voice: "ar-SA-HamedNeural",
    language: "ar",
    style: "documentary",
    rate: "-8%",
    pitch: "-1Hz",
    descriptionAr: "سرد وثائقي واضح ومتزن للنصوص التحريرية والقصصية.",
  },
  {
    id: "kids_friendly",
    labelAr: "راوي أطفال — عربي ودود",
    mode: "tts",
    voice: "ar-EG-ShakirNeural",
    language: "ar",
    style: "kids",
    rate: "-6%",
    pitch: "0Hz",
    descriptionAr: "سرد أبطأ قليلًا ومناسب للمحتوى التعليمي الموجه للأطفال.",
  },
  {
    id: "documentary_female_msa",
    labelAr: "راوية وثائقية — فصحى",
    mode: "tts",
    voice: "ar-SA-ZariyahNeural",
    language: "ar",
    style: "documentary",
    rate: "-8%",
    pitch: "0Hz",
    descriptionAr: "صوت نسائي واضح للسرد الوثائقي والتعليمي العام.",
  },
  {
    id: "egyptian_female_story",
    labelAr: "راوية قصص — مصرية",
    mode: "tts",
    voice: "ar-EG-SalmaNeural",
    language: "ar",
    style: "documentary",
    rate: "-6%",
    pitch: "0Hz",
    descriptionAr: "صوت مصري نسائي للقصص والرسائل العامة غير المنسوبة إلى نص ديني.",
  },
  {
    id: "egyptian_male_story",
    labelAr: "راوي قصص — مصري",
    mode: "tts",
    voice: "ar-EG-ShakirNeural",
    language: "ar",
    style: "documentary",
    rate: "-7%",
    pitch: "0Hz",
    descriptionAr: "صوت مصري رجالي للقصص والرسائل العامة غير المنسوبة إلى نص ديني.",
  },
  {
    id: "levant_male_story",
    labelAr: "راوي قصص — شامي",
    mode: "tts",
    voice: "ar-JO-TaimNeural",
    language: "ar",
    style: "documentary",
    rate: "-8%",
    pitch: "-1Hz",
    descriptionAr: "صوت شامي رجالي للقصص والمواد التحريرية العامة.",
  },
] as const;

export function getVideoVoiceProfile(profileId: string | null | undefined) {
  const normalized = String(profileId ?? "").trim().toLowerCase();
  return (
    VIDEO_VOICE_PROFILES.find((profile) => profile.id === normalized) ??
    VIDEO_VOICE_PROFILES.find((profile) => profile.id === "hadith_male_msa")!
  );
}

export function getDefaultVideoVoiceProfile(category: string) {
  if (category === "quran") return getVideoVoiceProfile("quran_reciter");
  if (category === "hadith" || category === "adhkar") return getVideoVoiceProfile("hadith_male_msa");
  if (category === "kids") return getVideoVoiceProfile("kids_friendly");
  // Egyptian narration is only for stories and general messages that are not attributed to a religious text.
  if (category === "story" || category === "stories" || category === "other" || category === "video") {
    return getVideoVoiceProfile("egyptian_male_story");
  }
  return getVideoVoiceProfile("documentary_male_msa");
}
