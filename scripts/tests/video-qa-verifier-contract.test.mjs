import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const verifier = read("scripts/verify-video-qa.mjs");
const videoService = read("src/features/videos/services/videos.ts");
const audiencePolicy = read("supabase/migrations/20261114210000_restrict_public_kids_video_read_to_qa_passed.sql");

const generalVideoContract = [
  'from "./video-audience-visibility"',
  "metadata->>audience.eq.general",
  "isGeneralAudienceVideoMetadata(row.metadata)",
  "renderableRows.slice(0, safeLimit)",
];
for (const token of generalVideoContract) {
  assert.ok(videoService.includes(token), \`video service must retain \${token}\`);
  assert.ok(verifier.includes(token), \`Video QA verifier must validate \${token}\`);
}

const kidsVideoContract = [
  "metadata->>audience=eq.kids",
  "metadata->>generator=eq.zikr_internal_video_factory",
  "metadata->>kidsVideoQaStatus=eq.passed",
  "metadata->automatedVideoQa->>status=eq.passed",
  "hasPassedKidsVideoQa(metadata)",
];
for (const token of kidsVideoContract) {
  assert.ok(videoService.includes(token), \`Kids video service must retain \${token}\`);
  assert.ok(verifier.includes(token), \`Video QA verifier must validate \${token}\`);
}

const failClosedRlsContract = [
  "metadata IS NULL",
  "jsonb_typeof(metadata) = 'object'",
  "metadata->>'audience' IS NULL",
  "metadata->>'audience' = 'general'",
  "metadata->>'audience' = 'kids'",
  "metadata->>'generator' = 'zikr_internal_video_factory'",
  "metadata->>'kidsVideoQaStatus' = 'passed'",
  "metadata->'automatedVideoQa'->>'status' = 'passed'",
];
for (const token of failClosedRlsContract) {
  assert.ok(audiencePolicy.includes(token), \`Kids video RLS migration must retain \${token}\`);
  assert.ok(verifier.includes(token), \`Video QA verifier must validate \${token}\`);
}
assert.doesNotMatch(
  audiencePolicy,
  /metadata->>'audience'\s*(?:<>|!=)\s*'kids'/i,
  "unknown audience labels must not be implicitly treated as general-audience videos",
);
assert.doesNotMatch(
  verifier,
  /lower\\(btrim\\(coalesce\\(metadata->>'audience'/,
  "the static verifier must not require the retired permissive audience predicate",
);

console.log("Video QA verifier and public Kids audience contracts are aligned.");
