import assert from "node:assert/strict";
import { resolveVideoPoster, isHookFramePosterEnabled } from "../../src/features/videos/services/video-media-url";

process.env.CLOUDINARY_CLOUD_NAME = "democloud";
const url = "https://res.cloudinary.com/democloud/video/upload/v1/zikr/videos/a.mp4";
assert.equal(isHookFramePosterEnabled({}), false, "off by default");
assert.equal(resolveVideoPoster(url, {}), "https://res.cloudinary.com/democloud/video/upload/so_0/v1/zikr/videos/a.jpg");
assert.equal(resolveVideoPoster(url, { VIDEO_THUMBNAIL_HOOK_FRAME_ENABLED: "true" }), "https://res.cloudinary.com/democloud/video/upload/so_1.6/v1/zikr/videos/a.jpg");
assert.equal(resolveVideoPoster("https://evil.example/video/upload/a.mp4", { VIDEO_THUMBNAIL_HOOK_FRAME_ENABLED: "true" }), null, "foreign hosts never get a poster");
assert.equal(resolveVideoPoster(null, {}), null);
console.log("Video poster contracts passed.");
assert.equal(isHookFramePosterEnabled({ VIDEO_THUMBNAIL_HOOK_FRAME: "true" }), true, "short Vercel name works");
