/**
 * Maps an episode theme to a background that already ships in public/video/templates.
 * Every background is an abstract or landscape scene without living beings, so it can sit
 * behind the host without competing with him.
 */
export const SHOW_TOPIC_THEMES = [
  "patience",
  "gratitude",
  "trust",
  "forgiveness",
  "parents",
  "honesty",
  "hope",
  "humility",
  "giving",
  "brotherhood",
  "time",
  "repentance",
] as const;

export type ShowTopicTheme = (typeof SHOW_TOPIC_THEMES)[number];

export const SHOW_TOPIC_BACKGROUNDS: Record<ShowTopicTheme, { primary: string; alternates: readonly string[] }> = {
  patience: { primary: "moonlit-sea", alternates: ["rainy-window", "coastal-blue"] },
  gratitude: { primary: "sunlit-arch", alternates: ["dawn", "olive-grove"] },
  trust: { primary: "starfield", alternates: ["night", "midnight-skyline"] },
  forgiveness: { primary: "olive-branch", alternates: ["watercolor-sky", "calm"] },
  parents: { primary: "old-city", alternates: ["heritage", "lantern-glow"] },
  honesty: { primary: "library", alternates: ["manuscript-library", "paper"] },
  hope: { primary: "mountain-dawn", alternates: ["oasis-dawn", "dawn"] },
  humility: { primary: "watercolor-sky", alternates: ["calm", "minimal-cream"] },
  giving: { primary: "olive-grove", alternates: ["botanical", "gold"] },
  brotherhood: { primary: "desert-caravan", alternates: ["desert-dusk", "andalusian-arch"] },
  time: { primary: "desert-dusk", alternates: ["satin-night", "cinematic"] },
  repentance: { primary: "satin-night", alternates: ["night", "moonlit-sea"] },
};

export function backgroundForTheme(theme: ShowTopicTheme, variant = 0): string {
  const entry = SHOW_TOPIC_BACKGROUNDS[theme];
  const pool = [entry.primary, ...entry.alternates];
  return pool[Math.abs(Math.trunc(variant)) % pool.length];
}
