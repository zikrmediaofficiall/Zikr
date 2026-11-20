import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapPublicSearchRows } from "../../src/features/search/public-search-results";

const mapped = mapPublicSearchRows([
  {
    id: "library-1",
    type: "content",
    label_ar: "مادة",
    title: "مادة منشورة",
    subtitle: "مكتبة ذِكر",
    href: "/content/published-item",
  },
  {
    id: "article-1",
    type: "article",
    label_ar: "مقال",
    title: "مقال منشور",
    subtitle: "مقال تعليمي",
    href: "/articles/published-article",
  },
  {
    id: "unsupported-1",
    type: "private_record",
    label_ar: "خاص",
    title: "يجب تجاهله",
    subtitle: "",
    href: "/private",
  },
  {
    id: "external-1",
    type: "content",
    label_ar: "مادة",
    title: "رابط خارجي",
    subtitle: "",
    href: "//example.com",
  },
]);

assert.deepEqual(mapped, [
  {
    id: "library-1",
    type: "content",
    labelAr: "مادة",
    title: "مادة منشورة",
    subtitle: "مكتبة ذِكر",
    href: "/content/published-item",
  },
  {
    id: "article-1",
    type: "article",
    labelAr: "مقال",
    title: "مقال منشور",
    subtitle: "مقال تعليمي",
    href: "/articles/published-article",
  },
]);

const service = readFileSync("src/features/search/services/search.ts", "utf8");
assert.match(service, /getPublicContentLibrary\(1000, "ar"\)/);
assert.match(service, /type: "content"/);
assert.match(service, /href: "\/content\/" \+ item\.slug/);
assert.match(service, /mapPublicSearchRows\(rows\)/);

const contentRoute = readFileSync("src/app/content/[slug]/page.tsx", "utf8");
assert.match(contentRoute, /getPublicContentBySlug/);

console.log("Public search content-library mapping and fallback contracts passed.");
