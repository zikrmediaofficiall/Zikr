import assert from "node:assert/strict";
import { QUIZ_THEMES, getQuizTheme, quizColors, quizNodeStates, streakRewardTier } from "../../src/features/kids/components/games/quiz-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getQuizTheme(level));
assert.equal(seen.size, QUIZ_THEMES.length, "30 levels must reach every path style");
assert.equal(new Set(QUIZ_THEMES.map(t => quizColors(t).path)).size, QUIZ_THEMES.length);
assert.deepEqual(quizNodeStates(4, 2), ["done", "done", "current", "ahead"]);
assert.equal(quizNodeStates(0, 0).length, 0);
assert.deepEqual([0, 2, 3, 5, 8].map(streakRewardTier), [0, 0, 1, 2, 3]);
console.log("Quiz scene contract passed: " + seen.size + " path styles, progress nodes and streak tiers.");
