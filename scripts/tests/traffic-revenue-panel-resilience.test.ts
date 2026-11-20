import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("analytics traffic panel degrades gracefully when its optional snapshot fails", () => {
  const panel = readFileSync(
    "src/features/admin/components/traffic-revenue-panel.tsx",
    "utf8",
  );

  assert.match(
    panel,
    /getTrafficRevenueSnapshot\(\)\.catch\(\(\) => null\)/,
    "snapshot failures must be contained inside the optional panel",
  );
  assert.match(panel, /if \(!snapshot\)/);
  assert.match(panel, /role="status"/);
  assert.match(panel, /لم يتم استبدال البيانات غير المتاحة بأصفار/);
});
