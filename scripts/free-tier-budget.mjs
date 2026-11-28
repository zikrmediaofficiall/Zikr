#!/usr/bin/env node
/**
 * ZIKR — free-tier budget.
 *
 * Every free plan the project depends on has a limit, a reset window and a
 * fallback. This module turns "how much have we used" into one of four states
 * so a pipeline can decide before it spends the allowance, and so the admin
 * page and CI can show the same numbers.
 *
 * Nothing here invents usage. A service with no recorded number is reported as
 * "unknown", never as zero.
 *
 * Usage:
 *   node scripts/free-tier-budget.mjs                          # the registry
 *   node scripts/free-tier-budget.mjs --usage usage.json        # usage vs limits
 *   node scripts/free-tier-budget.mjs --usage usage.json --format md
 *   node scripts/free-tier-budget.mjs --usage usage.json --fail-on warn
 *
 * Usage file shape (write it from the dashboard or from a pipeline counter):
 *   {
 *     "recordedAt": "2026-11-28T07:00:00+02:00",
 *     "services": { "supabase-database": { "used": 210 }, "flow-credits": { "used": 40 } }
 *   }
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REGISTRY_PATH = resolve(HERE, "..", "config", "free-tier-budget.json");

export const STATES = Object.freeze(["ok", "warn", "critical", "unknown"]);

export function loadRegistry(path = DEFAULT_REGISTRY_PATH) {
  const raw = readFileSync(path, "utf8");
  let registry;
  try {
    registry = JSON.parse(raw);
  } catch (error) {
    throw new Error(`free-tier-budget: ${path} is not valid JSON (${error.message}).`);
  }
  validateRegistry(registry);
  return registry;
}

export function validateRegistry(registry) {
  if (!registry || typeof registry !== "object") throw new Error("free-tier-budget: registry must be an object.");
  if (!Array.isArray(registry.services) || registry.services.length === 0) {
    throw new Error("free-tier-budget: registry.services must be a non-empty array.");
  }

  const seen = new Set();
  const allowedWindows = new Set(["second", "day", "week", "month", "instant"]);

  for (const service of registry.services) {
    for (const key of ["id", "name", "provider", "plan", "metric", "unit", "source"]) {
      if (typeof service[key] !== "string" || service[key].trim() === "") {
        throw new Error(`free-tier-budget: service is missing a non-empty "${key}".`);
      }
    }
    if (seen.has(service.id)) throw new Error(`free-tier-budget: duplicate service id "${service.id}".`);
    seen.add(service.id);

    if (typeof service.limit !== "number" || !Number.isFinite(service.limit) || service.limit < 0) {
      throw new Error(`free-tier-budget: "${service.id}" needs a numeric limit of 0 or more.`);
    }
    if (!allowedWindows.has(service.window)) {
      throw new Error(`free-tier-budget: "${service.id}" has an unsupported window "${service.window}".`);
    }
    if (service.selfCap !== undefined) {
      if (typeof service.selfCap !== "number" || !Number.isFinite(service.selfCap) || service.selfCap < 0) {
        throw new Error(`free-tier-budget: "${service.id}" has a non-numeric selfCap.`);
      }
      if (service.selfCap > service.limit) {
        throw new Error(`free-tier-budget: "${service.id}" selfCap ${service.selfCap} exceeds the vendor limit ${service.limit}.`);
      }
    }
  }

  const threshold = registry.alertThresholdPercent;
  if (typeof threshold !== "number" || threshold <= 0 || threshold > 100) {
    throw new Error("free-tier-budget: alertThresholdPercent must be a number above 0 and at most 100.");
  }

  return true;
}

/**
 * The number a pipeline should respect: our own cap when we set one, otherwise
 * the vendor limit.
 */
export function effectiveLimit(service) {
  return typeof service.selfCap === "number" ? service.selfCap : service.limit;
}

export function computeStatus({ limit, used, alertThresholdPercent = 80 }) {
  if (limit === null || limit === undefined || !Number.isFinite(limit)) {
    return { state: "unknown", percent: null, remaining: null };
  }
  if (used === null || used === undefined || !Number.isFinite(used) || used < 0) {
    return { state: "unknown", percent: null, remaining: null };
  }

  // A zero limit is a guard: any usage at all is a breach.
  if (limit === 0) {
    return used > 0
      ? { state: "critical", percent: 100, remaining: 0 }
      : { state: "ok", percent: 0, remaining: 0 };
  }

  const percent = (used / limit) * 100;
  const remaining = Math.max(limit - used, 0);

  if (percent >= 100) return { state: "critical", percent, remaining };
  if (percent >= alertThresholdPercent) return { state: "warn", percent, remaining };
  return { state: "ok", percent, remaining };
}

export function buildReport(registry, usage = null) {
  const threshold = registry.alertThresholdPercent ?? 80;
  const recorded = usage?.services ?? {};

  const rows = registry.services.map((service) => {
    const entry = recorded[service.id];
    const used = typeof entry === "number" ? entry : entry?.used;
    const limit = effectiveLimit(service);
    const status = computeStatus({ limit, used, alertThresholdPercent: threshold });
    return {
      id: service.id,
      name: service.name,
      labelAr: service.labelAr ?? service.name,
      provider: service.provider,
      plan: service.plan,
      unit: service.unit,
      window: service.window,
      limit,
      vendorLimit: service.limit,
      selfCap: service.selfCap ?? null,
      used: typeof used === "number" ? used : null,
      percent: status.percent,
      remaining: status.remaining,
      state: status.state,
      fallback: service.fallback ?? "",
      source: service.source,
      status: service.status ?? "active",
    };
  });

  return {
    recordedAt: usage?.recordedAt ?? null,
    alertThresholdPercent: threshold,
    rows,
    counts: rows.reduce((acc, row) => {
      acc[row.state] = (acc[row.state] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

export function worstState(report) {
  if (report.rows.some((row) => row.state === "critical")) return "critical";
  if (report.rows.some((row) => row.state === "warn")) return "warn";
  if (report.rows.every((row) => row.state === "unknown")) return "unknown";
  return "ok";
}

/**
 * Pipeline guard. Call before spending an allowance:
 *   assertWithinBudget(report, "hf-zerogpu-runs");
 * Throws when the service is at or past its limit, and returns a warning string
 * when it is past the alert threshold.
 */
export function assertWithinBudget(report, serviceId) {
  const row = report.rows.find((item) => item.id === serviceId);
  if (!row) throw new Error(`free-tier-budget: unknown service "${serviceId}".`);
  if (row.state === "critical") {
    throw new Error(
      `free-tier-budget: ${row.name} is at its limit (${row.used}/${row.limit} ${row.unit} per ${row.window}). Use the fallback: ${row.fallback || "none recorded"}.`,
    );
  }
  if (row.state === "warn") {
    return `${row.name} is at ${Math.round(row.percent)}% of its limit (${row.used}/${row.limit} ${row.unit} per ${row.window}).`;
  }
  return null;
}

function formatPercent(percent) {
  if (percent === null) return "—";
  return `${percent.toFixed(percent < 10 ? 1 : 0)}%`;
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function renderMarkdown(report) {
  const lines = [];
  lines.push(`Recorded: ${report.recordedAt ?? "no usage recorded"} | alert at ${report.alertThresholdPercent}%`);
  lines.push("");
  lines.push("| Service | Plan | Used | Limit | Used % | State | Fallback |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const row of report.rows) {
    lines.push(
      `| ${row.name} | ${row.plan} | ${formatNumber(row.used)} ${row.unit} | ${formatNumber(row.limit)} ${row.unit} / ${row.window} | ${formatPercent(row.percent)} | ${row.state} | ${row.fallback} |`,
    );
  }
  return lines.join("\n");
}

export function renderTable(report) {
  const header = ["SERVICE", "USED", "LIMIT", "USED%", "STATE"];
  const body = report.rows.map((row) => [
    row.id,
    `${formatNumber(row.used)}`,
    `${formatNumber(row.limit)}/${row.window}`,
    formatPercent(row.percent),
    row.state,
  ]);
  const widths = header.map((cell, index) => Math.max(cell.length, ...body.map((line) => line[index].length)));
  const line = (cells) => cells.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd();
  return [line(header), widths.map((width) => "-".repeat(width)).join("  "), ...body.map(line)].join("\n");
}

export function parseArgs(argv) {
  const options = { usage: null, format: "table", failOn: "never", service: null, registry: DEFAULT_REGISTRY_PATH };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`${arg} needs a value.`);
      index += 1;
      return value;
    };
    switch (arg) {
      case "--usage": options.usage = next(); break;
      case "--format": options.format = next(); break;
      case "--fail-on": options.failOn = next(); break;
      case "--service": options.service = next(); break;
      case "--registry": options.registry = next(); break;
      case "--help":
      case "-h": options.help = true; break;
      default: throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!["table", "md", "json"].includes(options.format)) {
    throw new Error(`--format must be table, md or json (got ${options.format}).`);
  }
  if (!["never", "warn", "critical"].includes(options.failOn)) {
    throw new Error(`--fail-on must be never, warn or critical (got ${options.failOn}).`);
  }
  return options;
}

const HELP = `ZIKR free-tier budget

  node scripts/free-tier-budget.mjs [--usage usage.json] [--format table|md|json]
                                    [--service <id>] [--fail-on never|warn|critical]

Without --usage the registry itself is printed. With --usage every service is
compared to the limit it will actually respect (selfCap when set, otherwise the
vendor limit) and marked ok, warn (at or past the alert threshold), critical
(at or past the limit) or unknown (no usage recorded).

Exit codes: 0 ok, 2 when --fail-on trips, 1 on error.
`;

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`free-tier-budget: ${error.message}`);
    return 1;
  }

  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }

  try {
    const registry = loadRegistry(options.registry);
    const usage = options.usage ? JSON.parse(readFileSync(options.usage, "utf8")) : null;
    const report = buildReport(registry, usage);

    if (options.service) {
      report.rows = report.rows.filter((row) => row.id === options.service);
      if (report.rows.length === 0) throw new Error(`unknown service "${options.service}".`);
    }

    if (options.format === "json") {
      process.stdout.write(`${JSON.stringify({ ...report, worst: worstState(report) }, null, 2)}\n`);
    } else if (options.format === "md") {
      process.stdout.write(`${renderMarkdown(report)}\n`);
    } else {
      process.stdout.write(`${renderTable(report)}\n`);
      const worst = worstState(report);
      process.stdout.write(`\nworst: ${worst} | ok ${report.counts.ok ?? 0} | warn ${report.counts.warn ?? 0} | critical ${report.counts.critical ?? 0} | unknown ${report.counts.unknown ?? 0}\n`);
    }

    const worst = worstState(report);
    if (options.failOn === "warn" && (worst === "warn" || worst === "critical")) return 2;
    if (options.failOn === "critical" && worst === "critical") return 2;
    return 0;
  } catch (error) {
    console.error(`free-tier-budget: ${error.message}`);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)));
}
