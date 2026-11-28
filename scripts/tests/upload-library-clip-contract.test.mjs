import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/upload-library-clip.yml", "utf8");
const script = readFileSync("scripts/jobs/upload-library-clip.mjs", "utf8");

assert.ok(workflow.includes("actions/checkout@v7"), "workflow must use the repository's pinned checkout version");
assert.ok(workflow.includes("Ensure FFmpeg and ffprobe are available"), "manual upload must prepare FFmpeg tools before the uploader");
assert.ok(workflow.includes("sudo apt-get install -y --no-install-recommends ffmpeg"), "missing FFmpeg/ffprobe must be installed on a clean runner");
assert.ok(workflow.includes("command -v ffprobe"), "workflow must explicitly verify ffprobe is available");
assert.ok(!workflow.includes("actions/checkout@v4"), "deprecated checkout action must not be used");
assert.ok(workflow.includes("github.ref == 'refs/heads/main'"), "production upload must run only from main");
assert.ok(workflow.includes("environment: production"), "upload secrets must be scoped to the production environment");
assert.ok(workflow.includes("permissions:\n  contents: read"), "workflow token must remain read-only");
assert.ok(workflow.includes('[[ "$ASSET_NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$ ]]'), "release asset stem must use a strict safe-character allowlist");
assert.ok(workflow.includes('[[ "$ASSET_NAME" == *.mp4 ]]'), "release asset extension must match a literal .mp4 suffix");
assert.ok(workflow.includes("select(.name == env.ASSET_NAME)"), "release download must verify an exact asset name, not a glob");
assert.ok(workflow.includes("test -f \"/tmp/clip/$ASSET_NAME\""), "only the exact selected release asset may be passed to the uploader");

assert.ok(script.includes("realpathSync(\"/tmp/clip\")"), "uploader must constrain input to the release staging directory");
assert.ok(script.includes("assertClipLibraryReady(supabaseUrl, serviceKey)"), "the production clip table must be verified before uploading to Cloudinary");
assert.ok(script.includes("assertNoRegisteredClip(supabaseUrl, serviceKey, publicId)"), "duplicate registration must be rejected before uploading");
assert.ok(!workflow.includes("group: upload-library-clip"), "manual clip uploads must not share a concurrency key that replaces pending runs");
assert.ok(script.includes("facts.width < 720 || facts.height < 720"), "media validation must enforce the 720p edge");
assert.ok(script.includes("finalFacts.codec !== \"h264\"") && script.includes("finalFacts.hasAudio"), "normalized output must be H.264 and silent");
assert.ok(script.includes('"-an"'), "FFmpeg must strip the input audio stream");
assert.ok(script.includes('form.set("overwrite", "false")'), "Cloudinary uploads must never overwrite an existing public ID");
assert.ok(script.includes("assertCloudinaryUrl(secureUrl, cloudName, returnedPublicId)"), "Cloudinary URL, tenant and public ID must match");
assert.ok(script.includes("isClipRegistered(supabaseUrl, serviceKey, returnedPublicId)"), "ambiguous Supabase responses must be reconciled before compensation");
assert.ok(script.includes("cloudinaryDestroy({ cloudName, apiKey, apiSecret, publicId: returnedPublicId })"), "failed registrations must compensate the Cloudinary asset only after confirming no DB row exists");
assert.ok(script.includes('status: "pending"'), "upload must never auto-approve");
assert.ok(!script.includes("CLIP_LIBRARY_ENABLED"), "manual ingestion must not turn on the production provider");
assert.ok(!script.includes("publishToYoutube") && !script.includes("publishToFacebook"), "upload must never publish externally");

console.log("Manual clip upload contract passed: pinned action, exact release asset, media normalization, no-overwrite Cloudinary upload, DB reconciliation and safe compensation.");
