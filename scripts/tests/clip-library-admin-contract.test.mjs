import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const route = read("../../src/app/api/admin/video-clips/route.ts");
const page = read("../../src/app/admin/video/clips/page.tsx");
const client = read("../../src/features/admin/video-studio/components/admin-video-clips-client.tsx");
const navigation = read("../../src/features/admin/config/navigation.ts");
const layout = read("../../src/features/admin/config/navigation-layout.ts");
const migration = read("../../supabase/migrations/20261128120000_video_clip_library.sql");

assert.ok(route.includes("requireAdminApi('video.manage')"), "GET must require video.manage");
assert.ok(route.includes("requireAdminStepUpApi('video.manage'"), "writes must require step-up MFA");
assert.ok(route.includes("readBoundedJsonBody(request, MAX_BODY_BYTES)"), "JSON payload must be size-bounded");
assert.ok(route.includes("validateClipRow(candidate)"), "clip metadata must pass shared Cloudinary/rights validation");
assert.ok(route.includes("status: 'pending'"), "new clips must not be approved on create");
assert.ok(route.includes("statusFilter = '&status=eq.pending'"), "approval must be a compare-and-set from pending");
assert.ok(route.includes("statusFilter = '&status=in.(pending,approved)'"), "retirement must be conditional");
assert.ok(route.includes("recordAdminAuditEvent"), "mutations must be audited");
assert.ok(route.includes("audioMuted !== true"), "the source clip must be explicitly confirmed muted");
assert.ok(!route.includes("formData()") && !route.includes("readBoundedRequestBytes"), "this route must store metadata only, not accept binary uploads");
assert.ok(page.includes("requireAdminPermission('video.manage')"), "page must enforce video.manage");
assert.ok(client.includes("/api/admin/video-clips"), "admin UI must use the guarded metadata API");
assert.ok(client.includes('action: "approve"') && client.includes('action: "retire"'), "admin UI must expose review and retirement actions");
assert.ok(navigation.includes('href: "/admin/video/clips"'), "clip library must be registered in admin navigation");
assert.ok(layout.includes('"/admin/video/clips"'), "clip library must be placed in the video sidebar");
assert.ok(migration.includes("video_clip_library_cloudinary_public_id_uidx"), "one Cloudinary asset must not be registered more than once");
assert.ok(migration.includes("enable row level security"), "clip table must enable RLS");
assert.ok(migration.includes("revoke all on table public.video_clip_library from public, anon, authenticated"), "client roles must have no table privileges");
assert.ok(migration.includes("grant select, insert, update on table public.video_clip_library to service_role"), "only worker service role gets required table access");
assert.ok(migration.includes("mark_video_clip_library_used"), "clip usage counter must have an atomic RPC");
assert.ok(migration.includes("grant execute on function public.mark_video_clip_library_used(uuid) to service_role"), "clip usage RPC must be service-role-only");

console.log("Clip library admin contract passed: step-up, bounded input, pending-by-default, CAS approval, audit, Cloudinary checks, navigation and RLS.");
