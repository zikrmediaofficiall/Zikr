import assert from "node:assert/strict";
import {
  resolveNextVideoPublishAt,
  VIDEO_PUBLISH_SLOTS,
} from "../../src/features/social/services/video-publishing-schedule";

const now = new Date("2026-11-25T06:00:00.000Z"); // 08:00 Cairo
const empty = resolveNextVideoPublishAt({ now, rows: [], targetPlatforms: ["youtube", "facebook_reels"] });
assert.equal(empty, "2026-11-25T10:52:00.000Z", "First daily slot is 12:52 Cairo.");

const occupied = (scheduled_at: string, platforms = ["youtube", "facebook_reels"]) => ({
  id: scheduled_at, status: "queued", target_platforms: platforms, scheduled_at,
  published_at: null, created_at: "2026-11-25T05:00:00.000Z",
});
assert.equal(
  resolveNextVideoPublishAt({ now, rows: [occupied("2026-11-25T10:52:00.000Z")], targetPlatforms: ["youtube", "facebook_reels"] }),
  "2026-11-25T16:07:00.000Z",
);
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [occupied("2026-11-25T10:52:00.000Z"), occupied("2026-11-25T16:07:00.000Z"), occupied("2026-11-25T19:22:00.000Z")],
    targetPlatforms: ["youtube", "facebook_reels"],
  }),
  "2026-11-26T10:52:00.000Z",
);
assert.equal(
  resolveNextVideoPublishAt({ now, rows: [occupied("2026-11-25T10:52:00.000Z", ["facebook_reels"])], targetPlatforms: ["youtube"] }),
  "2026-11-25T10:52:00.000Z",
);
assert.equal(
  resolveNextVideoPublishAt({ now, rows: [{ ...occupied("2026-11-25T10:52:00.000Z"), status: "failed" }], targetPlatforms: ["youtube"] }),
  "2026-11-25T10:52:00.000Z",
);
assert.equal(VIDEO_PUBLISH_SLOTS.length, 3);
assert.equal(resolveNextVideoPublishAt({ now, rows: [], targetPlatforms: ["tiktok"] }), null);
console.log("Cairo video publishing schedule tests passed.");
