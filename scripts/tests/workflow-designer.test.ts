import assert from "node:assert/strict";
import { buildWorkflowDefinition, definitionToFields, parseFacts } from "../../src/features/automation/workflow-designer";

const fields = { key: "alert-on-failures", triggerType: "event", triggerName: "video.failed", conditions: "failed_count gte 5\nenv eq production", actions: "notify_admin message=hello\nrevalidate_path path=/admin", verification: "audit event exists", maxAttempts: 3, baseDelayMs: 500, timeoutMs: 10000, perHour: 6 };
const built = buildWorkflowDefinition(fields);
assert.deepEqual(built.errors, []);
assert.equal(built.def?.conditions[0].value, 5);
assert.equal(built.def?.actions[1].params?.path, "/admin");
assert.deepEqual(definitionToFields(built.def!), fields, "round trip");
assert.ok(buildWorkflowDefinition({ ...fields, actions: "drop_database" }).errors.length, "unknown action rejected");
assert.ok(buildWorkflowDefinition({ ...fields, conditions: "bad" }).errors.length, "bad condition rejected");
assert.ok(buildWorkflowDefinition({ ...fields, verification: "" }).errors.length, "verification required");
assert.ok(buildWorkflowDefinition({ ...fields, key: "X" }).errors.length, "bad key rejected");
assert.deepEqual(parseFacts("failed_count=7\nenv=production\nok=true"), { failed_count: 7, env: "production", ok: true });
console.log("workflow-designer tests passed");
