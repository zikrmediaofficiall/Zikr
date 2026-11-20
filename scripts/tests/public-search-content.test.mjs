import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("src/features/search/services/search.ts", "utf8");
assert.match(service, /getPublicContentLibrary\(1000, "ar"\)/);
assert.match(service, /type: "content"/);
assert.match(service, /href: "\/content\/" \+ item\.slug/);
assert.match(service, /mapPublicSearchRows\(rows\)/);

const contentRoute = readFileSync("src/app/content/[slug]/page.tsx", "utf8");
assert.match(contentRoute, /getPublicContentBySlug/);

console.log("Public search content-library mapping and fallback contracts passed.");
