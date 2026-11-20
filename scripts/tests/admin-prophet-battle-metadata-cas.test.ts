import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("prophet and battle metadata writes use updated_at compare-and-set", () => {
  for (const table of ["prophets", "battles"]) {
    const service = read(`src/features/admin/services/${table}.ts`);
    assert.match(service, /select\("metadata,updated_at"\)/);
    assert.match(service, /update = current\.updated_at/);
    assert.match(service, /update\.eq\("updated_at", current\.updated_at\)/);
    assert.match(service, /update\.is\("updated_at", null\)/);
    assert.match(service, /update\.select\("id"\)\.maybeSingle\(\)/);
    assert.match(service, /\.select\("id"\)\s*\.maybeSingle\(\)/);
  }
});

test("admin metadata and publish actions verify row existence and do not misreport audit failure", () => {
  for (const page of ["prophets", "battles"]) {
    const source = read(`src/app/admin/${page}/page.tsx`);
    assert.match(source, /requireAdminStepUp\(/);
    assert.match(source, /recordAdminAuditEventSafely\(/);
    assert.match(source, /runPostCommitAudit\(/);
    assert.match(source, /typeof .*metadata\?\.youtube_video_id === 'string'/);
  }
});
