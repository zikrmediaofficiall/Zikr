import { OMNIS_MODULE_DEPENDENCIES } from "@/features/admin/omnis/module-dependencies";

export type OmnisResourceCategory = "page" | "api" | "component" | "service" | "library" | "workflow" | "migration" | "test";
export type OmnisResource = { path: string; category: OmnisResourceCategory; sha: string };
export type OmnisImpactAnalysis = {
  path: string;
  confidence: "area-based";
  directModules: string[];
  affectedModules: string[];
  sharedDependencies: string[];
  explanation: string;
};

export const OMNIS_RESOURCE_CATEGORY_LABELS: Record<OmnisResourceCategory, string> = {
  page: "صفحة",
  api: "واجهة API",
  component: "مكوّن",
  service: "خدمة",
  library: "مكتبة",
  workflow: "Workflow",
  migration: "Migration",
  test: "اختبار",
};

export function normalizeOmnisResourcePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || path.startsWith("/") || path.length > 500 || path.includes(String.fromCharCode(92))) return null;
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  if (segments.some((segment) => !/^[a-zA-Z0-9._@+-]+$/.test(segment))) return null;
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
  {
    prefixes: ["supabase/migrations/", "src/lib/supabase/"],
    moduleIds: ["database-studio", "cloud-infrastructure", "security-recovery"],
    explanation: "تغيير قاعدة البيانات أو موصل Supabase قد يؤثر في التخزين والصلاحيات والوحدات التي تعتمد على قاعدة البيانات.",
  },
  {
    prefixes: [".github/workflows/", ".circleci/"],
    moduleIds: ["cloud-infrastructure", "software-development", "release-deployment"],
    explanation: "تغيير CI أو Workflow قد يؤثر في التحقق والبناء والجدولة والنشر.",
  },
  {
    prefixes: ["src/features/admin/omnis/", "src/features/admin/services/"],
    moduleIds: ["global-command", "universal-control", "identity-access", "security-recovery"],
    explanation: "تغيير طبقة OMNIS أو خدمات الإدارة قد يؤثر في القيادة والصلاحيات والتدقيق.",
  },
  {
    prefixes: ["src/features/video/", "src/app/admin/video/"],
    moduleIds: ["video-production", "media-assets", "omnichannel-publishing", "kids-learning"],
    explanation: "تغيير الفيديو قد يؤثر في التوليد والوسائط والتوزيع وسياسات عرض الأطفال.",
  },
  {
    prefixes: ["src/features/social/", "src/app/admin/social/"],
    moduleIds: ["omnichannel-publishing", "growth-campaigns", "audience-intelligence"],
    explanation: "تغيير النشر الاجتماعي قد يؤثر في القنوات والجدولة والتحليلات.",
  },
  {
    prefixes: ["src/features/content/", "src/app/admin/content/"],
    moduleIds: ["content-os", "knowledge-verification", "seo-search"],
    explanation: "تغيير المحتوى قد يؤثر في التحرير والتحقق والفهرسة.",
  },
  {
    prefixes: ["src/app/api/"],
    moduleIds: ["api-integrations", "identity-access", "cloud-infrastructure"],
    explanation: "تغيير API قد يؤثر في عقود التكامل والمصادقة والبنية التشغيلية.",
  },
  {
    prefixes: ["src/app/"],
    moduleIds: ["website-experience", "seo-search"],
    explanation: "تغيير مسار أو صفحة في الموقع قد يؤثر في تجربة الموقع والفهرسة.",
  },
  {
    prefixes: ["src/features/"],
    moduleIds: ["universal-control", "business-intelligence"],
    explanation: "التغيير داخل نطاق ميزة يحتاج مراجعة مالك الميزة واعتمادياتها المشتركة.",
  },
];

/** Area-based pre-change impact estimate; not an import-graph or test-coverage proof. */
export function analyzeOmnisResourceImpact(value: unknown): OmnisImpactAnalysis | null {
  const path = normalizeOmnisResourcePath(value);
  if (!path) return null;
  const rule = IMPACT_RULES.find((item) => item.prefixes.some((prefix) => path.startsWith(prefix)));
  if (!rule) {
    return {
      path,
      confidence: "area-based",
      directModules: [],
      affectedModules: [],
      sharedDependencies: [],
      explanation: "لم تتطابق المسارات المعروفة؛ يلزم تحديد مالك الملف ومراجعة الاعتماديات يدويًا قبل التغيير.",
    };
  }
  const byModule = new Map(OMNIS_MODULE_DEPENDENCIES.map((item) => [item.moduleId, item.dependencyIds]));
  const sharedDependencies = new Set(rule.moduleIds.flatMap((moduleId) => [...(byModule.get(moduleId) ?? [])]));
  const affectedModules = new Set(rule.moduleIds);
  for (const relation of OMNIS_MODULE_DEPENDENCIES) {
    if (relation.dependencyIds.some((dependencyId) => sharedDependencies.has(dependencyId))) {
      affectedModules.add(relation.moduleId);
    }
  }
  return {
    path,
    confidence: "area-based",
    directModules: [...rule.moduleIds],
    affectedModules: [...affectedModules].sort(),
    sharedDependencies: [...sharedDependencies].sort(),
    explanation: rule.explanation,
  };
}
