import assert from "node:assert/strict";
import test from "node:test";
import { OMNIS_CENTERS } from "@/features/admin/omnis/registry";
import { OMNIS_DEPENDENCY_DEFINITIONS, OMNIS_MODULE_DEPENDENCIES } from "@/features/admin/omnis/module-dependencies";
import {
  buildOmnisModuleStatuses,
  type OmnisDependencyObservation,
} from "@/features/admin/omnis/module-status";

const now = new Date("2026-11-25T05:30:00.000Z");

test("module dependency graph covers all 30 registered OMNIS centers exactly once", () => {
  const moduleIds = OMNIS_MODULE_DEPENDENCIES.map((item) => item.moduleId);
  assert.equal(OMNIS_CENTERS.length, 30);
  assert.equal(moduleIds.length, 30);
  assert.equal(new Set(moduleIds).size, 30);
  assert.deepEqual([...moduleIds].sort(), OMNIS_CENTERS.map((item) => item.id).sort());
});

test("global command center monitors all five operational sources", () => {
  const globalCommand = OMNIS_MODULE_DEPENDENCIES.find((item) => item.moduleId === "global-command");
  assert.deepEqual(globalCommand?.dependencyIds, [
    "supabase-database",
    "github-status",
    "github-workflows",
    "video-generation-queue",
    "vercel-deployment",
  ]);
});

test("the global command remains unknown when a required Vercel probe is missing", () => {
  const dependencies = OMNIS_MODULE_DEPENDENCIES.find((item) => item.moduleId === "global-command");
  assert.ok(dependencies);
  const observations: OmnisDependencyObservation[] = dependencies.dependencyIds
    .filter((dependencyId) => dependencyId !== "vercel-deployment")
    .map((dependencyId) => ({
      dependencyId,
      state: "healthy",
      source: "test probe",
      summary: "available",
      checkedAt: "2026-11-25T05:29:30.000Z",
      latencyMs: 1,
    }));
  const [status] = buildOmnisModuleStatuses({
    moduleIds: ["global-command"],
    definitions: OMNIS_DEPENDENCY_DEFINITIONS,
    relations: OMNIS_MODULE_DEPENDENCIES,
    observations,
    now,
  });
  assert.equal(status?.state, "unknown");
  assert.equal(status?.unknownDependencies, 1);
});

test("all dependency edges resolve to a declared dependency", () => {
  const known = new Set(OMNIS_DEPENDENCY_DEFINITIONS.map((item) => item.id));
  for (const relation of OMNIS_MODULE_DEPENDENCIES) {
    for (const dependencyId of relation.dependencyIds) {
      assert.ok(known.has(dependencyId), `Unknown dependency ${dependencyId} for ${relation.moduleId}`);
    }
  }
});

test("missing probes stay unknown and are never rendered healthy", () => {
  const [status] = buildOmnisModuleStatuses({
    moduleIds: ["ai-model-center"],
    definitions: OMNIS_DEPENDENCY_DEFINITIONS,
    relations: OMNIS_MODULE_DEPENDENCIES,
    observations: [],
    now,
  });
  assert.equal(status.state, "unknown");
  assert.equal(status.unknownDependencies, 1);
  assert.equal(status.dependencies[0]?.freshness, "missing");
});

test("stale probes are converted to unknown", () => {
  const observations: OmnisDependencyObservation[] = [{
    dependencyId: "supabase-database",
    state: "healthy",
    source: "test",
    summary: "probe",
    checkedAt: "2026-11-25T05:00:00.000Z",
    latencyMs: 12,
  }];
  const [status] = buildOmnisModuleStatuses({
    moduleIds: ["content-os"],
    definitions: OMNIS_DEPENDENCY_DEFINITIONS,
    relations: OMNIS_MODULE_DEPENDENCIES,
    observations,
    now,
  });
  assert.equal(status.state, "unknown");
  assert.equal(status.dependencies[0]?.freshness, "stale");
  assert.equal(status.dependencies[0]?.source, null);
});

test("a recent unhealthy dependency degrades the module", () => {
  const observations: OmnisDependencyObservation[] = [{
    dependencyId: "supabase-database",
    state: "degraded",
    source: "test",
    summary: "connection latency high",
    checkedAt: "2026-11-25T05:29:30.000Z",
    latencyMs: 1200,
  }];
  const [status] = buildOmnisModuleStatuses({
    moduleIds: ["content-os"],
    definitions: OMNIS_DEPENDENCY_DEFINITIONS,
    relations: OMNIS_MODULE_DEPENDENCIES,
    observations,
    now,
  });
  assert.equal(status.state, "degraded");
  assert.equal(status.degradedDependencies, 1);
});

test("a recent database failure marks the affected module unavailable", () => {
  const observations: OmnisDependencyObservation[] = [{
    dependencyId: "supabase-database",
    state: "unavailable",
    source: "test",
    summary: "database is not reachable",
    checkedAt: "2026-11-25T05:29:30.000Z",
    latencyMs: null,
    errorCode: "DB_UNREACHABLE",
  }];
  const [status] = buildOmnisModuleStatuses({
    moduleIds: ["content-os"],
    definitions: OMNIS_DEPENDENCY_DEFINITIONS,
    relations: OMNIS_MODULE_DEPENDENCIES,
    observations,
    now,
  });
  assert.equal(status.state, "unavailable");
  assert.equal(status.unavailableDependencies, 1);
});

test("mixed healthy and unknown dependencies remain unknown", () => {
  const observations: OmnisDependencyObservation[] = [{
    dependencyId: "supabase-database",
    state: "healthy",
    source: "test",
    summary: "database available",
    checkedAt: "2026-11-25T05:29:30.000Z",
    latencyMs: 8,
  }];
  const [status] = buildOmnisModuleStatuses({
    moduleIds: ["video-production"],
    definitions: OMNIS_DEPENDENCY_DEFINITIONS,
    relations: OMNIS_MODULE_DEPENDENCIES,
    observations,
    now,
  });
  assert.equal(status.state, "unknown");
  assert.equal(status.healthyDependencies, 1);
  assert.equal(status.unknownDependencies, 3);
});
