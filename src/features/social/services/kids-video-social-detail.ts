import {
  classifyKidsVideoGenerationRequestId,
  resolveKidsVideoSocialPublication,
} from "./kids-video-social-visibility";
import {
  loadKidsSocialQueueRows,
  type KidsSocialQueueRequest,
} from "./kids-video-social-query";

export type KidsVideoSocialPublicationDetailResolution =
  | {
      status: "verified";
      publication: ReturnType<typeof resolveKidsVideoSocialPublication>;
    }
  | {
      status: "unavailable";
      reason: "invalid_request_id" | "queue_read_failed";
      publication: null;
    };

/**
 * Reconcile the detail-page badge against the complete live queue history.
 * A verified empty history means "not published"; an invalid ID or failed
 * queue read means "unknown" and must never be presented as a negative result.
 */
export async function resolveKidsVideoSocialPublicationForDetail(
  requestId: unknown,
  stored: unknown,
  request: KidsSocialQueueRequest,
): Promise<KidsVideoSocialPublicationDetailResolution> {
  const requestIdState = classifyKidsVideoGenerationRequestId(requestId);

  if (requestIdState.kind === "missing") {
    return {
      status: "verified",
      publication: resolveKidsVideoSocialPublication([], stored, true, true),
    };
  }

  if (requestIdState.kind === "invalid") {
    return {
      status: "unavailable",
      reason: "invalid_request_id",
      publication: null,
    };
  }

  try {
    const rows = await loadKidsSocialQueueRows([requestIdState.id], request);
    return {
      status: "verified",
      publication: resolveKidsVideoSocialPublication(rows, stored, true, false),
    };
  } catch {
    return {
      status: "unavailable",
      reason: "queue_read_failed",
      publication: null,
    };
  }
}
