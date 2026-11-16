import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveYouTubeUploadPrivacy } from "../../src/features/videos/services/youtube-upload-privacy";

assert.equal(resolveYouTubeUploadPrivacy(undefined), "private");
assert.equal(resolveYouTubeUploadPrivacy(null), "private");
assert.equal(resolveYouTubeUploadPrivacy(""), "private");
assert.equal(resolveYouTubeUploadPrivacy("unexpected"), "private");
assert.equal(resolveYouTubeUploadPrivacy(" public "), "public");
assert.equal(resolveYouTubeUploadPrivacy("UNLISTED"), "unlisted");
assert.equal(resolveYouTubeUploadPrivacy("private"), "private");
const envExample = readFileSync(".env.example", "utf8");
assert.match(envExample, /# Visibility for automatic YouTube uploads: public, unlisted, or private \\(default: private\\)\\r?\\nYOUTUBE_UPLOAD_PRIVACY=private/m, "environment documentation must match the fail-safe private runtime default");

console.log("YouTube upload privacy passed: public visibility requires an explicit valid configuration.");
