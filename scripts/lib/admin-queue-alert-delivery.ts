export type QueueAlertChannelAvailability = {
  webhook: boolean;
  email: boolean;
};

export type QueueAlertDeliveryState = {
  webhook_sent: boolean;
  email_sent: boolean;
  delivered_at: string | null;
};

export type QueueAlertDeliveryPlan = {
  skip: boolean;
  sendWebhook: boolean;
  sendEmail: boolean;
};

export function queueAlertChannelsComplete(
  channels: QueueAlertChannelAvailability,
  state: Pick<QueueAlertDeliveryState, "webhook_sent" | "email_sent">,
): boolean {
  return (
    (channels.webhook || channels.email) &&
    (!channels.webhook || state.webhook_sent) &&
    (!channels.email || state.email_sent)
  );
}

export function planQueueAlertDelivery(
  channels: QueueAlertChannelAvailability,
  previous: QueueAlertDeliveryState | null,
): QueueAlertDeliveryPlan {
  if (previous?.delivered_at) {
    return { skip: true, sendWebhook: false, sendEmail: false };
  }

  if (!channels.webhook && !channels.email) {
    return { skip: true, sendWebhook: false, sendEmail: false };
  }

  return {
    skip: false,
    sendWebhook: channels.webhook && previous?.webhook_sent !== true,
    sendEmail: channels.email && previous?.email_sent !== true,
  };
}
