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
      caption: string | null;
    }
  | {
      status: "unavailable";
      reason: "missing_request_id" | "invalid_request_id" | "queue_read_failed";
      publication: null;
      caption: null;
    };

/**
 * Reconcile the detail-page badge against the complete live queue history.
 * A verified empty history means "not published". A missing/invalid ID or failed
 * queue read means "unknown"; legacy catalog metadata is not proof of live delivery.
 */
export async function resolveKidsVideoSocialPublicationForDetail(
  requestId: unknown,
  stored: unknown,
  request: KidsSocialQueueRequest,
): Promise<KidsVideoSocialPublicationDetailResolution> {
  const requestIdState = classifyKidsVideoGenerationRequestId(requestId);

  if (requestIdState.kind === "missing") {
    return {
      status: "unavailable",
      reason: "missing_request_id",
      publication: null,
      caption: null,
    };
  }

  if (requestIdState.kind === "invalid") {
    return {
      status: "unavailable",
      reason: "invalid_request_id",
      publication: null,
      caption: null,
    };
  }

  try {
    const rows = await loadKidsSocialQueueRows([requestIdState.id], request);
    const confirmedCaptionRow = rows.find((row) =>
      resolveKidsVideoSocialPublication([row], null, true, false)?.platforms.length,
    );
    const caption = typeof confirmedCaptionRow?.body === "string" && confirmedCaptionRow.body.trim()
      ? confirmedCaptionRow.body
      : null;
    return {
      status: "verified",
      publication: resolveKidsVideoSocialPublication(rows, stored, true, false),
      caption,
    };
  } catch {
    return {
      status: "unavailable",
      reason: "queue_read_failed",
      publication: null,
      caption: null,
    };
  }
}
