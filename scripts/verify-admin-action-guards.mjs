import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// OMNIS P14-01: every exported server action under src/app/admin must authenticate
// the admin near the top of the function. Static check, no database needed.
const ROOT = process.env.ADMIN_ACTIONS_ROOT ?? "src/app/admin";
const GUARD = /requireAdmin|requireOmnis|requireAnyAdmin|assertAdmin|enforceAdmin/;
function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
const failures = [];
let checked = 0;
for (const file of walk(ROOT).filter((f) => /actions?\.ts$/.test(f) || /-actions\.ts$/.test(f))) {
  const source = readFileSync(file, "utf8");
  if (!source.slice(0, 80).includes('"use server"')) continue;
  for (const m of source.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{([\s\S]{0,600})/g)) {
    checked += 1;
    if (!GUARD.test(m[2])) failures.push(`${file}: ${m[1]}`);
  }
}
if (failures.length) {
  console.error("Admin server actions without an admin guard near the top:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log(`Admin server action guard check passed (${checked} actions).`);
