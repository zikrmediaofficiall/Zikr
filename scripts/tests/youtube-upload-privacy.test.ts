import assert from "node:assert/strict";
import { resolveYouTubeUploadPrivacy } from "../../src/features/videos/services/youtube-upload-privacy";

assert.equal(resolveYouTubeUploadPrivacy(undefined), "private");
assert.equal(resolveYouTubeUploadPrivacy(null), "private");
assert.equal(resolveYouTubeUploadPrivacy(""), "private");
assert.equal(resolveYouTubeUploadPrivacy("unexpected"), "private");
assert.equal(resolveYouTubeUploadPrivacy(" public "), "public");
assert.equal(resolveYouTubeUploadPrivacy("UNLISTED"), "unlisted");
assert.equal(resolveYouTubeUploadPrivacy("private"), "private");

console.log("YouTube upload privacy passed: public visibility requires an explicit valid configuration.");
