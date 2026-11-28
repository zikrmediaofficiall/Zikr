import assert from "node:assert/strict";
import { createStageTimer, slowestStage } from "../../src/features/videos/services/stage-timings";

let t = 1000;
const timer = createStageTimer(() => t);
t += 500; timer.mark("render");
t += 200; timer.mark("register");
t += 100; timer.mark("render");
const snap = timer.snapshot();
assert.equal(snap.render, 600);
assert.equal(snap.register, 200);
assert.equal(snap.totalMs, 800);
assert.equal(slowestStage(snap), "render");
assert.equal(slowestStage(null), null);
console.log("stage-timings tests passed");
