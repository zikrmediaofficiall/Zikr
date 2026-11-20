import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getSourceAgentRunStatus, getSourceParserSkipReason, parseSourceItems } from "../../supabase/functions/source-verified-content-agent/parse-items";
import { authorizeSchedulerBearer, parseStrictBearerToken } from "../../supabase/functions/_shared/scheduler-auth";

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
assert.match(agentSource, /getSourceAgentRunStatus\(summary\)/, "skipped sources must affect the persisted run status");
assert.match(agentSource, /ok:\s*summary\.failed === 0 && summary\.skipped === 0/, "skipped sources must not produce a successful top-level response");

const schedulerSecret = "0123456789abcdef0123456789abcdef";
assert.equal(parseStrictBearerToken(`Bearer ${schedulerSecret}`), schedulerSecret);
assert.equal(parseStrictBearerToken(`bearer ${schedulerSecret}`), schedulerSecret);
for (const malformed of [
  null,
  "",
  schedulerSecret,
  "Basic " + schedulerSecret,
  "Bearer",
  "Bearer ",
  `Bearer ${schedulerSecret} extra`,
  `Bearer ${"a".repeat(257)}`,
]) {
  assert.equal(parseStrictBearerToken(malformed), null, "malformed or oversized scheduler credentials must be rejected before secret lookup");
}

let schedulerSecretReads = 0;
for (const malformed of [
  null,
  "",
  schedulerSecret,
  "Basic " + schedulerSecret,
  "Bearer",
  "Bearer ",
  `Bearer ${schedulerSecret} extra`,
  `Bearer ${"a".repeat(257)}`,
]) {
  assert.equal(
    await authorizeSchedulerBearer(malformed, async () => {
      schedulerSecretReads += 1;
      return schedulerSecret;
    }),
    false,
    "invalid Authorization syntax must be denied",
  );
}
assert.equal(schedulerSecretReads, 0, "invalid Authorization syntax must not invoke the service-role secret RPC");
assert.equal(
  await authorizeSchedulerBearer(`Bearer ${schedulerSecret}`, async () => {
    schedulerSecretReads += 1;
    return schedulerSecret;
  }),
  true,
  "the canonical pg_cron Bearer credential must remain accepted",
);
assert.equal(schedulerSecretReads, 1);
assert.equal(
  await authorizeSchedulerBearer(`Bearer ${schedulerSecret}`, async () => null),
  false,
  "missing database secret must fail closed",
);

const authBlockStart = agentSource.indexOf("async function isAuthorized");
const authBlockEnd = agentSource.indexOf("\nasync function processSource", authBlockStart);
const authBlock = authBlockStart >= 0 && authBlockEnd > authBlockStart
  ? agentSource.slice(authBlockStart, authBlockEnd)
  : "";
assert.ok(authBlock.includes("authorizeSchedulerBearer"), "the active source-agent entrypoint must use strict scheduler authorization");
assert.ok(authBlock.indexOf("authorizeSchedulerBearer") < authBlock.indexOf('supabase.rpc("get_push_scheduler_secret")'),
  "the strict Bearer preflight must run before the service-role secret RPC");

console.log("Source-agent parser outcome, fetch safety, and strict scheduler-auth preflight passed.");

const prayerWorkerSource = readFileSync("supabase/functions/prayer-notification-worker/index.ts", "utf8");
const prayerWorkerAuthStart = prayerWorkerSource.indexOf("const authorized = await authorizeSchedulerBearer");
const prayerWorkerSecretRead = prayerWorkerSource.indexOf('supabase.rpc("get_push_scheduler_secret")', prayerWorkerAuthStart);
const prayerWorkerWorkStart = prayerWorkerSource.indexOf("const now = new Date()", prayerWorkerAuthStart);
assert.ok(prayerWorkerAuthStart >= 0, "the prayer notification worker must use the shared strict scheduler authorization helper");
assert.ok(prayerWorkerAuthStart < prayerWorkerSecretRead && prayerWorkerSecretRead < prayerWorkerWorkStart,
  "the worker must parse the strict Bearer header before reading the secret and before scheduling or delivering notifications");
assert.doesNotMatch(prayerWorkerSource, /function constantTimeEqual/,
  "the worker must not retain a second, permissive scheduler-auth implementation");
