export type QuizTheme = "clay-library" | "clay-observatory" | "clay-orchard" | "clay-market" | "clay-harbor";
export const QUIZ_THEMES: QuizTheme[] = ["clay-library", "clay-observatory", "clay-orchard", "clay-market", "clay-harbor"];

/** A new path style every 6 levels. */
export function getQuizTheme(levelIndex: number): QuizTheme {
  return QUIZ_THEMES[Math.min(QUIZ_THEMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const QUIZ_COLORS: Record<QuizTheme, { path: string; node: string; done: string }> = {
  "clay-library": { path: "#c9a870", node: "#e8d9b5", done: "#6a9a5a" },
  "clay-observatory": { path: "#7a6a9a", node: "#cfc6e6", done: "#e8b44a" },
  "clay-orchard": { path: "#8fb07a", node: "#e2f0c8", done: "#d9803a" },
  "clay-market": { path: "#c98a5e", node: "#f4e0d0", done: "#4a88a8" },
  "clay-harbor": { path: "#6aa0b8", node: "#cbe8f2", done: "#b9693a" },
};

export function quizColors(theme: QuizTheme) {
  return QUIZ_COLORS[theme];
}

export type QuizNodeState = "done" | "current" | "ahead";
export function quizNodeStates(total: number, index: number): QuizNodeState[] {
  return Array.from({ length: Math.max(0, total) }, (_, i) => (i < index ? "done" : i === index ? "current" : "ahead"));
}

/** Streak reward tier: 0 none, 1 at 3 in a row, 2 at 5, 3 at 8. */
export function streakRewardTier(streak: number): 0 | 1 | 2 | 3 {
  if (streak >= 8) return 3;
  if (streak >= 5) return 2;
  if (streak >= 3) return 1;
  return 0;
}

export function QuizPath({ theme, total, index, streak }: { theme: QuizTheme; total: number; index: number; streak: number }) {
  const c = quizColors(theme);
  const states = quizNodeStates(total, index);
  const tier = streakRewardTier(streak);
  return (
    <div aria-hidden="true" className="mt-3 flex items-center gap-1 rounded-2xl border border-white/10 bg-black/20 px-3 py-2" style={{ direction: "ltr" }}>
      {states.map((state, i) => (
        <div key={i} className="flex flex-1 items-center">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[10px] font-black text-white" style={{ background: state === "done" ? c.done : state === "current" ? c.path : c.node, borderColor: c.path, opacity: state === "ahead" ? 0.6 : 1, transform: state === "current" ? "scale(1.2)" : undefined }}>{state === "done" ? "✓" : i + 1}</span>
          {i < states.length - 1 && <span className="h-1 flex-1 rounded" style={{ background: i < index ? c.done : c.path, opacity: i < index ? 1 : 0.35 }} />}
        </div>
      ))}
      {tier > 0 && <span className="ml-2 shrink-0 rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-black text-brand-gold">{"★".repeat(tier)}</span>}
    </div>
  );
}
