export type FlySky = "dusk" | "midnight" | "aurora" | "nebula" | "dawn";
export const FLY_SKIES: FlySky[] = ["dusk", "midnight", "aurora", "nebula", "dawn"];

/** The sky changes every 6 levels, so a 30-level flight crosses all five skies. */
export function getFlySky(levelIndex: number): FlySky {
  return FLY_SKIES[Math.min(FLY_SKIES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const SKY: Record<FlySky, { bg: string; cloud: string; glow: string }> = {
  dusk: { bg: "linear-gradient(#3b2a6b,#d9758a 85%,#f6b878)", cloud: "#f3d3e0", glow: "#ffd9a0" },
  midnight: { bg: "linear-gradient(#050b1f,#142a5a)", cloud: "#6f86b8", glow: "#cfe3ff" },
  aurora: { bg: "linear-gradient(#06182a,#0e4a4f 70%,#2a7a6a)", cloud: "#7fc9b8", glow: "#9dffd0" },
  nebula: { bg: "linear-gradient(#1c0b3a,#5a2a7a 70%,#a24a8a)", cloud: "#c9a0e0", glow: "#ffb8f0" },
  dawn: { bg: "linear-gradient(#27406e,#e89ab0 75%,#ffe0a0)", cloud: "#fff0e0", glow: "#fff3b0" },
};

export const FLY_CONSTELLATIONS = [
  [[8, 18], [14, 12], [21, 16], [27, 9]],
  [[60, 10], [66, 18], [74, 14], [80, 22], [86, 15]],
  [[38, 8], [44, 15], [51, 10]],
];

export function FlyScene({ sky, distance }: { sky: FlySky; distance: number }) {
  const p = SKY[sky];
  const starX = -((distance * 0.05) % 180);
  const cloudX = -((distance * 0.22) % 400);
  const shoot = (distance / 5) % 100;
  return (
    <div aria-hidden="true" className="absolute inset-0" data-fly-sky={sky}>
      <div className="absolute inset-0" style={{ background: p.bg }} />
      <div className="absolute inset-0 opacity-90" style={{ backgroundImage: "radial-gradient(2px 2px at 20px 30px,#fff,transparent),radial-gradient(1.5px 1.5px at 90px 80px,#fff,transparent),radial-gradient(2.5px 2.5px at 150px 40px,#fff,transparent),radial-gradient(1.5px 1.5px at 60px 130px,#fff,transparent)", backgroundSize: "180px 160px", backgroundPosition: starX + "px 0" }} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {FLY_CONSTELLATIONS.map((points, i) => (
          <g key={i} opacity="0.55">
            <polyline fill="none" stroke={p.glow} strokeWidth="0.25" points={points.map(point => point.join(",")).join(" ")} />
            {points.map(([x, y], j) => <circle key={j} cx={x} cy={y} r="0.7" fill={p.glow} />)}
          </g>
        ))}
        <line x1={110 - shoot * 1.3} y1={shoot * 0.35} x2={118 - shoot * 1.3} y2={shoot * 0.35 - 3} stroke="#fff" strokeWidth="0.35" strokeLinecap="round" opacity={shoot > 5 && shoot < 80 ? 0.8 : 0} />
      </svg>
      <div className="absolute bottom-[14%] left-0 h-24 w-[1600px]" style={{ transform: "translateX(" + cloudX + "px)" }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="absolute" style={{ left: i * 400 + 40, top: (i % 2) * 18, width: 180, height: 46, borderRadius: 40, background: p.cloud, opacity: 0.35, boxShadow: "60px -14px 0 -6px " + p.cloud + "55" }} />
        ))}
      </div>
    </div>
  );
}

export function CloudPillar({ height, fromTop, tone }: { height: number; fromTop: boolean; tone: string }) {
  const h = Math.max(0, height);
  return (
    <div className="absolute inset-x-0" style={{ [fromTop ? "top" : "bottom"]: 0, height: h }}>
      <div className="absolute inset-x-1 rounded-[2.4rem]" style={{ top: 0, bottom: 0, background: "linear-gradient(90deg," + tone + "," + "rgba(255,255,255,.55) 45%," + tone + ")", boxShadow: "inset 0 -6px 0 rgba(0,0,0,.12), 0 6px 14px rgba(0,0,0,.25)" }} />
      <div className="absolute left-0 h-9 w-9 rounded-full" style={{ [fromTop ? "bottom" : "top"]: -10, background: tone }} />
      <div className="absolute right-0 h-10 w-10 rounded-full" style={{ [fromTop ? "bottom" : "top"]: -12, background: tone }} />
    </div>
  );
}

export function Crescent({ tilt, hit, celebrate }: { tilt: number; hit: boolean; celebrate: boolean }) {
  return (
    <div style={{ transform: "rotate(" + Math.max(-25, Math.min(25, tilt)) + "deg)", filter: "drop-shadow(0 0 14px rgba(255,226,138,.85))" }}>
      <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label="الهلال">
        <path d="M58 10a34 34 0 1 0 0 64 28 28 0 1 1 0-64z" fill={hit ? "#f0a090" : "#ffe28a"} stroke="#c99a2e" strokeWidth="3" />
        <path d="M30 22q8-10 20-10" stroke="rgba(255,255,255,.7)" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="36" cy="44" r="3" fill="#5a3a12" />
        <path d={celebrate ? "M32 56q8 8 16 0" : hit ? "M32 60q8-6 16 0" : "M32 56q8 5 16 0"} stroke="#5a3a12" strokeWidth="3" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
