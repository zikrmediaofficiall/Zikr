import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const gitBlobSha = (content) => {
  const bytes = Buffer.from(content, "utf8");
  return createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`))
    .update(bytes)
    .digest("hex");
};
const parseJsonl = (content, label) => content
  .split(/\r?\n/)
  .filter((line) => line.trim().length > 0)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${label} contains invalid JSON on line ${index + 1}: ${error.message}`);
    }
  });
const format = (value) => value.toLocaleString("en-US");

const manifestPath = "docs/audits/REPOSITORY_MANIFEST_a0f51cdc3fc31503.jsonl";
const matrixPath = "docs/audits/REPOSITORY_FILE_STATUS_MATRIX_a0f51cdc3fc31503.jsonl";
const inventoryPath = "docs/audits/REPOSITORY_INVENTORY_a0f51cdc3fc31503.md";
const projectStatusPath = "PROJECT_STATUS.md";
const ledgerPath = "docs/audits/CONTINUOUS_CLOSEOUT_LEDGER.md";

const manifestText = read(manifestPath);
const matrixText = read(matrixPath);
const inventoryText = read(inventoryPath);
const projectStatusText = read(projectStatusPath);
const ledgerText = read(ledgerPath);

const manifest = parseJsonl(manifestText, "Repository manifest");
const matrix = parseJsonl(matrixText, "Repository file-status matrix");
const manifestEntries = manifest.filter((row) => row.kind === "entry");
const snapshot = manifest.find((row) => row.kind === "snapshot");
const manifestFiles = manifestEntries.filter((row) => row.type === "blob");
const manifestDirectories = manifestEntries.filter((row) => row.type === "tree");
const matrixFiles = matrix.filter((row) => row.kind === "file");

assert.ok(snapshot, "the manifest must include its immutable snapshot header");
assert.equal(manifestEntries.length, 2459, "the immutable main snapshot must contain 2,459 recursive entries");
assert.equal(snapshot.entry_count, 2459, "the snapshot header must agree with the recursive entry count");
assert.equal(snapshot.blob_count, 1959, "the snapshot header must agree with the tracked blob count");
assert.equal(snapshot.directory_count, 500, "the snapshot header must agree with the directory count");
assert.equal(manifestFiles.length, 1959, "the main snapshot must contain 1,959 tracked blobs");
assert.equal(manifestDirectories.length, 500, "the main snapshot must contain 500 directories");
assert.equal(matrixFiles.length, manifestFiles.length, "every tracked blob must have exactly one matrix row");

const manifestByPath = new Map(manifestFiles.map((row) => [row.path, row.sha]));
const matrixByPath = new Map(matrixFiles.map((row) => [row.path, row.blob_sha]));
assert.equal(matrixByPath.size, matrixFiles.length, "the matrix must not contain duplicate file paths");
assert.deepEqual(
  [...matrixByPath.keys()].sort(),
  [...manifestByPath.keys()].sort(),
  "manifest and matrix file paths must match exactly",
);
for (const [path, sha] of manifestByPath) {
  assert.equal(matrixByPath.get(path), sha, `matrix blob SHA must match the immutable manifest for ${path}`);
}

const unreviewed = matrixFiles.filter((row) => row.status === "UNREVIEWED");
const highPriorityUnreviewed = unreviewed.filter((row) => row.priority === "HIGH" || row.priority === "CRITICAL");
const nonUnreviewed = matrixFiles.length - unreviewed.length;
assert.equal(unreviewed.length, 1194, "the current audit checkpoint's unreviewed count must match the matrix");
assert.equal(highPriorityUnreviewed.length, 377, "the current audit checkpoint's high-priority count must match the matrix");

const manifestBlobSha = gitBlobSha(manifestText);
const matrixBlobSha = gitBlobSha(matrixText);
const inventoryBlobSha = gitBlobSha(inventoryText);
const projectStatusBlobSha = gitBlobSha(projectStatusText);

assert.ok(inventoryText.includes(manifestBlobSha), "inventory must pin the exact immutable manifest blob");
assert.ok(inventoryText.includes(matrixBlobSha), "inventory must pin the exact matrix blob");
assert.ok(inventoryText.includes(`- \`UNREVIEWED\`: ${unreviewed.length}`), "inventory must report the exact unreviewed count");
assert.ok(inventoryText.includes("High-priority `UNREVIEWED`: **" + highPriorityUnreviewed.length + "**"), "inventory must report the exact high-priority count");
assert.ok(inventoryText.includes(`Non-\`UNREVIEWED\` file rows: **${nonUnreviewed}**`), "inventory must report the exact non-unreviewed count");

assert.ok(projectStatusText.includes(manifestBlobSha), "project status must pin the immutable manifest blob");
assert.ok(projectStatusText.includes(matrixBlobSha), "project status must pin the exact matrix blob");
assert.ok(projectStatusText.includes(inventoryBlobSha), "project status must pin the exact inventory blob");
assert.ok(projectStatusText.includes(`**${format(unreviewed.length)} UNREVIEWED**`), "project status must report the exact unreviewed count");
assert.ok(projectStatusText.includes(`**${format(highPriorityUnreviewed.length)} high-priority**`), "project status must report the exact high-priority count");
assert.ok(projectStatusText.includes(`${format(nonUnreviewed)} rows have a non-UNREVIEWED status`), "project status must report the exact non-unreviewed count");

assert.ok(ledgerText.includes(manifestBlobSha), "closeout ledger must pin the immutable manifest blob");
assert.ok(ledgerText.includes(matrixBlobSha), "closeout ledger must pin the exact matrix blob");
assert.ok(ledgerText.includes(inventoryBlobSha), "closeout ledger must pin the exact inventory blob");
assert.ok(ledgerText.includes(projectStatusBlobSha), "closeout ledger must pin the exact project-status blob");

console.log(
  `Repository audit artifacts passed: ${manifestFiles.length} files, ${manifestDirectories.length} directories, ${unreviewed.length} unreviewed (${highPriorityUnreviewed.length} high priority).`,
);
