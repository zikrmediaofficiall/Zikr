// READ-ONLY reconciliation: compares Cloudinary video assets with catalog references. No deletes, no writes.
import { appendFileSync } from "node:fs";

const need = (k) => { const v = (process.env[k] ?? "").trim(); if (!v) throw new Error("Missing " + k); return v; };
const cloud = need("CLOUDINARY_CLOUD_NAME"), key = need("CLOUDINARY_API_KEY"), secret = need("CLOUDINARY_API_SECRET");
const supaUrl = need("SUPABASE_URL").replace(/\/$/, ""), service = need("SUPABASE_SERVICE_ROLE_KEY");
const auth = "Basic " + Buffer.from(key + ":" + secret).toString("base64");
const MAX_PAGES = 40;

async function listCloudinary() {
  const ids = new Map();
  let cursor = "";
  for (let page = 0; page < MAX_PAGES; page++) {
    const u = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/video`);
    u.searchParams.set("max_results", "500");
    u.searchParams.set("type", "upload");
    if (cursor) u.searchParams.set("next_cursor", cursor);
    const r = await fetch(u, { headers: { Authorization: auth }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error("Cloudinary list failed: " + r.status);
    const j = await r.json();
    for (const item of j.resources ?? []) ids.set(item.public_id, item.bytes ?? 0);
    cursor = j.next_cursor ?? "";
    if (!cursor) return { ids, complete: true };
  }
  return { ids, complete: false };
}

async function supa(path) {
  const r = await fetch(supaUrl + "/rest/v1/" + path, { headers: { apikey: service, Authorization: "Bearer " + service }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("Supabase read failed: " + path.split("?")[0] + " " + r.status);
  return r.json();
}

function publicIdFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "res.cloudinary.com") return null;
    const m = u.pathname.match(/^\/([^/]+)\/video\/upload\/(.+)$/);
    if (!m || m[1] !== cloud) return null;
    return decodeURIComponent(m[2].replace(/^(?:[a-z]{1,3}_[^/]*\/)*/i, "").replace(/^v[0-9]+\//, "").replace(/\.[A-Za-z0-9]{2,4}$/, ""));
  } catch { return null; }
}

const { ids, complete } = await listCloudinary();
const videos = [];
for (let offset = 0; ; offset += 1000) {
  const rows = await supa(`videos?select=id,slug,published,metadata&order=id&limit=1000&offset=${offset}`);
  videos.push(...rows);
  if (rows.length < 1000) break;
}
const clips = await supa("video_clip_library?select=id,cloudinary_public_id,status&limit=1000");

const referenced = new Map();
let withoutCloudinaryRef = 0;
for (const v of videos) {
  const m = v.metadata ?? {};
  const urls = [m.videoUrl, m.generatedVideoUrl].filter((x) => typeof x === "string");
  const found = urls.map(publicIdFromUrl).filter(Boolean);
  if (!found.length) { withoutCloudinaryRef++; continue; }
  for (const id of found) referenced.set(id, [...(referenced.get(id) ?? []), v.slug]);
}
for (const c of clips) referenced.set(c.cloudinary_public_id, [...(referenced.get(c.cloudinary_public_id) ?? []), "clip-library:" + c.status]);

const missing = [...referenced.keys()].filter((id) => !ids.has(id));
const unreferenced = complete ? [...ids.keys()].filter((id) => !referenced.has(id)) : [];
const unrefBytes = unreferenced.reduce((s, id) => s + (ids.get(id) ?? 0), 0);

const lines = [
  "## Cloudinary catalog reconciliation (read-only)",
  "",
  `- Cloudinary video assets listed: ${ids.size}${complete ? "" : " (INCOMPLETE: page limit reached, orphan count skipped)"}`,
  `- Catalog videos: ${videos.length} (published ${videos.filter((v) => v.published).length}); without a Cloudinary video reference: ${withoutCloudinaryRef}`,
  `- Distinct Cloudinary references in catalog and clip library: ${referenced.size}`,
  `- Referenced but missing in Cloudinary: ${missing.length}`,
  `- In Cloudinary but not referenced: ${complete ? unreferenced.length : "unknown"} (about ${(unrefBytes / 1048576).toFixed(1)} MiB)`,
  "",
  "Nothing was deleted or changed. First 25 missing references (slug or clip):",
  ...missing.slice(0, 25).map((id) => `- ${id} <- ${referenced.get(id).slice(0, 2).join(", ")}`),
  "",
  "First 25 unreferenced asset ids:",
  ...unreferenced.slice(0, 25).map((id) => `- ${id}`),
];
const out = lines.join("\n");
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + "\n");
