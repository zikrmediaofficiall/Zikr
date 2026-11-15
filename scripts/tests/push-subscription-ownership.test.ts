import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parsePushSubscriptionRequestBody } from "../../src/features/notifications/services/push-subscription-request";
import { resolvePushSubscriptionWritePlan } from "../../src/features/notifications/services/push-subscription-ownership";

const validEndpoint = "https://fcm.googleapis.com/fcm/send/test-token";
const validKeys = { p256dh: "A".repeat(16), auth: "B".repeat(8) };
const validPayload = {
  subscription: { endpoint: validEndpoint, keys: validKeys },
  deviceId: "  device-1 ",
  userAgent: "  test-browser ",
  platform: " web ",
};

assert.deepEqual(
  parsePushSubscriptionRequestBody(validPayload),
  {
    endpoint: validEndpoint,
    p256dh: validKeys.p256dh,
    auth: validKeys.auth,
    device_id: "device-1",
    user_agent: "test-browser",
    platform: "web",
  },
  "nested browser subscription payloads should be normalized before persistence",
);

assert.deepEqual(
  parsePushSubscriptionRequestBody({ endpoint: validEndpoint, keys: validKeys }),
  {
    endpoint: validEndpoint,
    p256dh: validKeys.p256dh,
    auth: validKeys.auth,
    device_id: null,
    user_agent: null,
    platform: null,
  },
  "flat browser subscription payloads should remain supported",
);

assert.equal(
  parsePushSubscriptionRequestBody({
    ...validPayload,
    subscription: { endpoint: validEndpoint, keys: { ...validKeys, p256dh: "short" } },
  }),
  null,
  "short P-256 public keys must be rejected before the database constraint",
);
assert.equal(
  parsePushSubscriptionRequestBody({
    ...validPayload,
    subscription: { endpoint: validEndpoint, keys: { ...validKeys, auth: "short" } },
  }),
  null,
  "short auth secrets must be rejected before the database constraint",
);
assert.equal(
  parsePushSubscriptionRequestBody({
    ...validPayload,
    subscription: { endpoint: "https://attacker.example/collect", keys: validKeys },
  }),
  null,
  "unapproved push endpoints must be rejected",
);
assert.equal(parsePushSubscriptionRequestBody([]), null, "non-object payloads must fail closed");

assert.deepEqual(resolvePushSubscriptionWritePlan(null, "user-a"), { kind: "insert" });
assert.deepEqual(
  resolvePushSubscriptionWritePlan({ id: "subscription-1", user_id: "user-a" }, "user-a"),
  { kind: "update", id: "subscription-1" },
);
assert.deepEqual(
  resolvePushSubscriptionWritePlan({ id: "subscription-1", user_id: "user-b" }, "user-a"),
  { kind: "conflict" },
  "a subscription owned by another user must never be reassigned",
);
assert.deepEqual(
  resolvePushSubscriptionWritePlan({ id: "", user_id: "user-a" }, "user-a"),
  { kind: "conflict" },
  "malformed existing rows must fail closed",
);
assert.deepEqual(resolvePushSubscriptionWritePlan(null, "  "), { kind: "conflict" });

const route = readFileSync("src/app/api/push/subscription/route.ts", "utf8");
assert.ok(route.includes('userClient.rpc("save_default_prayer_location"'));
assert.ok(route.includes("resolvePushSubscriptionWritePlan(existing, user.id)"));
assert.ok(
  route.includes('.eq("user_id", user.id)') &&
    route.includes('.eq("endpoint", parsed.endpoint)'),
  "updates must be compare-and-set scoped to the existing owner and endpoint",
);
assert.match(route, /\.from\("push_subscriptions"\)\s*\.insert\(/);
assert.doesNotMatch(route, /\.from\("push_subscriptions"\)\s*\.upsert\(/);
assert.doesNotMatch(route, /\.from\("prayer_locations"\)\s*\.(?:insert|update)\(/);
assert.ok(route.includes('code?: string }).code === "23505"'));

console.log("Push subscription payload validation, ownership, and atomic location contracts passed.");
