import assert from "node:assert/strict";
import { chooseHookStyle, isHookExperimentEnabled, type HookStyleStats } from "../../src/features/videos/services/hook-experiment";

const empty: HookStyleStats = { question: { videos: 0, totalViews: 0 }, reflection: { videos: 0, totalViews: 0 }, action: { videos: 0, totalViews: 0 } };
assert.equal(isHookExperimentEnabled({}), false, "off by default");
assert.equal(isHookExperimentEnabled({ VIDEO_HOOK_EXPERIMENT_ENABLED: "true" }), true);
assert.equal(chooseHookStyle({ seed: "a", audience: "kids", stats: empty }), "balanced", "no experiment on kids content");

const counts: Record<string, number> = {};
for (let i = 0; i < 600; i += 1) {
  const s = chooseHookStyle({ seed: `v${i}`, stats: empty });
  counts[s] = (counts[s] ?? 0) + 1;
}
for (const style of ["question", "reflection", "action"]) assert.ok(counts[style] > 140, `rotation reaches ${style} evenly (${counts[style]})`);
assert.equal(chooseHookStyle({ seed: "x", stats: empty }), chooseHookStyle({ seed: "x", stats: empty }), "deterministic per seed");

const mature: HookStyleStats = { question: { videos: 30, totalViews: 3000 }, reflection: { videos: 30, totalViews: 9000 }, action: { videos: 30, totalViews: 1500 } };
const wins: Record<string, number> = {};
for (let i = 0; i < 1000; i += 1) {
  const s = chooseHookStyle({ seed: `m${i}`, stats: mature });
  wins[s] = (wins[s] ?? 0) + 1;
}
assert.ok(wins.reflection > 780, `best style is exploited (${wins.reflection})`);
assert.ok(wins.question > 20 && wins.action > 20, "other styles are still explored");
const partial: HookStyleStats = { ...mature, action: { videos: 3, totalViews: 10 } };
assert.equal(chooseHookStyle({ seed: "p", stats: partial }), "action", "undersampled style is filled first");
console.log("Hook experiment contracts passed.");
