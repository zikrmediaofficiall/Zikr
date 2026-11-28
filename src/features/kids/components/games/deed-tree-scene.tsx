export type TreeTheme = "clay-sapling" | "clay-olive" | "clay-date-palm" | "clay-fig" | "clay-orchard-tree";
export const TREE_THEMES: TreeTheme[] = ["clay-sapling", "clay-olive", "clay-date-palm", "clay-fig", "clay-orchard-tree"];

/** A new tree kind every 6 levels. */
export function getTreeTheme(levelIndex: number): TreeTheme {
  return TREE_THEMES[Math.min(TREE_THEMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const TREE_COLORS: Record<TreeTheme, { trunk: string; leaf: string; fruit: string }> = {
  "clay-sapling": { trunk: "#a9825a", leaf: "#8fc07a", fruit: "#f3c969" },
  "clay-olive": { trunk: "#8a7a5a", leaf: "#9ab07a", fruit: "#5a6a3a" },
  "clay-date-palm": { trunk: "#b98a5a", leaf: "#6aa05a", fruit: "#c9803a" },
  "clay-fig": { trunk: "#9a7a6a", leaf: "#7ab06a", fruit: "#8a5a8a" },
  "clay-orchard-tree": { trunk: "#a9825a", leaf: "#5a9a5a", fruit: "#e86a5a" },
};

export function treeColors(theme: TreeTheme) {
  return TREE_COLORS[theme];
}

/** Leaves grown, from completed scenes. Never exceeds `max`. */
export function leafCount(done: number, total: number, max = 12): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(max, Math.round((Math.min(done, total) / total) * max)));
}

const LEAF_SPOTS = [[50, 28], [34, 34], [66, 34], [24, 46], [76, 46], [42, 22], [58, 22], [50, 42], [30, 56], [70, 56], [16, 38], [84, 38]];

export function DeedTree({ theme, done, total, complete }: { theme: TreeTheme; done: number; total: number; complete: boolean }) {
  const c = treeColors(theme);
  const n = leafCount(done, total);
  return (
    <svg aria-hidden="true" viewBox="0 0 100 80" className="pointer-events-none absolute bottom-2 right-3 z-10 h-28 w-28 opacity-90 sm:h-36 sm:w-36">
      <rect x="46" y="48" width="8" height="30" rx="3" fill={c.trunk} />
      <ellipse cx="50" cy="78" rx="22" ry="3" fill="rgba(0,0,0,.18)" />
      {LEAF_SPOTS.slice(0, n).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} fill={c.leaf} stroke="rgba(255,255,255,.35)" strokeWidth={1} />)}
      {complete && [[40, 30], [60, 36], [50, 24]].map(([x, y], i) => <circle key={"f" + i} cx={x} cy={y} r={3.5} fill={c.fruit} />)}
    </svg>
  );
}
