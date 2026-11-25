/** OMNIS P07-02: one pipeline view over a video request: script, render, thumbnail, publish. Pure. */
export type VideoRow = { id: string; title: string; status: string; content: string | null; video_url: string | null; thumbnail_url: string | null; youtube_id: string | null; facebook_id: string | null; published_at: string | null; error_message: string | null; generation_attempts: number | null; next_retry_at: string | null; created_at: string };
export type StageKey = "script" | "render" | "thumbnail" | "publish";
export type StageState = "done" | "pending" | "blocked";
export type PipelineView = { id: string; title: string; stages: Record<StageKey, StageState>; blocker: string | null; stuckStage: StageKey | null };

const ORDER: StageKey[] = ["script", "render", "thumbnail", "publish"];
const filled = (v: string | null | undefined) => Boolean(v && v.trim());

export function pipelineFor(row: VideoRow): PipelineView {
  const done: Record<StageKey, boolean> = {
    script: filled(row.content),
    render: filled(row.video_url),
    thumbnail: filled(row.thumbnail_url),
    publish: Boolean(row.published_at || filled(row.youtube_id) || filled(row.facebook_id)),
  };
  const failed = row.status === "failed" || filled(row.error_message);
  const stages = {} as Record<StageKey, StageState>;
  let stuck: StageKey | null = null;
  for (const key of ORDER) {
    if (done[key]) stages[key] = "done";
    else if (!stuck) { stuck = key; stages[key] = failed ? "blocked" : "pending"; }
    else stages[key] = "pending";
  }
  const blocker = stuck && failed ? (row.error_message?.slice(0, 160) ?? "فشل بلا رسالة") : null;
  return { id: row.id, title: row.title, stages, blocker, stuckStage: stuck };
}

export function pipelineSummary(rows: readonly VideoRow[]): { total: number; complete: number; stuckBy: Record<StageKey, number>; blocked: number } {
  const stuckBy: Record<StageKey, number> = { script: 0, render: 0, thumbnail: 0, publish: 0 };
  let complete = 0;
  let blocked = 0;
  for (const row of rows) {
    const view = pipelineFor(row);
    if (!view.stuckStage) complete += 1;
    else stuckBy[view.stuckStage] += 1;
    if (view.blocker) blocked += 1;
  }
  return { total: rows.length, complete, stuckBy, blocked };
}
