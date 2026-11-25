export const DEFAULT_GEMINI_PRIMARY = "gemini-3.1-flash-lite";
export const DEFAULT_GEMINI_FALLBACKS = ["gemini-3.5-flash-lite"] as const;

const MODEL_ID = /^[a-z0-9][a-z0-9._-]{1,63}$/;

function clean(value: string | undefined | null): string | null {
  const id = (value ?? "").trim().replace(/^(?:google|models)\//, "").toLowerCase();
  return MODEL_ID.test(id) ? id : null;
}

/**
 * Ordered, de-duplicated model route: primary first, then configured fallbacks
 * (comma separated in GEMINI_FALLBACK_MODELS), then the built-in fallback.
 * Invalid ids are dropped so a typo in config cannot break generation.
 */
export function resolveGeminiModelRoute(input: { primary?: string | null; fallbacks?: string | null }): string[] {
  const route: string[] = [];
  const add = (id: string | null) => {
    if (id && !route.includes(id)) route.push(id);
  };
  add(clean(input.primary) ?? DEFAULT_GEMINI_PRIMARY);
  for (const part of (input.fallbacks ?? "").split(",")) add(clean(part));
  for (const id of DEFAULT_GEMINI_FALLBACKS) add(id);
  return route.slice(0, 5);
}
