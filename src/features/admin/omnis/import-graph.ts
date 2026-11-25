import { posix } from "node:path";

export type OmnisImportGraph = {
  version: 1;
  generatedAt: string;
  commitSha: string | null;
  complete: boolean;
  files: string[];
  imports: Record<string, string[]>;
  importedBy: Record<string, string[]>;
  edgeCount: number;
};

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"];

function normalizeGraphPath(value: string): string | null {
  const path = value.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!path || path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return path;
}

function resolveInternalImport(importer: string, specifier: string, knownFiles: ReadonlySet<string>): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = posix.normalize("src/" + specifier.slice(2));
  else if (specifier.startsWith(".")) base = posix.normalize(posix.join(posix.dirname(importer), specifier));
  else return null;
  if (base.startsWith("../") || base === "..") return null;
  const candidates = new Set<string>([base]);
  const extension = posix.extname(base);
  if (extension) {
    const stem = base.slice(0, -extension.length);
    if ([".js", ".jsx", ".mjs", ".cjs"].includes(extension)) {
      for (const sourceExtension of SOURCE_EXTENSIONS) candidates.add(stem + sourceExtension);
    }
  } else {
    for (const sourceExtension of SOURCE_EXTENSIONS) candidates.add(base + sourceExtension);
    for (const sourceExtension of SOURCE_EXTENSIONS) candidates.add(posix.join(base, "index" + sourceExtension));
  }
  for (const candidate of candidates) if (knownFiles.has(candidate)) return candidate;
  return null;
}

export function buildOmnisImportGraph(input: {
  files: readonly string[];
  specifiersByFile: Readonly<Record<string, readonly string[]>>;
  generatedAt?: string;
  commitSha?: string | null;
}): OmnisImportGraph {
  const files = [...new Set(input.files.map(normalizeGraphPath).filter((path): path is string => Boolean(path)))]
    .sort((a,b) => a.localeCompare(b));
  const knownFiles = new Set(files);
  const imports: Record<string,string[]> = {};
  const importedBy: Record<string,string[]> = {};
  for (const path of files) {
    imports[path] = [];
    importedBy[path] = [];
  }
  let edgeCount = 0;
  for (const importer of files) {
    const targets = new Set<string>();
    for (const specifier of input.specifiersByFile[importer] ?? []) {
      const resolved = resolveInternalImport(importer, specifier, knownFiles);
      if (resolved && resolved !== importer) targets.add(resolved);
    }
    imports[importer] = [...targets].sort((a,b) => a.localeCompare(b));
    edgeCount += imports[importer].length;
    for (const target of imports[importer]) importedBy[target].push(importer);
  }
  for (const value of Object.values(importedBy)) value.sort((a,b) => a.localeCompare(b));
  return {
    version: 1,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    commitSha: input.commitSha ?? null,
    complete: true,
    files,
    imports,
    importedBy,
    edgeCount,
  };
}

export function getTransitiveOmnisImporters(graph: OmnisImportGraph, value: string): string[] {
  const target = normalizeGraphPath(value);
  if (!target || !graph.files.includes(target)) return [];
  const visited = new Set<string>([target]);
  const queue = [target];
  while (queue.length) {
    const current = queue.shift()!;
    for (const importer of graph.importedBy[current] ?? []) {
      if (!visited.has(importer)) {
        visited.add(importer);
        queue.push(importer);
      }
    }
  }
  return [...visited].filter((path) => path !== target).sort((a,b) => a.localeCompare(b));
}

export function isOmnisImportGraph(value: unknown): value is OmnisImportGraph {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const graph = value as Record<string, unknown>;
  const validMap = (candidate: unknown): boolean =>
    Boolean(candidate && typeof candidate === "object" && !Array.isArray(candidate))
    && Object.values(candidate as Record<string,unknown>).every((items) =>
      Array.isArray(items) && items.every((item) => typeof item === "string"));
  return graph.version === 1
    && typeof graph.generatedAt === "string"
    && (graph.commitSha === null || typeof graph.commitSha === "string")
    && graph.complete === true
    && Array.isArray(graph.files)
    && graph.files.every((path) => typeof path === "string")
    && validMap(graph.imports)
    && validMap(graph.importedBy)
    && typeof graph.edgeCount === "number"
    && Number.isSafeInteger(graph.edgeCount)
    && graph.edgeCount >= 0;
}
