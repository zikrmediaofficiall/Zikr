import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MAX_PROVIDER_VIDEO_BYTES,
  readBoundedMediaResponse,
} from "../../src/features/videos/providers/media-response";
import { resolveFreeVideoProviderDownloadUrl } from "../../src/features/videos/providers/free-api-provider";

const endpoint = "https://api.video.example/generate";

assert.equal(MAX_PROVIDER_VIDEO_BYTES, 50 * 1024 * 1024);
assert.equal(
  resolveFreeVideoProviderDownloadUrl("https://api.video.example/files/clip.mp4", endpoint),
  "https://api.video.example/files/clip.mp4",
  "the configured provider origin is trusted by default",
);
assert.equal(
  resolveFreeVideoProviderDownloadUrl(
    "https://cdn.video.example/files/clip.mp4?signature=abc",
    endpoint,
    "cdn.video.example",
  ),
  "https://cdn.video.example/files/clip.mp4?signature=abc",
  "an explicitly configured CDN host may serve signed media URLs",
);
for (const url of [
  "http://api.video.example/files/clip.mp4",
  "https://attacker.example/files/clip.mp4",
  "https://user:secret@api.video.example/files/clip.mp4",
  "https://api.video.example:8443/files/clip.mp4",
  "https://api.video.example/files/clip.mp4#fragment",
  "https://localhost/files/clip.mp4",
]) {
  assert.equal(
    resolveFreeVideoProviderDownloadUrl(url, endpoint),
    null,
    `untrusted provider media URL must be rejected: ${url}`,
  );
}
assert.equal(
  resolveFreeVideoProviderDownloadUrl("https://media.internal.local/files/clip.mp4", "https://media.internal.local/generate"),
  "https://media.internal.local/files/clip.mp4",
  "the explicitly configured provider origin remains usable for private deployments",
);
assert.equal(
  resolveFreeVideoProviderDownloadUrl("https://cdn.video.example/clip.mp4", "http://api.video.example/generate", "cdn.video.example"),
  null,
  "the provider endpoint itself must be HTTPS",
);

const exactResponse = new Response(new Uint8Array([1, 2, 3, 4]), {
  headers: { "content-length": "4" },
});
assert.deepEqual(
  await readBoundedMediaResponse(exactResponse, 4),
  new Uint8Array([1, 2, 3, 4]),
  "the exact byte limit must be accepted",
);

const declaredOversize = new Response(new Uint8Array([1, 2, 3]), {
  headers: { "content-length": "3" },
});
await assert.rejects(
  readBoundedMediaResponse(declaredOversize, 2),
  /exceeds the configured byte limit/,
  "declared oversized media must be rejected before buffering",
);

let streamCancelled = false;
const streamingOversize = new Response(new ReadableStream<Uint8Array>({
  start(controller) {
    controller.enqueue(new Uint8Array([1, 2]));
    controller.enqueue(new Uint8Array([3, 4]));
  },
  cancel() {
    streamCancelled = true;
  },
}));
await assert.rejects(
  readBoundedMediaResponse(streamingOversize, 3),
  /exceeds the configured byte limit/,
  "unknown-length media must be bounded while streaming",
);
assert.equal(streamCancelled, true, "oversized streams must be cancelled immediately");

const invalidLength = new Response(new Uint8Array([1]), {
  headers: { "content-length": "not-a-number" },
});
await assert.rejects(
  readBoundedMediaResponse(invalidLength, 10),
  /invalid Content-Length/,
);

await assert.rejects(
  readBoundedMediaResponse(new Response(new Uint8Array([1])), 0),
  /positive safe integer/,
);

const worker = readFileSync("scripts/jobs/template-video-automation.ts", "utf8");
const comfy = readFileSync("src/features/videos/providers/comfyui-provider.ts", "utf8");
const freeApi = readFileSync("src/features/videos/providers/free-api-provider.ts", "utf8");
const hfWorker = readFileSync("scripts/jobs/hf-space-video.py", "utf8");
assert.match(worker, /resolveFreeVideoProviderDownloadUrl/);
assert.match(worker, /readBoundedMediaResponse/);
assert.match(worker, /redirect: "error"/);
assert.match(comfy, /readBoundedMediaResponse/);
assert.match(comfy, /readBoundedMediaResponse\(queued, 64 \* 1024\)/);
assert.match(comfy, /readBoundedMediaResponse\(history, 2 \* 1024 \* 1024\)/);
assert.match(comfy, /redirect: "error"/);
assert.match(freeApi, /FREE_VIDEO_PROVIDER_ALLOWED_HOSTS/);
assert.match(hfWorker, /MAX_VIDEO_BYTES = 50 \* 1024 \* 1024/);

console.log("Video provider download origin and byte-boundary tests passed.");
