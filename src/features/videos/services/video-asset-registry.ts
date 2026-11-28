import {
  VIDEO_TEMPLATE_ASSETS,
  isVideoTemplateAssetAllowedForAudience,
  type VideoTemplateAsset,
  type VideoTemplateAudience,
} from "./template-config";

export const VIDEO_ASSET_REGISTRY_VERSION = "zikr-visual-assets-v1";

export type VideoAssetRightsState = "review_required" | "approved" | "restricted";
export type VideoAssetDestination = "private_preview" | "public_site" | "social";

export type VideoAssetRightsRecord = {
  assetKey: VideoTemplateAsset;
  version: 1;
  source: {
    kind: "repository_svg";
    reference: string;
    sourceRevision: "git";
  };
  author: {
    name: string;
    attribution: string | null;
  };
  audience: VideoTemplateAudience;
  category: "devotional" | "architecture" | "history" | "nature" | "kids_learning" | "kids_values" | "general" | "presenter";
  allowedTopics: readonly string[];
  paletteFamily: "warm" | "cool" | "natural" | "paper" | "bright" | "asset_native";
  focalPoint: {
    x: number;
    y: number;
    measurement: "default_pending_visual_review";
  };
  safeArea: {
    status: "not_measured" | "measured";
    notes: string;
  };
  rights: {
    state: VideoAssetRightsState;
    licenseId: string | null;
    evidenceReference: string | null;
    reviewer: string | null;
    reviewedAt: string | null;
    notes: string;
  };
  usage: {
    privatePreviewAllowed: boolean;
    publicSiteAllowed: boolean;
    socialAllowed: boolean;
  };
};

export type VideoAssetUsageDecision = {
  allowed: boolean;
  destination: VideoAssetDestination;
  reason: string | null;
  asset: VideoAssetRightsRecord | null;
};

const GENERAL_GROUPS: ReadonlyArray<{
  category: VideoAssetRightsRecord["category"];
  keys: readonly VideoTemplateAsset[];
  topics: readonly string[];
}> = [
  {
    category: "devotional",
    keys: ["calm", "dawn", "emerald", "gold", "night", "paper", "rose", "lantern-glow", "manuscript-library", "moonlit-sea", "olive-grove", "botanical", "library", "geometric", "marble", "starfield", "coastal-blue", "olive-branch", "minimal-cream"],
    topics: ["quran", "hadith", "dua", "adhkar", "worship", "spiritual-guidance"],
  },
  {
    category: "architecture",
    keys: ["andalusian-arch", "geometric-mosaic", "sunlit-arch", "mosaic-blue", "old-city", "midnight-skyline"],
    topics: ["islamic-architecture", "heritage", "history", "seerah"],
  },
  {
    category: "history",
    keys: ["desert-caravan", "desert-dusk", "mountain-dawn", "heritage", "cinematic", "watercolor-sky"],
    topics: ["history", "seerah", "documentary", "stories"],
  },
  {
    category: "nature",
    keys: ["oasis-dawn", "desert-rose", "rainy-window", "olive-grove", "botanical", "coastal-blue"],
    topics: ["nature", "reflection", "dua", "adhkar", "stories"],
  },
  {
    category: "presenter",
    keys: ["layl", "minimal-studio", "satin-night"],
    topics: ["layl", "presenter", "general-guidance", "studio"],
  },
];

const KIDS_GROUPS: ReadonlyArray<{
  keys: readonly VideoTemplateAsset[];
  category: "kids_learning" | "kids_values";
  topics: readonly string[];
}> = [
  {
    keys: ["kids-classroom", "kids-workshop", "kids-robotics", "kids-space", "kids-weather"],
    category: "kids_learning",
    topics: ["kids-science", "kids-learning", "education", "original-kids-fiction"],
  },
  {
    keys: ["kids-garden", "kids-nature", "kids-neighborhood", "kids-ocean", "kids-forest", "kids-playground", "kids-adventure", "kids-jungle", "kids-animals"],
    category: "kids_values",
    topics: ["kids-values", "kids-nature", "kids-learning", "original-kids-fiction"],
  },
];

function includesKey(keys: readonly VideoTemplateAsset[], asset: VideoTemplateAsset): boolean {
  return keys.includes(asset);
}

function generalGroup(asset: VideoTemplateAsset) {
  return GENERAL_GROUPS.find((group) => includesKey(group.keys, asset));
}

function kidsGroup(asset: VideoTemplateAsset) {
  return KIDS_GROUPS.find((group) => includesKey(group.keys, asset));
}

function paletteFor(asset: VideoTemplateAsset, audience: VideoTemplateAudience): VideoAssetRightsRecord["paletteFamily"] {
  if (audience === "kids") return "bright";
  if (["paper", "manuscript-library", "library", "marble", "minimal-cream"].includes(asset)) return "paper";
  if (["olive-grove", "olive-branch", "botanical", "emerald", "oasis-dawn"].includes(asset)) return "natural";
  if (["night", "moonlit-sea", "midnight-skyline", "starfield", "satin-night", "desert-dusk"].includes(asset)) return "cool";
  if (["dawn", "gold", "rose", "desert-rose", "desert-caravan", "sunlit-arch", "lantern-glow"].includes(asset)) return "warm";
  return "asset_native";
}

function buildRecord(assetKey: VideoTemplateAsset): VideoAssetRightsRecord {
  const audience: VideoTemplateAudience = isVideoTemplateAssetAllowedForAudience(assetKey, "kids")
    ? "kids"
    : "general";
  const kids = audience === "kids" ? kidsGroup(assetKey) : undefined;
  const general = audience === "general" ? generalGroup(assetKey) : undefined;
  const category: VideoAssetRightsRecord["category"] = kids?.category ?? general?.category ?? (audience === "kids" ? "kids_values" : "general");
  const allowedTopics = kids?.topics ?? general?.topics ?? ["general-guidance", "stories"];

  return {
    assetKey,
    version: 1,
    source: {
      kind: "repository_svg",
      reference: "public/video/templates/" + assetKey + ".svg",
      sourceRevision: "git",
    },
    author: {
      name: "unknown",
      attribution: null,
    },
    audience,
    category,
    allowedTopics,
    paletteFamily: paletteFor(assetKey, audience),
    focalPoint: {
      x: 0.5,
      y: 0.5,
      measurement: "default_pending_visual_review",
    },
    safeArea: {
      status: "not_measured",
      notes: "Asset-specific 9:16, 16:9 and platform UI exclusion zones have not been visually measured yet.",
    },
    rights: {
      state: "review_required",
      licenseId: null,
      evidenceReference: null,
      reviewer: null,
      reviewedAt: null,
      notes: "Repository presence proves source location only; it does not prove authorship, copyright ownership, or a usage license.",
    },
    usage: {
      privatePreviewAllowed: true,
      publicSiteAllowed: false,
      socialAllowed: false,
    },
  };
}

export const VIDEO_ASSET_RIGHTS_REGISTRY: Readonly<Record<VideoTemplateAsset, VideoAssetRightsRecord>> =
  Object.freeze(Object.fromEntries(
    VIDEO_TEMPLATE_ASSETS.map((asset) => [asset, Object.freeze(buildRecord(asset))]),
  ) as Record<VideoTemplateAsset, VideoAssetRightsRecord>);

export function getVideoAssetRightsRecord(assetKey: string): VideoAssetRightsRecord | null {
  if (!VIDEO_TEMPLATE_ASSETS.includes(assetKey as VideoTemplateAsset)) return null;
  return VIDEO_ASSET_RIGHTS_REGISTRY[assetKey as VideoTemplateAsset] ?? null;
}

export function inspectVideoAssetUse(input: {
  assetKey: string;
  audience: VideoTemplateAudience;
  destination: VideoAssetDestination;
  topic?: string | null;
}): VideoAssetUsageDecision {
  const asset = getVideoAssetRightsRecord(input.assetKey);
  if (!asset) {
    return { allowed: false, destination: input.destination, reason: "Visual asset is not registered in the versioned ZIKR asset catalogue.", asset: null };
  }
  if (asset.audience !== input.audience) {
    return { allowed: false, destination: input.destination, reason: "Visual asset audience does not match the video audience.", asset };
  }
  if (!isVideoTemplateAssetAllowedForAudience(asset.assetKey, input.audience)) {
    return { allowed: false, destination: input.destination, reason: "Visual asset is outside the allowed audience catalogue.", asset };
  }
  const rawTopic = input.topic?.trim().toLowerCase();
  const topic = rawTopic === "story" ? "stories" : rawTopic;
  if (topic && !asset.allowedTopics.includes(topic)) {
    return { allowed: false, destination: input.destination, reason: "Visual asset is not approved for the requested content topic.", asset };
  }
  if (input.destination === "private_preview") {
    return { allowed: asset.usage.privatePreviewAllowed, destination: input.destination, reason: null, asset };
  }
  if (asset.rights.state !== "approved" || !asset.rights.licenseId || !asset.rights.evidenceReference || !asset.rights.reviewer || !asset.rights.reviewedAt) {
    return {
      allowed: false,
      destination: input.destination,
      reason: "Visual asset rights are unverified; public publishing is blocked until a reviewer records the license and evidence.",
      asset,
    };
  }
  const allowed = input.destination === "public_site"
    ? asset.usage.publicSiteAllowed
    : asset.usage.socialAllowed;
  return {
    allowed,
    destination: input.destination,
    reason: allowed ? null : "The recorded asset rights do not permit this publication destination.",
    asset,
  };
}

export function getVideoAssetRightsSummary() {
  const assets = VIDEO_TEMPLATE_ASSETS.map((asset) => VIDEO_ASSET_RIGHTS_REGISTRY[asset]);
  return {
    version: VIDEO_ASSET_REGISTRY_VERSION,
    total: assets.length,
    general: assets.filter((asset) => asset.audience === "general").length,
    kids: assets.filter((asset) => asset.audience === "kids").length,
    rightsReviewRequired: assets.filter((asset) => asset.rights.state === "review_required").length,
    approvedForPublic: assets.filter((asset) => asset.rights.state === "approved" && asset.usage.publicSiteAllowed).length,
    measuredSafeAreas: assets.filter((asset) => asset.safeArea.status === "measured").length,
  };
}
