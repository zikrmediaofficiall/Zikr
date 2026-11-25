import assert from "node:assert/strict";
import { pipelineFor, pipelineSummary, type VideoRow } from "../../src/features/admin/omnis/video-pipeline";

const base: VideoRow = { id: "1", title: "t", status: "completed", content: "s", video_url: "https://v", thumbnail_url: "https://t", youtube_id: "y", facebook_id: null, published_at: null, error_message: null, generation_attempts: 1, next_retry_at: null, created_at: "2026-11-25T00:00:00Z" };
const full = pipelineFor(base);
assert.equal(full.stuckStage, null);
assert.ok(Object.values(full.stages).every((s) => s === "done"));
const noRender = pipelineFor({ ...base, video_url: null, youtube_id: null });
assert.equal(noRender.stuckStage, "render");
assert.equal(noRender.stages.render, "pending");
assert.equal(noRender.stages.thumbnail, "done", "later stages keep their own state");
const failed = pipelineFor({ ...base, video_url: null, status: "failed", error_message: "provider timeout" });
assert.equal(failed.stages.render, "blocked");
assert.equal(failed.blocker, "provider timeout");
const summary = pipelineSummary([base, { ...base, id: "2", video_url: null }, { ...base, id: "3", content: "" , status: "failed", error_message: "x" }]);
assert.deepEqual(summary, { total: 3, complete: 1, stuckBy: { script: 1, render: 1, thumbnail: 0, publish: 0 }, blocked: 1 });
console.log("video-pipeline tests passed");
