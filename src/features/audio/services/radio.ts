export type RadioCategory = "quran" | "reciter";

export interface RadioChannel {
  id: string;
  name: string;
  streamUrl: string;
  description: string;
  category: RadioCategory;
  tags: string[];
}

export const RADIO_CHANNELS: RadioChannel[] = [
  {
    id: "quran-sa",
    name: "إذاعة تلاوات القرآن",
    streamUrl: "https://qurango.net/radio/tarateel",
    description: "بث قرآني مستمر مناسب للاستماع الهادئ والتدبر.",
    category: "quran",
    tags: ["قرآن", "تلاوات", "مباشر"],
  },
  {
    id: "quran-afasy",
    name: "إذاعة القرآن - مشاري العفاسي",
    streamUrl: "https://qurango.net/radio/mishary_alafasy",
    description: "تلاوات الشيخ مشاري العفاسي عبر البث الصوتي المدرج.",
    category: "reciter",
    tags: ["قرآن", "مشاري العفاسي", "مباشر"],
  },
  {
    id: "quran-minshawi",
    name: "إذاعة القرآن - المنشاوي",
    streamUrl: "https://qurango.net/radio/minshawi",
    description: "تلاوات الشيخ محمد صديق المنشاوي.",
    category: "reciter",
    tags: ["المنشاوي", "مرتل", "قرآن"],
  },
  {
    id: "quran-abdulbasit",
    name: "إذاعة القرآن - عبد الباسط",
    streamUrl: "https://qurango.net/radio/abdulbasit",
    description: "تلاوات الشيخ عبد الباسط عبد الصمد.",
    category: "reciter",
    tags: ["عبد الباسط", "قرآن"],
  },
  {
    id: "quran-husary",
    name: "إذاعة القرآن - الحصري",
    streamUrl: "https://qurango.net/radio/husary",
    description: "تلاوات الشيخ محمود خليل الحصري.",
    category: "reciter",
    tags: ["الحصري", "قرآن"],
  },
  {
    id: "quran-sudais",
    name: "إذاعة القرآن - السديس",
    streamUrl: "https://qurango.net/radio/sudais",
    description: "تلاوات الشيخ عبد الرحمن السديس.",
    category: "reciter",
    tags: ["السديس", "قرآن"],
  },
  {
    id: "quran-maher",
    name: "إذاعة القرآن - ماهر المعيقلي",
    streamUrl: "https://qurango.net/radio/maher_al_muaiqly",
    description: "تلاوات الشيخ ماهر المعيقلي.",
    category: "reciter",
    tags: ["ماهر المعيقلي", "قرآن"],
  },
  {
    id: "quran-ghamdi",
    name: "إذاعة القرآن - سعد الغامدي",
    streamUrl: "https://qurango.net/radio/saad_al_ghamdi",
    description: "تلاوات الشيخ سعد الغامدي.",
    category: "reciter",
    tags: ["سعد الغامدي", "قرآن"],
  },
  {
    id: "quran-yasser",
    name: "إذاعة القرآن - ياسر الدوسري",
    streamUrl: "https://qurango.net/radio/yasser_al_dosari",
    description: "تلاوات الشيخ ياسر الدوسري.",
    category: "reciter",
    tags: ["ياسر الدوسري", "قرآن"],
  },
  {
    id: "quran-nasser",
    name: "إذاعة القرآن - ناصر القطامي",
    streamUrl: "https://qurango.net/radio/nasser_al_qatami",
    description: "تلاوات الشيخ ناصر القطامي.",
    category: "reciter",
    tags: ["ناصر القطامي", "قرآن"],
  },
  {
    id: "quran-idris",
    name: "إذاعة القرآن - إدريس أبكر",
    streamUrl: "https://qurango.net/radio/idrees_abkar",
    description: "تلاوات الشيخ إدريس أبكر.",
    category: "reciter",
    tags: ["إدريس أبكر", "قرآن"],
  },
  {
    id: "quran-ajmi",
    name: "إذاعة القرآن - أحمد العجمي",
    streamUrl: "https://qurango.net/radio/ahmed_al_ajmi",
    description: "تلاوات الشيخ أحمد العجمي.",
    category: "reciter",
    tags: ["أحمد العجمي", "قرآن"],
  },
  {
    id: "quran-shuraim",
    name: "إذاعة القرآن - سعود الشريم",
    streamUrl: "https://qurango.net/radio/shuraim",
    description: "تلاوات الشيخ سعود الشريم.",
    category: "reciter",
    tags: ["الشريم", "قرآن"],
  },
  {
    id: "quran-shatri",
    name: "إذاعة القرآن - أبو بكر الشاطري",
    streamUrl: "https://qurango.net/radio/abu_bakr_al_shatri",
    description: "تلاوات الشيخ أبو بكر الشاطري عبر البث الصوتي المدرج.",
    category: "reciter",
    tags: ["قرآن", "أبو بكر الشاطري"],
  },
  {
    id: "quran-kandari",
    name: "إذاعة القرآن - فهد الكندري",
    streamUrl: "https://qurango.net/radio/fahad_al_kandari",
    description: "تلاوات الشيخ فهد الكندري عبر البث الصوتي المدرج.",
    category: "reciter",
    tags: ["قرآن", "فهد الكندري"],
  },
];

export function getRadioChannels(): RadioChannel[] {
  return RADIO_CHANNELS;
}
