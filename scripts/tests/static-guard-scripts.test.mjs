import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rls = resolve("scripts/verify-migration-rls-coverage.mjs");
const guards = resolve("scripts/verify-admin-action-guards.mjs");
const run = (script, env) => spawnSync("node", [script], { env: { ...process.env, ...env }, encoding: "utf8" });

const mig = mkdtempSync(join(tmpdir(), "mig-"));
writeFileSync(join(mig, "1.sql"), "create table public.a (id int);\nalter table public.a enable row level security;\n");
assert.equal(run(rls, { MIGRATIONS_DIR: mig }).status, 0, "table with RLS passes");
writeFileSync(join(mig, "2.sql"), "create table if not exists public.b (id int);\n-- alter table public.b enable row level security;\n");
const bad = run(rls, { MIGRATIONS_DIR: mig });
assert.equal(bad.status, 1, "table without RLS fails (commented-out RLS does not count)");
assert.ok(bad.stderr.includes("b"));
writeFileSync(join(mig, "3.sql"), "drop table if exists public.b;\n");
assert.equal(run(rls, { MIGRATIONS_DIR: mig }).status, 0, "dropped tables are ignored");

const root = mkdtempSync(join(tmpdir(), "adm-"));
mkdirSync(join(root, "x"));
writeFileSync(join(root, "x", "actions.ts"), '"use server";\nexport async function ok() {\n  await requireAdminStepUp("a");\n}\n');
assert.equal(run(guards, { ADMIN_ACTIONS_ROOT: root }).status, 0);
writeFileSync(join(root, "x", "more-actions.ts"), '"use server";\nexport async function open() {\n  await doThing();\n}\n');
const open = run(guards, { ADMIN_ACTIONS_ROOT: root });
assert.equal(open.status, 1, "unguarded server action fails");
assert.ok(open.stderr.includes("open"));
console.log("Static guard script contracts passed.");
