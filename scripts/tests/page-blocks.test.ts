import assert from "node:assert/strict";
import { blocksToText, isCustomPagesEnabled, nextVersion, parseBlocksText, publishProblem, safeHref, safeImageSrc, slugProblem, validateBlocks } from "../../src/features/site-content/pages/page-blocks";

assert.equal(isCustomPagesEnabled({}), false, "off by default");
assert.equal(isCustomPagesEnabled({ CUSTOM_PAGES_ENABLED: "true" }), true);
assert.equal(slugProblem("about-us"), null);
for (const bad of ["Admin", "a", "admin", "with space", "x_y", "-a-", "p"]) assert.ok(slugProblem(bad), `slug rejected: ${bad}`);

assert.equal(safeHref("/quran"), "/quran");
assert.equal(safeHref("//evil.example"), null, "protocol-relative links are rejected");
assert.equal(safeHref("javascript:alert(1)"), null);
assert.equal(safeHref("http://example.com"), null, "plain http is rejected");
assert.equal(safeHref("https://user:pw@example.com"), null, "credentials in URLs are rejected");
assert.ok(safeHref("https://example.com/a?b=1"));
assert.ok(safeImageSrc("https://res.cloudinary.com/demo/image/upload/a.jpg"));
assert.equal(safeImageSrc("https://evil.example/a.jpg"), null, "images only from Cloudinary");
assert.equal(safeImageSrc("/local.png"), null);

const text = "## عنوان\n\nفقرة عادية\nبسطرين\n\n> ملاحظة مهمة\n\n- [القرآن](/quran)\n- [موقع](https://example.com/a)\n\n![صورة](https://res.cloudinary.com/demo/image/upload/a.jpg)\n\n[[ابدأ الآن|/quran]]";
const parsed = validateBlocks(parseBlocksText(text));
assert.ok(parsed.ok, JSON.stringify(parsed));
if (parsed.ok) {
  assert.deepEqual(parsed.blocks.map((b) => b.type), ["heading", "paragraph", "callout", "links", "image", "cta"]);
  assert.equal(blocksToText(parsed.blocks), text, "editor text round-trips");
}
const html = validateBlocks([{ type: "html", text: "<script>x</script>" }]);
assert.ok(!html.ok, "raw HTML blocks do not exist");
const xss = validateBlocks(parseBlocksText("[[click|javascript:alert(1)]]"));
assert.ok(!xss.ok, "unsafe cta href is rejected");
assert.ok(!validateBlocks([]).ok && !validateBlocks("x").ok);
assert.ok(!validateBlocks(Array.from({ length: 61 }, () => ({ type: "paragraph", text: "x" }))).ok, "block cap");
const scrubbed = validateBlocks([{ type: "paragraph", text: "a\u202Eb\u0000c" }]);
assert.ok(scrubbed.ok && scrubbed.blocks[0].type === "paragraph" && scrubbed.blocks[0].text === "abc", "bidi controls and NUL are stripped");

assert.equal(nextVersion([]), 1);
assert.equal(nextVersion([{ version: 1 }, { version: 4 }, { version: 2 }]), 5);
assert.equal(publishProblem([{ version: 1 }], 1), null);
assert.ok(publishProblem([{ version: 1 }], 2));
console.log("Page block contracts passed.");
