import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { captionSiteLine, displayHost, growthOverlayCta, videoCtaVariant } from "../../src/features/videos/services/video-cta";

const site = "https://zikrmediaofficial.vercel.app";
assert.equal(displayHost(site), "zikrmediaofficial.vercel.app");
assert.equal(displayHost("http://insecure.test"), null, "https only");
assert.equal(displayHost("nonsense"), null);
assert.equal(displayHost(undefined), null);

for (let i = 0; i < 50; i += 1) {
  assert.equal(growthOverlayCta({ seed: `v${i}`, audience: "kids", siteUrl: site }), null, "kids never get an external CTA");
}
const seen = new Set<number>();
for (let i = 0; i < 200; i += 1) seen.add(videoCtaVariant(`video-${i}`, site));
assert.deepEqual([...seen].sort(), [0, 1, 2], "all three CTA variants are used");
assert.equal(videoCtaVariant("x", null), 0, "no valid https site means the classic CTA");
assert.equal(growthOverlayCta({ seed: "x", audience: "general", siteUrl: "http://x.test" }), null);
const texts = new Set<string>();
for (let i = 0; i < 200; i += 1) {
  const cta = growthOverlayCta({ seed: `v${i}`, audience: "general", siteUrl: site });
  if (cta) { texts.add(cta); assert.ok(cta.includes("zikrmediaofficial.vercel.app")); assert.ok(cta.length < 60, "CTA fits one caption line"); }
}
assert.equal(texts.size, 2);
assert.equal(growthOverlayCta({ seed: "same", audience: "general", siteUrl: site }), growthOverlayCta({ seed: "same", audience: "general", siteUrl: site }), "deterministic per video");

assert.equal(captionSiteLine({ audienceResolution: { ok: true, audience: "kids" }, siteUrl: site }), null);
assert.equal(captionSiteLine({ audienceResolution: { ok: false }, siteUrl: site }), null, "unknown audience fails closed");
assert.ok(captionSiteLine({ audienceResolution: { ok: true, audience: "general" }, siteUrl: site })?.includes("https://zikrmediaofficial.vercel.app"));

const job = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
assert.ok(job.includes("growthOverlayCta("), "overlay must use the CTA module");
assert.ok(job.indexOf('audience === "kids") return') < job.indexOf("growthOverlayCta({"), "kids branch returns before any growth CTA");
console.log("Video growth CTA contracts passed.");
