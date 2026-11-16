import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  planQueueAlertDelivery,
  queueAlertChannelsComplete,
} from "../lib/admin-queue-alert-delivery";

const bothChannels = { webhook: true, email: true };
const noDelivery = {
  webhook_sent: false,
  email_sent: false,
  delivered_at: null,
};

assert.deepEqual(planQueueAlertDelivery(bothChannels, null), {
  skip: false,
  sendWebhook: true,
  sendEmail: true,
});

const webhookOnlySucceeded = {
  webhook_sent: true,
  email_sent: false,
  delivered_at: null,
};
assert.deepEqual(planQueueAlertDelivery(bothChannels, webhookOnlySucceeded), {
  skip: false,
  sendWebhook: false,
  sendEmail: true,
});
assert.equal(
  queueAlertChannelsComplete(bothChannels, webhookOnlySucceeded),
  false,
  "one successful channel must not finalize an alert while another configured channel is pending",
);

const allSucceeded = {
  webhook_sent: true,
  email_sent: true,
  delivered_at: null,
};
assert.equal(queueAlertChannelsComplete(bothChannels, allSucceeded), true);
assert.deepEqual(planQueueAlertDelivery(bothChannels, {
  ...allSucceeded,
  delivered_at: "2026-11-16T20:00:00.000Z",
}), {
  skip: true,
  sendWebhook: false,
  sendEmail: false,
});

assert.deepEqual(planQueueAlertDelivery(bothChannels, {
  ...webhookOnlySucceeded,
  delivered_at: "2026-11-16T20:00:00.000Z",
}), {
  skip: false,
  sendWebhook: false,
  sendEmail: true,
}, "legacy rows finalized by the old any-channel rule must still retry their failed configured channel");

const emailOnly = { webhook: false, email: true };
assert.deepEqual(planQueueAlertDelivery(emailOnly, {
  webhook_sent: true,
  email_sent: false,
  delivered_at: null,
}), {
  skip: false,
  sendWebhook: false,
  sendEmail: true,
});
assert.equal(
  queueAlertChannelsComplete(emailOnly, {
    webhook_sent: false,
    email_sent: true,
  }),
  true,
  "unconfigured channels must not block successful delivery",
);

assert.deepEqual(planQueueAlertDelivery({ webhook: false, email: false }, null), {
  skip: true,
  sendWebhook: false,
  sendEmail: false,
});

const worker = readFileSync("scripts/jobs/admin-queue-alerts.ts", "utf8");
assert.match(worker, /planQueueAlertDelivery/);
assert.match(worker, /queueAlertChannelsComplete/);
assert.doesNotMatch(
  worker,
  /admin_queue_alert_deliveries[\s\S]{0,180}\.catch\(\(\) => \[\]\)/,
  "delivery-state read failures must stop delivery rather than resend an unknown prior success",
);
assert.doesNotMatch(
  worker,
  /admin_settings[\s\S]{0,180}\.catch\(\(\) => \[\]\)/,
  "admin alert setting read failures must fail closed",
);

assert.deepEqual(planQueueAlertDelivery(bothChannels, noDelivery), {
  skip: false,
  sendWebhook: true,
  sendEmail: true,
});

console.log("Admin queue alert per-channel retry contract passed.");
