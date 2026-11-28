// Manual clip library intake. Runs only from the upload-library-clip workflow.
// Uploads one muted 720p+ clip to Cloudinary and registers it as PENDING. It never approves, publishes or changes flags.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

const env = process.env;
const need = (k) => { const v = (env[k] ?? "").trim(); if (!v) { console.error(`Missing ${k}`); process.exit(1); } return v; };
const CATEGORIES = ["quran", "hadith", "dua", "adhkar", "story", "kids", "general"];
const SOURCES = ["flow_manual", "owned_original", "stock_licensed", "other_documented"];

const file = need("CLIP_FILE");
const title = need("CLIP_TITLE");
const category = need("CLIP_CATEGORY");
const audience = need("CLIP_AUDIENCE");
const sourceKind = need("CLIP_SOURCE_KIND");
const license = need("CLIP_RIGHTS_LICENSE");
const evidence = need("CLIP_RIGHTS_EVIDENCE");
const slug = need("CLIP_SLUG");

const fail = (m) => { console.error("Rejected: " + m); process.exit(1); };
if (title.length > 120) fail("title too long");
if (!CATEGORIES.includes(category)) fail("unknown category");
if (!["general", "kids"].includes(audience)) fail("audience must be general or kids");
if (category === "kids" && audience !== "kids") fail("kids category needs kids audience");
if (!SOURCES.includes(sourceKind)) fail("unknown source kind");
if (license.length > 200 || evidence.length > 500) fail("rights note too long");
if (!/^[a-z0-9][a-z0-9-]{2,60}$/.test(slug)) fail("slug must be lowercase letters, digits and dashes");
if (statSync(file).size > 40 * 1024 * 1024) fail("file over 40 MB");

const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]).toString());
const v = probe.streams.find((s) => s.codec_type === "video");
if (!v) fail("no video stream");
const width = Number(v.width), height = Number(v.height);
const duration = Number(probe.format.duration);
if (Math.min(width, height) < 720) fail(`resolution ${width}x${height} is below 720p`);
if (!(duration >= 2 && duration <= 60)) fail(`duration ${duration}s outside 2-60 s`);
const hadAudio = probe.streams.some((s) => s.codec_type === "audio");

// Always strip audio so the stored clip is muted.
const muted = "/tmp/clip-muted.mp4";
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", file, "-c:v", "copy", "-an", "-movflags", "+faststart", muted]);
const outProbe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", muted]).toString());
if (outProbe.streams.some((s) => s.codec_type === "audio")) fail("audio track still present after strip");

const cloud = need("CLOUDINARY_CLOUD_NAME"), key = need("CLOUDINARY_API_KEY"), secret = need("CLOUDINARY_API_SECRET");
const folder = "zikr/clip-library";
const publicId = slug;
const timestamp = String(Math.floor(Date.now() / 1000));
const toSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${secret}`;
const signature = createHash("sha1").update(toSign).digest("hex");
const form = new FormData();
form.set("file", new Blob([readFileSync(muted)], { type: "video/mp4" }), `${slug}.mp4`);
form.set("api_key", key); form.set("timestamp", timestamp); form.set("signature", signature);
form.set("folder", folder); form.set("public_id", publicId);
const up = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/video/upload`, { method: "POST", body: form });
const upJson = await up.json().catch(() => ({}));
if (!up.ok) fail(`Cloudinary upload failed: ${up.status} ${upJson?.error?.message ?? ""}`);
const secureUrl = String(upJson.secure_url ?? "");
const fullId = String(upJson.public_id ?? `${folder}/${publicId}`);
if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(secureUrl)) fail("unexpected Cloudinary URL");

const supaUrl = need("SUPABASE_URL").replace(/\/$/, ""), service = need("SUPABASE_SERVICE_ROLE_KEY");
const row = {
  title, category, audience, video_url: secureUrl, cloudinary_public_id: fullId,
  width, height, duration_seconds: Number(duration.toFixed(2)), audio_muted: true,
  source_kind: sourceKind, rights_license: license, rights_evidence: evidence,
  rights_reviewer: "Awaiting owner approval in /admin/video/clips", rights_reviewed_at: new Date().toISOString(),
  status: "pending",
};
const ins = await fetch(`${supaUrl}/rest/v1/video_clip_library`, {
  method: "POST",
  headers: { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify(row),
});
const insJson = await ins.json().catch(() => ({}));
if (!ins.ok) fail(`Registration failed: ${ins.status} ${JSON.stringify(insJson).slice(0, 200)}`);
console.log(JSON.stringify({ registered: true, id: insJson?.[0]?.id, status: "pending", width, height, duration, hadAudio, publicId: fullId }));
