import { writeFileSync } from "node:fs";
import { buildInventory } from "./lib/db-inventory.mjs";

writeFileSync("src/features/admin/omnis/db-inventory.generated.json", JSON.stringify(buildInventory(), null, 1) + "\n");
console.log("db inventory written");
