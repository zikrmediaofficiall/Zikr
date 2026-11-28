// Read-only plan builder (GET requests only). Shared by the dry run and by the delete workflow, which re-validates with it.
import { evaluateVideo, publicIdFromUrl } from "./cloudinary-cleanup-rules.mjs";

export async function buildPlan(minAgeDaysInput) {
const need = (k) => { const v = (process.env[k] ?? "").trim(); if (!v) throw new Error("Missing " + k); return v; };
const cloud = need("CLOUDINARY_CLOUD_NAME"), key = need("CLOUDINARY_API_KEY"), secret = need("CLOUDINARY_API_SECRET");
const supaUrl = need("SUPABASE_URL").replace(/\/$/, ""), service = need("SUPABASE_SERVICE_ROLE_KEY");
const minAgeDays = Math.max(1, Number.parseInt(String(minAgeDaysInput ?? "14"), 10) || 14);
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
const videos = await all("videos?select=id,slug,published,youtube_id,metadata&order=id");
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
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return "invalid"; } };
const noCloudinary = new Map();
for (const v of videos) {
  if ([...idsOf(v)].length) continue;
  const m = v.metadata ?? {};
  const urls = [m.videoUrl, m.generatedVideoUrl, m.video_url, m.sourceVideoUrl].filter((x) => typeof x === "string" && x);
  const hosts = [...new Set(urls.map(hostOf))].map((h) => h.endsWith(".supabase.co") ? "supabase-storage" : h);
  const where = hosts.length ? "file url on " + hosts.join("+") : (typeof m.youtubePublishedVideoId === "string" && m.youtubePublishedVideoId) || v.youtube_id ? "YouTube only (id, no file url)" : "no media reference";
  const key = `${where} | ${m.generator === "zikr_internal_video_factory" ? "internal" : "imported/other"} | ${v.published ? "published" : "unpublished"}`;
  const e = noCloudinary.get(key) ?? { n: 0, ex: [] }; e.n++; if (e.ex.length < 2) e.ex.push(v.slug); noCloudinary.set(key, e);
}
const referenced = new Set(byAsset.keys());
const unreferenced = complete ? [...assets.keys()].filter((id) => !referenced.has(id) && !clipIds.has(id)) : [];
const groupOf = (id) => id.startsWith("zikr/") ? id.split("/").slice(0, 3).join("/") : id.replace(/-\d.*$/, "-*");
const groups = new Map();
for (const id of unreferenced) { const g = groupOf(id); const e = groups.get(g) ?? { n: 0, bytes: 0, ex: [] }; e.n++; e.bytes += assets.get(id) ?? 0; if (e.ex.length < 3) e.ex.push(id); groups.set(g, e); }
return { cloud, minAgeDays, assets, complete, videos, byAsset, candidates, kept, unreferenced, groups, noCloudinary };
}
