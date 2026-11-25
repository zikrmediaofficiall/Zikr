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

import { aggregateHookStyleStats } from "../../src/features/videos/services/hook-experiment";
const agg = aggregateHookStyleStats(
  [
    { id: "r1", content: { hookStyle: "question" } },
    { id: "r2", content: { hookStyle: "action" } },
    { id: "r3", content: { hookStyle: "balanced" } },
    { id: "r4", content: { hookStyle: "question", audience: "kids" } },
    { id: "r5", content: { hookStyle: "question" } },
  ],
  [{ id: "q1", content_id: "r1" }, { id: "q2", content_id: "r2" }, { id: "q3", content_id: "r3" }, { id: "q4", content_id: "r4" }, { id: "q5", content_id: "r5" }],
  [
    { queue_id: "q1", metrics: { views: 100 } },
    { queue_id: "q1", metrics: { views: 50 } },
    { queue_id: "q2", metrics: { views: 7 } },
    { queue_id: "q3", metrics: { views: 999 } },
    { queue_id: "q4", metrics: { views: 999 } },
    { queue_id: "q5", metrics: {} },
  ],
);
assert.deepEqual(agg.question, { videos: 2, totalViews: 150 }, "views summed per video, kids and unmeasured handled");
assert.deepEqual(agg.action, { videos: 1, totalViews: 7 });
assert.deepEqual(agg.reflection, { videos: 0, totalViews: 0 }, "balanced and kids rows are ignored");
console.log("Hook aggregation contracts passed.");

assert.equal(isHookExperimentEnabled({ VIDEO_HOOK_EXPERIMENT: "true" }), true, "short Vercel name works");
assert.equal(isHookExperimentEnabled({ VIDEO_HOOK_EXPERIMENT: "false" }), false);
