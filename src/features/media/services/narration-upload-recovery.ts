const SAFE_PUBLIC_ID_SEGMENT = /^[A-Za-z0-9_.-]+$/;

function isSafeCloudinaryPublicId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  if (!normalized || normalized.length > 255) return false;
  return normalized.split("/").every((segment) =>
    segment.length > 0 &&
    segment !== "." &&
    segment !== ".." &&
    SAFE_PUBLIC_ID_SEGMENT.test(segment)
  );
}

export function resolveNarrationUploadRecoveryReference(
  requestedPublicId: unknown,
  returnedPublicId: unknown,
): { uploadReference: string; requestedUploadReference?: string } | null {
  if (!isSafeCloudinaryPublicId(requestedPublicId)) return null;
  const requested = requestedPublicId.trim();
  if (!isSafeCloudinaryPublicId(returnedPublicId)) {
    return { uploadReference: requested };
  }
  const returned = returnedPublicId.trim();
  if (returned === requested) return { uploadReference: requested };
  return {
    uploadReference: returned,
    requestedUploadReference: requested,
  };
}
