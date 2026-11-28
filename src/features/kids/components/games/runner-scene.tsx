import type { ReactElement } from "react";

export type RunnerSceneTheme = "garden" | "market" | "mosque" | "stars" | "dawn" | "gold";
export type RunnerHazardVariant = "box" | "cone" | "stone";

type ScenePalette = {
  sky: string;
  far: string;
  near: string;
  ground: string;
  groundTop: string;
  accent: string;
};

export const RUNNER_SCENE_PALETTES: Record<RunnerSceneTheme, ScenePalette> = {
  garden: { sky: "linear-gradient(#7fd6c2,#d6f2d0)", far: "#4f9b73", near: "#2f7a55", ground: "#7a5a3a", groundTop: "#5fae4d", accent: "#f4d35e" },
  market: { sky: "linear-gradient(#f7b267,#fde2b3)", far: "#c97b4a", near: "#a85a34", ground: "#8a5a3a", groundTop: "#d9a05b", accent: "#f25c54" },
  mosque: { sky: "linear-gradient(#4a6fa5,#c9d6ea)", far: "#8aa0c4", near: "#5f7aa8", ground: "#6b5b4a", groundTop: "#c9b79c", accent: "#f4d35e" },
  stars: { sky: "linear-gradient(#0b1a3a,#2b3a72)", far: "#1d2b5a", near: "#142046", ground: "#1b2a3a", groundTop: "#3b4f7a", accent: "#f4e9a8" },
  dawn: { sky: "linear-gradient(#f28dab,#ffd9a0)", far: "#b86a8c", near: "#8e4a74", ground: "#6a4a5a", groundTop: "#d98a6a", accent: "#fff3b0" },
  gold: { sky: "linear-gradient(#f2c14e,#fbe9a8)", far: "#d9a03b", near: "#b9822a", ground: "#9a6a2a", groundTop: "#efc76a", accent: "#ffffff" },
};

function farShape(theme: RunnerSceneTheme, fill: string): ReactElement {
  switch (theme) {
    case "mosque":
      return <path fill={fill} d="M0 160V120h40v-30l12-18 12 18v30h40V100q20-40 40 0v60zM160 160v-70l8-26 8 26v70zM200 160v-40h30q10-30 30 0v40z" />;
    case "market":
      return <path fill={fill} d="M0 160V110q25-30 50 0v50zM60 160V100q30-36 60 0v60zM130 160V120q20-24 40 0v40z" />;
    case "stars":
      return <path fill={fill} d="M0 160V120l40-30 40 30 40-40 40 40v40z" />;
    case "gold":
      return <path fill={fill} d="M0 160q50-60 100-10t100-20v30z" />;
    case "dawn":
      return <path fill={fill} d="M0 160l50-70 40 40 50-80 60 110z" />;
    default:
      return <path fill={fill} d="M0 160q40-70 80-20t80-30v50z" />;
  }
}

export function RunnerScene({ theme, distance }: { theme: RunnerSceneTheme; distance: number }) {
  const p = RUNNER_SCENE_PALETTES[theme];
  const farX = -((distance * 0.12) % 240);
  const nearX = -((distance * 0.35) % 240);
  const groundX = -((distance * 1) % 80);
  const layer = (x: number, fill: string, top: string, h: number, key: string) => (
    <div key={key} aria-hidden="true" className="absolute inset-x-0" style={{ top, height: h, overflow: "hidden" }}>
      <svg viewBox="0 0 240 160" preserveAspectRatio="none" width="1200" height={h} style={{ position: "absolute", left: 0, transform: "translateX(" + x + "px)" }}>
        {[0, 1, 2, 3, 4].map(i => <g key={i} transform={"translate(" + i * 240 + " 0)"}>{farShape(theme, fill)}</g>)}
      </svg>
    </div>
  );
  return (
    <div aria-hidden="true" className="absolute inset-0" data-runner-theme={theme}>
      <div className="absolute inset-0" style={{ background: p.sky }} />
      {theme === "stars" && (
        <div className="absolute inset-0 opacity-80" style={{ backgroundImage: "radial-gradient(2px 2px at 20px 30px,#fff,transparent),radial-gradient(2px 2px at 90px 80px,#fff,transparent),radial-gradient(1.5px 1.5px at 150px 20px,#fff,transparent)", backgroundSize: "180px 120px" }} />
      )}
      <div className="absolute right-8 top-8 h-14 w-14 rounded-full" style={{ background: p.accent, boxShadow: "0 0 40px " + p.accent + "88, inset -6px -6px 0 rgba(0,0,0,.08)" }} />
      {layer(farX, p.far, "34%", 160, "far")}
      {layer(nearX, p.near, "48%", 130, "near")}
      <div className="absolute inset-x-0 bottom-0 h-[26%]" style={{ background: p.ground }}>
        <div className="absolute inset-x-0 top-0 h-3" style={{ background: p.groundTop, borderRadius: "0 0 14px 14px" }} />
        <div className="absolute inset-x-0 top-5 h-3 opacity-40" style={{ backgroundImage: "repeating-linear-gradient(90deg,rgba(0,0,0,.35) 0 14px,transparent 14px 40px)", backgroundPosition: groundX + "px 0" }} />
      </div>
    </div>
  );
}

export function RunnerHazard({ variant, theme }: { variant: RunnerHazardVariant; theme: RunnerSceneTheme }) {
  const p = RUNNER_SCENE_PALETTES[theme];
  const shade = "rgba(0,0,0,.18)";
  const hi = "rgba(255,255,255,.45)";
  if (variant === "box") {
    return (
      <svg width="56" height="52" viewBox="0 0 56 52" role="img" aria-label="صندوق">
        <ellipse cx="28" cy="48" rx="24" ry="4" fill={shade} />
        <rect x="6" y="8" width="44" height="38" rx="9" fill="#b9733a" stroke="#8a5224" strokeWidth="2" />
        <rect x="10" y="12" width="36" height="8" rx="4" fill={hi} />
        <path d="M8 28h40" stroke="#8a5224" strokeWidth="3" />
      </svg>
    );
  }
  if (variant === "cone") {
    return (
      <svg width="52" height="58" viewBox="0 0 52 58" role="img" aria-label="عائق مدبب">
        <ellipse cx="26" cy="54" rx="22" ry="4" fill={shade} />
        <path d="M26 4c4 0 8 20 20 44 0 4-6 6-20 6S6 52 6 48C18 24 22 4 26 4z" fill={p.accent === "#ffffff" ? "#f08a3c" : "#e56b3d"} stroke="#a8431f" strokeWidth="2" />
        <path d="M18 26q8-4 16 0M14 38q12-5 24 0" stroke="#fff3" strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  return (
    <svg width="58" height="46" viewBox="0 0 58 46" role="img" aria-label="حجر">
      <ellipse cx="29" cy="42" rx="25" ry="4" fill={shade} />
      <path d="M6 40C4 22 16 6 32 6s24 14 20 34z" fill="#8f98a3" stroke="#5f6874" strokeWidth="2" />
      <path d="M16 18q8-8 18-6" stroke={hi} strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
