import assert from "node:assert/strict";
import {
  applyAutomatedVideoTemplateBinding,
  selectAutomatedVideoTemplate,
  type VideoTemplateCandidateInput,
  type VideoTemplateUsage,
} from "../../src/features/videos/services/video-template-selection";

function candidate(
  templateId: string,
  slug: string,
  audience: "general" | "kids",
  versionId = `version-${templateId}`,
): VideoTemplateCandidateInput {
  return {
    templateId,
    slug,
    audience,
    versionId,
    version: 1,
    config: {
      assetKey: slug,
      defaultFormat: "vertical",
      motion: "slow",
    },
  };
}

const quranCandidates = [
  candidate("general-calm", "calm", "general"),
  candidate("general-manuscript", "manuscript-library", "general"),
  candidate("general-paper", "paper", "general"),
  candidate("kids-space", "kids-space", "kids"),
];

const baseInput = {
  candidates: quranCandidates,
  usage: [] as VideoTemplateUsage[],
  audience: "general" as const,
  category: "quran",
  automationKey: "quran:day-100:slot-0",
};

const first = selectAutomatedVideoTemplate(baseInput);
assert.ok(first);
assert.equal(first.templateId, "general-manuscript", "Quran should prefer a manuscript-oriented general template.");
assert.deepEqual(
  selectAutomatedVideoTemplate(baseInput),
  first,
  "The same automation key and catalog snapshot must always select the same template version.",
);

const balanced = selectAutomatedVideoTemplate({
  ...baseInput,
  usage: [{ templateId: "general-manuscript", category: "quran" }],
});
assert.ok(balanced);
assert.equal(
  balanced.templateId,
  "general-paper",
  "The selector must rotate away from a recently used template within the same category.",
);

const kids = selectAutomatedVideoTemplate({
  candidates: quranCandidates,
  usage: [],
  audience: "kids",
  category: "other",
  automationKey: "kids-series:day-100:slot-5",
});
assert.ok(kids);
assert.equal(kids.templateAudience, "kids");
assert.equal(kids.templateAssetKey, "kids-space");
assert.notEqual(kids.templateAudience, "general", "Kids selection must never fall back to general-audience assets.");

const invalidOnly = selectAutomatedVideoTemplate({
  candidates: [{
    ...candidate("bad-general", "calm", "general"),
    config: { assetKey: "kids-space", defaultFormat: "vertical", motion: "slow" },
  }],
  usage: [],
  audience: "general",
  category: "quran",
  automationKey: "invalid:1",
});
assert.equal(invalidOnly, null, "Invalid or audience-mismatched configs must not be selected.");

const bound = applyAutomatedVideoTemplateBinding({ textAr: "نص موثق", audience: "general" }, first);
assert.equal(bound.templateBindingMode, "studio");
assert.equal(bound.templateVersionId, first.templateVersionId);
assert.equal(bound.templateVersion, first.templateVersion);
assert.equal(bound.templateAssetKey, first.templateAssetKey);
assert.deepEqual(bound.templateConfigSnapshot, first.templateConfigSnapshot);
assert.equal(bound.videoFormat, "vertical");
assert.equal(bound.resolution, "1080x1920");

console.log("✅ Automated template selection is deterministic, audience-safe, balanced, and pins immutable Studio versions.");
