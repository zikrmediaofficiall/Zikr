import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteVerifiedGeneratedCloudinaryVideo, verifyGeneratedCloudinaryVideo } from "../../src/features/videos/services/generated-cloudinary-asset";

const env = {
  CLOUDINARY_CLOUD_NAME: "zikr",
  CLOUDINARY_API_KEY: "test-api-key",
  CLOUDINARY_API_SECRET: "test-api-secret",
};
const videoUrl = "https://res.cloudinary.com/zikr/video/upload/v123456/auto-episode-123.mp4";

function mockFetcher(searchPayload: unknown, destroyPayload: unknown = { result: "ok" }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/resources/search")) {
      return new Response(JSON.stringify(searchPayload), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.endsWith("/video/destroy")) {
      return new Response(JSON.stringify(destroyPayload), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error("Unexpected Cloudinary endpoint: " + url);
  };
  return { fetcher, calls };
}

test("deletes only a Cloudinary MP4 that is tagged as an automated ZIKR-generated asset", async () => {
  const { fetcher, calls } = mockFetcher({
    resources: [{
      public_id: "auto-episode-123",
      resource_type: "video",
      type: "upload",
      format: "mp4",
      tags: ["zikr-generated", "automated"],
    }],
  });
  const verifiedAsset = await verifyGeneratedCloudinaryVideo(videoUrl, env, fetcher);
  const result = await deleteVerifiedGeneratedCloudinaryVideo(verifiedAsset, fetcher);
  assert.deepEqual(result, { publicId: "auto-episode-123" });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /resources\/search$/);
  assert.match(String(calls[0].init?.body), /public_id=auto-episode-123/);
  assert.match(calls[1].url, /video\/destroy$/);
  assert.match(String(calls[1].init?.body), /public_id=auto-episode-123/);
});

test("does not delete an untagged, unowned, or non-MP4 asset", async () => {
  for (const asset of [
    { public_id: "auto-episode-123", resource_type: "video", type: "upload", format: "mp4", tags: ["automated"] },
    { public_id: "auto-episode-123", resource_type: "video", type: "upload", format: "mp4", tags: ["zikr-generated"] },
    { public_id: "auto-episode-123", resource_type: "image", type: "upload", format: "jpg", tags: ["zikr-generated", "automated"] },
  ]) {
    const { fetcher, calls } = mockFetcher({ resources: [asset] });
    await assert.rejects(verifyGeneratedCloudinaryVideo(videoUrl, env, fetcher), /لم يثبت/);
    assert.equal(calls.length, 1, "destroy must never run when asset ownership is not verified");
  }
});

test("rejects transformed, foreign-host, and non-generated URLs before any Cloudinary request", async () => {
  const { fetcher, calls } = mockFetcher({ resources: [] });
  for (const invalidUrl of [
    "https://res.cloudinary.com/zikr/video/upload/q_auto/v123456/auto-episode-123.mp4",
    "https://res.cloudinary.com/other/video/upload/v123456/auto-episode-123.mp4",
    "https://example.com/zikr/video/upload/v123456/auto-episode-123.mp4",
    "https://res.cloudinary.com/zikr/image/upload/v123456/auto-episode-123.jpg",
  ]) {
    await assert.rejects(verifyGeneratedCloudinaryVideo(invalidUrl, env, fetcher));
  }
  assert.equal(calls.length, 0);
});

test("requires complete Cloudinary credentials before attempting deletion", async () => {
  const { fetcher, calls } = mockFetcher({ resources: [] });
  await assert.rejects(
    verifyGeneratedCloudinaryVideo(videoUrl, { ...env, CLOUDINARY_API_SECRET: "" }, fetcher),
    /إعدادات Cloudinary غير مكتملة/,
  );
  assert.equal(calls.length, 0);
});
