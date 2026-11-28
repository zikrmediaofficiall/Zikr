import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXTRA_SHEET_IDS, EXTRA_SHEET_REGION_COUNT } from "../../src/features/kids/components/games/coloring-extra-sheets";

const catalog = readFileSync("src/features/kids/components/games/kids-values-coloring.tsx", "utf8");
const ids = [...(catalog.split("const COLORING_SHEETS: ColoringSheet[] = [")[1]?.split("];")[0] ?? "").matchAll(/id: "([^"]+)"/g)].map(m => m[1]);
assert.ok(ids.length >= 10, "coloring must offer ten pictures");
assert.equal(new Set(ids).size, ids.length);
for (const id of EXTRA_SHEET_IDS) assert.ok(ids.includes(id), id + " missing in catalog");
const art = readFileSync("src/features/kids/components/games/coloring-extra-sheets.tsx", "utf8");
for (const id of EXTRA_SHEET_IDS) {
  const block = art.split('id === "' + id + '"')[1]?.split("if (id ===")[0] ?? "";
  const regions = new Set([...block.matchAll(/paintable\((\d+)\)/g)].map(m => m[1]));
  assert.equal(regions.size, EXTRA_SHEET_REGION_COUNT, id + " must have exactly 10 paintable regions");
}
console.log("Coloring extra sheets passed: " + ids.length + " pictures, 4 new clay pictures with 10 regions each.");
