import assert from "node:assert/strict";
import { missingSecretNames, sanitizeProviderError, summarizeProviderHealth } from "../../src/features/videos/services/provider-health";

const rows = [
  { provider: "hf_wan", status: "completed", render_duration_ms: 20000, updated_at: "2026-11-28T10:00:00Z" },
  { provider: "hf_wan", status: "failed", error_message: "timeout at https://x.hf.space/run token=abcdef123456789", updated_at: "2026-11-28T11:00:00Z" },
  { provider: "hf_wan", status: "processing", updated_at: "2026-11-28T11:30:00Z" },
  { provider: null, status: "completed", render_duration_ms: 4000, updated_at: "2026-11-28T09:00:00Z" },
];
const out = summarizeProviderHealth(rows);
const wan = out.find((p) => p.provider === "hf_wan")!;
assert.equal(wan.total, 3);
assert.equal(wan.successRate, 50);
assert.equal(wan.avgDurationSec, 20);
assert.equal(wan.lastSuccessAt, "2026-11-28T10:00:00Z");
assert.equal(wan.lastFailureAt, "2026-11-28T11:00:00Z");
assert.ok(!wan.lastError!.includes("abcdef123456789"));
assert.ok(!wan.lastError!.includes("hf.space"));
assert.equal(out.find((p) => p.provider === "template")!.successRate, 100);
assert.equal(sanitizeProviderError(null), null);
assert.deepEqual(missingSecretNames({ A: "x", B: " " }, ["A", "B", "C"]), ["B", "C"]);
console.log("provider-health tests passed");
