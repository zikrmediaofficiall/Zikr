/**
 * Converts admin audit metadata into bounded, JSON-safe values.
 * Secret-bearing keys are removed at every nesting level; unknown payloads are
 * never copied wholesale into the immutable audit stream.
 */
const SENSITIVE_KEY = /(^|[^a-z0-9])(access[-_]?token|refresh[-_]?token|token|secret|password|passwd|cookie|authorization|api[-_]?key|private[-_]?key|client[-_]?secret|service[-_]?role|key)([^a-z0-9]|$)/i;

const MAX_DEPTH = 5;
const MAX_STRING_LENGTH = 2_000;
const MAX_OBJECT_ENTRIES = 50;
const MAX_ARRAY_ITEMS = 50;

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2");
  return SENSITIVE_KEY.test(normalized);
}

function clipString(value: string): string {
  return value.length > MAX_STRING_LENGTH
    ? `${value.slice(0, MAX_STRING_LENGTH)}…`
    : value;
}

function sanitizeValue(
  value: unknown,
  depth: number,
  ancestors: WeakSet<object>,
): unknown {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") return clipString(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "object") return "[Unsupported value]";
  if (depth >= MAX_DEPTH) return "[Maximum audit metadata depth reached]";
  if (ancestors.has(value)) return "[Circular reference]";

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const visible = value.slice(0, MAX_ARRAY_ITEMS).map((item) => {
        const sanitized = sanitizeValue(item, depth + 1, ancestors);
        return sanitized === undefined ? null : sanitized;
      });
      if (value.length > MAX_ARRAY_ITEMS) {
        visible[MAX_ARRAY_ITEMS - 1] = `[Truncated ${value.length - MAX_ARRAY_ITEMS + 1} additional items]`;
      }
      return visible;
    }

    const entries: Array<[string, unknown]> = [];
    const sourceEntries = Object.entries(value as Record<string, unknown>);
    for (const [key, entryValue] of sourceEntries.slice(0, MAX_OBJECT_ENTRIES)) {
      if (!key || key.length > 120 || isSensitiveKey(key) || typeof entryValue === "undefined") continue;
      entries.push([key, sanitizeValue(entryValue, depth + 1, ancestors)]);
    }
    if (sourceEntries.length > MAX_OBJECT_ENTRIES) {
      entries.push(["__truncated__", sourceEntries.length - MAX_OBJECT_ENTRIES]);
    }
    return Object.fromEntries(entries);
  } finally {
    ancestors.delete(value);
  }
}

/** Return bounded metadata suitable for an append-only audit row. */
export function sanitizeAdminAuditMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const sanitized = sanitizeValue(metadata ?? {}, 0, new WeakSet());
  return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : {};
}
