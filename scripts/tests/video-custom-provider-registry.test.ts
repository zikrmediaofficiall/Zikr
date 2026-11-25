import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getVideoEngineConfig, isVideoAiPlanningEnabled, parseCustomVideoSpaces } from "../../src/features/videos/providers/types";

const providerSource = readFileSync("src/features/videos/providers/hf-space-provider.ts", "utf8");
const pythonSource = readFileSync("scripts/jobs/hf-space-video.py", "utf8");
const visualsPageSource = readFileSync("src/app/admin/video/visuals/page.tsx", "utf8");
const environmentExample = readFileSync(".env.example", "utf8");
assert.match(environmentExample, /^VIDEO_AUTOMATION_DRY_RUN=false$/m, "production example config must not leave video generation in dry-run mode");
assert.match(environmentExample, /^AUTO_VIDEO_PUBLISH_ENABLED=true$/m, "production example config must enable automated publishing");
assert.match(environmentExample, /^AUTO_VIDEO_PUBLISH_REQUIRES_APPROVAL=false$/m, "automated QA must be the approval gate, not a routine human hold");


const entries = parseCustomVideoSpaces(JSON.stringify([
  { space: "example/wan-free", variant: "wan2_2_fast", enabled: true },
  { space: "example/ltx-free", variant: "ltx_fast", enabled: true },
  { space: "not valid", variant: "wan2_2_fast", enabled: true },
  { space: "example/disabled", variant: "ltx_fast", enabled: false },
  { space: "example/unknown", variant: "other", enabled: true },
]));
assert.equal(entries.length, 2);
assert.equal(entries[0].name, "hf_custom_1");
assert.equal(entries[1].variant, "ltx_fast");
assert.equal(parseCustomVideoSpaces("not-json").length, 0);
assert.equal(parseCustomVideoSpaces(JSON.stringify(Array.from({ length: 8 }, (_, index) => ({
  space: "owner/space-" + index,
  variant: "wan2_2_fast",
  enabled: true,
})))).length, 5);

const config = getVideoEngineConfig({ ...process.env,
  VIDEO_FREE_ONLY: "true",
  HF_VIDEO_CUSTOM_SPACES: JSON.stringify([{ space: "example/wan-free", variant: "wan2_2_fast", enabled: true }]),
});
assert.ok(config.order.includes("hf_custom_1"));
assert.deepEqual(config.customSpaces.map((entry) => entry.name), ["hf_custom_1"]);
const disabledAiConfig = getVideoEngineConfig({
  NODE_ENV: process.env.NODE_ENV ?? "test",
  VIDEO_AI_ENABLED: "false",
  HF_VIDEO_CUSTOM_SPACES: JSON.stringify([{ space: "example/wan-free", variant: "wan2_2_fast", enabled: true }]),
});
assert.equal(disabledAiConfig.aiEnabled, false);
assert.equal(disabledAiConfig.customSpaces.length, 1);

const scheduledFreeProviderConfig = getVideoEngineConfig({
  NODE_ENV: "test",
  VIDEO_FREE_ONLY: "true",
  VIDEO_AI_ENABLED: "true",
  HF_WAN_VIDEO_ENABLED: "true",
  HF_LTX_FAST_VIDEO_ENABLED: "true",
  VIDEO_PROVIDER_ORDER: "hf_ltx_fast,hf_wan,template",
});
assert.equal(scheduledFreeProviderConfig.freeOnly, true);
assert.equal(scheduledFreeProviderConfig.hfLtxFastEnabled, true);
assert.equal(scheduledFreeProviderConfig.hfWanEnabled, true);
assert.ok(scheduledFreeProviderConfig.order.includes("hf_ltx_fast"));
assert.ok(scheduledFreeProviderConfig.order.includes("hf_wan"));
assert.ok(scheduledFreeProviderConfig.order.includes("template"));
assert.equal(
  isVideoAiPlanningEnabled({
    NODE_ENV: "test",
    VIDEO_FREE_ONLY: "true",
    VIDEO_AI_ENABLED: "true",
    GEMINI_API_KEY: "test-key",
  }),
  false,
  "free-only video generation must not make Gemini planning requests even when a key exists",
);
assert.ok(
  visualsPageSource.includes("...(config.aiEnabled ? config.customSpaces.map((entry) => entry.name) : [])"),
  "Admin visuals must not label custom providers enabled while the global AI switch is off",
);
const automaticPublishingDefaults = getVideoEngineConfig({
  NODE_ENV: "test",
  VIDEO_AUTOMATION_DRY_RUN: "false",
});
assert.equal(automaticPublishingDefaults.dryRun, false);
assert.equal(automaticPublishingDefaults.autoPublishEnabled, true);
assert.equal(automaticPublishingDefaults.requiresApproval, false);
const explicitHold = getVideoEngineConfig({
  NODE_ENV: "test",
  AUTO_VIDEO_PUBLISH_ENABLED: "false",
  AUTO_VIDEO_PUBLISH_REQUIRES_APPROVAL: "true",
});
assert.equal(explicitHold.autoPublishEnabled, false);
assert.equal(explicitHold.requiresApproval, true);
const missingConfig = getVideoEngineConfig({ ...process.env, ...process.env, VIDEO_FREE_ONLY: "true", VIDEO_PROVIDER_ORDER: "hf_custom_2,hf_wan" });
assert.ok(!missingConfig.order.includes("hf_custom_2"));
console.log("Custom Hugging Face provider registry tests passed.");

assert.ok(providerSource.includes('args.push("--public-space")'));
assert.ok(providerSource.includes('childEnv.HF_TOKEN = ""'));
assert.ok(providerSource.includes('childEnv.HF_HUB_DISABLE_IMPLICIT_TOKEN = "1"'));
assert.ok(providerSource.includes("space !== DEFAULT_SPACES[this.variant]"));
assert.ok(providerSource.includes("delete childEnv.HF_TOKEN_PATH"));
assert.ok(!providerSource.includes('args.push("--hf-token"'));
assert.ok(pythonSource.includes("download_files=False"));
assert.ok(pythonSource.includes("is_allowed_space_file_url"));
assert.ok(pythonSource.includes("SameOriginRedirectHandler"));
assert.ok(pythonSource.includes("resolve_file_url"));
assert.ok(pythonSource.includes("BUILTIN_SPACE_IDS"));
assert.ok(pythonSource.includes("should_use_public_space(args.space, args.public_space)"));
assert.ok(pythonSource.includes("utils.encode_file_path"));
assert.ok(pythonSource.includes("MAX_VIDEO_BYTES"));
assert.ok(pythonSource.includes('header[4:8] != b"ftyp"'));
assert.ok(!pythonSource.includes("shutil.copyfile("));
assert.ok(!pythonSource.includes("urlopen(source"));
