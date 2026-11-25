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

assert.equal(resolveYouTubeVideoDisclosure({
  content: { audience: "kids", renderer: "template", publicDistributionAudience: "general" },
  provider: "template",
  queueMetadata: { audience: "kids", publicDistributionAudience: "general", publicPath: "/kids/videos/story" },
  contentType: "other_video",
}).selfDeclaredMadeForKids, false, "Kids-suitable website content can be distributed to a general social audience");

assert.equal(resolveYouTubeVideoDisclosure({
  content: { audience: "kids", platformAudience: "general", childDirected: true },
  queueMetadata: { platformAudience: "general" },
  contentType: "other_video",
}).selfDeclaredMadeForKids, true, "an explicit child-directed declaration must never be overridden");

assert.equal(resolveYouTubeVideoDisclosure({
  content: { audience: "general", renderer: "template" },
  provider: "template",
  queueMetadata: {},
  contentType: "other_video",
}).selfDeclaredMadeForKids, false, "all ZIKR-generated general videos must use general-audience YouTube disclosure");

assert.equal(resolveYouTubeVideoDisclosure({
  content: { audience: "kids" },
  provider: "external",
  queueMetadata: { audience: "kids" },
  contentType: "kids_video",
}).selfDeclaredMadeForKids, true, "external child-directed content keeps its honest Kids disclosure");

assert.equal(resolveYouTubeVideoDisclosure({
  content: { audience: "kids", platformAudience: "general" },
  queueMetadata: {},
  contentType: "other_video",
}).selfDeclaredMadeForKids, false, "platformAudience=general must override website-only Kids suitability");

console.log("YouTube general-distribution and Kids-suitability disclosure separation passed.");
