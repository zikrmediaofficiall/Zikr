// OMNIS P12-03: offline check of a plain-format pg_dump file. It proves a dump is structurally
// restorable-looking (header, required tables, data present). It does NOT replace restoring into a scratch database.
export const REQUIRED_TABLES = ["content_library", "content_sources", "quran_ayahs", "hadiths", "profiles", "admin_audit_events"];

export function analyzeDump(sql, required = REQUIRED_TABLES) {
  const problems = [];
  if (!/^-- PostgreSQL database dump/m.test(sql)) problems.push("missing pg_dump header");
  if (!/-- PostgreSQL database dump complete/.test(sql)) problems.push("dump looks truncated (no completion footer)");
  const created = new Set([...sql.matchAll(/^CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?"?([a-z0-9_]+)"?/gim)].map((m) => m[1]));
  const rows = new Map();
  for (const m of sql.matchAll(/^COPY (?:public\.)?"?([a-z0-9_]+)"? \([^)]*\) FROM stdin;\n([\s\S]*?)\n\\\.$/gm)) {
    rows.set(m[1], m[2] ? m[2].split("\n").length : 0);
  }
  for (const table of required) {
    if (!created.has(table)) problems.push(`table ${table} not created in dump`);
    else if (!rows.has(table)) problems.push(`table ${table} has no data section`);
  }
  return { ok: problems.length === 0, tables: created.size, rowsByTable: Object.fromEntries(rows), problems };
}
