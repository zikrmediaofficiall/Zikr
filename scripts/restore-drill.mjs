import { readFileSync } from "node:fs";
import { analyzeDump } from "./lib/restore-drill.mjs";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/restore-drill.mjs <plain-sql-dump-file>");
  process.exit(2);
}
const report = analyzeDump(readFileSync(file, "utf8"));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
