import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSourceAgentRunStatus, getSourceParserSkipReason, parseSourceItems } from "../../supabase/functions/source-verified-content-agent/parse-items";

const catalogResult = parseSourceItems(
  { parser_key: "alquran_cloud" },
  { data: { surahs: [{ number: 1, name: "Al-Fatiha" }] } },
  "2026-11-14T00:00:00.000Z",
);
assert.deepEqual(
  catalogResult,
  { kind: "skipped", reason: "catalog_only_source" },
  "the Quran chapter catalog must be reported as intentionally skipped rather than a successful zero-item ingest",
);

assert.equal(getSourceParserSkipReason({ parser_key: "alquran_cloud" }), "catalog_only_source");
assert.equal(getSourceParserSkipReason({ parser_key: "quran_foundation_v4" }), "parser_not_implemented");

assert.equal(getSourceAgentRunStatus({ queued: 0, skipped: 0, failed: 0 }), "succeeded", "a due-source-free no-op remains successful");
assert.equal(getSourceAgentRunStatus({ queued: 0, skipped: 1, failed: 0 }), "partial", "an all-skipped run must not be reported as a full success");
assert.equal(getSourceAgentRunStatus({ queued: 2, skipped: 1, failed: 0 }), "partial", "a run that ingests some sources and skips others is partial");
assert.equal(getSourceAgentRunStatus({ queued: 0, skipped: 0, failed: 1 }), "failed", "a run with failures and no queued content is failed");
assert.equal(getSourceAgentRunStatus({ queued: 1, skipped: 0, failed: 1 }), "partial", "a run with both successful and failed sources is partial");

const unsupportedResult = parseSourceItems(
  { parser_key: "quran_foundation_v4" },
  { data: [{ id: "chapter-1" }] },
  "2026-11-14T00:00:00.000Z",
);
assert.deepEqual(
  unsupportedResult,
  { kind: "skipped", reason: "parser_not_implemented" },
  "an unimplemented provider parser must be visible as a skipped source",
);

const agentSource = readFileSync("supabase/functions/source-verified-content-agent/index.ts", "utf8");
const parserPreflightIndex = agentSource.indexOf("getSourceParserSkipReason(source)");
const externalFetchIndex = agentSource.indexOf("await fetch(source.fetch_url");
assert.ok(parserPreflightIndex >= 0 && parserPreflightIndex < externalFetchIndex, "unsupported/catalog-only providers must be skipped before any network request");
assert.match(agentSource, /redirect:\s*"error"/, "provider fetches must not follow unreviewed redirects");
assert.match(agentSource, /signal:\s*AbortSignal\.timeout\(10_000\)/, "provider fetches must have a bounded timeout");
assert.match(agentSource, /getSourceAgentRunStatus\\(summary\\)/, "skipped sources must affect the persisted run status");
assert.match(agentSource, /ok:\\s*summary\\.failed === 0 && summary\\.skipped === 0/, "skipped sources must not produce a successful top-level response");

console.log("Source-agent parser outcome and fetch-safety contract passed.");
