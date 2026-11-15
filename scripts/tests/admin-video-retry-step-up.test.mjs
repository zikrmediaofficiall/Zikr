import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const read = (path) => readFileSync(path, "utf8");
const route = read("src/app/api/admin/videos/[id]/retry/route.ts");
const client = read("src/features/admin/video-requests/components/admin-video-requests-client.tsx");
const verifier = read("scripts/verify-admin-api-guards.mjs");
const generationRoute = read("src/app/api/admin/video-generation/route.ts");
const createRoute = read("src/app/api/admin/videos/create/route.ts");
const templatesRoute = read("src/app/api/admin/video/templates/route.ts");
const narrationUploadRoute = read("src/app/api/admin/video-generation/narration-upload/route.ts");
const videoUploadRoute = read("src/app/api/admin/videos/upload/route.ts");
const contentPublisher = read("scripts/jobs/content-publishing.ts");
const studioClient = read("src/features/admin/video-studio/components/admin-video-studio-client.tsx");
const templateClient = read("src/features/admin/video-templates/components/template-studio-client.tsx");
const uploadField = read("src/features/admin/components/video-upload-field.tsx");
const videoAutomation = read("src/features/videos/services/video-automation.ts");

assert.match(
  route,
  /import \{ requireAdminStepUpApi \} from ['"]@\/features\/admin\/services\/security['"]/,
  "video retry must use the centralized step-up policy",
);
assert.match(
  route,
  /requireAdminStepUpApi\(['"]video\.manage['"],\s*['"]\/admin\/video\/requests['"]\)/,
  "re-queuing a failed video generation request must require video.manage plus configured MFA step-up",
);
assert.doesNotMatch(route, /requireAdminApi\s*\(/, "the retry route must not retain the permission-only bypass");
assert.ok(
  route.indexOf("requireAdminStepUpApi") < route.indexOf("supabaseServerAdminRequest"),
  "step-up authorization must run before any privileged database read or mutation",
);
assert.match(
  client,
  /data\.error === ["']step_up_required["'][\s\S]*?redirectToAdminStepUp\(data\.nextPath\)/,
  "the retry UI must send administrators through the step-up flow instead of showing a generic error",
);
assert.match(
  verifier,
  /videoRetrySource[\s\S]*requireAdminStepUpApi/,
  "the canonical admin API guard verifier must retain the retry-specific step-up contract",
);

assert.match(generationRoute, /readBoundedJsonBody\(request,/);
assert.equal((generationRoute.match(/readBoundedJsonBody\(request,/g) || []).length, 1, "PATCH body parsing must remain bounded; legacy DELETE is disabled without reading a body");
assert.doesNotMatch(generationRoute, /request\.json\(\)/, "the admin video-generation route must not parse unbounded JSON bodies");
const generationDelete = generationRoute.split("export async function DELETE()")[1]?.split("export async function PATCH")[0] ?? "";
assert.ok(generationDelete.includes("VIDEO_GENERATION_DELETE_REQUIRES_REFERENCE_AUDIT"), "legacy request-row deletion must remain disabled until media and queue references are audited");
assert.ok(generationDelete.includes("status: 410"), "disabled legacy delete endpoint must return 410");
assert.ok(generationDelete.includes("requireAdminStepUpApi('video.delete'"), "disabled legacy delete endpoint must remain step-up protected");
assert.ok(!generationDelete.includes("supabaseServerAdminRequest") && !generationDelete.includes("method: 'DELETE'"), "disabled legacy delete endpoint must not perform database mutations");
assert.match(generationRoute, /VIDEO_REQUEST_ID_PATTERN/, "video request IDs must be validated as UUIDs before building PostgREST filters");

assert.match(createRoute, /requireAdminStepUpApi\(["']video\.manage["'],\s*["']\/admin\/video\/studio["']\)/);
assert.match(createRoute, /readBoundedJsonBody\(request, 64 \* 1024\)/);
assert.doesNotMatch(createRoute, /request\.json\(\)/);
const createPost = createRoute.slice(createRoute.indexOf("export async function POST"));
assert.ok(createPost.indexOf("requireAdminStepUpApi") < createPost.indexOf("createVideoGenerationRequest"));

const templatePost = templatesRoute.slice(templatesRoute.indexOf("export async function POST"));
assert.match(templatePost, /requireAdminStepUpApi\(["']video\.manage["'],\s*["']\/admin\/video\/templates["']\)/);
assert.match(templatePost, /readBoundedJsonBody\(request, 64 \* 1024\)/);
assert.doesNotMatch(templatePost, /request\.json\(\)/);
assert.ok(templatePost.indexOf("requireAdminStepUpApi") < templatePost.indexOf("supabaseServerAdminRequest"));

assert.match(narrationUploadRoute, /requireAdminStepUpApi\(["']video\.manage["']/);
const narrationUploadPost = narrationUploadRoute.slice(narrationUploadRoute.indexOf("export async function POST"));
assert.ok(narrationUploadPost.indexOf("requireAdminStepUpApi") < narrationUploadPost.indexOf("readBoundedRequestBytes"));
assert.match(videoUploadRoute, /requireAdminStepUpApi\(['"]video\.manage['"]/);
const videoUploadPost = videoUploadRoute.slice(videoUploadRoute.indexOf("export async function POST"));
assert.ok(videoUploadPost.indexOf("requireAdminStepUpApi") < videoUploadPost.indexOf("createPresignedUploadUrl"));

assert.match(contentPublisher, /metadata\.mediaState !== ["']purged["']/,
  "scheduled video publication must reject media already marked purged");
assert.match(contentPublisher, /metadata\.mediaState !== ["']unlinked["']/,
  "scheduled video publication must reject media whose storage link is unlinked");
assert.match(contentPublisher, /!approval\.approved/,
  "scheduled video publication must revalidate the source-bound approval snapshot");

assert.match(studioClient, /redirectToAdminStepUp/);
assert.match(studioClient, /payload\.error === ["']step_up_required["'][\s\S]*?redirectToAdminStepUp\(payload\.nextPath\)/);
assert.match(templateClient, /payload\.error === ["']step_up_required["'][\s\S]*?redirectToAdminStepUp\(payload\.nextPath\)/);
assert.match(uploadField, /presignData\.error === ["']step_up_required["'][\s\S]*?redirectToAdminStepUp\(presignData\.nextPath\)/);

const verifierRun = spawnSync(process.execPath, ["scripts/verify-admin-video-factory.mjs"], { encoding: "utf8" });
assert.equal(
  verifierRun.status,
  0,
  `Admin Video Factory verification must accept the step-up-protected create and narration-upload routes.\\n${verifierRun.stdout}\\n${verifierRun.stderr}`,
);

const pendingInventoryStart = videoAutomation.indexOf("export async function getPendingVideoRequests");
const claimStart = videoAutomation.indexOf("/** Optimistic queue claim.", pendingInventoryStart);
const pendingInventory = videoAutomation.slice(pendingInventoryStart, claimStart);
assert.match(pendingInventory, /if \(!Array\.isArray\(rows\)\)/);
assert.match(pendingInventory, /throw error;/);

const allInventoryStart = videoAutomation.indexOf("export async function getAllVideoRequests");
const updateStart = videoAutomation.indexOf("export async function updateVideoRequestStatus", allInventoryStart);
const allInventory = videoAutomation.slice(allInventoryStart, updateStart);
assert.match(allInventory, /if \(!Array\.isArray\(rows\)\)/);
assert.match(allInventory, /throw error;/);

const updateStatusStart = videoAutomation.indexOf("export async function updateVideoRequestStatus");
const metadataStart = videoAutomation.indexOf("export function generateYoutubeMetadata", updateStatusStart);
const updateStatus = videoAutomation.slice(updateStatusStart, metadataStart);
assert.match(updateStatus, /if \(!Array\.isArray\(existingContentRows\)\)/);
assert.match(updateStatus, /if \(!Array\.isArray\(updated\)\)/);
assert.match(updateStatus, /throw error;/);

console.log("Admin video generation, retry step-up, and queue-read failure contracts passed.");
