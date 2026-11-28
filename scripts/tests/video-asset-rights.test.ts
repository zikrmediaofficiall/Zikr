import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { VIDEO_TEMPLATE_ASSETS, isVideoTemplateAssetAllowedForAudience } from "../../src/features/videos/services/template-config";
import {
  VIDEO_ASSET_REGISTRY_VERSION,
  VIDEO_ASSET_RIGHTS_REGISTRY,
  getVideoAssetRightsRecord,
  getVideoAssetRightsSummary,
  inspectExternalVideoAssetUse,
  inspectVideoAssetUse,
} from "../../src/features/videos/services/video-asset-registry";

const summary = getVideoAssetRightsSummary();
assert.equal(summary.version, VIDEO_ASSET_REGISTRY_VERSION);
assert.equal(summary.total, VIDEO_TEMPLATE_ASSETS.length);
assert.equal(summary.rightsReviewRequired, 0, "Repository SVG assets are ZIKR originals and need no per-asset review.");
assert.equal(summary.approvedForPublic, VIDEO_TEMPLATE_ASSETS.length, "Every repository SVG is approved for public use as a ZIKR original.");
assert.equal(summary.measuredSafeAreas, 0, "Default focal points and safe areas must not be presented as visually measured.");

for (const assetKey of VIDEO_TEMPLATE_ASSETS) {
  const asset = getVideoAssetRightsRecord(assetKey);
  assert.ok(asset, "Every Template Studio asset must have a registry entry: " + assetKey);
  assert.equal(asset?.assetKey, assetKey);
  assert.equal(asset?.version, 1);
  assert.ok(asset?.source.reference.endsWith("/" + assetKey + ".svg"));
  assert.ok(existsSync(join(process.cwd(), asset!.source.reference)), "Registry source file must exist: " + assetKey);
  assert.equal(asset?.author.name, "ZIKR");
  assert.equal(asset?.rights.state, "approved");
  assert.equal(asset?.rights.licenseId, "ZIKR-ORIGINAL");
  assert.ok(asset?.rights.evidenceReference);
  assert.equal(asset?.usage.privatePreviewAllowed, true);
  assert.equal(asset?.usage.publicSiteAllowed, true);
  assert.equal(asset?.usage.socialAllowed, true);
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
assert.equal(quranPublic.allowed, true, "Publishing a ZIKR original must not be blocked.");
assert.equal(quranPublic.reason, null);

const quranSocial = inspectVideoAssetUse({
  assetKey: "manuscript-library",
  audience: "general",
  topic: "quran",
  destination: "social",
});
assert.equal(quranSocial.allowed, true, "Social publishing of a ZIKR original must not be blocked.");

assert.equal(inspectExternalVideoAssetUse(null).allowed, false, "Undocumented external assets stay blocked.");
assert.equal(inspectExternalVideoAssetUse({ kind: "stock", licenseId: null, evidenceReference: null, reviewer: null, reviewedAt: null }).allowed, false);
assert.equal(inspectExternalVideoAssetUse({ kind: "flow_generated", licenseId: "flow-terms", evidenceReference: null, reviewer: "owner", reviewedAt: "2026-11-28" }).allowed, false);
assert.equal(inspectExternalVideoAssetUse({ kind: "flow_generated", licenseId: "flow-terms", evidenceReference: "flow-export-1", reviewer: "owner", reviewedAt: "2026-11-28" }).allowed, true, "Documented external assets are allowed.");

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

console.log("Video asset registry, 52 local SVG sources, topic/audience controls, ZIKR-original publishing allowed, undocumented external assets blocked.");
