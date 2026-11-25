import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveGeminiModelRoute } from "../../src/features/spiritual-ai/services/model-routing";

assert.deepEqual(resolveGeminiModelRoute({}), ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"]);
assert.deepEqual(resolveGeminiModelRoute({ primary: "google/Gemini-X" }), ["gemini-x", "gemini-3.5-flash-lite"]);
assert.deepEqual(
  resolveGeminiModelRoute({ primary: "a-model", fallbacks: "b-model, a-model, bad model!, models/c-model" }),
  ["a-model", "b-model", "c-model", "gemini-3.5-flash-lite"],
);
assert.deepEqual(resolveGeminiModelRoute({ primary: "!!", fallbacks: ",," })[0], "gemini-3.1-flash-lite", "invalid primary falls back to default");
assert.ok(resolveGeminiModelRoute({ fallbacks: "a1,b1,c1,d1,e1,f1,g1" }).length <= 5, "route length is capped");
const client = readFileSync("src/features/spiritual-ai/services/gemini-client.ts", "utf8");
assert.ok(client.includes("resolveGeminiModelRoute("), "client must use the routing module");
console.log("Gemini model routing contracts passed.");
