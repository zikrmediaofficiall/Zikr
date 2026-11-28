import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { VIDEO_TEMPLATE_ASSETS, isVideoTemplateAssetAllowedForAudience } from "../../src/features/videos/services/template-config";
import {
  VIDEO_ASSET_REGISTRY_VERSION,
  VIDEO_ASSET_RIGHTS_REGISTRY,
  getVideoAssetRightsRecord,
  getVideoAssetRightsSummary,
  inspectVideoAssetUse,
} from "../../src/features/videos/services/video-asset-registry";

const summary = getVideoAssetRightsSummary();
assert.equal(summary.version, VIDEO_ASSET_REGISTRY_VERSION);
assert.equal(summary.total, VIDEO_TEMPLATE_ASSETS.length);
assert.equal(summary.rightsReviewRequired, VIDEO_TEMPLATE_ASSETS.length);
assert.equal(summary.approvedForPublic, 0, "No asset may be represented as licensed without recorded evidence.");
assert.equal(summary.measuredSafeAreas, 0, "Default focal points and safe areas must not be presented as visually measured.");

for (const assetKey of VIDEO_TEMPLATE_ASSETS) {
  const asset = getVideoAssetRightsRecord(assetKey);
  assert.ok(asset, "Every Template Studio asset must have a registry entry: " + assetKey);
  assert.equal(asset?.assetKey, assetKey);
  assert.equal(asset?.version, 1);
  assert.ok(asset?.source.reference.endsWith("/" + assetKey + ".svg"));
  assert.ok(existsSync(join(process.cwd(), asset!.source.reference)), "Registry source file must exist: " + assetKey);
  assert.equal(asset?.author.name, "unknown", "An unknown author must remain unknown until attribution is proven.");
  assert.equal(asset?.rights.state, "review_required");
  assert.equal(asset?.rights.licenseId, null);
  assert.equal(asset?.rights.evidenceReference, null);
  assert.equal(asset?.usage.privatePreviewAllowed, true);
  assert.equal(asset?.usage.publicSiteAllowed, false);
  assert.equal(asset?.usage.socialAllowed, false);
  assert.ok(asset?.allowedTopics.length, "Every asset must declare its allowed-topic tags.");
}

const quranPreview = inspectVideoAssetUse({
  assetKey: "manuscript-library",
  audience: "general",
  topic: "quran",
  destination: "private_preview",
});
assert.equal(quranPreview.allowed, true);
assert.equal(quranPreview.reason, null);

const quranPublic = inspectVideoAssetUse({
  assetKey: "manuscript-library",
  audience: "general",
  topic: "quran",
  destination: "public_site",
});
assert.equal(quranPublic.allowed, false);
assert.match(quranPublic.reason ?? "", /rights are unverified/i);

const quranSocial = inspectVideoAssetUse({
  assetKey: "manuscript-library",
  audience: "general",
  topic: "quran",
  destination: "social",
});
assert.equal(quranSocial.allowed, false);

assert.equal(inspectVideoAssetUse({
  assetKey: "kids-space",
  audience: "general",
  destination: "private_preview",
}).allowed, false, "Kids-only scenes must never enter a general-audience preview.");

assert.equal(inspectVideoAssetUse({
  assetKey: "manuscript-library",
  audience: "kids",
  destination: "private_preview",
}).allowed, false, "General-only scenes must never enter a Kids preview.");

assert.equal(inspectVideoAssetUse({
  assetKey: "not-in-registry",
  audience: "general",
  destination: "private_preview",
}).allowed, false, "Unknown assets must fail closed.");

assert.equal(inspectVideoAssetUse({
  assetKey: "manuscript-library",
  audience: "general",
  topic: "kids-science",
  destination: "private_preview",
}).allowed, false, "Topic mismatches must fail closed.");

for (const assetKey of VIDEO_TEMPLATE_ASSETS) {
  const audience = isVideoTemplateAssetAllowedForAudience(assetKey, "kids") ? "kids" : "general";
  assert.equal(inspectVideoAssetUse({
    assetKey,
    audience,
    destination: "private_preview",
  }).allowed, true, "All locally registered assets remain available for internal preview: " + assetKey);
}


const adminNavigation = readFileSync("src/features/admin/config/navigation.ts", "utf8");
const adminRightsPage = readFileSync("src/app/admin/video/assets/page.tsx", "utf8");
assert.match(
  adminNavigation,
  /href: "\/admin\/video\/assets", label: "مراجعة حقوق الأصول", permission: "video\\.manage"/,
  "the asset-rights route must remain in canonical navigation with video.manage",
);
assert.ok(
  adminRightsPage.includes('requireAdminPermission("video.manage")'),
  "the asset-rights Admin page must enforce the same server-side permission",
);

console.log("Video asset registry, 52 local SVG sources, topic/audience controls, and unverified-rights publication blocking passed.");
