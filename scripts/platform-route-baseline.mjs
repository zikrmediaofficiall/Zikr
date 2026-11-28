// Deliberately maintained when canonical platform route files are added or retired.
// Both route discovery and project-integrity checks import this single source of truth.
export const EXPECTED_PLATFORM_PAGES = 141;
// 141 Next.js pages include the reviewed Admin visual asset rights route; 83 route handlers remain.
export const EXPECTED_PLATFORM_APIS = 83;

/**
 * Route inventory drift is a verification failure, not a warning. A new or
 * retired App Router endpoint must update this baseline deliberately.
 */
export function isPlatformRouteInventoryValid(pageCount, apiCount) {
  return (
    Number.isInteger(pageCount) &&
    Number.isInteger(apiCount) &&
    pageCount === EXPECTED_PLATFORM_PAGES &&
    apiCount === EXPECTED_PLATFORM_APIS
  );
}
