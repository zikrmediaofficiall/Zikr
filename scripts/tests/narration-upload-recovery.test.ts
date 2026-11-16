import assert from "node:assert/strict";
import { resolveNarrationUploadRecoveryReference } from "../../src/features/media/services/narration-upload-recovery";

const requested = "audio-human-00000000-0000-4000-8000-000000000001";
const returned = "audio-human-00000000-0000-4000-8000-000000000002";

assert.deepEqual(resolveNarrationUploadRecoveryReference(requested, null), { uploadReference: requested });
assert.deepEqual(resolveNarrationUploadRecoveryReference(requested, requested), { uploadReference: requested });
assert.deepEqual(
  resolveNarrationUploadRecoveryReference(requested, returned),
  { uploadReference: returned, requestedUploadReference: requested },
);
assert.deepEqual(
  resolveNarrationUploadRecoveryReference(requested, "audio-human/returned.asset"),
  { uploadReference: "audio-human/returned.asset", requestedUploadReference: requested },
);
assert.deepEqual(
  resolveNarrationUploadRecoveryReference(requested, "../unexpected"),
  { uploadReference: requested },
);
assert.equal(resolveNarrationUploadRecoveryReference("../invalid", returned), null);
assert.equal(resolveNarrationUploadRecoveryReference("x".repeat(256), null), null);

console.log("Narration upload recovery references passed.");
