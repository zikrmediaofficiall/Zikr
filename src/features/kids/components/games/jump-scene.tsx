export type JumpBiome = "valley" | "cliffs" | "clouds" | "sunset" | "summit";
export const JUMP_BIOMES: JumpBiome[] = ["valley", "cliffs", "clouds", "sunset", "summit"];

/** A new climbing biome every 6 levels, so 30 levels travel from the valley up to the summit. */
export function getJumpBiome(levelIndex: number): JumpBiome {
  return JUMP_BIOMES[Math.min(JUMP_BIOMES.length - 1, Math.floor(Math.max(0, levelIndex) / 6))];
}

const BIOME: Record<JumpBiome, { sky: string; hill: string; hill2: string; slab: string; top: string }> = {
  valley: { sky: "linear-gradient(#8fd3c4,#e3f3d0)", hill: "#5fa56a", hill2: "#3f8556", slab: "#a98a62", top: "#6fbf5a" },
  cliffs: { sky: "linear-gradient(#e8a468,#f8dcae)", hill: "#c0824f", hill2: "#9a6038", slab: "#b98a62", top: "#e0b078" },
  clouds: { sky: "linear-gradient(#6fa4e8,#e8f1fb)", hill: "#cfe0f4", hill2: "#a9c4e6", slab: "#e9eef8", top: "#ffffff" },
  sunset: { sky: "linear-gradient(#4a3a8a,#e8708a 70%,#ffc27a)", hill: "#8a4a7a", hill2: "#5f3366", slab: "#9a6a7a", top: "#f2a98a" },
  summit: { sky: "linear-gradient(#050b1f,#1d2f66)", hill: "#2b3a70", hill2: "#1b2650", slab: "#5b6aa0", top: "#cfe3ff" },
};

export function jumpBiomeColors(biome: JumpBiome) {
  return BIOME[biome];
}

export function JumpScene({ biome, cameraY }: { biome: JumpBiome; cameraY: number }) {
  const p = BIOME[biome];
  const farY = (cameraY * 0.15) % 200;
  const nearY = (cameraY * 0.35) % 200;
  return (
    <div aria-hidden="true" className="absolute inset-0" data-jump-biome={biome}>
      <div className="absolute inset-0" style={{ background: p.sky }} />
      {biome === "summit" && (
        <div className="absolute inset-0 opacity-90" style={{ backgroundImage: "radial-gradient(2px 2px at 20px 30px,#fff,transparent),radial-gradient(1.5px 1.5px at 100px 90px,#fff,transparent),radial-gradient(2px 2px at 150px 50px,#fff,transparent)", backgroundSize: "180px 140px", backgroundPosition: "0 " + (cameraY * 0.1) + "px" }} />
      )}
      <svg className="absolute inset-x-0 bottom-0 h-full w-full" viewBox="0 0 100 200" preserveAspectRatio="none" style={{ transform: "translateY(" + farY + "px)" }}>
        <path fill={p.hill2} d="M0 200V150q15-20 30 0t30-10 40 10v50z" opacity=".7" />
      </svg>
      <svg className="absolute inset-x-0 bottom-0 h-full w-full" viewBox="0 0 100 200" preserveAspectRatio="none" style={{ transform: "translateY(" + nearY + "px)" }}>
        <path fill={p.hill} d="M0 200V165q20-25 40-5t35-15 25 12v43z" opacity=".8" />
      </svg>
    </div>
  );
}

export function JumpPlatformArt({ biome, goal, widthPct }: { biome: JumpBiome; goal: boolean; widthPct: number }) {
  const p = BIOME[biome];
  return (
    <div
      className="relative h-full w-full"
      data-platform-width={widthPct}
      style={{
        background: goal ? "linear-gradient(#ffe28a,#e0b040)" : p.slab,
        borderRadius: 14,
        border: "2px solid " + (goal ? "#c99a2e" : "rgba(0,0,0,.22)"),
        boxShadow: goal ? "0 0 26px rgba(255,226,138,.8), 0 4px 0 rgba(0,0,0,.2)" : "0 4px 0 rgba(0,0,0,.22)",
      }}
    >
      <div className="absolute inset-x-1 -top-1 h-2.5 rounded-full" style={{ background: goal ? "#fff3b0" : p.top }} />
      <div className="absolute inset-x-3 top-3 h-1 rounded-full" style={{ background: "rgba(255,255,255,.25)" }} />
    </div>
  );
}

export function JumpHazardArt() {
  return (
    <svg width="56" height="36" viewBox="0 0 56 36" role="img" aria-label="أشواك">
      <path d="M2 34L11 6l9 28 9-28 9 28 9-22 6 22z" fill="#d9674a" stroke="#8f3a24" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 28l4-12M26 28l4-12" stroke="rgba(255,255,255,.5)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
