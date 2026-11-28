export type MapTheme = "courtyard" | "library" | "garden" | "night" | "dawn";
export const MAP_THEMES: MapTheme[] = ["courtyard", "library", "garden", "night", "dawn"];

/** A different part of the mosque grounds every 6 levels. */
export function getMapTheme(levelIndex: number): MapTheme {
  return MAP_THEMES[Math.min(MAP_THEMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const MAP: Record<MapTheme, { ground: string; tile: string; path: string; done: string; label: string }> = {
  courtyard: { ground: "#d8c39a", tile: "rgba(120,90,50,.18)", path: "#f0e2bf", done: "#e0a640", label: "الساحة" },
  library: { ground: "#b9b0d0", tile: "rgba(70,60,120,.2)", path: "#e4def5", done: "#7a6ad0", label: "المكتبة" },
  garden: { ground: "#9cc88a", tile: "rgba(40,100,50,.2)", path: "#e8f2d0", done: "#4fae6a", label: "الحديقة" },
  night: { ground: "#1d2a52", tile: "rgba(255,255,255,.08)", path: "#4a5c96", done: "#ffe28a", label: "ليل المسجد" },
  dawn: { ground: "#e8a8a0", tile: "rgba(140,60,60,.18)", path: "#fff0e0", done: "#f0884a", label: "الفجر" },
};

export function mapColors(theme: MapTheme) {
  return MAP[theme];
}

export function MapScene({ theme, nodes, position }: { theme: MapTheme; nodes: { x: number; y: number }[]; position: number }) {
  const c = MAP[theme];
  const all = nodes.map(n => n.x + "," + n.y).join(" ");
  const done = nodes.slice(0, Math.max(1, position + 1)).map(n => n.x + "," + n.y).join(" ");
  return (
    <div aria-hidden="true" className="absolute inset-0" data-map-theme={theme}>
      <div className="absolute inset-0" style={{ background: c.ground }} />
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(45deg," + c.tile + " 25%,transparent 25%,transparent 75%," + c.tile + " 75%),linear-gradient(45deg," + c.tile + " 25%,transparent 25%,transparent 75%," + c.tile + " 75%)", backgroundSize: "44px 44px", backgroundPosition: "0 0,22px 22px" }} />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <polyline points={all} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" transform="translate(0.6 1)" />
        <polyline points={all} fill="none" stroke={c.path} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={done} fill="none" stroke={c.done} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black" style={{ background: "rgba(0,0,0,.25)", color: "#fff" }}>{c.label}</div>
    </div>
  );
}

export function StationArt({ state, icon }: { state: "done" | "next" | "locked"; icon: string }) {
  const bg = state === "done" ? "linear-gradient(#ffe28a,#e0a640)" : state === "next" ? "linear-gradient(#bdf0d6,#5fd1a6)" : "linear-gradient(#cfd2d8,#9aa0aa)";
  return (
    <span
      aria-hidden="true"
      className="grid h-16 w-16 place-items-center text-3xl"
      style={{ background: bg, borderRadius: "46% 46% 38% 38%", border: "3px solid rgba(0,0,0,.22)", boxShadow: "0 6px 0 rgba(0,0,0,.22)" + (state === "next" ? ",0 0 24px rgba(95,209,166,.8)" : ""), color: state === "locked" ? "rgba(0,0,0,.35)" : "#5a3a12" }}
    >
      {state === "locked" ? "•" : icon}
    </span>
  );
}

export function LightGuide() {
  return (
    <span
      aria-hidden="true"
      className="block h-6 w-6 rounded-full"
      style={{ background: "radial-gradient(circle,#fffbe0 0,#ffe28a 45%,rgba(255,226,138,0) 72%)", boxShadow: "0 0 22px 8px rgba(255,226,138,.7)", animation: "pulse 1.8s ease-in-out infinite" }}
    />
  );
}
