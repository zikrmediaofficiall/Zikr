import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.example");
const inventoryPath = path.join(root, "docs/admin/OMNIS_CONFIGURATION_INVENTORY.md");
const env = fs.readFileSync(envPath, "utf8");
const inventory = fs.readFileSync(inventoryPath, "utf8");
const keys = [...new Set([...env.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]))];
const missing = keys.filter((key) => !inventory.includes("`" + key + "`"));
const suspiciousAssignments = inventory.split(/\r?\n/).filter((line) => /^\|\s*`[A-Z][A-Z0-9_]*`\s*\|/.test(line) && /=\s*[^|\s]/.test(line));
if (missing.length || suspiciousAssignments.length) {
  if (missing.length) console.error("Missing environment keys:", missing.join(", "));
  if (suspiciousAssignments.length) console.error("Possible value leakage in inventory:", suspiciousAssignments.join("\n"));
  process.exit(1);
}
console.log(`OMNIS configuration inventory passed: ${keys.length} environment variable names; no values copied.`);
