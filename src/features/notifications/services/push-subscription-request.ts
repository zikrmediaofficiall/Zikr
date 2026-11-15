import { isAllowedPushEndpoint } from "./push-endpoint";

export function normalizePushSubscriptionRequestBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function parsePushCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    return null;
  }
  return value;
}

export type ParsedPushSubscriptionRequest = {
  endpoint: string;
  p256dh: string;
  auth: string;
  device_id: string | null;
  user_agent: string | null;
  platform: string | null;
};

function boundedSubscriptionString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

export function parsePushSubscriptionRequestBody(
  value: unknown,
): ParsedPushSubscriptionRequest | null {
  const body = normalizePushSubscriptionRequestBody(value);
  const subscription = isRecord(body.subscription) ? body.subscription : body;
  const keys = isRecord(subscription.keys) ? subscription.keys : {};
  const endpoint = boundedSubscriptionString(subscription.endpoint, 4096);
  const p256dh = boundedSubscriptionString(keys.p256dh, 1024);
  const auth = boundedSubscriptionString(keys.auth, 1024);

  if (
    !endpoint ||
    !isAllowedPushEndpoint(endpoint) ||
    !p256dh ||
    p256dh.length < 16 ||
    !auth ||
    auth.length < 8
  ) {
    return null;
  }

  return {
    endpoint,
    p256dh,
    auth,
    device_id: boundedSubscriptionString(body.deviceId, 256),
    user_agent: boundedSubscriptionString(body.userAgent, 1024),
    platform: boundedSubscriptionString(body.platform, 128),
  };
}
