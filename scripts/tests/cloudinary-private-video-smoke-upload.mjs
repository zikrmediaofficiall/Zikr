#!/usr/bin/env node
/**
 * Upload a generated provider smoke-test MP4 to Cloudinary as an authenticated
 * (non-public) asset. This script never changes access mode or deletes assets.
 */
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

const [filePath, provider] = process.argv.slice(2);
if (!filePath || !["wan2_2_fast", "ltx_fast"].includes(provider ?? "")) {
  throw new Error("Usage: node cloudinary-private-video-smoke-upload.mjs <video.mp4> <wan2_2_fast|ltx_fast>");
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
if (cloudName !== "dcuveyab9") {
  throw new Error("Cloudinary smoke test is restricted to the verified ZIKR cloud dcuveyab9.");
}
if (!apiKey || !apiSecret) {
  throw new Error("Missing Cloudinary upload credentials in the production environment.");
}

const fileInfo = await stat(filePath);
if (!fileInfo.isFile() || fileInfo.size < 1024 || fileInfo.size > 50 * 1024 * 1024) {
  throw new Error("Smoke-test MP4 must be between 1 KiB and 50 MiB.");
}

const runId = (process.env.GITHUB_RUN_ID || "manual").replace(/[^A-Za-z0-9_-]/g, "");
const attempt = (process.env.GITHUB_RUN_ATTEMPT || "1").replace(/[^A-Za-z0-9_-]/g, "");
const publicId = `zikr/provider-smoke/${provider}-${runId}-${attempt}`;
const timestamp = Math.floor(Date.now() / 1000);
const signedParams = { public_id: publicId, timestamp, type: "authenticated" };
const toSign = Object.keys(signedParams)
  .sort()
  .map((key) => `${key}=${signedParams[key]}`)
  .join("&") + apiSecret;
const signature = createHash("sha1").update(toSign, "utf8").digest("hex");

const form = new FormData();
const bytes = await readFile(filePath);
form.append("file", new Blob([bytes], { type: "video/mp4" }), basename(filePath));
form.append("api_key", apiKey);
form.append("timestamp", String(timestamp));
form.append("public_id", publicId);
form.append("type", "authenticated");
form.append("signature", signature);

const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
  method: "POST",
  body: form,
});
let payload;
try {
  payload = await response.json();
} catch {
  throw new Error(`Cloudinary returned a non-JSON response (HTTP ${response.status}).`);
}
if (!response.ok) {
  const message = payload?.error?.message || `HTTP ${response.status}`;
  throw new Error(`Cloudinary authenticated upload failed: ${message}`);
}
if (payload?.resource_type !== "video" || payload?.type !== "authenticated" || payload?.public_id !== publicId) {
  throw new Error("Cloudinary response did not confirm the expected private video asset.");
}

console.log(JSON.stringify({
  provider,
  cloud_name: cloudName,
  public_id: payload.public_id,
  asset_id: payload.asset_id,
  resource_type: payload.resource_type,
  delivery_type: payload.type,
  bytes: payload.bytes,
}, null, 2));
