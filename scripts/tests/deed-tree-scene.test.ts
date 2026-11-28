import assert from "node:assert/strict";
import { TREE_THEMES, getTreeTheme, leafCount, treeColors } from "../../src/features/kids/components/games/deed-tree-scene";

const seen = new Set<string>();
for (let level = 0; level < 30; level++) seen.add(getTreeTheme(level));
assert.equal(seen.size, TREE_THEMES.length, "30 levels must reach every tree");
assert.equal(new Set(TREE_THEMES.map(t => treeColors(t).trunk + treeColors(t).leaf)).size, TREE_THEMES.length);
assert.equal(leafCount(0, 4), 0);
assert.equal(leafCount(4, 4), 12);
assert.equal(leafCount(9, 4), 12);
assert.ok(leafCount(2, 4) > leafCount(1, 4), "tree grows as deeds are completed");
assert.equal(leafCount(1, 0), 0);
console.log("Deed tree contract passed: " + seen.size + " trees that grow leaves per completed deed.");
