/**
 * OMNIS P05-02: reusable page blocks for custom pages.
 * Pure and dependency free. Blocks are plain data (no HTML, no scripts), so a page
 * can only ever contain these block types. Links are relative or https; images are
 * https and limited to the project's Cloudinary host.
 */
export type PageBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "callout"; text: string }
  | { type: "links"; items: Array<{ label: string; href: string }> }
  | { type: "image"; src: string; alt: string }
  | { type: "cta"; label: string; href: string };

export const PAGE_LIMITS = { blocks: 60, text: 2000, linkItems: 12, label: 80, title: 120 } as const;
export const RESERVED_PAGE_SLUGS = ["admin", "api", "auth", "kids", "quran", "hadith", "dua", "duas", "adhkar", "videos", "p", "search", "settings", "profile", "platform", "data"] as const;

export function isCustomPagesEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.CUSTOM_PAGES_ENABLED === "true" || env.CUSTOM_PAGES_ENABLED === "1";
}

export function slugProblem(slug: string): string | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 60) {
    return "الرابط المختصر يجب أن يكون حروفًا لاتينية صغيرة وأرقامًا وشرطات (3 إلى 60 حرفًا).";
  }
  if ((RESERVED_PAGE_SLUGS as readonly string[]).includes(slug)) return "هذا الرابط محجوز للنظام.";
  return null;
}

export function safeHref(value: string): string | null {
  const href = value.trim();
  if (!href || href.length > 500 || /[\s<>"'`\\]/.test(href)) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safeImageSrc(value: string): string | null {
  const src = safeHref(value);
  if (!src || src.startsWith("/")) return null;
  return new URL(src).hostname === "res.cloudinary.com" ? src : null;
}

const clean = (value: unknown) => (typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u202A-\u202E\u2066-\u2069]/g, "").trim() : "");

export type BlockValidation = { ok: true; blocks: PageBlock[] } | { ok: false; errors: string[] };

export function validateBlocks(input: unknown): BlockValidation {
  if (!Array.isArray(input)) return { ok: false, errors: ["blocks_must_be_array"] };
  if (input.length === 0) return { ok: false, errors: ["blocks_empty"] };
  if (input.length > PAGE_LIMITS.blocks) return { ok: false, errors: ["too_many_blocks"] };
  const errors: string[] = [];
  const blocks: PageBlock[] = [];
  input.forEach((raw, index) => {
    const at = `block ${index + 1}`;
    if (!raw || typeof raw !== "object") return void errors.push(`${at}: invalid`);
    const b = raw as Record<string, unknown>;
    const text = clean(b.text);
    switch (b.type) {
      case "heading":
        if (!text || text.length > PAGE_LIMITS.label * 2) return void errors.push(`${at}: heading text`);
        blocks.push({ type: "heading", level: b.level === 3 ? 3 : 2, text });
        return;
      case "paragraph":
      case "callout":
        if (!text || text.length > PAGE_LIMITS.text) return void errors.push(`${at}: ${b.type} text`);
        blocks.push({ type: b.type, text });
        return;
      case "links": {
        const items = Array.isArray(b.items) ? b.items : [];
        const good = items
          .map((item) => ({ label: clean((item as Record<string, unknown>)?.label), href: safeHref(clean((item as Record<string, unknown>)?.href)) }))
          .filter((item): item is { label: string; href: string } => !!item.label && item.label.length <= PAGE_LIMITS.label && !!item.href);
        if (!good.length || good.length !== items.length || good.length > PAGE_LIMITS.linkItems) return void errors.push(`${at}: links`);
        blocks.push({ type: "links", items: good });
        return;
      }
      case "image": {
        const src = safeImageSrc(clean(b.src));
        const alt = clean(b.alt);
        if (!src || !alt || alt.length > 200) return void errors.push(`${at}: image`);
        blocks.push({ type: "image", src, alt });
        return;
      }
      case "cta": {
        const label = clean(b.label);
        const href = safeHref(clean(b.href));
        if (!label || label.length > PAGE_LIMITS.label || !href) return void errors.push(`${at}: cta`);
        blocks.push({ type: "cta", label, href });
        return;
      }
      default:
        errors.push(`${at}: unknown type`);
    }
  });
  return errors.length ? { ok: false, errors } : { ok: true, blocks };
}

/**
 * Editor syntax, one block per blank-line separated chunk:
 *   ## heading   ### sub heading   > callout   ![alt](https://res.cloudinary.com/...)
 *   [[cta label|url]]   - [label](url) lines for a link list   anything else: paragraph
 */
export function parseBlocksText(source: string): unknown[] {
  const chunks = source.replace(/\r\n/g, "\n").split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  return chunks.map((chunk): unknown => {
    let m: RegExpMatchArray | null;
    if ((m = chunk.match(/^(#{2,3})\s+(.+)$/s))) return { type: "heading", level: m[1].length === 3 ? 3 : 2, text: m[2].replace(/\n/g, " ") };
    if (chunk.startsWith(">")) return { type: "callout", text: chunk.split("\n").map((l) => l.replace(/^>\s?/, "")).join("\n") };
    if ((m = chunk.match(/^!\[([^\]]*)\]\(([^)]+)\)$/))) return { type: "image", alt: m[1], src: m[2] };
    if ((m = chunk.match(/^\[\[([^|\]]+)\|([^\]]+)\]\]$/))) return { type: "cta", label: m[1], href: m[2] };
    const lines = chunk.split("\n");
    if (lines.every((l) => /^-\s+\[[^\]]+\]\([^)]+\)$/.test(l))) {
      return { type: "links", items: lines.map((l) => { const r = l.match(/^-\s+\[([^\]]+)\]\(([^)]+)\)$/)!; return { label: r[1], href: r[2] }; }) };
    }
    return { type: "paragraph", text: chunk };
  });
}

export function blocksToText(blocks: PageBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading": return `${"#".repeat(b.level)} ${b.text}`;
        case "callout": return b.text.split("\n").map((l) => `> ${l}`).join("\n");
        case "links": return b.items.map((i) => `- [${i.label}](${i.href})`).join("\n");
        case "image": return `![${b.alt}](${b.src})`;
        case "cta": return `[[${b.label}|${b.href}]]`;
        default: return b.text;
      }
    })
    .join("\n\n");
}

export type PageVersionRef = { version: number };
/** Next version number; versions are append-only so rollback never loses history. */
export function nextVersion(existing: PageVersionRef[]): number {
  return existing.reduce((max, v) => Math.max(max, v.version), 0) + 1;
}

/** Publishing needs a version that exists; rollback is publishing an older one. */
export function publishProblem(existing: PageVersionRef[], version: number): string | null {
  return existing.some((v) => v.version === version) ? null : "النسخة المطلوبة غير موجودة.";
}
