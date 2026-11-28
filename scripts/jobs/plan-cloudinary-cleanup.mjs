// DRY-RUN ONLY. Lists which generated Cloudinary videos could be freed after confirmed YouTube publication.
// It reads Cloudinary and Supabase with GET only. It never deletes or writes anything.
import { appendFileSync, writeFileSync } from "node:fs";
import { buildPlan } from "../lib/cloudinary-cleanup-plan.mjs";

const { minAgeDays, assets, complete, candidates, kept, unreferenced, groups } = await buildPlan(process.env.MIN_AGE_DAYS);
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
