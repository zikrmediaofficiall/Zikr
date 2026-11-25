import { OMNIS_MODULE_DEPENDENCIES } from "@/features/admin/omnis/module-dependencies";
import { getTransitiveOmnisImporters, type OmnisImportGraph } from "@/features/admin/omnis/import-graph";

export type OmnisResourceCategory = "page" | "api" | "component" | "service" | "library" | "workflow" | "migration" | "test";
export type OmnisResource = { path: string; category: OmnisResourceCategory; sha: string };
export type OmnisImpactAnalysis = {
  path: string;
  confidence: "import-graph" | "area-based";
  directModules: string[];
  affectedModules: string[];
  sharedDependencies: string[];
  impactedFiles: string[];
  relatedTests: string[];
  explanation: string;
};

export const OMNIS_RESOURCE_CATEGORY_LABELS: Record<OmnisResourceCategory, string> = {
  page: "صفحة", api: "واجهة API", component: "مكوّن", service: "خدمة",
  library: "مكتبة", workflow: "Workflow", migration: "Migration", test: "اختبار",
};

export function normalizeOmnisResourcePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || path.startsWith("/") || path.length > 500 || path.includes(String.fromCharCode(92))) return null;
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  if (segments.some((segment) => !/^[a-zA-Z0-9._@+-]+$/.test(segment) && !/^\[[a-zA-Z0-9._@-]+\]$/.test(segment))) return null;
  return path;
}

export function classifyOmnisResource(value: unknown): OmnisResourceCategory | null {
  const path = normalizeOmnisResourcePath(value);
  if (!path) return null;
  const basename = path.split("/").at(-1) ?? "";
  if (path.startsWith(".github/workflows/")) return "workflow";
  if (path.startsWith("supabase/migrations/")) return "migration";
  if (path.startsWith("scripts/tests/") || /\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/.test(basename)) return "test";
  if (path.startsWith("src/app/api/") && basename.startsWith("route.")) return "api";
  if (path.startsWith("src/app/") && ["page.", "layout.", "loading.", "error.", "not-found."].some((prefix) => basename.startsWith(prefix))) return "page";
  if ((path.startsWith("src/features/") || path.startsWith("src/components/")) && path.split("/").includes("components") && /\.(tsx|ts|jsx|js)$/.test(basename)) return "component";
  if (path.startsWith("src/features/") && path.split("/").includes("services") && /\.(ts|tsx)$/.test(basename)) return "service";
  if (path.startsWith("src/lib/")) return "library";
  return null;
}

const IMPACT_RULES: ReadonlyArray<{ prefixes: readonly string[]; moduleIds: readonly string[]; explanation: string }> = [
  { prefixes: ["supabase/migrations/", "src/lib/supabase/"], moduleIds: ["database-studio", "cloud-infrastructure", "security-recovery"], explanation: "تغيير قاعدة البيانات أو موصل Supabase قد يؤثر في التخزين والصلاحيات والوحدات التي تعتمد على قاعدة البيانات." },
  { prefixes: [".github/workflows/", ".circleci/"], moduleIds: ["cloud-infrastructure", "software-development", "release-deployment"], explanation: "تغيير CI أو Workflow قد يؤثر في التحقق والبناء والجدولة والنشر." },
  { prefixes: ["src/features/admin/omnis/", "src/features/admin/services/"], moduleIds: ["global-command", "universal-control", "identity-access", "security-recovery"], explanation: "تغيير طبقة OMNIS أو خدمات الإدارة قد يؤثر في القيادة والصلاحيات والتدقيق." },
  { prefixes: ["src/features/videos/", "src/features/video/", "src/app/admin/video/"], moduleIds: ["video-production", "media-assets", "omnichannel-publishing", "kids-learning"], explanation: "تغيير الفيديو قد يؤثر في التوليد والوسائط والتوزيع وسياسات عرض الأطفال." },
  { prefixes: ["src/features/social/", "src/app/admin/social/"], moduleIds: ["omnichannel-publishing", "growth-campaigns", "audience-intelligence"], explanation: "تغيير النشر الاجتماعي قد يؤثر في القنوات والجدولة والتحليلات." },
  { prefixes: ["src/features/content/", "src/app/admin/content/"], moduleIds: ["content-os", "knowledge-verification", "seo-search"], explanation: "تغيير المحتوى قد يؤثر في التحرير والتحقق والفهرسة." },
  { prefixes: ["src/app/api/"], moduleIds: ["api-integrations", "identity-access", "cloud-infrastructure"], explanation: "تغيير API قد يؤثر في عقود التكامل والمصادقة والبنية التشغيلية." },
  { prefixes: ["src/app/"], moduleIds: ["website-experience", "seo-search"], explanation: "تغيير مسار أو صفحة في الموقع قد يؤثر في تجربة الموقع والفهرسة." },
  { prefixes: ["src/features/"], moduleIds: ["universal-control", "business-intelligence"], explanation: "التغيير داخل نطاق ميزة يحتاج مراجعة مالك الميزة واعتمادياتها المشتركة." },
];

function matchingRule(path: string) {
  return IMPACT_RULES.find((item) => item.prefixes.some((prefix) => path.startsWith(prefix)));
}
function isTestPath(path: string): boolean {
  const basename = path.split("/").at(-1) ?? "";
  return path.startsWith("scripts/tests/") || /\.(test|spec)\.(ts|tsx|js|mjs|cjs)$/.test(basename);
}

/** Exact reverse import graph for code; explicit area-based estimate for non-code or missing graphs. */
export function analyzeOmnisResourceImpact(value: unknown, graph?: OmnisImportGraph | null): OmnisImpactAnalysis | null {
  const path = normalizeOmnisResourcePath(value);
  if (!path) return null;
  const directRule = matchingRule(path);
  const hasExactGraph = Boolean(graph?.complete && graph.files.includes(path));
  const importers = hasExactGraph && graph ? getTransitiveOmnisImporters(graph, path) : [];
  const impactedPaths = [path, ...importers];
  const moduleIds = new Set<string>(directRule?.moduleIds ?? []);
  if (hasExactGraph) {
    for (const importer of importers) {
      for (const moduleId of matchingRule(importer)?.moduleIds ?? []) moduleIds.add(moduleId);
    }
  }
  const byModule = new Map(OMNIS_MODULE_DEPENDENCIES.map((item) => [item.moduleId, item.dependencyIds]));
  const sharedDependencies = new Set([...moduleIds].flatMap((moduleId) => [...(byModule.get(moduleId) ?? [])]));
  const affectedModules = new Set(moduleIds);
  for (const relation of OMNIS_MODULE_DEPENDENCIES) {
    if (relation.dependencyIds.some((dependencyId) => sharedDependencies.has(dependencyId))) affectedModules.add(relation.moduleId);
  }
  const relatedTests = hasExactGraph ? importers.filter(isTestPath).slice(0, 50) : [];
  const explanation = hasExactGraph
    ? "تم تتبع " + importers.length + " ملفًا يستورد هذا المورد مباشرة أو بصورة انتقالية من خريطة البناء. المراكز المالكة مشتقة من نطاقات الملفات المستوردة، وتظل مراجعة الاختبارات وسلوك التشغيل مطلوبة."
    : directRule?.explanation ?? "لم تتطابق المسارات المعروفة؛ يلزم تحديد مالك الملف ومراجعة الاعتماديات يدويًا قبل التغيير.";
  return {
    path,
    confidence: hasExactGraph ? "import-graph" : "area-based",
    directModules: [...(directRule?.moduleIds ?? [])],
    affectedModules: [...affectedModules].sort(),
    sharedDependencies: [...sharedDependencies].sort(),
    impactedFiles: impactedPaths.slice(0, 100),
    relatedTests,
    explanation,
  };
}

export type OmnisChangeScopeEntry = {
  path: string;
  scope: "scoped" | "exempt" | "unscoped";
  affectedModules: string[];
  relatedTests: string[];
  needsTestReview: boolean;
};
export type OmnisChangeScope = {
  entries: OmnisChangeScopeEntry[];
  unscoped: string[];
  needsTestReview: string[];
  ok: boolean;
};

const EXEMPT_PREFIXES = ["docs/", "public/", ".gitignore", "README", "package.json", "pnpm-lock.yaml", "tsconfig", "eslint", "next.config", "CLAUDE.md", "AGENTS.md"] as const;
const CODE_CATEGORIES: ReadonlySet<OmnisResourceCategory> = new Set(["page", "api", "component", "service", "library"]);

/**
 * P04-03: a change set is "scoped" when every changed file has a known owner area (impact rule or
 * resource category) or is documentation/config. Unknown paths block the change (ok=false) so no
 * unreviewed area is modified. Code files with an exact import graph but no importing test are
 * listed for review; they do not block, because tests may cover them indirectly.
 */
export function evaluateOmnisChangeScope(paths: readonly string[], graph?: OmnisImportGraph | null): OmnisChangeScope {
  const entries: OmnisChangeScopeEntry[] = [];
  for (const raw of paths) {
    const path = normalizeOmnisResourcePath(raw);
    if (!path) {
      entries.push({ path: String(raw), scope: "unscoped", affectedModules: [], relatedTests: [], needsTestReview: false });
      continue;
    }
    if (EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      entries.push({ path, scope: "exempt", affectedModules: [], relatedTests: [], needsTestReview: false });
      continue;
    }
    const category = classifyOmnisResource(path);
    const analysis = analyzeOmnisResourceImpact(path, graph);
    const known = Boolean(matchingRule(path)) || category !== null || isTestPath(path);
    const exact = analysis?.confidence === "import-graph";
    entries.push({
      path,
      scope: known ? "scoped" : "unscoped",
      affectedModules: analysis?.affectedModules ?? [],
      relatedTests: analysis?.relatedTests ?? [],
      needsTestReview: known && exact && category !== null && CODE_CATEGORIES.has(category) && (analysis?.relatedTests.length ?? 0) === 0,
    });
  }
  const unscoped = entries.filter((entry) => entry.scope === "unscoped").map((entry) => entry.path);
  return {
    entries,
    unscoped,
    needsTestReview: entries.filter((entry) => entry.needsTestReview).map((entry) => entry.path),
    ok: unscoped.length === 0,
  };
}
