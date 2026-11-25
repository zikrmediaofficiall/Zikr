/**
 * OMNIS P10-01: pure helpers behind the workflow designer form.
 * Conditions are lines "field op value", actions are lines "type key=value key=value".
 */
import {
  AUTOMATION_ACTION_TYPES,
  validateWorkflowDefinition,
  type AutomationActionType,
  type WorkflowAction,
  type WorkflowCondition,
  type WorkflowDefinition,
} from "./workflow-engine";

const OPS = ["eq", "neq", "gt", "lt", "gte", "lte"] as const;

function scalar(raw: string): string | number | boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.trim() !== "" && Number.isFinite(Number(raw))) return Number(raw);
  return raw;
}

const lines = (text: string) => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

export function parseConditionLines(text: string): { conditions: WorkflowCondition[]; errors: string[] } {
  const conditions: WorkflowCondition[] = [];
  const errors: string[] = [];
  for (const line of lines(text).slice(0, 20)) {
    const [field, op, ...rest] = line.split(/\s+/);
    if (!field || !(OPS as readonly string[]).includes(op) || !rest.length) {
      errors.push(`شرط غير صالح: ${line.slice(0, 60)}`);
      continue;
    }
    conditions.push({ field, op: op as WorkflowCondition["op"], value: scalar(rest.join(" ")) });
  }
  return { conditions, errors };
}

export function parseActionLines(text: string): { actions: WorkflowAction[]; errors: string[] } {
  const actions: WorkflowAction[] = [];
  const errors: string[] = [];
  for (const line of lines(text).slice(0, 10)) {
    const [type, ...pairs] = line.split(/\s+/);
    if (!(AUTOMATION_ACTION_TYPES as readonly string[]).includes(type)) {
      errors.push(`إجراء غير معروف: ${type.slice(0, 40)}`);
      continue;
    }
    const params: Record<string, string | number | boolean> = {};
    for (const pair of pairs) {
      const at = pair.indexOf("=");
      if (at > 0) params[pair.slice(0, at)] = scalar(pair.slice(at + 1));
    }
    actions.push({ type: type as AutomationActionType, ...(Object.keys(params).length ? { params } : {}) });
  }
  return { actions, errors };
}

export function parseFacts(text: string): Record<string, string | number | boolean> {
  const facts: Record<string, string | number | boolean> = {};
  for (const line of lines(text).slice(0, 30)) {
    const at = line.indexOf("=");
    if (at > 0) facts[line.slice(0, at).trim()] = scalar(line.slice(at + 1).trim());
  }
  return facts;
}

export type DesignerFields = {
  key: string;
  triggerType: string;
  triggerName: string;
  conditions: string;
  actions: string;
  verification: string;
  maxAttempts: number;
  baseDelayMs: number;
  timeoutMs: number;
  perHour: number;
};

export function buildWorkflowDefinition(fields: DesignerFields): { def: WorkflowDefinition | null; errors: string[] } {
  const c = parseConditionLines(fields.conditions);
  const a = parseActionLines(fields.actions);
  const def: WorkflowDefinition = {
    key: fields.key.trim().toLowerCase(),
    trigger: { type: fields.triggerType === "schedule" ? "schedule" : "event", name: fields.triggerName.trim() },
    conditions: c.conditions,
    actions: a.actions,
    verification: fields.verification.trim() ? { expect: fields.verification.trim() } : null,
    retry: { maxAttempts: fields.maxAttempts, baseDelayMs: fields.baseDelayMs },
    timeoutMs: fields.timeoutMs,
    rateLimit: { perHour: fields.perHour },
  };
  const errors = [...c.errors, ...a.errors, ...validateWorkflowDefinition(def)];
  return { def: errors.length ? null : def, errors };
}

export function definitionToFields(def: WorkflowDefinition): DesignerFields {
  return {
    key: def.key,
    triggerType: def.trigger.type,
    triggerName: def.trigger.name,
    conditions: def.conditions.map((x) => `${x.field} ${x.op} ${String(x.value)}`).join("\n"),
    actions: def.actions.map((x) => [x.type, ...Object.entries(x.params ?? {}).map(([k, v]) => `${k}=${String(v)}`)].join(" ")).join("\n"),
    verification: def.verification?.expect ?? "",
    maxAttempts: def.retry.maxAttempts,
    baseDelayMs: def.retry.baseDelayMs,
    timeoutMs: def.timeoutMs,
    perHour: def.rateLimit.perHour,
  };
}
