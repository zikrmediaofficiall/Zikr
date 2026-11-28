// MANUAL DELETE. Runs only from the manual workflow, with exact asset ids and a typed confirmation.
// Every id is re-validated against the same read-only plan at run time; if any id is not eligible, nothing is deleted.
// Eligible: (a) a current dry-run candidate (confirmed YouTube publication, old enough, general audience), or
// (b) an unreferenced Cloudinary demo asset under "samples/". Never audio, kids/series masters, clip library or queued items.
import { appendFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { buildPlan } from "../lib/cloudinary-cleanup-plan.mjs";

const ids = [...new Set((process.env.ASSET_IDS ?? "").split(/[\s,]+/).filter(Boolean))];
const confirm = (process.env.CONFIRM ?? "").trim();
if (ids.length === 0 || ids.length > 100) throw new Error("Provide between 1 and 100 asset ids.");
if (confirm !== `DELETE ${ids.length} ASSETS`) throw new Error(`Confirmation must be exactly: DELETE ${ids.length} ASSETS`);
if (!ids.every((id) => /^[A-Za-z0-9][A-Za-z0-9_\/.-]{0,200}$/.test(id) && !id.includes(".."))) throw new Error("Invalid asset id format.");

const key = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
const supaUrl = process.env.SUPABASE_URL.replace(/\/$/, ""), service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const plan = await buildPlan(process.env.MIN_AGE_DAYS);
if (!plan.complete) throw new Error("Cloudinary listing incomplete; refusing to delete.");
const candidateById = new Map(plan.candidates.map((c) => [c.assetId, c]));
const sampleSet = new Set(plan.unreferenced.filter((id) => id.startsWith("samples/")));
const refused = ids.filter((id) => !candidateById.has(id) && !sampleSet.has(id));
const log = [];
const say = (l) => { console.log(l); log.push(l); };
if (refused.length) {
  say(`ABORT: ${refused.length} id(s) are not currently eligible; nothing was deleted:`);
  refused.forEach((id) => say(`- ${id}`));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, log.join("\n") + "\n");
  process.exit(1);
}

async function supa(path, init = {}) {
  const r = await fetch(supaUrl + "/rest/v1/" + path, { ...init, headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json", Prefer: "return=minimal", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("Supabase request failed: " + r.status);
  return r;
}
async function destroy(publicId) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash("sha1").update(`invalidate=true&public_id=${publicId}&timestamp=${timestamp}${secret}`).digest("hex");
  const r = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(plan.cloud)}/video/destroy`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ public_id: publicId, timestamp, invalidate: "true", api_key: key, signature }), signal: AbortSignal.timeout(20000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.result !== "ok") throw new Error("Cloudinary destroy failed for " + publicId + ": " + (j.result ?? r.status));
}

let freed = 0, done = 0;
say(`Deleting ${ids.length} validated asset(s). Started ${new Date().toISOString()}`);
for (const id of ids) {
  const bytes = plan.assets.get(id) ?? 0;
  const cand = candidateById.get(id);
  if (cand) {
    // Switch the catalog rows to the confirmed YouTube fallback BEFORE the file goes, so no page points at a dead URL.
    for (const v of plan.byAsset.get(id) ?? []) {
      const rows = await (await supa(`videos?select=id,metadata,thumbnail_url&id=eq.${encodeURIComponent(v.id)}`, { headers: { Prefer: "" } })).json();
      const row = rows[0]; if (!row) throw new Error("catalog row vanished for " + id);
      const m = row.metadata ?? {};
      const yt = cand.youtubeId;
      const thumb = typeof row.thumbnail_url === "string" && row.thumbnail_url.includes("res.cloudinary.com") ? `https://i.ytimg.com/vi/${encodeURIComponent(yt)}/hqdefault.jpg` : row.thumbnail_url;
      await supa(`videos?id=eq.${encodeURIComponent(v.id)}`, { method: "PATCH", body: JSON.stringify({ thumbnail_url: thumb, metadata: { ...m, generatedVideoUrl: null, videoUrl: null, video_url: null, sourceVideoUrl: null, youtubePublishedVideoId: yt, youtubePublishedUrl: `https://www.youtube.com/watch?v=${yt}`, mediaFallbackAvailable: true, mediaState: "purged", mediaPurgedFromPublished: true, mediaPurgedAt: new Date().toISOString() } }) });
    }
  }
  await destroy(id);
  done++; freed += bytes;
  say(`- deleted ${id} | ${(bytes / 1048576).toFixed(1)} MiB | ${cand ? "generated video, YouTube " + cand.youtubeId + ", site rows: " + cand.videos.join(",") : "unreferenced demo sample"}`);
}
say(`Done: ${done} deleted, about ${(freed / 1048576).toFixed(1)} MiB freed. Finished ${new Date().toISOString()}`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, "## Cloudinary delete (manual)\n" + log.join("\n") + "\n");
