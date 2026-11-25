"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdminStepUp } from "@/features/admin/services/security";
import { enforceAdminRateLimit } from "@/features/admin/services/rate-limit";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { getCatalogItem } from "@/lib/navigation/catalog";
import {
  BRAND_TOKENS, DEFAULT_BRAND_COLORS, SITE_EXPERIENCE_KEY, THEME_PRESETS, parseSiteExperience, validateColors,
  type BrandColors, type NavLabelOverride,
} from "@/lib/omnis/site-experience";

const BASE = "/admin/omnis/experience";
const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (kind: "ok" | "error", message: string): never => redirect(`${BASE}?${kind}=${encodeURIComponent(message)}`);
const audit = (event: Parameters<typeof recordAdminAuditEvent>[0]) =>
  runPostCommitAudit(() => recordAdminAuditEvent(event), (error) => console.error("[admin/omnis/experience] audit failed:", error));

async function save(value: { colors: BrandColors | null; labels: Record<string, NavLabelOverride> }) {
  await supabaseServerAdminRequest("/rest/v1/site_settings?on_conflict=key", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal", "Content-Type": "application/json" },
    body: JSON.stringify({ key: SITE_EXPERIENCE_KEY, value, updated_at: new Date().toISOString() }),
  });
  updateTag(`site-setting:${SITE_EXPERIENCE_KEY}`);
  revalidatePath("/", "layout");
}

async function current() {
  const rows = await supabaseServerAdminRequest<Array<{ value?: unknown }>>(
    `/rest/v1/site_settings?key=eq.${SITE_EXPERIENCE_KEY}&select=value&limit=1`, { method: "GET" });
  return parseSiteExperience(rows?.[0]?.value);
}

export async function saveThemeAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.experience.theme", 10, 60);
  const preset = field(formData, "preset");
  let colors: BrandColors;
  if (preset && preset !== "custom") {
    if (!THEME_PRESETS[preset]) back("error", "ثيم غير معروف.");
    colors = { ...THEME_PRESETS[preset].colors };
  } else {
    colors = { ...DEFAULT_BRAND_COLORS };
    for (const t of BRAND_TOKENS) colors[t] = field(formData, `color_${t}`).toUpperCase();
  }
  const problems = validateColors(colors);
  if (problems.length) back("error", problems.join(" "));
  const prev = await current();
  const isDefault = BRAND_TOKENS.every((t) => colors[t] === DEFAULT_BRAND_COLORS[t]);
  await save({ colors: isDefault ? null : colors, labels: prev.labels });
  await audit({ action: "omnis.experience.theme.save", permission: "system.manage", resourceType: "site_settings", resourceId: "site_experience", metadata: { preset: preset || "custom" } });
  back("ok", isDefault ? "رجع الثيم الافتراضي." : "حُفظ الثيم وطُبّق على الموقع.");
}

export async function saveLabelAction(formData: FormData) {
  const admin = await requireAdminStepUp("system.manage", BASE);
  await enforceAdminRateLimit(admin, "omnis.experience.label", 20, 60);
  const href = field(formData, "href");
  if (!getCatalogItem(href)) back("error", "قسم غير معروف.");
  const prev = await current();
  const labels = { ...prev.labels };
  const parsed = parseSiteExperience({ labels: { [href]: { ar: field(formData, "ar"), en: field(formData, "en") } } }).labels[href];
  if (parsed) labels[href] = parsed; else delete labels[href];
  await save({ colors: prev.colors, labels });
  await audit({ action: "omnis.experience.label.save", permission: "system.manage", resourceType: "site_settings", resourceId: "site_experience", metadata: { href, reset: !parsed } });
  back("ok", parsed ? "حُفظت التسمية." : "أُعيدت التسمية الافتراضية.");
}
