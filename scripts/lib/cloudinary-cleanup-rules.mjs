// Pure rules for Cloudinary cleanup candidates. No network, no writes.
// An asset is a candidate only if EVERY referencing catalog video passes and no guard applies.
const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;
const asObj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

export function publicIdFromUrl(url, cloud) {
  try {
    const u = new URL(url);
    if (u.hostname !== "res.cloudinary.com") return null;
    const m = u.pathname.match(/^\/([^/]+)\/video\/upload\/(.+)$/);
    if (!m || m[1] !== cloud) return null;
    return decodeURIComponent(m[2].replace(/^(?:[a-z]{1,3}_[^/]*\/)*/i, "").replace(/^v[0-9]+\//, "").replace(/\.[A-Za-z0-9]{2,4}$/, ""));
  } catch { return null; }
}

function platformResult(queueRow, platform) {
  const pr = asObj(queueRow.metadata).platformResults;
  if (Array.isArray(pr)) return asObj(pr.find((x) => asObj(x).platform === platform));
  return asObj(asObj(pr)[platform]);
}

/** Confirmed remote publications for one platform on queue rows, minus confirmed deletions. */
export function confirmedRemoteIds(queueRows, platform) {
  const ids = new Set();
  const deleted = new Set();
  for (const row of queueRows) {
    const res = platformResult(row, platform);
    const rid = typeof res.remoteId === "string" ? res.remoteId.trim() : "";
    if ((row.status === "published" || row.status === "partial") && res.ok === true && rid) ids.add(rid);
    const del = asObj(asObj(asObj(row.metadata).platformDeletions)[platform]);
    if (del.status === "deleted") deleted.add(typeof del.remoteId === "string" ? del.remoteId.trim() : "*");
  }
  if (deleted.has("*")) return new Set();
  return new Set([...ids].filter((id) => !deleted.has(id)));
}

function isKidsOrSeries(video) {
  const m = asObj(video.metadata);
  const slug = String(video.slug ?? "").toLowerCase();
  return m.audience === "kids" || Boolean(m.kidsContentId) || Boolean(m.seriesId) || Boolean(m.seriesTitle) ||
    /(^|[-_])(layl|hady|kids)([-_]|$)/.test(slug);
}

/**
 * Evaluate one catalog video. Returns { ok, reasons[] }.
 * queueRows: social_publish_queue rows tied to this video (by content_id or Cloudinary URL).
 */
export function evaluateVideo(video, queueRows, opts) {
  const { minAgeDays, now } = opts;
  const m = asObj(video.metadata);
  const reasons = [];
  if (video.published !== true) reasons.push("not published on the site");
  if (m.generator !== "zikr_internal_video_factory") reasons.push("not an internal generated video");
  if (isKidsOrSeries(video)) reasons.push("kids/series/Layl/Hady master: keep");
  const active = queueRows.filter((r) => r.status === "queued" || r.status === "processing");
  if (active.length) reasons.push("still queued or processing for publishing");
  const yt = confirmedRemoteIds(queueRows, "youtube");
  const metaId = typeof m.youtubePublishedVideoId === "string" ? m.youtubePublishedVideoId.trim() : "";
  if (!yt.size) reasons.push("no queue-confirmed YouTube remote id");
  else if (!YT_ID.test(metaId) || !yt.has(metaId)) reasons.push("catalog YouTube id does not match the confirmed queue id");
  const published = queueRows
    .filter((r) => r.status === "published" || r.status === "partial")
    .map((r) => Date.parse(r.published_at ?? ""))
    .filter(Number.isFinite);
  const newest = published.length ? Math.max(...published) : NaN;
  if (!Number.isFinite(newest)) reasons.push("no publish timestamp");
  else if (now - newest < minAgeDays * 86400000) reasons.push(`published less than ${minAgeDays} days ago`);
  return { ok: reasons.length === 0, reasons, youtubeId: metaId, facebookConfirmed: confirmedRemoteIds(queueRows, "facebook").size > 0 };
}
