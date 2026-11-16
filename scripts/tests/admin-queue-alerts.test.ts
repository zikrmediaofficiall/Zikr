import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getQueueAlertRetrySince,
  isQueueAlertDeliveryComplete,
  QUEUE_ALERT_RETRY_LOOKBACK_MS,
  shouldSendQueueAlertChannel,
  shouldSkipQueueAlertDelivery,
  type QueueAlertDelivery,
} from "../jobs/queue-alert-contract";

const runStartedAt = "2026-11-16T12:00:00.000Z";
assert.equal(
  getQueueAlertRetrySince(runStartedAt),
  new Date(Date.parse(runStartedAt) - QUEUE_ALERT_RETRY_LOOKBACK_MS).toISOString(),
);
assert.equal(
  getQueueAlertRetrySince(runStartedAt),
  "2026-11-09T12:00:00.000Z",
);
assert.throws(() => getQueueAlertRetrySince("not-a-date"), /valid timestamp/);

const pendingEmail: QueueAlertDelivery = {
  delivered_at: null,
  webhook_sent: true,
  email_sent: false,
};
assert.equal(shouldSkipQueueAlertDelivery(pendingEmail), false);
assert.equal(shouldSendQueueAlertChannel(pendingEmail, "webhook"), false);
assert.equal(shouldSendQueueAlertChannel(pendingEmail, "email"), true);
assert.equal(shouldSendQueueAlertChannel(null, "webhook"), true);
assert.equal(shouldSendQueueAlertChannel(null, "email"), true);

assert.equal(
  isQueueAlertDeliveryComplete({
    webhookConfigured: true,
    webhookSent: true,
    emailConfigured: true,
    emailSent: false,
  }),
  false,
  "one successful channel must not mark a partially delivered alert complete",
);
assert.equal(
  isQueueAlertDeliveryComplete({
    webhookConfigured: true,
    webhookSent: true,
    emailConfigured: true,
    emailSent: true,
  }),
  true,
);
assert.equal(
  isQueueAlertDeliveryComplete({
    webhookConfigured: true,
    webhookSent: true,
    emailConfigured: false,
    emailSent: false,
  }),
  true,
  "an unconfigured channel must not block a configured channel from completing",
);
assert.equal(
  isQueueAlertDeliveryComplete({
    webhookConfigured: false,
    webhookSent: false,
    emailConfigured: false,
    emailSent: false,
  }),
  false,
  "an alert with no configured delivery channel must remain pending",
);

const job = readFileSync("scripts/jobs/admin-queue-alerts.ts", "utf8");
assert.match(job, /getQueueAlertRetrySince\(runStartedAt\)/);
assert.match(job, /select=alert_key,delivered_at,webhook_sent,email_sent/);
assert.match(job, /shouldSkipQueueAlertDelivery\(delivery\)/);
assert.match(job, /shouldSendQueueAlertChannel\(delivery, "webhook"\)/);
assert.match(job, /shouldSendQueueAlertChannel\(delivery, "email"\)/);
assert.match(job, /isQueueAlertDeliveryComplete\(/);
assert.match(job, /Delivery ledger lookup failed/);
assert.match(job, /if \\(!existing\\) continue;/, "a failed ledger read must not resend an alert blindly");

console.log("Queue alert retry window and per-channel delivery contracts passed.");
