import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, relative, extname } from "node:path";
import ts from "typescript";
import { buildOmnisImportGraph } from "../src/features/admin/omnis/import-graph";

const ROOT = process.cwd();
const OUTPUT = resolve(ROOT, "src/features/admin/omnis/import-graph.generated.json");
const ROOTS = ["src", "scripts"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "coverage") continue;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile() && EXTENSIONS.has(extname(entry.name))) files.push(absolute);
  }
  return files;
}

function collectSpecifiers(filePath: string, source: string): string[] {
  const kind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX
    : filePath.endsWith(".jsx") ? ts.ScriptKind.JSX
      : /\.(js|mjs|cjs)$/.test(filePath) ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const ast = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, kind);
  if (ast.parseDiagnostics.length) {
    throw new Error("Import graph parse error in " + filePath + ": " + ast.parseDiagnostics.length + " syntax diagnostic(s).");
  }
  const specifiers = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier;
      if (specifier && ts.isStringLiteralLike(specifier)) specifiers.add(specifier.text);
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      if (ts.isLiteralTypeNode(argument) && ts.isStringLiteralLike(argument.literal)) specifiers.add(argument.literal.text);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const first = node.arguments[0];
      const dynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const requireCall = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if ((dynamicImport || requireCall) && ts.isStringLiteralLike(first)) specifiers.add(first.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return [...specifiers];
}

const absoluteFiles = (await Promise.all(ROOTS.map((root) => walk(resolve(ROOT, root)))))
  .flat().sort((a,b) => a.localeCompare(b));
if (!absoluteFiles.length || absoluteFiles.length > 5000) {
  throw new Error("OMNIS import graph inventory is empty or exceeds 5,000 files.");
}
const relativeFiles = absoluteFiles.map((file) => relative(ROOT, file).replace(/\\/g, "/"));
const specifierEntries = await Promise.all(absoluteFiles.map(async (file, index) => {
  const source = await readFile(file, "utf8");
  return [relativeFiles[index], collectSpecifiers(relativeFiles[index], source)] as const;
}));
const candidateSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.CIRCLE_SHA1 ?? process.env.GITHUB_SHA ?? null;
const commitSha = candidateSha && /^[0-9a-f]{40}$/i.test(candidateSha) ? candidateSha.toLowerCase() : null;
const graph = buildOmnisImportGraph({
  files: relativeFiles,
  specifiersByFile: Object.fromEntries(specifierEntries),
  generatedAt: new Date().toISOString(),
  commitSha,
});
await writeFile(OUTPUT, JSON.stringify(graph), "utf8");
console.log("OMNIS import graph generated: " + graph.files.length + " files, " + graph.edgeCount + " internal edges, commit " + (graph.commitSha ?? "unverified") + ".");
