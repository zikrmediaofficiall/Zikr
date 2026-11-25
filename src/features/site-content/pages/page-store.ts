import "server-only";

import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { nextVersion, validateBlocks, type PageBlock } from "./page-blocks";

export type CustomPage = { id: string; slug: string; title: string; published_version: number | null; updated_at: string };
export type CustomPageVersion = { version: number; blocks: PageBlock[]; created_at: string };

export async function listCustomPages(): Promise<CustomPage[]> {
  return supabaseServerAdminRequest<CustomPage[]>(
    "/rest/v1/omnis_custom_pages?select=id,slug,title,published_version,updated_at&order=updated_at.desc&limit=200",
    { method: "GET" },
  );
}

export async function getCustomPage(id: string): Promise<CustomPage | null> {
  const rows = await supabaseServerAdminRequest<CustomPage[]>(
    `/rest/v1/omnis_custom_pages?select=id,slug,title,published_version,updated_at&id=eq.${encodeURIComponent(id)}&limit=1`,
    { method: "GET" },
  );
  return rows[0] ?? null;
}

export async function listPageVersions(pageId: string): Promise<CustomPageVersion[]> {
  const rows = await supabaseServerAdminRequest<Array<{ version: number; blocks: unknown; created_at: string }>>(
    `/rest/v1/omnis_custom_page_versions?select=version,blocks,created_at&page_id=eq.${encodeURIComponent(pageId)}&order=version.desc&limit=50`,
    { method: "GET" },
  );
  return rows.flatMap((row) => {
    const checked = validateBlocks(row.blocks);
    return checked.ok ? [{ version: row.version, blocks: checked.blocks, created_at: row.created_at }] : [];
  });
}

/** Public read: only the published version of a page, re-validated before rendering. */
export async function getPublishedPage(slug: string): Promise<{ title: string; blocks: PageBlock[] } | null> {
  const pages = await supabaseServerAdminRequest<Array<{ id: string; title: string; published_version: number | null }>>(
    `/rest/v1/omnis_custom_pages?select=id,title,published_version&slug=eq.${encodeURIComponent(slug)}&limit=1`,
    { method: "GET" },
  );
  const page = pages[0];
  if (!page || page.published_version === null) return null;
  const versions = await supabaseServerAdminRequest<Array<{ blocks: unknown }>>(
    `/rest/v1/omnis_custom_page_versions?select=blocks&page_id=eq.${encodeURIComponent(page.id)}&version=eq.${page.published_version}&limit=1`,
    { method: "GET" },
  );
  const checked = validateBlocks(versions[0]?.blocks);
  return checked.ok ? { title: page.title, blocks: checked.blocks } : null;
}

export { nextVersion };
