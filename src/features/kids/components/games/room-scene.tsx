export type RoomTheme = "prayer-hall" | "library" | "courtyard" | "kitchen" | "garden";
export const ROOM_THEMES: RoomTheme[] = ["prayer-hall", "library", "courtyard", "kitchen", "garden"];

/** A different room every 6 levels. */
export function getRoomTheme(levelIndex: number): RoomTheme {
  return ROOM_THEMES[Math.min(ROOM_THEMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const ROOM: Record<RoomTheme, { wall: string; floor: string; tile: string; name: string }> = {
  "prayer-hall": { wall: "#e9dcc0", floor: "#9a7a52", tile: "rgba(60,40,20,.18)", name: "قاعة الصلاة" },
  library: { wall: "#cfc6e6", floor: "#7a6a9a", tile: "rgba(30,20,70,.2)", name: "المكتبة" },
  courtyard: { wall: "#f0e2bf", floor: "#c9a870", tile: "rgba(90,60,20,.2)", name: "الفناء" },
  kitchen: { wall: "#f4e0d0", floor: "#b87a5a", tile: "rgba(80,30,10,.2)", name: "المطبخ" },
  garden: { wall: "#cfe6c8", floor: "#6a9a5a", tile: "rgba(20,70,20,.22)", name: "الحديقة" },
};

export function roomColors(theme: RoomTheme) {
  return ROOM[theme];
}

/** Dust spots visible for a given tidy ratio (0 = untouched, 1 = clean). */
export function dustSpotCount(total: number, placed: number, max = 9): number {
  if (total <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, placed / total));
  return Math.ceil(max * (1 - ratio));
}

const SPOTS = [[12, 70], [70, 80], [40, 60], [84, 58], [24, 88], [56, 90], [90, 84], [8, 50], [60, 70]];

export function RoomScene({ theme, total, placed }: { theme: RoomTheme; total: number; placed: number }) {
  const c = ROOM[theme];
  const dust = dustSpotCount(total, placed);
  const clean = total > 0 && placed >= total;
  return (
    <div aria-hidden="true" className="absolute inset-0" data-room-theme={theme}>
      <div className="absolute inset-x-0 top-0 h-[42%]" style={{ background: c.wall }} />
      <div className="absolute inset-x-0 bottom-0 top-[42%]" style={{ background: c.floor }} />
      <div className="absolute inset-x-0 bottom-0 top-[42%]" style={{ backgroundImage: "linear-gradient(90deg," + c.tile + " 1px,transparent 1px),linear-gradient(" + c.tile + " 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="absolute right-6 top-4 h-16 w-12 rounded-t-full border-4" style={{ borderColor: "rgba(0,0,0,.18)", background: "linear-gradient(#bfe6ff,#f4fbff)" }} />
      {SPOTS.slice(0, dust).map(([x, y], i) => (
        <div key={i} className="absolute rounded-full" style={{ left: x + "%", top: y + "%", width: 34 + (i % 3) * 12, height: 16 + (i % 3) * 6, background: "rgba(70,50,30,.3)", filter: "blur(2px)" }} />
      ))}
      {clean && <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 55%,rgba(255,243,176,.55),transparent 60%)" }} />}
      <div className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black" style={{ background: "rgba(0,0,0,.28)", color: "#fff" }}>{c.name}</div>
    </div>
  );
}
