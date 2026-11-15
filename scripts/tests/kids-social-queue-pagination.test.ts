import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  loadKidsSocialQueueRows,
  type KidsSocialQueueRow,
  type KidsSocialQueueRequest,
} from "../../src/features/social/services/kids-video-social-query";
import {
  classifyKidsVideoGenerationRequestId,
  resolveKidsVideoSocialPublication,
} from "../../src/features/social/services/kids-video-social-visibility";
import { resolveKidsVideoSocialPublicationForDetail } from "../../src/features/social/services/kids-video-social-detail";

const requestId = "60000000-0000-4000-8000-000000000001";
const queueId = (value: number) =>
  "00000000-0000-4000-8000-" + String(value).padStart(12, "0");

function queueRow(id: string, createdAt: string): KidsSocialQueueRow {
  return {
    id,
    content_id: requestId,
    content_type: "kids_story_video",
    body: null,
    target_platforms: ["facebook"],
    status: "published",
    published_at: createdAt,
    created_at: createdAt,
    metadata: { audience: "kids" },
  };
}

const sharedTimestamp = "2026-11-14T00:00:00.000Z";
const firstPage = Array.from({ length: 500 }, (_, index) =>
  queueRow(queueId(500 - index), sharedTimestamp),
);
const secondPage = [
  queueRow(queueId(0), "2026-11-13T23:59:59.000Z"),
];
const pages = [firstPage, secondPage];
const paths: string[] = [];
const request: KidsSocialQueueRequest = async <T>(path: string): Promise<T> => {
  paths.push(path);
  const page = pages.shift();
  if (!page) throw new Error("unexpected extra page request");
  return page as unknown as T;
};

const rows = await loadKidsSocialQueueRows(
  [" " + requestId + " ", requestId, " "],
  request,
);
assert.equal(rows.length, 501, "the queue loader must collect every row across pages");
assert.equal(paths.length, 2, "a full first page must trigger one cursor-based follow-up");
const firstPath = paths[0] ?? "";
const secondPath = paths[1] ?? "";
assert.ok(firstPath.includes("content_id=in.(" + requestId + ")"), "request IDs must be trimmed and deduplicated");
assert.match(firstPath, /metadata->>audience=eq\.kids/, "the queue scan must remain scoped to Kids rows");
assert.match(firstPath, /order=created_at\.desc,id\.desc/, "the queue scan must use a stable composite order");
assert.match(firstPath, /limit=500/, "the queue scan must retain its bounded page size");
assert.ok(
  secondPath.includes(encodeURIComponent(
    "(created_at.lt." + sharedTimestamp +
    ",and(created_at.eq." + sharedTimestamp + ",id.lt." + queueId(1) + "))",
  )),
  "the next page must use the last row's timestamp and ID as a stable keyset cursor",
);

let emptyCalls = 0;
const empty = await loadKidsSocialQueueRows(["", "   "], async <T>(_path: string) => {
  emptyCalls += 1;
  return [] as unknown as T;
});
assert.deepEqual(empty, []);
assert.equal(emptyCalls, 0, "empty request-ID input must not query the database");

await assert.rejects(
  () => loadKidsSocialQueueRows(
    [requestId],
    async <T>(_path: string) => ({ rows: [] }) as unknown as T,
  ),
  /invalid page/,
  "a malformed PostgREST response must fail closed",
);

const duplicatePages = [
  firstPage,
  [queueRow(firstPage[0]?.id ?? queueId(500), sharedTimestamp)],
];
let duplicateCall = 0;
await assert.rejects(
  () => loadKidsSocialQueueRows([requestId], async <T>(_path: string) => {
    const page = duplicatePages[duplicateCall++];
    return page as unknown as T;
  }),
  /repeated a row/,
  "a repeated queue row must not be treated as a complete publication history",
);

let oversizedCall = 0;
await assert.rejects(
  () => loadKidsSocialQueueRows([requestId], async <T>(_path: string) => {
    const pageIndex = oversizedCall++;
    const count = pageIndex < 10 ? 500 : 1;
    const page = Array.from({ length: count }, (_, index) => {
      const ordinal = pageIndex * 500 + index;
      const createdAt = new Date(Date.UTC(2026, 10, 14) - ordinal * 1000).toISOString();
      return queueRow(queueId(ordinal), createdAt);
    });
    return page as unknown as T;
  }),
  /exceeded the safe scan limit/,
  "a queue history beyond 5,000 rows must fail closed rather than return a truncated badge history",
);
assert.equal(oversizedCall, 11, "the bounded scan must stop on the first row beyond its 5,000-row cap");

const staleCatalogPublication = {
  status: "published",
  platforms: ["youtube"],
  publishedAt: "2026-11-14T23:00:00.000Z",
};
const confirmedQueuePublication: KidsSocialQueueRow = {
  ...queueRow(queueId(9000), "2026-11-15T05:00:00.000Z"),
  body: "حكاية أصلية من ذِكر عن الصدق.",
  status: "published",
  published_at: "2026-11-15T05:00:00.000Z",
  target_platforms: ["facebook"],
  metadata: {
    audience: "kids",
    platformResults: {
      facebook: { ok: true, remoteId: "facebook-video-9000" },
    },
  },
};

assert.deepEqual(classifyKidsVideoGenerationRequestId(null), { kind: "missing" });
assert.deepEqual(
  classifyKidsVideoGenerationRequestId("  " + requestId + " "),
  { kind: "valid", id: requestId },
);
assert.deepEqual(classifyKidsVideoGenerationRequestId("not-a-request-id"), { kind: "invalid" });
assert.deepEqual(classifyKidsVideoGenerationRequestId(42), { kind: "invalid" });

assert.deepEqual(
  resolveKidsVideoSocialPublication([confirmedQueuePublication], staleCatalogPublication, true, false),
  {
    status: "published",
    platforms: ["facebook"],
    publishedAt: "2026-11-15T05:00:00.000Z",
  },
  "the queue ledger must override stale catalog publication metadata",
);
assert.equal(
  resolveKidsVideoSocialPublication([], staleCatalogPublication, true, false),
  null,
  "a valid request ID with an empty queue history must not fall back to stale catalog metadata",
);
assert.equal(
  resolveKidsVideoSocialPublication([], staleCatalogPublication, false, true),
  null,
  "a failed queue read must not fall back to stale catalog metadata",
);
assert.deepEqual(
  resolveKidsVideoSocialPublication([], staleCatalogPublication, true, true),
  {
    status: "published",
    platforms: ["youtube"],
    publishedAt: "2026-11-14T23:00:00.000Z",
  },
  "only rows with no generation request ID may use the legacy catalog fallback",
);

const publishedDetail = await resolveKidsVideoSocialPublicationForDetail(
  requestId,
  staleCatalogPublication,
  async <T>(_path: string) => [confirmedQueuePublication] as unknown as T,
);
assert.deepEqual(
  publishedDetail,
  {
    status: "verified",
    publication: {
      status: "published",
      platforms: ["facebook"],
      publishedAt: "2026-11-15T05:00:00.000Z",
    },
    caption: "حكاية أصلية من ذِكر عن الصدق.",
  },
  "a detail page must use confirmed live queue delivery state and its confirmed caption",
);

const emptyDetail = await resolveKidsVideoSocialPublicationForDetail(
  requestId,
  staleCatalogPublication,
  async <T>(_path: string) => [] as unknown as T,
);
assert.deepEqual(
  emptyDetail,
  { status: "verified", publication: null, caption: null },
  "a successful empty queue read must be distinguished from an unavailable read",
);

const unavailableDetail = await resolveKidsVideoSocialPublicationForDetail(
  requestId,
  staleCatalogPublication,
  async <_T>(_path: string) => {
    throw new Error("simulated queue read failure");
  },
);
assert.deepEqual(
  unavailableDetail,
  { status: "unavailable", reason: "queue_read_failed", publication: null, caption: null },
  "a failed queue read must be shown as unknown rather than not published",
);

let invalidDetailCalls = 0;
const invalidDetail = await resolveKidsVideoSocialPublicationForDetail(
  "not-a-request-id",
  staleCatalogPublication,
  async <T>(_path: string) => {
    invalidDetailCalls += 1;
    return [] as unknown as T;
  },
);
assert.deepEqual(
  invalidDetail,
  { status: "unavailable", reason: "invalid_request_id", publication: null, caption: null },
);
assert.equal(invalidDetailCalls, 0, "invalid request IDs must never trigger a queue lookup");

const detailPageSource = readFileSync(
  new URL("../../src/app/kids/videos/[slug]/page.tsx", import.meta.url),
  "utf8",
);
assert.match(detailPageSource, /resolveKidsVideoSocialPublicationForDetail/);
assert.match(detailPageSource, /socialResolution\.publication/);
assert.doesNotMatch(detailPageSource, /metadata\.socialPublication\s*&&/);

const legacyDetail = await resolveKidsVideoSocialPublicationForDetail(
  null,
  staleCatalogPublication,
  async <_T>(_path: string) => {
    throw new Error("legacy rows must not need a queue lookup");
  },
);
assert.deepEqual(
  legacyDetail,
  {
    status: "verified",
    publication: {
      status: "published",
      platforms: ["youtube"],
      publishedAt: "2026-11-14T23:00:00.000Z",
    },
    caption: null,
  },
  "only rows with no request ID may use the legacy catalog fallback",
);

console.log("Kids social queue pagination, request-ID classification, and fail-closed publication visibility passed.");
