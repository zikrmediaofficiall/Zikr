export type MemoryTheme = "clay-dawn" | "clay-night" | "clay-garden" | "clay-sand" | "clay-sea";
export const MEMORY_THEMES: MemoryTheme[] = ["clay-dawn", "clay-night", "clay-garden", "clay-sand", "clay-sea"];

/** A new card style every 6 levels. */
export function getMemoryTheme(levelIndex: number): MemoryTheme {
  return MEMORY_THEMES[Math.min(MEMORY_THEMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const BACKS: Record<MemoryTheme, { back: string; ring: string; glyph: string }> = {
  "clay-dawn": { back: "linear-gradient(145deg,#e8b98a,#c98a5e)", ring: "#f6dcc0", glyph: "✦" },
  "clay-night": { back: "linear-gradient(145deg,#6a5a9a,#3f3470)", ring: "#b9aee6", glyph: "☾" },
  "clay-garden": { back: "linear-gradient(145deg,#8fc07a,#5a9a5a)", ring: "#d6efc6", glyph: "❀" },
  "clay-sand": { back: "linear-gradient(145deg,#e3c78a,#b99a5a)", ring: "#f5e6bd", glyph: "◈" },
  "clay-sea": { back: "linear-gradient(145deg,#7ab8d0,#4a88a8)", ring: "#cbe8f2", glyph: "≈" },
};

export function memoryCardBack(theme: MemoryTheme) {
  return BACKS[theme];
}

/** Board shape: column count per level so boards do not always look alike. */
export function memoryColumns(levelIndex: number, cardCount: number): 2 | 3 | 4 {
  const shapes: Array<2 | 3 | 4> = [3, 2, 4, 3, 4, 2];
  const pick = shapes[Math.max(0, levelIndex) % shapes.length];
  if (cardCount % pick !== 0 && cardCount >= 8) return 4;
  return pick;
}
