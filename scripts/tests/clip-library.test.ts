import assert from "node:assert/strict";
import { ClipLibraryVideoProvider } from "../../src/features/videos/providers/clip-library-provider";
import { pickClip, validateClipRow, type ClipLibraryRow, type ClipLibraryStore } from "../../src/features/videos/providers/clip-library";
import { createVideoProviderRouter } from "../../src/features/videos/providers/provider-router";
import { getVideoEngineConfig, type VideoGenerationInput } from "../../src/features/videos/providers/types";

const base: ClipLibraryRow = {
  id: "a", title: "Moon", category: "dua", audience: "general", video_url: "https://res.example.test/a.mp4",
  width: 720, height: 1280, duration_seconds: 8, audio_muted: true, source_kind: "flow_manual",
  rights_license: "Flow terms", rights_evidence: "flow-export-1", rights_reviewer: "owner", rights_reviewed_at: "2026-11-28T00:00:00Z",
  status: "approved", times_used: 0, created_at: "2026-11-28T00:00:00Z",
};
const input: VideoGenerationInput = { requestId: "r1", title: "t", description: "d", category: "dua", text: "x", format: "vertical", language: "ar" };

assert.equal(validateClipRow(base).ok, true);
assert.equal(validateClipRow({ ...base, status: "pending" }).ok, false);
assert.equal(validateClipRow({ ...base, audio_muted: false }).ok, false, "unmuted clips are rejected");
assert.equal(validateClipRow({ ...base, width: 640, height: 360 }).ok, false, "below 720p is rejected");
assert.equal(validateClipRow({ ...base, video_url: "http://x.test/a.mp4" }).ok, false);
assert.equal(validateClipRow({ ...base, rights_evidence: " " }).ok, false, "undocumented clips are rejected");

assert.equal(pickClip([], input), null);
assert.equal(pickClip([{ ...base, audience: "kids" }], input), null, "audience must match");
assert.equal(pickClip([{ ...base, category: "story" }], input), null, "category must match");
assert.equal(pickClip([{ ...base, width: 1280, height: 720 }], input), null, "orientation must match");
assert.equal(pickClip([{ ...base, id: "b", times_used: 3 }, { ...base, id: "c", times_used: 1 }], input)?.id, "c", "least used wins");
assert.equal(pickClip([{ ...base, id: "g", category: "general" }, { ...base, id: "d", times_used: 5 }], input)?.id, "d", "exact category beats general");
assert.equal(pickClip([{ ...base, id: "g", category: "general" }], input)?.id, "g");
assert.equal(pickClip([{ ...base, id: "k", category: "kids", audience: "kids" }], { ...input, audience: "kids", category: "story" })?.id, "k");

assert.equal(getVideoEngineConfig({} as NodeJS.ProcessEnv).clipLibraryEnabled, false, "clip library is off by default");
assert.equal(getVideoEngineConfig({ CLIP_LIBRARY_ENABLED: "true" } as unknown as NodeJS.ProcessEnv).clipLibraryEnabled, true);

(async () => {
  const used: string[] = [];
  const store: ClipLibraryStore = { listApproved: async () => [base], markUsed: async (id) => { used.push(id); } };
  assert.equal(await new ClipLibraryVideoProvider(store, false).isAvailable(), false);
  assert.equal(await new ClipLibraryVideoProvider(null, true).isAvailable(), false);
  const provider = new ClipLibraryVideoProvider(store, true);
  assert.equal(await provider.isAvailable(), true);
  const ok = await provider.generate(input);
  assert.equal(ok.ok, true);
  assert.equal(ok.audioPresent, false);
  assert.equal(ok.provider, "clip_library");
  assert.deepEqual(used, ["a"]);

  // Router: disabled by default, so the template renderer wins; enabled and ordered, the clip wins.
  const template = async () => ({ ok: true, provider: "template" as const, localPath: "/tmp/t.mp4" });
  const off = await createVideoProviderRouter(template, { VIDEO_PROVIDER_ORDER: "clip_library" } as unknown as NodeJS.ProcessEnv, { clipStore: store }).generate(input);
  assert.equal(off.provider, "template", "default off");
  const on = await createVideoProviderRouter(template, { VIDEO_PROVIDER_ORDER: "clip_library", CLIP_LIBRARY_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, { clipStore: store }).generate(input);
  assert.equal(on.provider, "clip_library");
  const noMatch = await createVideoProviderRouter(template, { VIDEO_PROVIDER_ORDER: "clip_library", CLIP_LIBRARY_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, { clipStore: { listApproved: async () => [], markUsed: async () => {} } }).generate(input);
  assert.equal(noMatch.provider, "template", "falls back to the template renderer when no clip matches");
  console.log("Clip library contract passed: rights, muted, 720p, https, balanced pick, off by default, router fallback.");
})();
