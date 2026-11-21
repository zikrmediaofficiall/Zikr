// Deliberately maintained when canonical platform route files are added or retired.
// Both route discovery and project-integrity checks import this single source of truth.
export const EXPECTED_PLATFORM_PAGES = 125;
// 82 Next.js route handlers are present after adding the owner-controlled project-video deletion endpoint.
export const EXPECTED_PLATFORM_APIS = 82;

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
