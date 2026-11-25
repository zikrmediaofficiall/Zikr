import { existsSync, readFileSync } from "node:fs";

// OMNIS P12-03: the runbook must exist, keep its required sections, and only
// reference workflows and migrations that actually exist in the repository.
const path = "docs/admin/BACKUP_RECOVERY_RUNBOOK.md";
const failures = [];
if (!existsSync(path)) {
  console.error(`Missing ${path}`);
  process.exit(1);
}
const text = readFileSync(path, "utf8");
for (const heading of ["## 1.", "## 2.", "## 3.", "## 4.", "## 5."]) {
  if (!text.includes(heading)) failures.push(`missing section ${heading}`);
}
if (!/Last drill:/.test(text)) failures.push("missing restore drill record line");
if (!/CONFIRM/.test(text)) failures.push("unverifiable provider facts must be marked CONFIRM");
const refs = [...text.matchAll(/`((?:\.github\/workflows|supabase\/migrations|docs)\/[^`\s]+\.(?:yml|sql|md))`/g)].map((m) => m[1]);
for (const ref of new Set(refs)) {
  if (!existsSync(ref) && !existsSync(`supabase/migrations/${ref}`)) failures.push(`referenced file not found: ${ref}`);
}
for (const m of text.matchAll(/migration `([0-9]{14}_[a-z0-9_]+\.sql)`/g)) {
  if (!existsSync(`supabase/migrations/${m[1]}`)) failures.push(`referenced migration not found: ${m[1]}`);
}
if (failures.length) {
  console.error("Backup and recovery runbook check failed:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`Backup and recovery runbook contract passed (${new Set(refs).size} references checked).`);
