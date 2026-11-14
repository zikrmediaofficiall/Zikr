import assert from "node:assert/strict";
import {
  loadKidsSocialQueueRows,
  type KidsSocialQueueRow,
  type KidsSocialQueueRequest,
} from "../../src/features/social/services/kids-video-social-query";

function queueRow(id: string, createdAt: string): KidsSocialQueueRow {
  return {
    id,
    content_id: "request,one",
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
  queueRow(String(500 - index).padStart(6, "0"), sharedTimestamp),
);
const secondPage = [
  queueRow("000000", "2026-11-13T23:59:59.000Z"),
  queueRow("-00001", "2026-11-13T23:59:58.000Z"),
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
  [" request,one ", "request,one", " "],
  request,
);
assert.equal(rows.length, 502, "the queue loader must collect every row across pages");
assert.equal(paths.length, 2, "a full first page must trigger one cursor-based follow-up");
assert.match(paths[0], /content_id=in\.\(request%2Cone\)/, "request IDs must be trimmed, deduplicated and URL-encoded");
assert.match(paths[0], /metadata->>audience=eq\.kids/, "the queue scan must remain scoped to Kids rows");
assert.match(paths[0], /order=created_at\.desc,id\.desc/, "the queue scan must use a stable composite order");
assert.match(paths[0], /limit=500/, "the queue scan must retain its bounded page size");
assert.ok(paths[1].includes(encodeURIComponent("(created_at.lt." + sharedTimestamp + ",and(created_at.eq." + sharedTimestamp + ",id.lt.000001))")),
  "the next page must use the last row's timestamp and ID as a stable keyset cursor");

let emptyCalls = 0;
const empty = await loadKidsSocialQueueRows(["", "   "], async <T>() => {
  emptyCalls += 1;
  return [] as unknown as T;
});
assert.deepEqual(empty, []);
assert.equal(emptyCalls, 0, "empty request-ID input must not query the database");

await assert.rejects(
  () => loadKidsSocialQueueRows(["request-1"], async <T>() => ({ rows: [] }) as T),
  /invalid page/,
  "a malformed PostgREST response must fail closed",
);

const duplicatePages = [
  firstPage,
  [queueRow(firstPage[0].id, sharedTimestamp)],
];
let duplicateCall = 0;
await assert.rejects(
  () => loadKidsSocialQueueRows(["request-1"], async <T>() => {
    const page = duplicatePages[duplicateCall++];
    return page as T;
  }),
  /repeated a row/,
  "a repeated queue row must not be treated as a complete publication history",
);

let oversizedCall = 0;
await assert.rejects(
  () => loadKidsSocialQueueRows(["request-1"], async <T>() => {
    const pageIndex = oversizedCall++;
    const count = pageIndex < 10 ? 500 : 1;
    const page = Array.from({ length: count }, (_, index) => {
      const ordinal = pageIndex * 500 + index;
      const createdAt = new Date(Date.UTC(2026, 10, 14) - ordinal * 1000).toISOString();
      return queueRow("overflow-" + String(ordinal).padStart(5, "0"), createdAt);
    });
    return page as T;
  }),
  /exceeded the safe scan limit/,
  "a queue history beyond 5,000 rows must fail closed rather than return a truncated badge history",
);
assert.equal(oversizedCall, 11, "the bounded scan must stop on the first row beyond its 5,000-row cap");

console.log("Kids social queue keyset pagination and fail-closed limits passed.");
