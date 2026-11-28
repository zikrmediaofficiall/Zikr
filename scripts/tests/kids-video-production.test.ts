import assert from "node:assert/strict";
import { buildKidsSeriesEpisode } from "../../src/features/videos/data/kids-story-factory";
import {
  buildKidsVideoProductionManifest,
  buildKidsCharacterSceneSvg,
  validateKidsVideoProductionManifest,
} from "../../src/features/videos/services/kids-video-production";
import { buildVideoStoryboard } from "../../src/features/videos/services/video-storyboard";

const deepSort = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(deepSort);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map((key) => [key, deepSort(record[key])]));
  }
  return value;
};

const sequences = [1, 7, 13, 19, 24];
for (const sequence of sequences) {
  const episode = buildKidsSeriesEpisode(sequence);
  assert.ok(episode.storyBeats.opening && episode.storyBeats.problem && episode.storyBeats.action && episode.storyBeats.outcome);
  const manifest = buildKidsVideoProductionManifest(episode, sequence);
  const expectedWordCount = episode.text.normalize("NFC").replace(/\s+/gu, " ").trim().split(/\s+/u).length;
  assert.equal(manifest.narrationWordCount, expectedWordCount, "manifest word count must count Arabic whitespace-separated words");
  assert.ok(manifest.narrationWordCount > 20 && manifest.narrationWordCount <= 220);
  assert.ok(manifest.ageRange.minAge <= manifest.ageRange.maxAge);
  assert.equal(manifest.scenePack.safeVisualBeats.length, 4);
  assert.ok(manifest.characterContinuity.characters.length >= 2);
  assert.equal(validateKidsVideoProductionManifest(manifest, episode, sequence).ok, true);
  const databaseRoundTrip = deepSort(JSON.parse(JSON.stringify(manifest)));
  assert.equal(validateKidsVideoProductionManifest(databaseRoundTrip, episode, sequence).ok, true,
    "manifest hash must remain valid after JSONB-style key reordering");

  const storyboard = buildVideoStoryboard({
    requestId: "kids-p07-" + String(sequence),
    category: "other",
    audience: "kids",
    durationSeconds: 24,
    visualTheme: episode.visualTheme,
    visualBeats: manifest.scenePack.safeVisualBeats.map((beat) => ({
      id: beat.id,
      narrationAnchor: beat.narrationAnchor,
      assetKey: beat.assetKey,
      characterCues: beat.characterCues,
    })),
  });
  assert.equal(storyboard.scenes.length, 4);
  assert.deepEqual(storyboard.scenes.map((scene) => scene.beat), ["opening", "challenge", "safe_action", "resolution"]);
  assert.ok(storyboard.scenes.every((scene) => (scene.characterCues?.length ?? 0) > 0));
  const characterSvg = buildKidsCharacterSceneSvg(manifest.scenePack.safeVisualBeats[0].characterCues);
  assert.ok(characterSvg.startsWith("<svg"));
  assert.throws(
    () => buildKidsCharacterSceneSvg([{ characterId: "unregistered", pose: "curious" }]),
    /versioned rig registry/i,
  );
}

const canonical = buildKidsSeriesEpisode(1);
assert.throws(
  () => buildKidsVideoProductionManifest({ ...canonical, text: "قال الله تعالى إن هذا نص اختباري." }, 1),
  /unsupported religious attribution/i,
  "fiction must not enter the Kids renderer with unsupported religious attribution",
);
const legacy = buildKidsSeriesEpisode(1, "legacy_msa");
const legacyManifest = buildKidsVideoProductionManifest(legacy, 1);
assert.equal(validateKidsVideoProductionManifest(legacyManifest, legacy, 1).ok, true,
  "legacy MSA episodes must keep canonical story anchors");

const forged = JSON.parse(JSON.stringify(buildKidsVideoProductionManifest(canonical, 1))) as ReturnType<typeof buildKidsVideoProductionManifest>;
forged.manifestSha256 = "0".repeat(64);
assert.equal(validateKidsVideoProductionManifest(forged, canonical, 1).ok, false);

const validManifest = buildKidsVideoProductionManifest(canonical, 1);
assert.throws(() => buildVideoStoryboard({
  requestId: "kids-visual-beats-general",
  category: "story",
  audience: "general",
  durationSeconds: 24,
  visualBeats: validManifest.scenePack.safeVisualBeats.map((beat) => ({
    id: beat.id,
    narrationAnchor: beat.narrationAnchor,
    assetKey: beat.assetKey,
    characterCues: beat.characterCues,
  })),
}), /reserved for the Kids production factory/i);

console.log("Kids video production manifest, JSONB integrity, recurring character, source, and storyboard tests passed.");
