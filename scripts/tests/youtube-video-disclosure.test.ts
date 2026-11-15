import assert from "node:assert/strict";
import { resolveYouTubeVideoDisclosure } from "../../src/features/social/services/youtube-video-disclosure";

assert.equal(resolveYouTubeVideoDisclosure({
  content: { audience: " KIDS " },
  queueMetadata: {},
  contentType: "other_video",
}).selfDeclaredMadeForKids, true);

assert.equal(resolveYouTubeVideoDisclosure({
  content: { sourceType: " ORIGINAL_KIDS_FICTION ", aiMode: " ORIGINAL_KIDS_STORY " },
  queueMetadata: {},
  contentType: "other_video",
}).selfDeclaredMadeForKids, true);

assert.equal(resolveYouTubeVideoDisclosure({
  content: {},
  queueMetadata: { audience: " children " },
  contentType: "other_video",
}).selfDeclaredMadeForKids, true);

assert.equal(resolveYouTubeVideoDisclosure({
  content: { audience: "family" },
  queueMetadata: {},
  contentType: "other_video",
}).selfDeclaredMadeForKids, false);

console.log("YouTube Kids audience disclosure normalization passed.");
