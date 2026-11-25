import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// OMNIS P11-02: static inventory of tables (with RLS and policy counts), migrations and API routes.
const name = String.raw`(?:public\.)?"?([a-z0-9_]+)"?`;

export function buildInventory({ migrationsDir = "supabase/migrations", apiDir = "src/app/api" } = {}) {
  const tables = new Map();
  const migrations = [];
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    migrations.push(file.replace(/\.sql$/, ""));
    const sql = readFileSync(join(migrationsDir, file), "utf8").replace(/--[^\n]*/g, "");
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?${name}\s*\(`, "gi"))) {
      const t = m[1].toLowerCase();
      if (!tables.has(t)) tables.set(t, { table: t, createdIn: file.slice(0, 14), rls: false, policies: 0, dropped: false });
    }
    for (const m of sql.matchAll(new RegExp(String.raw`alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?${name}\s+enable\s+row\s+level\s+security`, "gi"))) {
      const row = tables.get(m[1].toLowerCase()); if (row) row.rls = true;
    }
    for (const m of sql.matchAll(new RegExp(String.raw`create\s+policy\s+(?:"[^"]+"|[a-z0-9_]+)\s+on\s+${name}`, "gi"))) {
      const row = tables.get(m[1].toLowerCase()); if (row) row.policies += 1;
    }
    for (const m of sql.matchAll(new RegExp(String.raw`drop\s+table\s+(?:if\s+exists\s+)?${name}`, "gi"))) {
      const row = tables.get(m[1].toLowerCase()); if (row) row.dropped = true;
    }
  }
  const routes = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/^route\.(ts|tsx|js)$/.test(entry)) {
        const src = readFileSync(full, "utf8");
        const methods = [...src.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
        routes.push({ path: "/" + full.replace(/^src\/app\//, "").replace(/\/route\.[a-z]+$/, ""), methods: [...new Set(methods)] });
      }
    }
  };
  walk(apiDir);
  return {
    migrationCount: migrations.length,
    latestMigration: migrations.at(-1) ?? null,
    tables: [...tables.values()].filter((t) => !t.dropped).sort((a, b) => a.table.localeCompare(b.table)),
    routes,
  };
}
