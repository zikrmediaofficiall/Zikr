import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const worker = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
const qaModule = readFileSync("src/features/videos/services/video-frame-diversity.ts", "utf8");
const approval = readFileSync("src/features/videos/services/video-publish-approval.ts", "utf8");

const qaPosition = worker.indexOf("const videoTechnicalQa = await createVideoTechnicalQaSnapshot(outputPath, request.id, temp, signal);");
const uploadPosition = worker.indexOf("const uploadedMedia = await uploadGeneratedVideoToCloudinary(bytes, storageKey, signal);", qaPosition);
assert.ok(qaPosition >= 0 && uploadPosition > qaPosition, "technical QA must run before every Cloudinary write");
assert.ok(worker.includes("videoTechnicalQaStatus: \"passed\""), "the request must persist the passed P08 state");
assert.ok(worker.includes("const technicalQaPassed = Boolean("), "approval checklist must validate the P08 report");
assert.ok(worker.includes("verifyQaSnapshot(technicalQa)"), "approval must reject tampered or unversioned P08 snapshots");
assert.ok(worker.includes("isVideoMediaFactsValid(technicalQa.media)"), "approval must revalidate technical media facts");
assert.ok(worker.includes("const visualsReviewed = technicalQaPassed &&"), "P08 is a hard requirement for the visuals approval check");
assert.ok(worker.includes("technicalQaDigest:"), "automated approval must bind the QA digest");
assert.ok(qaModule.includes("containerFormat") && qaModule.includes("facts.audioPeakVolumeDb"), "technical QA must validate container and loudness");
assert.ok(worker.includes("measureFrameDiversity(frames)"), "the worker must measure sampled frame diversity");
assert.ok(approval.includes("snapshot.technicalQaDigest?.trim()"), "the approval hash must cover the P08 digest");
assert.ok(approval.includes("record(content?.videoTechnicalQa)?.digest"), "the publish queue must recompute its approval hash from the stored P08 digest");

console.log("P08 worker integration passed: pre-Cloudinary technical checks, sampled frames, verified report and digest-bound approval.");
