import assert from "node:assert/strict";
import test from "node:test";
import { analyzeOmnisResourceImpact, classifyOmnisResource, normalizeOmnisResourcePath } from "@/features/admin/omnis/resource-index";

test("resource classifier recognizes core project resource categories", () => {
  assert.equal(classifyOmnisResource("src/app/admin/page.tsx"), "page");
  assert.equal(classifyOmnisResource("src/app/api/admin/route.ts"), "api");
  assert.equal(classifyOmnisResource("src/features/admin/components/panel.tsx"), "component");
  assert.equal(classifyOmnisResource("src/features/admin/services/platform.ts"), "service");
  assert.equal(classifyOmnisResource("src/lib/supabase/server.ts"), "library");
  assert.equal(classifyOmnisResource(".github/workflows/quality-gate.yml"), "workflow");
  assert.equal(classifyOmnisResource("supabase/migrations/20261125_init.sql"), "migration");
  assert.equal(classifyOmnisResource("scripts/tests/contract.test.mjs"), "test");
});

test("resource paths reject traversal, absolute and malformed paths", () => {
  assert.equal(normalizeOmnisResourcePath("../secrets.env"), null);
  assert.equal(normalizeOmnisResourcePath("/etc/passwd"), null);
  assert.equal(normalizeOmnisResourcePath("src/../.env"), null);
  assert.equal(normalizeOmnisResourcePath("src\\\\secrets.env"), null);
  assert.equal(classifyOmnisResource("src/features/admin/components/panel.exe"), null);
});

test("database migration impact includes database and security owners and expands shared dependencies", () => {
  const impact = analyzeOmnisResourceImpact("supabase/migrations/20261125000000_example.sql");
  assert.ok(impact);
  assert.equal(impact.confidence, "area-based");
  assert.ok(impact.directModules.includes("database-studio"));
  assert.ok(impact.directModules.includes("security-recovery"));
  assert.ok(impact.sharedDependencies.includes("supabase-database"));
  assert.ok(impact.affectedModules.includes("content-os"));
});

test("video feature impact covers its owner and related production dependencies", () => {
  const impact = analyzeOmnisResourceImpact("src/features/video/services/generator.ts");
  assert.ok(impact);
  assert.ok(impact.directModules.includes("video-production"));
  assert.ok(impact.affectedModules.includes("omnichannel-publishing"));
});

test("unknown areas return a manual ownership warning instead of guessed modules", () => {
  const impact = analyzeOmnisResourceImpact("assets/brand/logo.svg");
  assert.ok(impact);
  assert.deepEqual(impact.directModules, []);
  assert.deepEqual(impact.affectedModules, []);
  assert.match(impact.explanation, /لم تتطابق/);
});
