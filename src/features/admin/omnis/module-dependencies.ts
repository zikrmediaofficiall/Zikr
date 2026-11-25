import type { OmnisDependencyDefinition, OmnisModuleDependency } from "@/features/admin/omnis/module-status";

/** Required platform dependencies and the maximum age accepted for their probes. */
export const OMNIS_DEPENDENCY_DEFINITIONS: readonly OmnisDependencyDefinition[] = [
  { id: "supabase-database", label: "قاعدة بيانات Supabase", description: "اتصال قاعدة البيانات وقراءة الموارد الأساسية.", owner: "Supabase", staleAfterSeconds: 120 },
  { id: "github-status", label: "حالة GitHub CI", description: "حالة Commit Status على الفرع الأساسي.", owner: "GitHub", staleAfterSeconds: 300 },
  { id: "github-workflows", label: "GitHub Actions", description: "آخر حالات مسارات العمل المراقبة.", owner: "GitHub", staleAfterSeconds: 600 },
  { id: "video-generation-queue", label: "طابور إنتاج الفيديو", description: "إمكانية قراءة حالات طلبات إنتاج الفيديو.", owner: "ZIKR", staleAfterSeconds: 120 },
  { id: "vercel-deployment", label: "نشر Vercel", description: "آخر حالة نشر للموقع والتطبيقات المرتبطة.", owner: "Vercel", staleAfterSeconds: 600 },
  { id: "social-oauth", label: "صلاحيات الحسابات الاجتماعية", description: "صلاحية OAuth وإمكانية تنفيذ عمليات المنصات.", owner: "Social Platforms", staleAfterSeconds: 300 },
  { id: "ai-provider", label: "مزودو الذكاء الاصطناعي", description: "اختبار اتصال مزودي النماذج وحدودهم.", owner: "AI Providers", staleAfterSeconds: 300 },
  { id: "media-storage", label: "تخزين الوسائط", description: "الاتصال بمخازن الصور والفيديو والصوت.", owner: "Cloud Storage", staleAfterSeconds: 300 },
  { id: "audio-provider", label: "مصادر الصوت", description: "اتصال مصادر التلاوات والصوت وخدمات TTS.", owner: "Audio Providers", staleAfterSeconds: 600 },
  { id: "analytics-source", label: "مصادر التحليلات", description: "تحديث البيانات من GA4 والمنصات الاجتماعية.", owner: "Analytics Providers", staleAfterSeconds: 900 },
  { id: "adsense-source", label: "مصدر AdSense", description: "توفر بيانات أداء وإيرادات AdSense.", owner: "Google AdSense", staleAfterSeconds: 1800 },
  { id: "push-delivery", label: "تسليم الإشعارات", description: "توفر قنوات Push والإرسال.", owner: "Push Providers", staleAfterSeconds: 300 },
  { id: "content-source-catalog", label: "كتالوج المصادر", description: "قابلية قراءة مصادر المعرفة والتحقق.", owner: "ZIKR Content", staleAfterSeconds: 300 },
] as const;

/**
 * Explicit ownership graph. Unknown probes remain visible until their real
 * provider adapter is implemented; the graph does not imply service health.
 */
export const OMNIS_MODULE_DEPENDENCIES: readonly OmnisModuleDependency[] = [
  { moduleId: "global-command", dependencyIds: ["supabase-database", "github-status", "github-workflows", "video-generation-queue", "vercel-deployment"] },
  { moduleId: "project-explorer", dependencyIds: ["github-status"] },
  { moduleId: "universal-control", dependencyIds: ["supabase-database"] },
  { moduleId: "configuration-studio", dependencyIds: ["supabase-database"] },
  { moduleId: "website-experience", dependencyIds: ["supabase-database", "vercel-deployment"] },
  { moduleId: "component-builder", dependencyIds: ["github-status"] },
  { moduleId: "mobile-application", dependencyIds: ["github-workflows", "vercel-deployment"] },
  { moduleId: "journey-analytics", dependencyIds: ["supabase-database", "analytics-source"] },
  { moduleId: "content-os", dependencyIds: ["supabase-database"] },
  { moduleId: "knowledge-verification", dependencyIds: ["supabase-database", "content-source-catalog"] },
  { moduleId: "ai-model-center", dependencyIds: ["ai-provider"] },
  { moduleId: "video-production", dependencyIds: ["supabase-database", "video-generation-queue", "ai-provider", "media-storage"] },
  { moduleId: "media-assets", dependencyIds: ["supabase-database", "media-storage"] },
  { moduleId: "audio-voice", dependencyIds: ["supabase-database", "audio-provider", "media-storage"] },
  { moduleId: "omnichannel-publishing", dependencyIds: ["supabase-database", "social-oauth", "media-storage"] },
  { moduleId: "growth-campaigns", dependencyIds: ["analytics-source", "social-oauth"] },
  { moduleId: "audience-intelligence", dependencyIds: ["analytics-source"] },
  { moduleId: "seo-search", dependencyIds: ["supabase-database", "vercel-deployment"] },
  { moduleId: "business-intelligence", dependencyIds: ["supabase-database", "analytics-source"] },
  { moduleId: "monetization", dependencyIds: ["adsense-source", "analytics-source"] },
  { moduleId: "identity-access", dependencyIds: ["supabase-database"] },
  { moduleId: "community", dependencyIds: ["supabase-database"] },
  { moduleId: "notifications", dependencyIds: ["supabase-database", "push-delivery"] },
  { moduleId: "kids-learning", dependencyIds: ["supabase-database", "media-storage"] },
  { moduleId: "cloud-infrastructure", dependencyIds: ["supabase-database", "github-status", "github-workflows", "vercel-deployment"] },
  { moduleId: "database-studio", dependencyIds: ["supabase-database"] },
  { moduleId: "api-integrations", dependencyIds: ["supabase-database", "github-workflows"] },
  { moduleId: "software-development", dependencyIds: ["github-status", "github-workflows"] },
  { moduleId: "release-deployment", dependencyIds: ["github-status", "github-workflows", "vercel-deployment"] },
  { moduleId: "security-recovery", dependencyIds: ["supabase-database", "github-workflows"] },
] as const;
