import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveYouTubeUploadPrivacy } from "../../src/features/videos/services/youtube-upload-privacy";

assert.equal(resolveYouTubeUploadPrivacy(undefined), "public");
assert.equal(resolveYouTubeUploadPrivacy(null), "public");
assert.equal(resolveYouTubeUploadPrivacy(""), "public");
assert.equal(resolveYouTubeUploadPrivacy("unexpected"), "public");
assert.equal(resolveYouTubeUploadPrivacy(" public "), "public");
assert.equal(resolveYouTubeUploadPrivacy("UNLISTED"), "unlisted");
assert.equal(resolveYouTubeUploadPrivacy("private"), "private");
const envExample = readFileSync(".env.example", "utf8");
assert.match(envExample, /^# Visibility for automatic YouTube uploads: public, unlisted, or private \(default: public\)\.$/m, "environment documentation must state the public runtime default");
assert.match(envExample, /^YOUTUBE_UPLOAD_PRIVACY=public$/m, "environment template must explicitly select public uploads");

console.log("YouTube upload privacy passed: approved uploads default to public visibility.");
