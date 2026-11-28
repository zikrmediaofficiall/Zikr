export type LetterTheme = "clay-beaker" | "clay-lantern" | "clay-leaf" | "clay-shell" | "clay-star";
export const LETTER_THEMES: LetterTheme[] = ["clay-beaker", "clay-lantern", "clay-leaf", "clay-shell", "clay-star"];

/** A different bench style each round. */
export function getLetterTheme(round: number): LetterTheme {
  return LETTER_THEMES[Math.max(0, round) % LETTER_THEMES.length];
}

const LETTER_COLORS: Record<LetterTheme, { tile: string; ring: string; fill: string }> = {
  "clay-beaker": { tile: "linear-gradient(145deg,#8fc7d8,#5a9ab8)", ring: "#d6eef6", fill: "#5a9ab8" },
  "clay-lantern": { tile: "linear-gradient(145deg,#e8b98a,#c98a5e)", ring: "#f6dcc0", fill: "#e8a24a" },
  "clay-leaf": { tile: "linear-gradient(145deg,#9acb86,#5a9a5a)", ring: "#d6efc6", fill: "#5a9a5a" },
  "clay-shell": { tile: "linear-gradient(145deg,#e9b6c4,#c98aa0)", ring: "#f8dce5", fill: "#c98aa0" },
  "clay-star": { tile: "linear-gradient(145deg,#a99ad8,#6a5aa8)", ring: "#d9d0f4", fill: "#8a7ac8" },
};

export function letterColors(theme: LetterTheme) {
  return LETTER_COLORS[theme];
}

/** Flask fill levels (0..1) for each round: full when done, empty when ahead. */
export function flaskFills(total: number, round: number): number[] {
  return Array.from({ length: Math.max(0, total) }, (_, i) => (i < round ? 1 : 0));
}

export function LetterFlasks({ theme, total, round }: { theme: LetterTheme; total: number; round: number }) {
  const c = letterColors(theme);
  return (
    <div aria-hidden="true" className="mx-auto mt-4 flex max-w-xs items-end justify-center gap-1.5" style={{ direction: "ltr" }}>
      {flaskFills(total, round).map((fill, i) => (
        <span key={i} className="relative h-8 w-5 overflow-hidden rounded-b-lg rounded-t-sm border-2" style={{ borderColor: c.ring }}>
          <span className="absolute bottom-0 left-0 right-0 transition-all duration-500" style={{ height: fill * 100 + "%", background: c.fill }} />
        </span>
      ))}
    </div>
  );
}
