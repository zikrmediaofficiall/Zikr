import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildInventory } from "../lib/db-inventory.mjs";

const fresh = buildInventory();
const stored = JSON.parse(readFileSync("src/features/admin/omnis/db-inventory.generated.json", "utf8"));
assert.deepEqual(stored, fresh, "db-inventory.generated.json is stale: run node scripts/generate-db-inventory.mjs");
assert.ok(fresh.tables.length > 50 && fresh.routes.length > 20, "inventory looks empty");
assert.ok(fresh.tables.every((t) => t.rls), "every listed table has RLS");
console.log("db-inventory tests passed");
