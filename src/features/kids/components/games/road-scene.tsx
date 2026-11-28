export type RoadTheme = "city" | "desert" | "rain" | "night" | "sunrise";

export const ROAD_THEMES: RoadTheme[] = ["city", "desert", "rain", "night", "sunrise"];

/** A new scenery theme every 6 levels, so a 30-level journey passes through all five. */
export function getRoadTheme(levelIndex: number): RoadTheme {
  return ROAD_THEMES[Math.min(ROAD_THEMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const PALETTE: Record<RoadTheme, { sky: string; ground: string; road: string; edge: string; far: string; post: string }> = {
  city: { sky: "linear-gradient(#7db7e8,#e8f1f8)", ground: "#7f9c6a", road: "#4b5560", edge: "#f4d35e", far: "#9db4cc", post: "#c9b79c" },
  desert: { sky: "linear-gradient(#f2b45a,#fbe3b0)", ground: "#e0b46a", road: "#6a5a4a", edge: "#fff3c4", far: "#d08a4a", post: "#b8793a" },
  rain: { sky: "linear-gradient(#5d6f86,#a9b6c6)", ground: "#4f6f5a", road: "#394450", edge: "#cfd8e3", far: "#7d8aa0", post: "#7a8696" },
  night: { sky: "linear-gradient(#0a1633,#2a3a70)", ground: "#14243a", road: "#222c3c", edge: "#f4e9a8", far: "#1b2a55", post: "#f4e9a8" },
  sunrise: { sky: "linear-gradient(#f28dab,#ffe1a8)", ground: "#8a9a5a", road: "#5a4a58", edge: "#fff3b0", far: "#b86a8c", post: "#e8b46a" },
};

/** Perspective factor: 1 at the player's line (82%), smaller toward the horizon. */
export function roadScale(position: number): number {
  return (0.3 + (0.7 * Math.max(0, Math.min(120, position))) / 100) / 0.874;
}

export function roadLaneLeft(lane: number, position: number): number {
  return 50 + (lane - 1) * 33.5 * roadScale(position);
}

export function RoadScene({ theme, distance }: { theme: RoadTheme; distance: number }) {
  const p = PALETTE[theme];
  const s0 = roadScale(0);
  const s1 = roadScale(100);
  const phase = (distance / 60) % 1;
  const dashes = Array.from({ length: 9 }, (_, i) => ((i + phase) / 9) * 100);
  const posts = Array.from({ length: 6 }, (_, i) => ((i + ((distance / 140) % 1)) / 6) * 100);
  return (
    <div aria-hidden="true" className="absolute inset-0" data-road-theme={theme}>
      <div className="absolute inset-x-0 top-0 h-[36%]" style={{ background: p.sky }} />
      <svg className="absolute inset-x-0 top-[18%] h-[18%] w-full" viewBox="0 0 200 40" preserveAspectRatio="none">
        {theme === "city" || theme === "night" ? (
          <path fill={p.far} d="M0 40V22h14V12h12v10h10V6h14v16h12V14h12v26zM100 40V20h14V8h10v12h14V16h12v24zM150 40V18h12V10h14v30z" />
        ) : theme === "desert" ? (
          <path fill={p.far} d="M0 40q30-30 60-6t70-14 70 20z" />
        ) : (
          <path fill={p.far} d="M0 40l30-24 24 14 36-26 34 30 30-16 46 22z" />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 top-[36%]" style={{ background: p.ground }} />
      <svg className="absolute inset-x-0 bottom-0 top-[36%] h-[64%] w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon fill={p.road} points={`${50 - 50.25 * s0},0 ${50 + 50.25 * s0},0 ${50 + 50.25 * s1},100 ${50 - 50.25 * s1},100`} />
        <polyline stroke={p.edge} strokeWidth="0.9" fill="none" points={`${50 - 50.25 * s0},0 ${50 - 50.25 * s1},100`} />
        <polyline stroke={p.edge} strokeWidth="0.9" fill="none" points={`${50 + 50.25 * s0},0 ${50 + 50.25 * s1},100`} />
        {dashes.map((pos, i) => {
          const a = roadScale(pos * 0.9);
          const b = roadScale(Math.min(100, pos * 0.9 + 4));
          return [-16.75, 16.75].map(off => (
            <line key={i + ":" + off} x1={50 + off * a} y1={pos * 0.9} x2={50 + off * b} y2={Math.min(100, pos * 0.9 + 4)} stroke="rgba(255,255,255,.7)" strokeWidth={0.5 + a * 0.5} strokeLinecap="round" />
          ));
        })}
      </svg>
      {posts.map((pos, i) => {
        const sc = roadScale(pos * 0.9);
        const top = 36 + pos * 0.9 * 0.64;
        return [-1, 1].map(side => (
          <div key={i + ":" + side} className="absolute" style={{ top: top + "%", left: 50 + side * 56 * sc + "%", transform: "translate(-50%,-100%) scale(" + Math.max(0.25, sc) + ")", transformOrigin: "bottom center" }}>
            {theme === "desert" ? (
              <div style={{ width: 14, height: 40, background: p.post, borderRadius: 8, boxShadow: "0 3px 0 rgba(0,0,0,.2)" }} />
            ) : theme === "city" || theme === "night" || theme === "rain" ? (
              <div style={{ width: 6, height: 54, background: p.post, borderRadius: 3, position: "relative" }}>
                <div style={{ position: "absolute", top: -4, left: -6, width: 18, height: 10, borderRadius: 6, background: theme === "night" ? "#fff6b8" : "#e8e1c8", boxShadow: theme === "night" ? "0 0 18px #fff6b8" : "none" }} />
              </div>
            ) : (
              <div style={{ width: 26, height: 44, background: "#5a8a4a", borderRadius: "50% 50% 8px 8px", boxShadow: "0 3px 0 rgba(0,0,0,.2)" }} />
            )}
          </div>
        ));
      })}
      {theme === "rain" && (
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "repeating-linear-gradient(100deg,rgba(255,255,255,.35) 0 1px,transparent 1px 14px)", backgroundPosition: "0 " + ((distance * 2) % 40) + "px" }} />
      )}
      {theme === "night" && (
        <div className="absolute inset-x-0 top-0 h-[36%] opacity-80" style={{ backgroundImage: "radial-gradient(2px 2px at 20px 30px,#fff,transparent),radial-gradient(2px 2px at 90px 70px,#fff,transparent),radial-gradient(1.5px 1.5px at 150px 20px,#fff,transparent)", backgroundSize: "180px 110px" }} />
      )}
    </div>
  );
}

export function RoadHazard({ variant }: { variant: string }) {
  const shade = "rgba(0,0,0,.22)";
  if (variant === "lantern") {
    return (
      <svg width="48" height="56" viewBox="0 0 48 56" role="img" aria-label="فانوس">
        <ellipse cx="24" cy="52" rx="18" ry="3.5" fill={shade} />
        <rect x="12" y="10" width="24" height="34" rx="10" fill="#e08a3a" stroke="#9a5a1f" strokeWidth="2" />
        <rect x="18" y="4" width="12" height="8" rx="3" fill="#9a5a1f" />
        <ellipse cx="24" cy="27" rx="5" ry="9" fill="#ffe28a" />
      </svg>
    );
  }
  if (variant === "stone") {
    return (
      <svg width="56" height="46" viewBox="0 0 56 46" role="img" aria-label="حجر">
        <ellipse cx="28" cy="42" rx="24" ry="4" fill={shade} />
        <path d="M5 40C4 22 16 6 31 6s23 14 20 34z" fill="#8f98a3" stroke="#5f6874" strokeWidth="2" />
        <path d="M15 18q8-8 18-6" stroke="rgba(255,255,255,.45)" strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg width="52" height="56" viewBox="0 0 52 56" role="img" aria-label="حاجز مروري">
      <ellipse cx="26" cy="52" rx="22" ry="3.5" fill={shade} />
      <path d="M26 4c4 0 8 20 20 44 0 4-6 6-20 6S6 52 6 48C18 24 22 4 26 4z" fill="#e56b3d" stroke="#a8431f" strokeWidth="2" />
      <path d="M18 26q8-4 16 0M14 38q12-5 24 0" stroke="rgba(255,255,255,.55)" strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
