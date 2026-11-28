import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEFAULT_VIDEO_DAILY_TARGET, MAX_VIDEO_DAILY_TARGET, effectiveVideoDailyTarget } from "../../src/features/videos/config/daily-target";
import { getIntegerAdminSettingDefinition } from "../../src/features/admin/config/settings-registry";

assert.equal(MAX_VIDEO_DAILY_TARGET, 2);
assert.equal(DEFAULT_VIDEO_DAILY_TARGET, 2);
assert.equal(effectiveVideoDailyTarget(24), 2, "a larger stored target is clamped to the worker cap");
assert.equal(effectiveVideoDailyTarget(0), 1);
assert.equal(effectiveVideoDailyTarget("nope"), 2);
const def = getIntegerAdminSettingDefinition("video_automation_daily_target");
assert.equal(def?.maximum, MAX_VIDEO_DAILY_TARGET, "Admin maximum equals the worker cap");
assert.equal(def?.formFallback, MAX_VIDEO_DAILY_TARGET);
const worker = readFileSync(new URL("../jobs/template-video-automation.ts", import.meta.url), "utf8");
assert.ok(worker.includes("effectiveVideoDailyTarget(process.env.DAILY_VIDEO_TARGET)"), "worker uses the shared cap");
const runner = readFileSync(new URL("../run-background-jobs.ts", import.meta.url), "utf8");
assert.ok(runner.includes("MAX_VIDEO_DAILY_TARGET,"), "runner bounds the setting by the shared cap");
console.log("Video daily target cap contract passed: Admin, runner and worker agree on 2/day.");
