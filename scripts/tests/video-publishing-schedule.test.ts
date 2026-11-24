import assert from "node:assert/strict";
import {
  resolveNextVideoPublishAt,
  VIDEO_PUBLISH_SLOTS,
} from "../../src/features/social/services/video-publishing-schedule";

const now = new Date("2026-11-25T03:00:00.000Z"); // 05:00 Cairo
const empty = resolveNextVideoPublishAt({ now, rows: [], targetPlatforms: ["youtube", "facebook_reels"] });
assert.equal(empty, "2026-11-25T03:37:00.000Z", "First daily slot is 05:37 Cairo.");

const occupied = (scheduled_at: string, platforms = ["youtube", "facebook_reels"]) => ({
  id: scheduled_at, status: "queued", target_platforms: platforms, scheduled_at,
  published_at: null, created_at: "2026-11-25T02:00:00.000Z",
});
assert.equal(
  resolveNextVideoPublishAt({ now, rows: [occupied("2026-11-25T03:37:00.000Z")], targetPlatforms: ["youtube", "facebook_reels"] }),
  "2026-11-25T12:22:00.000Z",
  "An occupied morning slot should move the post to 14:22 Cairo.",
);
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [
      occupied("2026-11-25T03:37:00.000Z"),
      occupied("2026-11-25T12:22:00.000Z"),
      occupied("2026-11-25T15:52:00.000Z"),
    ],
    targetPlatforms: ["youtube", "facebook_reels"],
  }),
  "2026-11-26T03:37:00.000Z",
  "Three occupied daily slots must roll over to tomorrow.",
);
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [occupied("2026-11-25T03:37:00.000Z", ["facebook_reels"])],
    targetPlatforms: ["youtube"],
  }),
  "2026-11-25T03:37:00.000Z",
  "Platform occupancy must be isolated.",
);
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [{ ...occupied("2026-11-25T03:37:00.000Z"), status: "failed" }],
    targetPlatforms: ["youtube"],
  }),
  "2026-11-25T03:37:00.000Z",
  "Terminal failed rows must not reserve a slot.",
);
assert.deepEqual(VIDEO_PUBLISH_SLOTS, [
  { hour: 5, minute: 37 },
  { hour: 14, minute: 22 },
  { hour: 17, minute: 52 },
]);
assert.equal(resolveNextVideoPublishAt({ now, rows: [], targetPlatforms: ["tiktok"] }), null);
console.log("Cairo video publishing schedule tests passed.");
