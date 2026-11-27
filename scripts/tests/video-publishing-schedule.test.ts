import assert from "node:assert/strict";
import {
  canReserveVideoPublishAt,
  resolveNextVideoPublishAt,
  VIDEO_PUBLISH_SLOTS,
} from "../../src/features/social/services/video-publishing-schedule";

const now = new Date("2026-11-25T03:00:00.000Z"); // 05:00 Cairo
const empty = resolveNextVideoPublishAt({ now, rows: [], targetPlatforms: ["youtube", "facebook_reels"] });
assert.equal(empty, "2026-11-25T12:22:00.000Z", "First daily slot is 14:22 Cairo.");

const occupied = (scheduled_at: string, platforms = ["youtube", "facebook_reels"]) => ({
  id: scheduled_at, status: "queued", target_platforms: platforms, scheduled_at,
  published_at: null, created_at: "2026-11-25T02:00:00.000Z",
});
assert.equal(
  resolveNextVideoPublishAt({ now, rows: [occupied("2026-11-25T12:22:00.000Z")], targetPlatforms: ["youtube", "facebook_reels"] }),
  "2026-11-25T15:52:00.000Z",
  "An occupied first slot should move the post to 17:52 Cairo.",
);
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [
      occupied("2026-11-25T12:22:00.000Z"),
      occupied("2026-11-25T15:52:00.000Z"),
    ],
    targetPlatforms: ["youtube", "facebook_reels"],
  }),
  "2026-11-26T12:22:00.000Z",
  "Two occupied daily slots must roll over to tomorrow.",
);
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [occupied("2026-11-25T12:22:00.000Z", ["facebook_reels"])],
    targetPlatforms: ["youtube"],
  }),
  "2026-11-25T12:22:00.000Z",
  "Platform occupancy must be isolated.",
);
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [{ ...occupied("2026-11-25T12:22:00.000Z"), status: "failed" }],
    targetPlatforms: ["youtube"],
  }),
  "2026-11-25T12:22:00.000Z",
  "Terminal failed rows must not reserve a slot.",
);
assert.deepEqual(VIDEO_PUBLISH_SLOTS, [
  { hour: 14, minute: 22 },
  { hour: 17, minute: 52 },
]);
// Manually scheduled video rows still consume the per-platform daily quota,
// even when their timestamps do not match one of the preferred automation slots.
const offSlot = (scheduled_at: string) => ({
  ...occupied(scheduled_at),
  target_platforms: ["youtube", "facebook_reels"],
});
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [
      offSlot("2026-11-25T09:00:00.000Z"), // 11:00 Cairo
      offSlot("2026-11-25T14:00:00.000Z"), // 16:00 Cairo
    ],
    targetPlatforms: ["youtube", "facebook_reels"],
  }),
  "2026-11-26T12:22:00.000Z",
  "Two off-slot manual videos must still exhaust the per-platform daily quota.",
);
assert.equal(canReserveVideoPublishAt({
  now,
  scheduledAt: "2026-11-25T15:00:00.000Z",
  rows: [],
  targetPlatforms: ["youtube", "facebook_reels"],
}), true, "a future campaign slot may be reserved when daily capacity remains");
assert.equal(canReserveVideoPublishAt({
  now,
  scheduledAt: "2026-11-25T15:00:00.000Z",
  rows: [
    offSlot("2026-11-25T09:00:00.000Z"),
    offSlot("2026-11-25T14:00:00.000Z"),
  ],
  targetPlatforms: ["youtube", "facebook_reels"],
}), false, "a campaign slot must not bypass the daily platform quota");
assert.equal(canReserveVideoPublishAt({
  now,
  scheduledAt: "2026-11-25T02:00:00.000Z",
  rows: [],
  targetPlatforms: ["youtube"],
}), false, "a past campaign slot must never become an immediate post");
assert.equal(resolveNextVideoPublishAt({ now, rows: [], targetPlatforms: ["tiktok"] }), null);
const partialYoutubeSuccess = {
  ...occupied("2026-11-24T12:22:00.000Z"),
  status: "partial",
  published_at: "2026-11-25T12:10:00.000Z",
  completed_platforms: ["youtube"],
};
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [partialYoutubeSuccess],
    targetPlatforms: ["facebook_reels"],
  }),
  "2026-11-25T12:22:00.000Z",
  "A confirmed YouTube result must not occupy the Facebook Reels slot for a partially delivered queue item.",
);
assert.equal(
  resolveNextVideoPublishAt({
    now,
    rows: [partialYoutubeSuccess],
    targetPlatforms: ["youtube"],
  }),
  "2026-11-25T15:52:00.000Z",
  "A completed YouTube result must still consume YouTube's daily quota at its confirmed publish time.",
);
assert.equal(canReserveVideoPublishAt({
  now,
  scheduledAt: "2026-11-25T12:22:00.000Z",
  rows: [partialYoutubeSuccess],
  targetPlatforms: ["facebook_reels"],
}), true, "Reels may use an open slot while YouTube's result is already confirmed");
assert.equal(canReserveVideoPublishAt({
  now,
  scheduledAt: "2026-11-25T12:22:00.000Z",
  rows: [partialYoutubeSuccess],
  targetPlatforms: ["youtube"],
}), false, "a confirmed YouTube result must retain its per-platform slot reservation");

console.log("Cairo video publishing schedule tests passed.");
