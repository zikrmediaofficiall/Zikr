import type { ReactElement } from "react";

type Props = Record<string, unknown>;
export type ExtraSheetContext = {
  fill: (index: number) => string;
  paintable: (index: number) => Props;
  isEnglish: boolean;
};

export const EXTRA_SHEET_IDS = ["clay-fish", "clay-cat", "clay-camp", "clay-owl"] as const;
export type ExtraSheetId = (typeof EXTRA_SHEET_IDS)[number];

export const EXTRA_SHEET_REGION_COUNT = 10;

const FRAME = (stroke: string, bg: string) => <rect x="25" y="25" width="310" height="210" rx="28" fill={bg} stroke={stroke} strokeWidth="4" />;

export function renderExtraSheet(id: string, { fill, paintable, isEnglish }: ExtraSheetContext): ReactElement | null {
  const svg = (label: string, labelEn: string, children: ReactElement) => (
    <svg viewBox="0 0 360 260" className="w-full" role="group" aria-label={isEnglish ? labelEn : label}>{children}</svg>
  );
  if (id === "clay-fish") {
    return svg("لوحة السمكة", "Fish coloring board", (
      <>
        {FRAME("#8ab6e2", "#0c2a44")}
        <ellipse cx="170" cy="130" rx="85" ry="52" fill={fill(0)} stroke="#f7f1df" strokeWidth="3" {...paintable(0)} />
        <path d="M250 130L312 84V176Z" fill={fill(1)} stroke="#f7f1df" strokeWidth="3" {...paintable(1)} />
        <path d="M140 80Q170 46 205 80Z" fill={fill(2)} stroke="#f7f1df" strokeWidth="3" {...paintable(2)} />
        <path d="M150 180Q175 208 205 180Z" fill={fill(3)} stroke="#f7f1df" strokeWidth="3" {...paintable(3)} />
        <circle cx="118" cy="118" r="12" fill={fill(4)} stroke="#f7f1df" strokeWidth="2" {...paintable(4)} />
        <path d="M168 100Q186 130 168 160" fill="none" stroke={fill(5)} strokeWidth="8" strokeLinecap="round" {...paintable(5)} />
        <circle cx="62" cy="62" r="11" fill={fill(6)} stroke="#f7f1df" strokeWidth="2" {...paintable(6)} />
        <circle cx="84" cy="44" r="7" fill={fill(7)} stroke="#f7f1df" strokeWidth="2" {...paintable(7)} />
        <path d="M45 214Q75 190 105 214Z" fill={fill(8)} stroke="#5fd1a6" strokeWidth="2" {...paintable(8)} />
        <path d="M250 214Q280 184 312 214Z" fill={fill(9)} stroke="#5fd1a6" strokeWidth="2" {...paintable(9)} />
      </>
    ));
  }
  if (id === "clay-cat") {
    return svg("لوحة القطة", "Cat coloring board", (
      <>
        {FRAME("#e0a640", "#2a1f3a")}
        <ellipse cx="180" cy="170" rx="70" ry="48" fill={fill(0)} stroke="#f7f1df" strokeWidth="3" {...paintable(0)} />
        <circle cx="180" cy="104" r="46" fill={fill(1)} stroke="#f7f1df" strokeWidth="3" {...paintable(1)} />
        <path d="M144 76L148 40L174 62Z" fill={fill(2)} stroke="#f7f1df" strokeWidth="3" {...paintable(2)} />
        <path d="M216 76L212 40L186 62Z" fill={fill(3)} stroke="#f7f1df" strokeWidth="3" {...paintable(3)} />
        <circle cx="164" cy="102" r="9" fill={fill(4)} stroke="#f7f1df" strokeWidth="2" {...paintable(4)} />
        <circle cx="198" cy="102" r="9" fill={fill(5)} stroke="#f7f1df" strokeWidth="2" {...paintable(5)} />
        <path d="M172 120Q180 130 188 120Z" fill={fill(6)} stroke="#f7f1df" strokeWidth="2" {...paintable(6)} />
        <path d="M246 180Q300 170 292 126" fill="none" stroke={fill(7)} strokeWidth="14" strokeLinecap="round" {...paintable(7)} />
        <ellipse cx="150" cy="208" rx="20" ry="11" fill={fill(8)} stroke="#f7f1df" strokeWidth="2" {...paintable(8)} />
        <ellipse cx="210" cy="208" rx="20" ry="11" fill={fill(9)} stroke="#f7f1df" strokeWidth="2" {...paintable(9)} />
      </>
    ));
  }
  if (id === "clay-camp") {
    return svg("لوحة الخيمة", "Camp coloring board", (
      <>
        {FRAME("#e28a5a", "#16223a")}
        <path d="M60 205L180 70L300 205Z" fill={fill(0)} stroke="#f7f1df" strokeWidth="3" {...paintable(0)} />
        <path d="M180 70L150 205H210Z" fill={fill(1)} stroke="#f7f1df" strokeWidth="3" {...paintable(1)} />
        <path d="M120 205L180 128L195 145L150 205Z" fill={fill(2)} stroke="#f7f1df" strokeWidth="2" {...paintable(2)} />
        <circle cx="290" cy="62" r="20" fill={fill(3)} stroke="#f7f1df" strokeWidth="2" {...paintable(3)} />
        <path d="M60 58L65 70L78 72L69 81L71 94L60 88L49 94L51 81L42 72L55 70Z" fill={fill(4)} stroke="#f7f1df" strokeWidth="1.5" {...paintable(4)} />
        <path d="M118 44L122 53L132 54L125 61L127 71L118 66L109 71L111 61L104 54L114 53Z" fill={fill(5)} stroke="#f7f1df" strokeWidth="1.5" {...paintable(5)} />
        <path d="M232 205Q250 170 268 205Z" fill={fill(6)} stroke="#f7f1df" strokeWidth="2" {...paintable(6)} />
        <path d="M262 214Q282 176 302 214Z" fill={fill(7)} stroke="#f7f1df" strokeWidth="2" {...paintable(7)} />
        <rect x="40" y="205" width="280" height="22" rx="10" fill={fill(8)} stroke="#f7f1df" strokeWidth="2" {...paintable(8)} />
        <path d="M80 190Q92 168 104 190Z" fill={fill(9)} stroke="#f7f1df" strokeWidth="2" {...paintable(9)} />
      </>
    ));
  }
  if (id === "clay-owl") {
    return svg("لوحة البومة", "Owl coloring board", (
      <>
        {FRAME("#c9a0e0", "#1d1a3a")}
        <ellipse cx="180" cy="140" rx="64" ry="78" fill={fill(0)} stroke="#f7f1df" strokeWidth="3" {...paintable(0)} />
        <ellipse cx="180" cy="162" rx="40" ry="50" fill={fill(1)} stroke="#f7f1df" strokeWidth="2" {...paintable(1)} />
        <circle cx="158" cy="104" r="20" fill={fill(2)} stroke="#f7f1df" strokeWidth="3" {...paintable(2)} />
        <circle cx="202" cy="104" r="20" fill={fill(3)} stroke="#f7f1df" strokeWidth="3" {...paintable(3)} />
        <circle cx="158" cy="104" r="8" fill={fill(4)} stroke="#f7f1df" strokeWidth="2" {...paintable(4)} />
        <circle cx="202" cy="104" r="8" fill={fill(5)} stroke="#f7f1df" strokeWidth="2" {...paintable(5)} />
        <path d="M172 118L180 134L188 118Z" fill={fill(6)} stroke="#f7f1df" strokeWidth="2" {...paintable(6)} />
        <path d="M116 120Q92 150 112 196Z" fill={fill(7)} stroke="#f7f1df" strokeWidth="3" {...paintable(7)} />
        <path d="M244 120Q268 150 248 196Z" fill={fill(8)} stroke="#f7f1df" strokeWidth="3" {...paintable(8)} />
        <path d="M70 216H290" stroke={fill(9)} strokeWidth="10" strokeLinecap="round" {...paintable(9)} />
      </>
    ));
  }
  return null;
}
