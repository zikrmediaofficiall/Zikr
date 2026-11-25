import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const studio = readFileSync(
  new URL(
    "../../src/features/admin/video-studio/components/admin-video-studio-client.tsx",
    import.meta.url
  ),
  "utf8"
);

assert.ok(studio.includes("const DAILY_SHORT_VIDEO_CAP = 3"));
assert.ok(studio.includes("if (plans.length >= DAILY_SHORT_VIDEO_CAP) break"));
assert.ok(studio.includes("data.sources[0] as Source | undefined"));
assert.ok(
  !studio.includes("slice(0, 2)"),
  "The studio must not recreate the former multi-item burst."
);
assert.ok(studio.includes("دفعة اليوم المضبوطة"));

console.log("Video Studio daily batch cap contract passed.");
