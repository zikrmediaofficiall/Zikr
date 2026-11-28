import assert from "node:assert/strict";
import { getVerifiedKidsQuizQuestions, getVerifiedWuduSteps, getVerifiedMemoryPairs } from "../../src/lib/games/verified-content";

const steps = getVerifiedWuduSteps();
assert.ok(steps.length >= 5, "wudu list needs the core steps");
steps.forEach((step, index) => {
  assert.equal(step.order, index + 1, "wudu step order must be contiguous from 1");
  assert.ok(step.text.trim().length > 0, "wudu step text must not be empty");
});
const joined = steps.map(step => step.text).join("\n");
const sequence = ["النية", "اليدين", "المضمضة", "الاستنشاق", "الوجه"];
let cursor = -1;
for (const word of sequence) {
  const at = joined.indexOf(word);
  assert.ok(at > cursor, "wudu step '" + word + "' is missing or out of the canonical order");
  cursor = at;
}

const questions = getVerifiedKidsQuizQuestions();
const seen = new Set<string>();
for (const q of questions) {
  assert.ok(q.sourceSlug, "every quiz question needs a source slug");
  assert.ok(q.correctAnswer >= 0 && q.correctAnswer < q.options.length, "correct answer index out of range");
  assert.equal(new Set(q.options).size, q.options.length, "quiz options must be unique: " + q.text);
  assert.ok(!seen.has(q.text), "duplicate quiz question: " + q.text);
  seen.add(q.text);
}

const pairs = getVerifiedMemoryPairs();
assert.ok(pairs.length >= 3, "memory needs at least 3 verified pairs");
for (const pair of pairs) assert.ok(pair.dhikr.trim(), "memory pair needs dhikr text");

console.log("Games religious-content gate passed: " + steps.length + " wudu steps, " + questions.length + " sourced quiz questions, " + pairs.length + " memory pairs.");
