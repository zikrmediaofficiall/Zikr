import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isCanonicalQuranAyahAudioUrl,
  isReadyAdminNarrationAsset,
  parseAdminNarrationAssetUrl,
  resolveVideoAudioSource,
} from "../../src/features/media/services/video-audio-source";
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


const cloudName = "zikr-media";
const uploaderId = "11111111-1111-4111-8111-111111111111";
const assetId = "22222222-2222-4222-8222-222222222222";
const publicId = "audio-human-123e4567-e89b-42d3-a456-426614174000";
const audioUrl = `https://res.cloudinary.com/${cloudName}/video/upload/v1730000000/${publicId}.mp3`;
const parsedAudio = parseAdminNarrationAssetUrl(audioUrl, cloudName);
assert.deepEqual(parsedAudio, { url: audioUrl, publicId });
assert.equal(parseAdminNarrationAssetUrl("https://attacker.example/audio-human-123e4567-e89b-42d3-a456-426614174000.mp3", cloudName), null);
assert.equal(parseAdminNarrationAssetUrl("https://res.cloudinary.com/other/video/upload/" + publicId + ".mp3", cloudName), null);
assert.equal(parseAdminNarrationAssetUrl("https://res.cloudinary.com/zikr-media/video/upload/" + publicId + ".mp3?redirect=https://127.0.0.1", cloudName), null);

const quranBase = "https://verses.quran.com/Alafasy/mp3";
const quranUrl = `${quranBase}/001001.mp3`;
assert.equal(isCanonicalQuranAyahAudioUrl(quranUrl, quranBase, 1, 1), true);
assert.equal(isCanonicalQuranAyahAudioUrl("https://127.0.0.1/latest/meta-data", quranBase, 1, 1), false);
assert.equal(
  resolveVideoAudioSource({
    category: "quran", audioUrl: quranUrl, audioSource: "quran-ayah-cdn",
    audioMediaAssetId: null, quranAudioBaseUrl: quranBase, surahId: 1, ayahNumber: 1,
  })?.kind,
  "quran",
);
assert.equal(
  resolveVideoAudioSource({
    category: "story", audioUrl: "https://127.0.0.1/latest/meta-data", audioSource: null,
    audioMediaAssetId: null, cloudinaryCloudName: cloudName, quranAudioBaseUrl: quranBase,
    surahId: null, ayahNumber: null,
  }),
  null,
  "non-Quran categories must not accept arbitrary HTTPS audio URLs",
);

const resolvedHumanAudio = resolveVideoAudioSource({
  category: "story", audioUrl, audioSource: "human_recording", audioMediaAssetId: assetId,
  cloudinaryCloudName: cloudName, quranAudioBaseUrl: quranBase, surahId: null, ayahNumber: null,
});
assert.deepEqual(resolvedHumanAudio, { kind: "human_recording", url: audioUrl, publicId, mediaAssetId: assetId });
assert.equal(
  resolveVideoAudioSource({
    category: "story", audioUrl: "https://attacker.example/audio.mp3", audioSource: "human_recording",
    audioMediaAssetId: assetId, cloudinaryCloudName: cloudName, quranAudioBaseUrl: quranBase,
    surahId: null, ayahNumber: null,
  }),
  null,
);

const readyAsset = {
  id: assetId,
  url: audioUrl,
  storage_path: publicId,
  mime_type: "audio/mpeg",
  media_type: "audio",
  asset_type: "audio",
  size_bytes: 4096,
  created_by: uploaderId,
  published: false,
  metadata: {
    provider: "cloudinary",
    cloudinary_public_id: publicId,
    purpose: "video_generation_narration",
    upload_state: "ready",
    audit_recorded: true,
    content_type: "audio/mpeg",
    uploaded_by: uploaderId,
  },
};
const expectedAsset = { assetId, url: audioUrl, publicId, uploaderId };
assert.equal(isReadyAdminNarrationAsset(readyAsset, expectedAsset), true);
assert.equal(
  isReadyAdminNarrationAsset({ ...readyAsset, created_by: "33333333-3333-4333-8333-333333333333" }, expectedAsset),
  false,
  "a different uploader must not attach the narration asset",
);
assert.equal(
  isReadyAdminNarrationAsset({ ...readyAsset, published: true }, expectedAsset),
  false,
  "a narration upload must remain unpublished",
);
assert.equal(
  isReadyAdminNarrationAsset({ ...readyAsset, size_bytes: 16 * 1024 * 1024 }, expectedAsset),
  false,
  "oversized narration assets must not be fetched",
);
assert.equal(
  isReadyAdminNarrationAsset({ ...readyAsset, metadata: { ...readyAsset.metadata, upload_state: "audit_pending" } }, expectedAsset),
  false,
  "an asset pending audit reconciliation must not be attached",
);
assert.equal(
  isReadyAdminNarrationAsset({ ...readyAsset, metadata: { ...readyAsset.metadata, audit_recorded: false } }, expectedAsset),
  false,
  "an asset without a recorded audit event must not be attached",
);
const m4aAsset = {
  ...readyAsset,
  url: audioUrl.replace(".mp3", ".m4a"),
  storage_path: publicId,
  mime_type: "audio/x-m4a",
  metadata: { ...readyAsset.metadata, content_type: "audio/x-m4a" },
};
assert.equal(
  isReadyAdminNarrationAsset(m4aAsset, { ...expectedAsset, url: m4aAsset.url }),
  true,
  "all MIME types accepted by the upload route must remain attachable",
);

const createRoute = readFileSync("src/app/api/admin/videos/create/route.ts", "utf8");
const studioClient = readFileSync("src/features/admin/video-studio/components/admin-video-studio-client.tsx", "utf8");
const audioWorker = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
assert.match(createRoute, /delete content\.audioUrl/);
assert.match(createRoute, /delete content\.audioSource/);
assert.match(createRoute, /isReadyAdminNarrationAsset/);
assert.match(createRoute, /humanAudioAssetId/);
assert.match(studioClient, /assetTrackingStatus !== "ready"[\s\S]*?return null/);
assert.match(studioClient, /humanAudioAssetId: humanAudioUrl \? uploadedAudioAssetId/);
assert.match(audioWorker, /resolveVideoAudioSource/);
assert.match(audioWorker, /isReadyAdminNarrationAsset/);
assert.match(audioWorker, /await contentAudioUrl\(request\)/);
assert.match(audioWorker, /redirect: "error"/);
assert.match(audioWorker, /readBoundedAudioResponse/);

console.log("Narration upload recovery and audio provenance checks passed.");
