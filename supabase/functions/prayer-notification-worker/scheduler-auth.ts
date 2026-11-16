const MAX_AUTHORIZATION_LENGTH = 280;
const MAX_SCHEDULER_TOKEN_LENGTH = 256;
const BEARER_CREDENTIAL_PATTERN = /^Bearer[ \t]+([A-Za-z0-9._~+/-]+=*)$/i;

/**
 * Parse exactly one bounded Bearer credential before the worker reads its
 * service-role scheduler secret. Invalid schemes, extra credentials and
 * oversized values are rejected without a privileged RPC.
 */
export function parseSchedulerBearerToken(
  authorization: string | null,
): string | null {
  if (!authorization || authorization.length > MAX_AUTHORIZATION_LENGTH) {
    return null;
  }

  const match = BEARER_CREDENTIAL_PATTERN.exec(authorization.trim());
  const token = match?.[1] ?? null;
  return token && token.length <= MAX_SCHEDULER_TOKEN_LENGTH ? token : null;
}
