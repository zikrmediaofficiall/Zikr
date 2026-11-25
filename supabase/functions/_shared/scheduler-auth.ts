const STRICT_BEARER_PATTERN = /^Bearer[ \t]+([A-Za-z0-9._~+/-]+=*)$/i;
const MAX_SCHEDULER_TOKEN_LENGTH = 256;

/**
 * Accept only a single RFC 6750-style Bearer credential. Invalid schemes,
 * missing values, extra tokens, and oversized values are rejected before
 * the caller performs a privileged database secret lookup.
 */
export function parseStrictBearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = STRICT_BEARER_PATTERN.exec(authorization.trim());
  const token = match?.[1] ?? null;
  return token && token.length <= MAX_SCHEDULER_TOKEN_LENGTH ? token : null;
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

/**
 * The secret reader is deliberately lazy: malformed public requests never
 * spend a service-role RPC to fetch the private scheduler credential.
 */
export async function authorizeSchedulerBearer(
  authorization: string | null,
  readSecret: () => Promise<unknown>,
): Promise<boolean> {
  const supplied = parseStrictBearerToken(authorization);
  if (!supplied) return false;

  let expected: unknown;
  try {
    expected = await readSecret();
  } catch {
    return false;
  }
  if (typeof expected !== "string" || !expected) return false;
  return constantTimeEqual(supplied, expected);
}
