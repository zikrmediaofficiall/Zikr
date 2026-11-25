import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const script = resolve("scripts/verify-no-committed-secrets.mjs");
const dir = mkdtempSync(join(tmpdir(), "secret-scan-"));
const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "pipe" });
git("init", "-q");
writeFileSync(join(dir, "clean.txt"), "nothing here\n");
git("add", ".");
assert.equal(spawnSync("node", [script], { cwd: dir }).status, 0, "clean repo must pass");

const fake = ["ghp", "_", "a".repeat(40)].join("");
writeFileSync(join(dir, "leak.env"), `TOKEN=${fake}\n`);
git("add", ".");
const result = spawnSync("node", [script], { cwd: dir, encoding: "utf8" });
assert.equal(result.status, 1, "leaked token must fail");
assert.ok(result.stderr.includes("leak.env:1 GitHub token"));
assert.equal(result.stderr.includes(fake), false, "scanner must never print the secret value");
console.log("Committed secret scan contracts passed.");
