// P05-01: admin-managed theme colors and navigation labels.
// Stored in site_settings key "site_experience" (no migration). Nothing is applied
// unless an admin saves a valid setting; the defaults equal the hard-coded brand palette.

export const SITE_EXPERIENCE_KEY = "site_experience";

export const BRAND_TOKENS = ["emerald", "emeraldDeep", "gold", "goldSoft", "cream", "mist"] as const;
export type BrandToken = (typeof BRAND_TOKENS)[number];
export type BrandColors = Record<BrandToken, string>;

export const DEFAULT_BRAND_COLORS: BrandColors = {
  emerald: "#0E4B45",
  emeraldDeep: "#072E2A",
  gold: "#C7A86B",
  goldSoft: "#E6D7B3",
  cream: "#F6F0E5",
  mist: "#8FA49F",
};

export const THEME_PRESETS: Record<string, { label: string; colors: BrandColors }> = {
  default: { label: "الافتراضي (زمردي وذهبي)", colors: DEFAULT_BRAND_COLORS },
  midnight: {
    label: "ليلي أزرق",
    colors: { emerald: "#12365A", emeraldDeep: "#0A2038", gold: "#D2B36F", goldSoft: "#E9DCB8", cream: "#F4F1EA", mist: "#9AAAB8" },
  },
  olive: {
    label: "زيتوني دافئ",
    colors: { emerald: "#34451F", emeraldDeep: "#1F2A12", gold: "#CDAE6A", goldSoft: "#E8DAB4", cream: "#F6F1E4", mist: "#A0AA8A" },
  },
};

const HEX = /^#[0-9a-f]{6}$/i;
export const isHexColor = (v: unknown): v is string => typeof v === "string" && HEX.test(v);

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Readability rules a theme must pass before it can be saved or applied. */
export function validateColors(colors: BrandColors): string[] {
  const problems: string[] = [];
  for (const t of BRAND_TOKENS) if (!isHexColor(colors[t])) problems.push(`لون غير صالح: ${t}`);
  if (problems.length) return problems;
  if (contrastRatio(colors.cream, colors.emeraldDeep) < 7) problems.push("تباين النص الفاتح مع الخلفية الغامقة أقل من 7:1.");
  if (contrastRatio(colors.cream, colors.emerald) < 4.5) problems.push("تباين النص الفاتح مع لون الأسطح أقل من 4.5:1.");
  if (contrastRatio(colors.gold, colors.emeraldDeep) < 4.5) problems.push("تباين الذهبي مع الخلفية الغامقة أقل من 4.5:1.");
  return problems;
}

export type NavLabelOverride = { ar?: string; en?: string };
export type SiteExperience = { colors: BrandColors | null; labels: Record<string, NavLabelOverride> };

const cleanLabel = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t || t.length > 40 || /[<>&"'`{}\\]|https?:|www\./i.test(t)) return undefined;
  return t;
};

/** Defensive parse: anything invalid is dropped, never thrown. */
export function parseSiteExperience(raw: unknown): SiteExperience {
  const out: SiteExperience = { colors: null, labels: {} };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  if (r.colors && typeof r.colors === "object") {
    const merged = { ...DEFAULT_BRAND_COLORS };
    for (const t of BRAND_TOKENS) {
      const v = (r.colors as Record<string, unknown>)[t];
      if (isHexColor(v)) merged[t] = v.toUpperCase();
    }
    if (validateColors(merged).length === 0 && BRAND_TOKENS.some((t) => merged[t] !== DEFAULT_BRAND_COLORS[t])) out.colors = merged;
  }
  if (r.labels && typeof r.labels === "object") {
    for (const [href, value] of Object.entries(r.labels as Record<string, unknown>)) {
      if (!/^\/[a-z0-9\-/]*$/i.test(href) || !value || typeof value !== "object") continue;
      const ar = cleanLabel((value as Record<string, unknown>).ar);
      const en = cleanLabel((value as Record<string, unknown>).en);
      if (ar || en) out.labels[href] = { ...(ar ? { ar } : {}), ...(en ? { en } : {}) };
    }
  }
  return out;
}

/** CSS for <style>; only validated hex values can reach it. Empty string when unchanged. */
export function buildThemeCss(colors: BrandColors | null): string {
  if (!colors) return "";
  const decl = BRAND_TOKENS.filter((t) => colors[t] !== DEFAULT_BRAND_COLORS[t])
    .map((t) => `--brand-${t}:${colors[t]}`)
    .join(";");
  return decl ? `:root{${decl}}` : "";
}
