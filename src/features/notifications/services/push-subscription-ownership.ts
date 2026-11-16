export type ExistingPushSubscriptionOwner = {
  id?: unknown;
  user_id?: unknown;
} | null;

export type PushSubscriptionWritePlan =
  | { kind: "insert" }
  | { kind: "update"; id: string }
  | { kind: "conflict" };

/**
 * Resolve the initial write mode without allowing an endpoint owned by another
 * account to be silently reassigned. The database write must still be scoped by
 * both endpoint and user_id to close the lookup/write race.
 */
export function resolvePushSubscriptionWritePlan(
  existing: ExistingPushSubscriptionOwner,
  userId: unknown,
): PushSubscriptionWritePlan {
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  if (!normalizedUserId) return { kind: "conflict" };
  if (!existing) return { kind: "insert" };

  const existingId = typeof existing.id === "string" ? existing.id.trim() : "";
  const existingUserId = typeof existing.user_id === "string" ? existing.user_id.trim() : "";
  if (!existingId || existingUserId !== normalizedUserId) return { kind: "conflict" };

  return { kind: "update", id: existingId };
}
