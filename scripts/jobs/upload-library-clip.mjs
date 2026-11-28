// Manual clip library intake. Runs only from the upload-library-clip workflow.
// Validates, normalizes, mutes and uploads one MP4 asset, then inserts a PENDING row.
// If registration fails, it verifies PostgREST state before compensating the Cloudinary upload.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

const env = process.env;
const need = (key) => {
  const value = (env[key] ?? "").trim();
  if (!value) throw new Error("Missing required environment variable: " + key);
  return value;
};
const fail = (message) => { throw new Error("Rejected: " + message); };
const CATEGORIES = new Set(["quran", "hadith", "dua", "adhkar", "story", "kids", "general"]);
const SOURCES = new Set(["flow_manual", "owned_original", "stock_licensed", "other_documented"]);
const RELEASE_ASSET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}\.mp4$/;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,60}$/;

function run(command, args) {
  return execFileSync(command, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 4 * 1024 * 1024 });
}
function probeMedia(file) {
  return JSON.parse(run("ffprobe", [
    "-v", "error", "-print_format", "json", "-show_streams", "-show_format", file,
  ]).toString("utf8"));
}
function mediaFacts(probe) {
  const stream = probe.streams?.find((item) => item.codec_type === "video");
  if (!stream) fail("no video stream");
  return {
    width: Number(stream.width),
    height: Number(stream.height),
    duration: Number(probe.format?.duration),
    formatName: String(probe.format?.format_name ?? ""),
    codec: String(stream.codec_name ?? ""),
    hasAudio: probe.streams.some((item) => item.codec_type === "audio"),
  };
}
function validateVideoFacts(facts, maxBytes) {
  if (!Number.isInteger(facts.width) || !Number.isInteger(facts.height) ||
      facts.width < 720 || facts.height < 720 || facts.width > 3840 || facts.height > 3840) {
    fail("resolution must be at least 720p and no larger than 3840x3840");
  }
  if (!Number.isFinite(facts.duration) || facts.duration < 2 || facts.duration > 60) {
    fail("duration must be between 2 and 60 seconds");
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1024 || maxBytes > 40 * 1024 * 1024) {
    fail("input/output size is outside the 1 KiB–40 MiB intake limit");
  }
  if (facts.formatName && !facts.formatName.split(",").some((name) => name === "mov" || name === "mp4")) {
    fail("source must be an MP4/MOV container");
  }
}
function signCloudinary(parameters, secret) {
  const canonical = Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + String(value))
    .join("&");
  return createHash("sha1").update(canonical + secret).digest("hex");
}
function assertCloudinaryUrl(secureUrl, cloudName, publicId) {
  let parsed;
  try { parsed = new URL(secureUrl); } catch { fail("Cloudinary returned an invalid secure URL"); }
  const prefix = "/" + cloudName + "/video/upload/";
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" ||
      !parsed.pathname.startsWith(prefix) || parsed.search || parsed.hash) {
    fail("uploaded asset URL does not belong to the configured Cloudinary tenant");
  }
  let assetPath = parsed.pathname.slice(prefix.length);
  assetPath = assetPath.replace(/^v[0-9]+\//, "").replace(/\.(mp4|m4v)$/i, "");
  if (assetPath !== publicId || !/\.(mp4|m4v)$/i.test(parsed.pathname)) {
    fail("Cloudinary URL public ID does not match the requested clip");
  }
}
async function cloudinaryDestroy({ cloudName, apiKey, apiSecret, publicId }) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const parameters = { public_id: publicId, timestamp };
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("timestamp", timestamp);
  form.set("api_key", apiKey);
  form.set("signature", signCloudinary(parameters, apiSecret));
  const response = await fetch("https://api.cloudinary.com/v1_1/" + cloudName + "/video/destroy", {
    method: "POST", body: form, signal: AbortSignal.timeout(15000),
  });
  const json = await response.json().catch(() => ({}));
  return response.ok && ["ok", "not found"].includes(String(json.result ?? "").toLowerCase());
}
async function isClipRegistered(supabaseUrl, serviceKey, publicId) {
  const endpoint = new URL(supabaseUrl + "/rest/v1/video_clip_library");
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("cloudinary_public_id", "eq." + publicId);
  endpoint.searchParams.set("limit", "1");
  const response = await fetch(endpoint, {
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Could not verify whether the clip registration committed.");
  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function assertClipLibraryReady(supabaseUrl, serviceKey) {
  const endpoint = new URL(supabaseUrl + "/rest/v1/video_clip_library");
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("limit", "0");
  const response = await fetch(endpoint, {
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    throw new Error("Clip library table is not ready in Supabase; refusing Cloudinary upload before database registration is available.");
  }
  const rows = await response.json().catch(() => null);
  if (!Array.isArray(rows)) throw new Error("Supabase clip library readiness response was invalid.");
}

async function assertNoRegisteredClip(supabaseUrl, serviceKey, publicId) {
  if (await isClipRegistered(supabaseUrl, serviceKey, publicId)) {
    throw new Error("A clip with this Cloudinary public ID is already registered; choose a new slug.");
  }
}

async function main() {
  const fileArgument = need("CLIP_FILE");
  const file = realpathSync(fileArgument);
  const allowedDirectory = realpathSync("/tmp/clip");
  if (!file.startsWith(allowedDirectory + path.sep)) fail("clip file must come from the validated /tmp/clip release download");
  const assetName = path.basename(file);
  if (!RELEASE_ASSET_PATTERN.test(assetName)) fail("release asset must be a single safe MP4 filename");
  const originalStats = statSync(file);
  if (!originalStats.isFile() || originalStats.size > 40 * 1024 * 1024) fail("file must be a regular media file of at most 40 MiB");

  const title = need("CLIP_TITLE");
  const category = need("CLIP_CATEGORY");
  const audience = need("CLIP_AUDIENCE");
  const sourceKind = need("CLIP_SOURCE_KIND");
  const license = need("CLIP_RIGHTS_LICENSE");
  const evidence = need("CLIP_RIGHTS_EVIDENCE");
  const slug = need("CLIP_SLUG");
  if (title.length > 120) fail("title too long");
  if (!CATEGORIES.has(category)) fail("unknown category");
  if (!["general", "kids"].includes(audience)) fail("audience must be general or kids");
  if (category === "kids" && audience !== "kids") fail("kids category needs kids audience");
  if (audience === "kids" && category !== "kids" && category !== "general") fail("Kids audience only accepts Kids or general category");
  if (!SOURCES.has(sourceKind)) fail("unknown source kind");
  if (license.length > 200 || evidence.length > 500) fail("rights notes exceed the allowed length");
  if (!SLUG_PATTERN.test(slug)) fail("slug must be lowercase letters, digits and dashes");

  const initialProbe = probeMedia(file);
  const initialFacts = mediaFacts(initialProbe);
  validateVideoFacts(initialFacts, originalStats.size);
  const originalDuration = initialFacts.duration;

  // Re-encode to a canonical MP4 and strip every source audio stream.
  const muted = "/tmp/clip-muted-" + slug + ".mp4";
  run("ffmpeg", [
    "-v", "error", "-y", "-i", file,
    "-map", "0:v:0", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", muted,
  ]);
  const mutedStats = statSync(muted);
  if (!mutedStats.isFile() || mutedStats.size > 40 * 1024 * 1024) fail("normalized MP4 exceeds the 40 MiB limit");
  const finalProbe = probeMedia(muted);
  const finalFacts = mediaFacts(finalProbe);
  validateVideoFacts(finalFacts, mutedStats.size);
  if (finalFacts.codec !== "h264" || finalFacts.hasAudio ||
      finalFacts.width !== initialFacts.width || finalFacts.height !== initialFacts.height ||
      Math.abs(finalFacts.duration - originalDuration) > 0.5) {
    fail("normalized MP4 must be H.264, muted, same dimensions, and duration-preserving");
  }

  const cloudName = need("CLOUDINARY_CLOUD_NAME");
  const apiKey = need("CLOUDINARY_API_KEY");
  const apiSecret = need("CLOUDINARY_API_SECRET");
  const supabaseUrl = need("SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");
  // Prove the production table and slug are ready before any Cloudinary write.
  await assertClipLibraryReady(supabaseUrl, serviceKey);
  const folder = "zikr/clip-library";
  const publicId = folder + "/" + slug;
  await assertNoRegisteredClip(supabaseUrl, serviceKey, publicId);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const uploadParameters = { folder, overwrite: "false", public_id: slug, timestamp };
  const form = new FormData();
  form.set("file", new Blob([readFileSync(muted)], { type: "video/mp4" }), slug + ".mp4");
  form.set("api_key", apiKey);
  form.set("timestamp", timestamp);
  form.set("signature", signCloudinary(uploadParameters, apiSecret));
  form.set("folder", folder);
  form.set("public_id", slug);
  form.set("overwrite", "false");

  const uploadResponse = await fetch("https://api.cloudinary.com/v1_1/" + cloudName + "/video/upload", {
    method: "POST", body: form, signal: AbortSignal.timeout(60000),
  });
  const uploadJson = await uploadResponse.json().catch(() => ({}));
  if (!uploadResponse.ok) fail("Cloudinary upload failed: " + uploadResponse.status + " " + String(uploadJson?.error?.message ?? "").slice(0, 160));

  const secureUrl = String(uploadJson.secure_url ?? "");
  const returnedPublicId = String(uploadJson.public_id ?? "");
  if (returnedPublicId !== publicId) {
    fail("Cloudinary returned an unexpected public ID; manual recovery may be required for " + returnedPublicId);
  }
  assertCloudinaryUrl(secureUrl, cloudName, returnedPublicId);

  const row = {
    title, category, audience, video_url: secureUrl, cloudinary_public_id: returnedPublicId,
    width: finalFacts.width, height: finalFacts.height, duration_seconds: Number(finalFacts.duration.toFixed(2)), audio_muted: true,
    source_kind: sourceKind, rights_license: license, rights_evidence: evidence,
    rights_reviewer: "Uploader attestation; owner approval is pending",
    rights_reviewed_at: new Date().toISOString(),
    status: "pending",
  };
  const endpoint = supabaseUrl + "/rest/v1/video_clip_library";
  let insertError = null;
  try {
    const insertResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: serviceKey, Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(20000),
    });
    const body = await insertResponse.json().catch(() => ({}));
    if (!insertResponse.ok) {
      insertError = new Error("Registration failed: " + insertResponse.status + " " + JSON.stringify(body).slice(0, 180));
    } else if (Array.isArray(body) && typeof body[0]?.id === "string") {
      console.log(JSON.stringify({
        registered: true, id: body[0].id, status: "pending",
        width: finalFacts.width, height: finalFacts.height, duration: finalFacts.duration,
        hadAudio: initialFacts.hasAudio, publicId: returnedPublicId,
      }));
      return;
    } else {
      insertError = new Error("Supabase did not return a registered clip row; reconciliation will verify the commit.");
    }
  } catch (error) {
    insertError = error instanceof Error ? error : new Error(String(error));
  }

  // On an ambiguous network failure, never delete the media until the DB state is re-read.
  try {
    if (await isClipRegistered(supabaseUrl, serviceKey, returnedPublicId)) {
      console.warn("Registration response was ambiguous, but the pending row exists; keeping Cloudinary asset.", returnedPublicId);
      return;
    }
  } catch {
    console.error("Registration state is unknown. Cloudinary asset was preserved to avoid a broken database reference:", returnedPublicId);
    throw insertError;
  }

  const destroyed = await cloudinaryDestroy({ cloudName, apiKey, apiSecret, publicId: returnedPublicId });
  if (!destroyed) {
    console.error("Registration failed and Cloudinary compensation did not confirm deletion. Manual recovery ID:", returnedPublicId);
  }
  throw insertError;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
