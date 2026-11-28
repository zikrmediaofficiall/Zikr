export type VerseTheme = "clay-scroll" | "clay-dunes" | "clay-oasis" | "clay-mountain" | "clay-night-sky";
export const VERSE_THEMES: VerseTheme[] = ["clay-scroll", "clay-dunes", "clay-oasis", "clay-mountain", "clay-night-sky"];

/** A new bead-string style every 6 levels. */
export function getVerseTheme(levelIndex: number): VerseTheme {
  return VERSE_THEMES[Math.min(VERSE_THEMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const VERSE_COLORS: Record<VerseTheme, { string: string; bead: string; lit: string }> = {
  "clay-scroll": { string: "#c9a870", bead: "#e8d9b5", lit: "#f3c969" },
  "clay-dunes": { string: "#c98a5e", bead: "#f0d2b0", lit: "#ffd98a" },
  "clay-oasis": { string: "#6a9a5a", bead: "#cfe6c8", lit: "#a8e08a" },
  "clay-mountain": { string: "#8a8aa8", bead: "#d6d6e6", lit: "#c9b8ff" },
  "clay-night-sky": { string: "#4a5a9a", bead: "#aab6e6", lit: "#fff1a8" },
};

export function verseColors(theme: VerseTheme) {
  return VERSE_COLORS[theme];
}

/** Which beads glow: one per placed word, capped at the total. */
export function litBeads(total: number, placed: number): boolean[] {
  return Array.from({ length: Math.max(0, total) }, (_, i) => i < Math.min(placed, total));
}

export function VerseLightString({ theme, total, placed }: { theme: VerseTheme; total: number; placed: number }) {
  const c = verseColors(theme);
  const beads = litBeads(Math.min(total, 24), Math.round((Math.min(placed, total) / Math.max(1, total)) * Math.min(total, 24)));
  return (
    <div aria-hidden="true" className="relative mx-3 mt-3 flex h-8 items-center justify-between sm:mx-6" style={{ direction: "rtl" }}>
      <span className="absolute left-2 right-2 top-1/2 h-1 -translate-y-1/2 rounded" style={{ background: c.string, opacity: 0.6 }} />
      {beads.map((lit, i) => (
        <span key={i} className="relative h-3.5 w-3.5 rounded-full border transition-all duration-300" style={{ background: lit ? c.lit : c.bead, borderColor: c.string, boxShadow: lit ? "0 0 10px " + c.lit : undefined, opacity: lit ? 1 : 0.7 }} />
      ))}
    </div>
  );
}
