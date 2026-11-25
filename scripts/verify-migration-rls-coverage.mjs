import { readdirSync, readFileSync } from "node:fs";

// OMNIS P14-01: every public table created by a migration must enable RLS in some
// migration (unless dropped later or allowlisted). Static check, no database needed.
const DIR = process.env.MIGRATIONS_DIR ?? "supabase/migrations";
const ALLOWLIST = new Set([]);
const created = new Set();
const rls = new Set();
const dropped = new Set();
const name = String.raw`(?:public\.)?"?([a-z0-9_]+)"?`;
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()) {
  const sql = readFileSync(`${DIR}/${file}`, "utf8").replace(/--[^\n]*/g, "");
  for (const m of sql.matchAll(new RegExp(String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?${name}\s*\(`, "gi"))) created.add(m[1].toLowerCase());
  for (const m of sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${name}\s+enable\s+row\s+level\s+security`, "gi"))) rls.add(m[1].toLowerCase());
  for (const m of sql.matchAll(new RegExp(String.raw`drop\s+table\s+(?:if\s+exists\s+)?${name}`, "gi"))) dropped.add(m[1].toLowerCase());
}
const missing = [...created].filter((t) => !rls.has(t) && !dropped.has(t) && !ALLOWLIST.has(t)).sort();
if (missing.length) {
  console.error(`Tables created without RLS in any migration (${missing.length}): ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`Migration RLS coverage passed (${created.size} tables created, ${rls.size} with RLS).`);
