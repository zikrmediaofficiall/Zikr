import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildStoragePath,
  encodeStorageKey,
  getStoragePurposeConfig,
  isAllowedStorageContentType,
  parseStorageKey,
  sanitizeStorageSegment,
  SIGNED_UPLOAD_URL_TTL_SECONDS,
  type StorageObjectPurpose,
} from "../../src/lib/services/storage-contract";

const expectedConfig: Record<StorageObjectPurpose, {
  bucket: string;
  maxBytes: number;
  isPublic: boolean;
  allowedContentTypes: string[];
}> = {
  avatar: {
    bucket: "avatars",
    maxBytes: 5 * 1024 * 1024,
    isPublic: true,
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  media: {
    bucket: "media",
    maxBytes: 20 * 1024 * 1024,
    isPublic: true,
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4"],
  },
  audio: {
    bucket: "audio",
    maxBytes: 50 * 1024 * 1024,
    isPublic: false,
    allowedContentTypes: ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"],
  },
  document: {
    bucket: "documents",
    maxBytes: 20 * 1024 * 1024,
    isPublic: false,
    allowedContentTypes: ["application/pdf"],
  },
  video: {
    bucket: "videos",
    maxBytes: 50 * 1024 * 1024,
    isPublic: true,
    allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"],
  },
};

for (const [purpose, expected] of Object.entries(expectedConfig) as [StorageObjectPurpose, typeof expectedConfig[StorageObjectPurpose]][]) {
  assert.deepEqual(getStoragePurposeConfig(purpose), expected, `${purpose} storage limits and MIME types must match Supabase bucket configuration`);
  for (const contentType of expected.allowedContentTypes) {
    assert.equal(isAllowedStorageContentType(purpose, contentType), true);
    assert.equal(isAllowedStorageContentType(purpose, contentType.toUpperCase()), true);
  }
  assert.equal(isAllowedStorageContentType(purpose, "text/html"), false);
}

assert.equal(
  SIGNED_UPLOAD_URL_TTL_SECONDS,
  7200,
  "the response must report Supabase's fixed two-hour signed-upload URL lifetime",
);

assert.equal(sanitizeStorageSegment(" User 123/My Photo.PNG "), "user-123-my-photo.png");
const generatedPath = buildStoragePath("User 123", "My Photo.PNG");
assert.match(
  generatedPath,
  /^user-123\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-my-photo\.png$/,
);
assert.equal(encodeStorageKey("avatars", "/user-123/avatar.png"), "avatars/user-123/avatar.png");
assert.deepEqual(parseStorageKey("avatars/user-123/avatar.png"), {
  bucket: "avatars",
  path: "user-123/avatar.png",
});
assert.equal(parseStorageKey("avatars"), null);
assert.equal(parseStorageKey("avatars/"), null);
assert.equal(parseStorageKey("avatars/user-123/../victim.png"), null,
  "storage keys must reject parent-directory segments before owner-prefix checks");
assert.equal(parseStorageKey("avatars/user-123/./avatar.png"), null,
  "storage keys must reject dot segments");
assert.equal(parseStorageKey("avatars/user-123/%2e%2e/victim.png"), null,
  "storage keys must reject encoded path segments");
assert.equal(parseStorageKey("avatars/user-123/%252e%252e/victim.png"), null,
  "storage keys must reject double-encoded path segments");
assert.equal(parseStorageKey("avatars/user-123\\\\victim.png"), null,
  "storage keys must reject backslash path separators");
assert.equal(parseStorageKey("avatars/user-123\\victim.png"), null,
  "storage keys must reject a single backslash path separator");
assert.equal(sanitizeStorageSegment(".."), "",
  "sanitized owner segments must never remain a dot path segment");
assert.equal(buildStoragePath("..", "avatar.png").startsWith("anonymous/"), true,
  "invalid owner segments must fall back to the anonymous storage namespace");

const migrationPath = resolve(
  "supabase/migrations/20261110115000_restore_owner_scoped_user_storage_policies.sql",
);
const migration = readFileSync(migrationPath, "utf8");
for (const action of ["select", "insert", "update", "delete"]) {
  assert.match(
    migration,
    new RegExp(`create policy "user_storage_${action}_own"[\\s\\S]*?for ${action}\\s+to authenticated`, "i"),
    `user storage ${action} policy must be restricted to authenticated users`,
  );
}
assert.equal(
  (migration.match(/auth\.uid\(\)::text = \(storage\.foldername\(name\)\)\[1\]/g) ?? []).length,
  5,
  "all four policies and both sides of UPDATE must enforce the owner path",
);
assert.match(migration, /bucket_id in \('avatars', 'media', 'audio', 'documents'\)/i);
assert.doesNotMatch(migration, /to anon/i, "the migration must not grant anonymous write access");
assert.doesNotMatch(migration, /insert into storage\.buckets/i, "the migration must not alter bucket visibility or limits");


const storagePresignRouteSource = readFileSync("src/app/api/storage/presign/route.ts", "utf8");
assert.match(storagePresignRouteSource, /readBoundedJsonBody\(request\)/);
assert.doesNotMatch(storagePresignRouteSource, /request\.json\(\)/);
assert.match(storagePresignRouteSource, /export const dynamic = ['"]force-dynamic['"]/);
assert.equal(
  (storagePresignRouteSource.match(/"Cache-Control": "no-store"/g) || []).length,
  3,
  "upload, download, and error responses must never cache signed storage capabilities",
);


const storageServiceSource = readFileSync("src/lib/services/storage.ts", "utf8");
const videoUploadRouteSource = readFileSync("src/app/api/admin/videos/upload/route.ts", "utf8");
const videoUploadFieldSource = readFileSync("src/features/admin/components/video-upload-field.tsx", "utf8");
const videoStorageMigration = readFileSync("supabase/migrations/20261114030000_scope_video_storage_writes.sql", "utf8");
const videoBucketLimitMigration = readFileSync("supabase/migrations/20261114100000_videos_bucket_free_tier_limit.sql", "utf8");
const supabaseConfig = readFileSync("supabase/config.toml", "utf8");

assert.match(
  storageServiceSource,
  /params\.purpose === "video"[\s\S]*?createAdminClient\(\)[\s\S]*?:[\s\S]*?await createClient\(\)/,
  "video signed-upload capabilities must be minted with the service role after the admin route guard; user-managed buckets must retain their session client",
);
assert.match(videoUploadRouteSource, /requireAdminStepUpApi\(['"]video\.manage['"]/);
assert.match(videoUploadRouteSource, /purpose: ['"]video['"]/);
assert.match(videoUploadFieldSource, /uploadToSignedUrl\(/);
assert.doesNotMatch(videoUploadFieldSource, /\.upload\(/, "browser video uploads must use the short-lived signed capability");
assert.match(videoUploadFieldSource, /MAX_VIDEO_BYTES = 50 \* 1024 \* 1024/);
assert.match(videoUploadFieldSource, /50 ميجابايت/);
assert.match(videoUploadRouteSource, /MAX_VIDEO_BYTES = 50 \* 1024 \* 1024/);
assert.match(videoUploadRouteSource, /contentLength > MAX_VIDEO_BYTES[\s\S]*?jsonError\([\s\S]*?413/);
assert.match(supabaseConfig, /\[storage\.buckets\.videos\][\s\S]*?file_size_limit = "50MiB"/);
assert.match(videoBucketLimitMigration, /UPDATE storage\.buckets[\s\S]*?SET file_size_limit = 52428800[\s\S]*?WHERE id = 'videos'/i);
assert.match(videoStorageMigration, /DROP POLICY IF EXISTS video_assets_admin_insert/i);
assert.doesNotMatch(videoStorageMigration, /CREATE POLICY ["']?video_assets_admin_insert/i, "authenticated users must not mint video upload capabilities directly through Storage RLS");

console.log("Storage owner-policy, MIME, path, upload-expiry, and bounded no-store presign contracts passed.");
