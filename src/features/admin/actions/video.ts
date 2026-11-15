"use server";

/**
 * Legacy bulk deletion is intentionally disabled. Failed generation requests
 * may still own media, catalog, social-queue, or audit references. Keep the
 * records until a complete reference inventory and transactional retention
 * contract are implemented.
 */
export async function deleteFailedVideoGenerationAction() {
  return {
    ok: false as const,
    code: "VIDEO_GENERATION_DELETE_REQUIRES_REFERENCE_AUDIT",
    deletionStarted: false as const,
    recordsDeleted: 0 as const,
    message: "No rows were changed.",
  };
}
