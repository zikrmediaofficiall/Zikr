export const MAX_PROVIDER_VIDEO_BYTES = 50 * 1024 * 1024;

export async function readBoundedMediaResponse(
  response: Response,
  maxBytes = MAX_PROVIDER_VIDEO_BYTES,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new Error("Media response byte limit must be a positive safe integer.");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error("Media response returned an invalid Content-Length.");
    }
    if (declaredBytes > maxBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error("Media response exceeds the configured byte limit.");
    }
  }

  if (!response.body) throw new Error("Media response has no readable body.");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("Media response exceeds the configured byte limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
