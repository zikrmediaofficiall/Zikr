const SAFE_KIDS_CONTENT_TYPES = new Set([
  "story",
  "prayer",
  "wudu",
  "quiz",
  "game",
  "puzzle",
  "coloring",
  "matching",
  "video",
  "memorize",
]);

function isPublicKidsRouteRow(row) {
  if (!row || typeof row !== "object") return false;
  const type = typeof row.type === "string"
    ? row.type
    : typeof row.content_type === "string" ? row.content_type : "";
  if (!SAFE_KIDS_CONTENT_TYPES.has(type)) return false;
  if (row.published !== true || row.is_active !== true) return false;
  if (type === "story" && row.metadata?.age_appropriate !== true) return false;
  return true;
}

function isSafeKidsSlug(value) {
  const slug = typeof value === "string" ? value.trim() : "";
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug);
}

export function getPublishedKidsRoutes(currentRows) {
  const routes = new Set();
  for (const row of Array.isArray(currentRows) ? currentRows : []) {
    if (!isPublicKidsRouteRow(row)) continue;
    const slug = typeof row.slug === "string" ? row.slug.trim() : "";
    if (!isSafeKidsSlug(slug)) continue;
    routes.add(`/kids/${slug}`);
  }
  return [...routes].sort();
}

export function getBlockedKidsRoutes(previousRows, currentRows, previousRoutes = []) {
  const rows = Array.isArray(currentRows) ? currentRows : [];
  const previous = Array.isArray(previousRows) ? previousRows : [];
  const visibleSlugs = new Set(
    rows
      .filter(isPublicKidsRouteRow)
      .map(row => typeof row?.slug === "string" ? row.slug.trim() : "")
      .filter(isSafeKidsSlug),
  );
  const blocked = new Set();

  // Remove every previously published Kids route that is no longer present in
  // the current public snapshot, including deleted, unpublished, or inactive
  // games, quizzes, activities, and stories.
  for (const row of previous) {
    const slug = typeof row?.slug === "string" ? row.slug.trim() : "";
    if (slug && !visibleSlugs.has(slug)) blocked.add(`/kids/${slug}`);
  }

  // The manifest can outlive an older dataset row (for example, routes
  // that were already removed before the previous kids.json snapshot). Prune
  // every stale Kids detail route directly from the prior route inventory too.
  for (const route of Array.isArray(previousRoutes) ? previousRoutes : []) {
    if (typeof route !== "string" || !route.startsWith("/kids/")) continue;
    const slug = route.slice("/kids/".length).split(/[?#]/, 1)[0].replace(/\/+$/, "");
    if (!visibleSlugs.has(slug)) blocked.add(route);
  }

  // A story may still be present in the public table query while its
  // age-appropriate approval flag has been withdrawn.
  for (const row of rows) {
    const slug = typeof row?.slug === "string" ? row.slug.trim() : "";
    if (row?.type === "story" && row?.metadata?.age_appropriate !== true && slug) {
      blocked.add(`/kids/${slug}`);
    }
  }

  return blocked;
}


export function resolveOfflineDatasetMinimum(dataset, configuredMinimum, hasServiceRoleKey) {
  if (!Number.isInteger(configuredMinimum) || configuredMinimum < 0) {
    throw new Error("Offline dataset minimum must be a non-negative integer.");
  }
  if (dataset !== "kids") return configuredMinimum;
  if (!hasServiceRoleKey) {
    throw new Error("Kids offline snapshots require a protected Supabase service-role key so route revocation uses a complete visibility read.");
  }
  // A legitimate empty or reduced Kids public set must still be exported so
  // previously cached routes for unpublished or rejected content are revoked.
  return 0;
}

export function isValidOfflineDatasetCount(dataset, count) {
  return Number.isInteger(count) && (dataset === "kids" ? count >= 0 : count > 0);
}
