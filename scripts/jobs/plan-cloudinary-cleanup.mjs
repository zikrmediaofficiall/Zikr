// DRY-RUN ONLY. Lists which generated Cloudinary videos could be freed after confirmed YouTube publication.
// It reads Cloudinary and Supabase with GET only. It never deletes or writes anything.
import { appendFileSync, writeFileSync } from "node:fs";
import { evaluateVideo, publicIdFromUrl } from "../lib/cloudinary-cleanup-rules.mjs";

const need = (k) => { const v = (process.env[k] ?? "").trim(); if (!v) throw new Error("Missing " + k); return v; };
const cloud = need("CLOUDINARY_CLOUD_NAME"), key = need("CLOUDINARY_API_KEY"), secret = need("CLOUDINARY_API_SECRET");
const supaUrl = need("SUPABASE_URL").replace(/\/$/, ""), service = need("SUPABASE_SERVICE_ROLE_KEY");
const minAgeDays = Math.max(1, Number.parseInt(process.env.MIN_AGE_DAYS ?? "14", 10) || 14);
const auth = "Basic " + Buffer.from(key + ":" + secret).toString("base64");

async function listCloudinary() {
  const assets = new Map();
  let cursor = "";
  for (let page = 0; page < 40; page++) {
    const u = new URL(`https://api.cloudinary.com/v1_1/${cloud}/resources/video`);
    u.searchParams.set("max_results", "500"); u.searchParams.set("type", "upload");
    if (cursor) u.searchParams.set("next_cursor", cursor);
    const r = await fetch(u, { headers: { Authorization: auth }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error("Cloudinary list failed: " + r.status);
    const j = await r.json();
    for (const it of j.resources ?? []) assets.set(it.public_id, it.bytes ?? 0);
    cursor = j.next_cursor ?? "";
    if (!cursor) return { assets, complete: true };
  }
  return { assets, complete: false };
}
async function supa(path) {
  const r = await fetch(supaUrl + "/rest/v1/" + path, { headers: { apikey: service, Authorization: "Bearer " + service }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("Supabase read failed: " + path.split("?")[0] + " " + r.status);
  return r.json();
}
async function all(path) {
  const rows = [];
  for (let o = 0; ; o += 1000) { const p = await supa(`${path}&limit=1000&offset=${o}`); rows.push(...p); if (p.length < 1000) break; }
  return rows;
}

const { assets, complete } = await listCloudinary();
const videos = await all("videos?select=id,slug,published,metadata&order=id");
const queue = await all("social_publish_queue?select=id,content_id,status,published_at,video_url,metadata&order=id");
const clips = await supa("video_clip_library?select=cloudinary_public_id&limit=1000");
const clipIds = new Set(clips.map((c) => c.cloudinary_public_id));

const idsOf = (v) => [v.metadata?.videoUrl, v.metadata?.generatedVideoUrl, v.metadata?.video_url, v.metadata?.sourceVideoUrl]
  .filter((x) => typeof x === "string").map((x) => publicIdFromUrl(x, cloud)).filter(Boolean);
const byAsset = new Map();
for (const v of videos) for (const id of new Set(idsOf(v))) byAsset.set(id, [...(byAsset.get(id) ?? []), v]);

const queueFor = (v, assetId) => queue.filter((q) => q.content_id === v.id || (q.video_url && publicIdFromUrl(q.video_url, cloud) === assetId));
const now = Date.now();
const candidates = [], kept = new Map();
const keep = (reason, id) => { kept.set(reason, [...(kept.get(reason) ?? []), id]); };
for (const [id, vids] of byAsset) {
  if (!assets.has(id)) { keep("referenced but missing in Cloudinary", id); continue; }
  if (clipIds.has(id)) { keep("in the clip library", id); continue; }
  const evals = vids.map((v) => ({ v, e: evaluateVideo(v, queueFor(v, id), { minAgeDays, now }) }));
  const bad = evals.find((x) => !x.e.ok);
  if (bad) { keep(bad.e.reasons[0], id); continue; }
  candidates.push({ assetId: id, bytes: assets.get(id) ?? 0, videos: vids.map((v) => v.slug), youtubeId: evals[0].e.youtubeId, facebookConfirmed: evals.some((x) => x.e.facebookConfirmed) });
}
const referenced = new Set(byAsset.keys());
const unreferenced = complete ? [...assets.keys()].filter((id) => !referenced.has(id) && !clipIds.has(id)) : [];
const groupOf = (id) => id.startsWith("zikr/") ? id.split("/").slice(0, 3).join("/") : id.replace(/-\d.*$/, "-*");
const groups = new Map();
for (const id of unreferenced) { const g = groupOf(id); const e = groups.get(g) ?? { n: 0, bytes: 0, ex: [] }; e.n++; e.bytes += assets.get(id) ?? 0; if (e.ex.length < 3) e.ex.push(id); groups.set(g, e); }
const mb = (b) => (b / 1048576).toFixed(1);
const totalBytes = candidates.reduce((s, c) => s + c.bytes, 0);
const allBytes = [...assets.values()].reduce((s, b) => s + b, 0);
candidates.sort((a, b) => b.bytes - a.bytes);

const lines = [
  "## Cloudinary cleanup DRY-RUN (nothing deleted, nothing written)",
  "",
  `- Minimum age since last publication: ${minAgeDays} days`,
  `- Cloudinary video-type assets: ${assets.size}${complete ? "" : " (INCOMPLETE listing, no cleanup numbers trusted)"}, total ${mb(allBytes)} MiB`,
  `- Candidates (confirmed YouTube remote id, published on site, general audience, old enough, not in clip library): ${candidates.length}, would free about ${mb(totalBytes)} MiB`,
  `- Candidates also confirmed on Facebook: ${candidates.filter((c) => c.facebookConfirmed).length}`,
  `- After deletion the site would play these from the YouTube embed (confirmed id) and use the YouTube thumbnail.`,
  "",
  "### Kept, by first reason",
  ...[...kept.entries()].sort((a, b) => b[1].length - a[1].length).map(([r, ids]) => `- ${r}: ${ids.length}`),
  `- unreferenced by catalog or clip library (never auto-candidates; includes site audio files): ${unreferenced.length}`,
  "",
  "### Unreferenced assets by folder or prefix (count | MiB | examples)",
  ...[...groups.entries()].sort((a, b) => b[1].bytes - a[1].bytes).map(([g, e]) => `- ${g}: ${e.n} | ${mb(e.bytes)} MiB | ${e.ex.join(", ")}`),
  "",
  "### Candidate asset ids (per-asset reason: confirmed YouTube id shown)",
  ...candidates.map((c) => `- ${c.assetId} | ${mb(c.bytes)} MiB | yt ${c.youtubeId} | fb ${c.facebookConfirmed ? "yes" : "no"} | ${c.videos.join(",")}`),
];
const out = lines.join("\n");
console.log(out);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out + "\n");
writeFileSync("cleanup-dry-run.json", JSON.stringify({ minAgeDays, complete, candidates, keptCounts: Object.fromEntries([...kept].map(([k, v]) => [k, v.length])) }, null, 2));
