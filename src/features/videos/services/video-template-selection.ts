import {
  isVideoTemplateAssetAllowedForAudience,
  parseVideoTemplateConfig,
  type VideoTemplateAudience,
  type VideoTemplateConfig,
} from "./template-config";
import { versionedTemplateLabel } from "./video-template-version";

export type VideoTemplateCandidateInput = {
  templateId: string;
  slug: string;
  audience: VideoTemplateAudience;
  versionId: string;
  version: number;
  config: unknown;
};

export type VideoTemplateUsage = {
  templateId: string;
  category: string;
};

export type SelectedVideoTemplate = {
  templateId: string;
  templateSlug: string;
  templateVersionId: string;
  templateVersionNumber: number;
  templateVersion: string;
  templateAssetKey: VideoTemplateConfig["assetKey"];
  templateAudience: VideoTemplateAudience;
  templateMotion: VideoTemplateConfig["motion"];
  templateConfigSnapshot: VideoTemplateConfig;
  videoFormat: VideoTemplateConfig["defaultFormat"];
  resolution: "1080x1920" | "1920x1080";
};

export type SelectAutomatedVideoTemplateInput = {
  candidates: VideoTemplateCandidateInput[];
  usage: VideoTemplateUsage[];
  audience: VideoTemplateAudience;
  category: string;
  automationKey: string;
};

const GENERAL_CATEGORY_PREFERENCES: Record<string, readonly string[]> = {
  quran: ["manuscript-library", "andalusian-arch", "geometric-mosaic", "heritage", "paper", "calm"],
  hadith: ["library", "manuscript-library", "paper", "olive-branch", "calm"],
  adhkar: ["olive-grove", "olive-branch", "botanical", "oasis-dawn", "calm"],
  dua: ["moonlit-sea", "lantern-glow", "dawn", "rose", "calm"],
  story: ["old-city", "desert-caravan", "heritage", "cinematic", "mountain-dawn"],
  other: ["minimal-studio", "calm", "night", "lantern-glow", "paper"],
};

const KIDS_CATEGORY_PREFERENCES = [
  "kids-adventure",
  "kids-nature",
  "kids-animals",
  "kids-forest",
  "kids-garden",
  "kids-space",
  "kids-ocean",
  "kids-classroom",
  "kids-neighborhood",
  "kids-playground",
  "kids-jungle",
  "kids-robotics",
  "kids-weather",
  "kids-workshop",
] as const;

function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function preferenceRank(
  assetKey: string,
  audience: VideoTemplateAudience,
  category: string,
): number {
  const normalized = category.trim().toLowerCase();
  const preferences = audience === "kids"
    ? KIDS_CATEGORY_PREFERENCES
    : (GENERAL_CATEGORY_PREFERENCES[normalized] ?? GENERAL_CATEGORY_PREFERENCES.other);
  const index = preferences.indexOf(assetKey as never);
  return index < 0 ? preferences.length + 1 : index;
}

/**
 * Deterministically selects an active immutable Template Studio version.
 * Category usage is weighted above total usage so templates rotate within a
 * content category while remaining reusable across other categories.
 */
export function selectAutomatedVideoTemplate(
  input: SelectAutomatedVideoTemplateInput,
): SelectedVideoTemplate | null {
  const category = input.category.trim().toLowerCase();
  const automationKey = input.automationKey.trim();
  if (!category || !automationKey) return null;

  const categoryUsage = new Map<string, number>();
  const totalUsage = new Map<string, number>();
  for (const row of input.usage) {
    if (!row.templateId) continue;
    totalUsage.set(row.templateId, (totalUsage.get(row.templateId) ?? 0) + 1);
    if (row.category.trim().toLowerCase() === category) {
      categoryUsage.set(row.templateId, (categoryUsage.get(row.templateId) ?? 0) + 1);
    }
  }

  const ranked = input.candidates.flatMap((candidate) => {
    if (
      !candidate.templateId ||
      !candidate.slug ||
      !candidate.versionId ||
      !Number.isInteger(candidate.version) ||
      candidate.version < 1 ||
      candidate.audience !== input.audience
    ) return [];

    const config = parseVideoTemplateConfig(candidate.config);
    if (!config || !isVideoTemplateAssetAllowedForAudience(config.assetKey, candidate.audience)) return [];

    const categoryCount = categoryUsage.get(candidate.templateId) ?? 0;
    const globalCount = totalUsage.get(candidate.templateId) ?? 0;
    const rank = preferenceRank(config.assetKey, candidate.audience, category);
    const score = categoryCount * 1_000 + globalCount * 10 + rank;
    const tieBreak = stableHash(`${automationKey}|${candidate.slug}|${candidate.version}`);

    return [{
      candidate,
      config,
      score,
      tieBreak,
    }];
  });

  ranked.sort((left, right) =>
    left.score - right.score ||
    left.tieBreak - right.tieBreak ||
    left.candidate.slug.localeCompare(right.candidate.slug),
  );

  const selected = ranked[0];
  if (!selected) return null;
  const { candidate, config } = selected;

  return {
    templateId: candidate.templateId,
    templateSlug: candidate.slug,
    templateVersionId: candidate.versionId,
    templateVersionNumber: candidate.version,
    templateVersion: versionedTemplateLabel(candidate.slug, candidate.version),
    templateAssetKey: config.assetKey,
    templateAudience: candidate.audience,
    templateMotion: config.motion,
    templateConfigSnapshot: config,
    videoFormat: config.defaultFormat,
    resolution: config.defaultFormat === "vertical" ? "1080x1920" : "1920x1080",
  };
}

export function applyAutomatedVideoTemplateBinding(
  content: Record<string, unknown>,
  selection: SelectedVideoTemplate,
): Record<string, unknown> {
  return {
    ...content,
    templateBindingMode: "studio",
    templateId: selection.templateId,
    templateSlug: selection.templateSlug,
    templateVersionId: selection.templateVersionId,
    templateVersionNumber: selection.templateVersionNumber,
    templateVersion: selection.templateVersion,
    templateAssetKey: selection.templateAssetKey,
    templateAudience: selection.templateAudience,
    templateMotion: selection.templateMotion,
    templateConfigSnapshot: selection.templateConfigSnapshot,
    videoFormat: selection.videoFormat,
    resolution: selection.resolution,
  };
}
