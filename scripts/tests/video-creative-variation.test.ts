import assert from "node:assert/strict";
import {
  isVideoSceneAllowedForAudience,
  resolveDeterministicVideoHook,
  resolveDeterministicVideoMotion,
  resolveDeterministicVideoScene,
  resolveDeterministicVideoVisualTheme,
} from "../../src/features/videos/services/video-creative-variation";
import { isVideoTemplateAssetAllowedForAudience } from "../../src/features/videos/services/template-config";

const ids = Array.from({ length: 30 }, (_, index) => `zikr-video-${index}`);
const categories = ["quran", "hadith", "dua", "adhkar", "story", "other"];

for (const category of categories) {
  const scenes = new Set(ids.map((id) => resolveDeterministicVideoScene({ id, category })));
  const hooks = new Set(ids.map((id) => resolveDeterministicVideoHook({ id, category })));
  assert.ok(scenes.size >= 3, `Expected visual variety for ${category}; got ${scenes.size} scene(s).`);
  assert.ok(hooks.size >= 3, `Expected opening-hook variety for ${category}; got ${hooks.size} hook(s).`);
}

const stableInput = { id: "same-video-id", category: "dua" };
assert.equal(
  resolveDeterministicVideoScene(stableInput),
  resolveDeterministicVideoScene(stableInput),
  "Scene selection must stay stable across retries.",
);
assert.equal(
  resolveDeterministicVideoHook(stableInput),
  resolveDeterministicVideoHook(stableInput),
  "Hook selection must stay stable across retries.",
);
assert.ok(["fade", "slow"].includes(resolveDeterministicVideoMotion(stableInput.id)));
for (const style of ["question", "reflection", "action"] as const) {
  const styledHooks = new Set(ids.map((id) => resolveDeterministicVideoHook({ id, category: "quran", style })));
  assert.ok(styledHooks.size >= 3, "Expected varied " + style + " hooks.");
}
const kidsScene = resolveDeterministicVideoScene({ id: "kids-1", category: "story", audience: "kids" });
assert.equal(isVideoSceneAllowedForAudience(kidsScene, "kids"), true);
assert.equal(isVideoSceneAllowedForAudience(kidsScene, "general"), true);
assert.ok(
  new Set(ids.map((id) => resolveDeterministicVideoScene({ id, category: "story", audience: "kids" }))).size >= 3,
  "Kids stories should also have varied, child-specific visual scenes.",
);
assert.ok(
  new Set(ids.map((id) => resolveDeterministicVideoHook({ id, category: "story", audience: "kids" }))).size >= 3,
  "Kids stories should also have varied opening hooks.",
);

for (const id of ids) {
  const generalTheme = resolveDeterministicVideoVisualTheme({ id, category: "story" });
  const kidsTheme = resolveDeterministicVideoVisualTheme({ id, category: "story", audience: "kids" });
  assert.equal(isVideoTemplateAssetAllowedForAudience(generalTheme, "general"), true);
  assert.equal(isVideoTemplateAssetAllowedForAudience(generalTheme, "kids"), false);
  assert.equal(isVideoTemplateAssetAllowedForAudience(kidsTheme, "kids"), true);
  assert.equal(isVideoTemplateAssetAllowedForAudience(kidsTheme, "general"), false);
}
assert.ok(new Set(ids.map((id) => resolveDeterministicVideoVisualTheme({ id, category: "story" }))).size >= 8);
assert.ok(new Set(ids.map((id) => resolveDeterministicVideoVisualTheme({ id, category: "story", audience: "kids" }))).size >= 8);

console.log("Video creative variation tests passed.");
