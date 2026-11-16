import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getQueueAlertRetrySince,
  MAX_QUEUE_ALERT_FAILURE_ROWS,
  QUEUE_ALERT_FAILURE_PAGE_SIZE,
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
assert.equal(QUEUE_ALERT_FAILURE_PAGE_SIZE, 50);
assert.equal(MAX_QUEUE_ALERT_FAILURE_ROWS, 500);
assert.equal(MAX_QUEUE_ALERT_FAILURE_ROWS % QUEUE_ALERT_FAILURE_PAGE_SIZE, 0);

const bothChannels = { webhookConfigured: true, emailConfigured: true };
const webhookOnly = { webhookConfigured: true, emailConfigured: false };
const pendingEmail: QueueAlertDelivery = {
  delivered_at: null,
  webhook_sent: true,
  email_sent: false,
};
assert.equal(shouldSkipQueueAlertDelivery(pendingEmail, bothChannels), false);
assert.equal(shouldSendQueueAlertChannel(pendingEmail, "webhook"), false);
assert.equal(shouldSendQueueAlertChannel(pendingEmail, "email"), true);
assert.equal(shouldSendQueueAlertChannel(null, "webhook"), true);
assert.equal(shouldSendQueueAlertChannel(null, "email"), true);

const legacyPartialDelivery: QueueAlertDelivery = {
  delivered_at: "2026-11-16T11:00:00.000Z",
  webhook_sent: true,
  email_sent: false,
};
assert.equal(
  shouldSkipQueueAlertDelivery(legacyPartialDelivery, bothChannels),
  false,
  "legacy delivered_at values created after either-channel success must not hide a failed configured channel",
);
assert.equal(
  shouldSendQueueAlertChannel(legacyPartialDelivery, "email"),
  true,
  "the unsent channel from a legacy partial delivery must be retried",
);
assert.equal(
  shouldSkipQueueAlertDelivery(legacyPartialDelivery, webhookOnly),
  true,
  "a legacy partial row is complete when every channel configured now has already succeeded",
);

const fullyDelivered: QueueAlertDelivery = {
  delivered_at: "2026-11-16T11:00:00.000Z",
  webhook_sent: true,
  email_sent: true,
};
assert.equal(
  shouldSkipQueueAlertDelivery(fullyDelivered, bothChannels),
  true,
  "fully delivered alerts must still be deduplicated",
);

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
assert.match(job, /shouldSkipQueueAlertDelivery\(delivery, deliveryChannels\)/);
assert.match(job, /webhookConfigured: hasWebhookConfiguration\(\)/);
assert.match(job, /emailConfigured: hasEmailConfiguration\(\)/);
assert.match(job, /shouldSendQueueAlertChannel\(delivery, "webhook"\)/);
assert.match(job, /shouldSendQueueAlertChannel\(delivery, "email"\)/);
assert.match(job, /isQueueAlertDeliveryComplete\(/);
assert.match(job, /Delivery ledger lookup failed/);
assert.match(job, /if \(!existing\) continue;/, "a failed ledger read must not resend an alert blindly");

assert.match(job, /updated_at=lte\\.\\$\\{encodeURIComponent\\(until\\)\\}/);
assert.match(job, /order=updated_at\\.asc,id\\.asc/);
assert.match(job, /offset=\\$\\{offset\\}/);
assert.match(job, /MAX_QUEUE_ALERT_FAILURE_ROWS/);
const videoWorkflow = readFileSync(".github/workflows/generate-ai-video.yml", "utf8");
const socialWorkflow = readFileSync(".github/workflows/publish-social.yml", "utf8");
for (const workflow of [videoWorkflow, socialWorkflow]) {
  assert.match(workflow, /concurrency:\\s*\\n\\s*group:\\s*zikr-background-worker\\s*\\n\\s*cancel-in-progress:\\s*false/);
}

console.log("Queue alert retry window and per-channel delivery contracts passed.");
