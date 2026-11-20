export type QueueAlertDelivery = {
  delivered_at: string | null;
  webhook_sent: boolean;
  email_sent: boolean;
};

export type QueueAlertChannel = "webhook" | "email";

export type QueueAlertConfiguredChannels = {
  webhookConfigured: boolean;
  emailConfigured: boolean;
};

export const QUEUE_ALERT_RETRY_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
export const QUEUE_ALERT_FAILURE_PAGE_SIZE = 50;
export const MAX_QUEUE_ALERT_FAILURE_ROWS = 500;

/**
 * Revisit recent failures so a transient delivery outage or an interrupted
 * worker run does not permanently lose an alert. The delivery ledger prevents
 * successful notifications from being sent twice.
 */
export function getQueueAlertRetrySince(runStartedAt: string): string {
  const startedAt = Date.parse(runStartedAt);
  if (!Number.isFinite(startedAt)) {
    throw new TypeError("Queue alert run start must be a valid timestamp.");
  }

  return new Date(startedAt - QUEUE_ALERT_RETRY_LOOKBACK_MS).toISOString();
}

/**
 * Older worker versions set delivered_at after either channel succeeded.
 * Treat that timestamp as complete only when every channel configured now has
 * a recorded success; this lets legacy partial deliveries resume safely.
 */
export function shouldSkipQueueAlertDelivery(
  delivery: QueueAlertDelivery | null | undefined,
  channels: QueueAlertConfiguredChannels,
): boolean {
  if (!delivery?.delivered_at) return false;

  return (
    (!channels.webhookConfigured || delivery.webhook_sent) &&
    (!channels.emailConfigured || delivery.email_sent)
  );
}

export function shouldSendQueueAlertChannel(
  delivery: QueueAlertDelivery | null | undefined,
  channel: QueueAlertChannel,
): boolean {
  return channel === "webhook"
    ? delivery?.webhook_sent !== true
    : delivery?.email_sent !== true;
}

export function isQueueAlertDeliveryComplete(input: QueueAlertConfiguredChannels & {
  webhookSent: boolean;
  emailSent: boolean;
}): boolean {
  const hasConfiguredChannel = input.webhookConfigured || input.emailConfigured;
  return (
    hasConfiguredChannel &&
    (!input.webhookConfigured || input.webhookSent) &&
    (!input.emailConfigured || input.emailSent)
  );
}
