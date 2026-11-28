export type WuduTheme = "clay-jug" | "clay-basin" | "clay-fountain" | "clay-stream" | "clay-pool";
export const WUDU_THEMES: WuduTheme[] = ["clay-jug", "clay-basin", "clay-fountain", "clay-stream", "clay-pool"];

/** A new water vessel every 6 levels. */
export function getWuduTheme(levelIndex: number): WuduTheme {
  return WUDU_THEMES[Math.min(WUDU_THEMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const WUDU_COLORS: Record<WuduTheme, { vessel: string; water: string; rim: string; radius: string }> = {
  "clay-jug": { vessel: "#c98a5e", water: "#6ab8e0", rim: "#f0d2b0", radius: "40% 40% 20% 20%" },
  "clay-basin": { vessel: "#b99a5a", water: "#5aa8d8", rim: "#f5e6bd", radius: "10% 10% 50% 50%" },
  "clay-fountain": { vessel: "#8a8aa8", water: "#7ac8f0", rim: "#d6d6e6", radius: "30% 30% 30% 30%" },
  "clay-stream": { vessel: "#6a9a5a", water: "#4ab8c8", rim: "#cfe6c8", radius: "20% 20% 20% 20%" },
  "clay-pool": { vessel: "#4a88a8", water: "#8ad8f0", rim: "#cbe8f2", radius: "15% 15% 15% 15%" },
};

export function wuduColors(theme: WuduTheme) {
  return WUDU_COLORS[theme];
}

/** Water height (0..100), clamped, from completed steps. */
export function waterPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

/** Drops shown for mistakes, capped so the row never overflows. */
export function mistakeDrops(mistakes: number, cap = 5): number {
  return Math.max(0, Math.min(cap, Math.floor(mistakes)));
}

export function WaterVessel({ theme, done, total, mistakes }: { theme: WuduTheme; done: number; total: number; mistakes: number }) {
  const c = wuduColors(theme);
  const pct = waterPercent(done, total);
  const drops = mistakeDrops(mistakes);
  return (
    <div aria-hidden="true" className="mx-4 mt-3 flex items-end gap-4 sm:mx-6" style={{ direction: "ltr" }}>
      <div className="relative h-24 w-20 overflow-hidden border-4" style={{ background: "rgba(255,255,255,.08)", borderColor: c.vessel, borderRadius: c.radius }}>
        <div className="absolute bottom-0 left-0 right-0 transition-all duration-500" style={{ height: pct + "%", background: c.water }} />
        <div className="absolute left-0 right-0 top-0 h-2" style={{ background: c.rim, opacity: 0.8 }} />
      </div>
      <div className="flex min-h-8 items-center gap-1">
        {Array.from({ length: drops }, (_, i) => <span key={i} className="h-4 w-3 rounded-b-full rounded-t-[60%] bg-rose-300/80" />)}
      </div>
    </div>
  );
}
