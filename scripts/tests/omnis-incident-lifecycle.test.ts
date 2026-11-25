import assert from "node:assert/strict";
import test from "node:test";

import {
  applyOmnisIncidentLifecycle,
  buildOmnisIncidentHistoryQuery,
  canResolveOmnisIncident,
  type OmnisIncidentLifecycleEvent,
} from "@/features/admin/omnis/incident-lifecycle";
import type { OmnisIncident } from "@/features/admin/omnis/incidents";

const incident = {
  incidentKey: "omnis:supabase-database",
  lifecycleState: "open",
} as unknown as OmnisIncident;

const event = (
  action: OmnisIncidentLifecycleEvent["action"],
  id: string,
  incidentKey = incident.incidentKey,
): OmnisIncidentLifecycleEvent => ({
  id,
  incidentKey,
  action,
  note: null,
  actorUserId: "admin-user",
  createdAt: "2026-11-25T08:00:00.000Z",
});

test("the newest acknowledged audit event is applied to a live incident", () => {
  const result = applyOmnisIncidentLifecycle(
    [incident],
    [
      event("acknowledged", "event-new"),
      event("resolved", "event-old"),
    ],
  );

  assert.equal(result[0]?.lifecycleState, "acknowledged");
});

test("a previously resolved incident is shown as reopened when it becomes live again", () => {
  const result = applyOmnisIncidentLifecycle(
    [incident],
    [event("resolved", "event-resolved")],
  );

  assert.equal(result[0]?.lifecycleState, "reopened");
});

test("events for another dependency do not change this incident", () => {
  const result = applyOmnisIncidentLifecycle(
    [incident],
    [event("acknowledged", "event-other", "omnis:github-status")],
  );

  assert.equal(result[0]?.lifecycleState, "open");
});

test("incident history query filters lifecycle events and has deterministic ordering", () => {
  const query = new URL(
    buildOmnisIncidentHistoryQuery(),
    "https://example.invalid",
  );
  assert.equal(query.searchParams.get("resource_type"), "eq.omnis_incident");
  assert.equal(
    query.searchParams.get("action"),
    "in.(admin.omnis.incident.acknowledged,admin.omnis.incident.resolved)",
  );
  assert.equal(query.searchParams.get("order"), "created_at.desc,id.desc");
  assert.equal(query.searchParams.get("limit"), "50");
});

test("incident resolution requires at least one recent healthy probe and all dependencies healthy", () => {
  const healthy = {
    state: "healthy" as const,
    freshness: "fresh" as const,
    checkedAt: "2026-11-25T08:00:00.000Z",
    source: "Supabase probe",
  };

  assert.equal(canResolveOmnisIncident([healthy]), true);
  assert.equal(canResolveOmnisIncident([healthy, healthy]), true);
  assert.equal(canResolveOmnisIncident([]), false);
  assert.equal(canResolveOmnisIncident([
    healthy,
    { ...healthy, state: "unknown" as const },
  ]), false);
  assert.equal(canResolveOmnisIncident([
    healthy,
    { ...healthy, freshness: "stale" as const },
  ]), false);
  assert.equal(canResolveOmnisIncident([
    healthy,
    { ...healthy, checkedAt: null },
  ]), false);
  assert.equal(canResolveOmnisIncident([
    healthy,
    { ...healthy, source: null },
  ]), false);
});

console.log("OMNIS incident lifecycle persistence and recovery contracts passed.");
