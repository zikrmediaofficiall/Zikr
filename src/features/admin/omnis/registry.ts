export type OmnisCenterStatus = "active" | "partial" | "planned";

export type OmnisCenter = {
  id: string;
  title: string;
  subtitle: string;
  path: string | null;
  status: OmnisCenterStatus;
  description: string;
};

export const OMNIS_CENTERS: readonly OmnisCenter[] = [
  { id: "global-command", title: "القيادة والتحكم الشامل", subtitle: "Executive Command", path: "/admin/omnis", status: "active", description: "الحالة التشغيلية والطوابير والتنبيهات والأوامر الآمنة." },
  { id: "project-explorer", title: "مستكشف المشروع", subtitle: "Project Explorer", path: "/admin/omnis/project", status: "partial", description: "فهرس GitHub للصفحات والخدمات وواجهات API، وخريطة اعتماديات وتحليل أثر نطاقي." },
  { id: "universal-control", title: "التحكم الموحد", subtitle: "Universal Control", path: "/admin/omnis", status: "partial", description: "أوامر موحدة حسب صلاحية المورد ونوع العملية." },
  { id: "configuration-studio", title: "استوديو الإعدادات", subtitle: "Configuration Studio", path: "/admin/settings", status: "partial", description: "سجل إعدادات typed مع مالك ونطاق وتحقق وتاريخ نسخ." },
  { id: "website-experience", title: "استوديو تجربة الموقع", subtitle: "Website Experience", path: "/admin/sections", status: "partial", description: "إدارة الأقسام والصفحات والقوائم والثيمات والمعاينة." },
  { id: "component-builder", title: "منشئ الصفحات والمكونات", subtitle: "Page & Component Builder", path: null, status: "planned", description: "إنشاء مكونات وصفحات من قوالب قابلة لإعادة الاستخدام." },
  { id: "mobile-application", title: "مركز التطبيق", subtitle: "Mobile Application", path: "/admin/android", status: "partial", description: "إعدادات Android والإصدارات والتوقيع والروابط والإشعارات." },
  { id: "journey-analytics", title: "تحليل رحلة المستخدم", subtitle: "Journey Analytics", path: "/admin/analytics", status: "partial", description: "تتبع أحداث الاستخدام ومسارات التصفح بمقاييس خصوصية." },
  { id: "content-os", title: "نظام المحتوى", subtitle: "Universal Content OS", path: "/admin/content", status: "active", description: "إدارة المحتوى والمكتبة والتحرير والتصنيفات والجدولة." },
  { id: "knowledge-verification", title: "التحقق المعرفي", subtitle: "Knowledge Verification", path: "/admin/knowledge", status: "partial", description: "توثيق المصادر والتحقق والمراجعات العلمية." },
  { id: "ai-model-center", title: "مركز نماذج الذكاء الاصطناعي", subtitle: "AI Model Center", path: null, status: "planned", description: "توجيه النماذج والمزودين والبدائل والميزانية والحدود." },
  { id: "video-production", title: "مصنع الإنتاج المرئي", subtitle: "Video Production OS", path: "/admin/video", status: "active", description: "الطلبات والاستوديو والسكريبت والأصوات والقوالب والجودة." },
  { id: "media-assets", title: "إدارة الأصول", subtitle: "Media & Assets", path: "/admin/memory", status: "active", description: "مكتبة الوسائط والمراجع والاحتفاظ والتخزين." },
  { id: "audio-voice", title: "الصوت والراديو", subtitle: "Audio & Voice", path: "/admin/audio", status: "active", description: "التلاوات والأذان وTTS وصوت الموقع." },
  { id: "omnichannel-publishing", title: "النشر متعدد القنوات", subtitle: "Omnichannel Publishing", path: "/admin/social", status: "active", description: "الحسابات والجدولة والطوابير والمزامنة والتحليلات الاجتماعية." },
  { id: "growth-campaigns", title: "محرك النمو والحملات", subtitle: "Growth & Campaigns", path: "/admin/analytics", status: "partial", description: "قياس الحملات ومصادر الزيارات وأهداف النمو." },
  { id: "audience-intelligence", title: "ذكاء الجمهور", subtitle: "Audience Intelligence", path: "/admin/analytics", status: "partial", description: "تحليلات مجمعة للجمهور والأجهزة واللغة والاحتفاظ." },
  { id: "seo-search", title: "محرك SEO والبحث", subtitle: "SEO & Search", path: "/admin/seo", status: "active", description: "SEO والفهرسة والبيانات المنظمة والبحث الداخلي." },
  { id: "business-intelligence", title: "ذكاء الأعمال والتحليلات", subtitle: "Business Intelligence", path: "/admin/analytics", status: "active", description: "لوحات تحليلات قابلة للتخصيص موثقة المصدر." },
  { id: "monetization", title: "إدارة الإيرادات", subtitle: "Revenue & Monetization", path: "/admin/analytics", status: "partial", description: "AdSense والإيرادات الفعلية والتقديرية ومواضع الإعلانات." },
  { id: "identity-access", title: "الهوية والصلاحيات", subtitle: "Identity & Access", path: "/admin/users", status: "active", description: "المستخدمون والأدوار والجلسات والصلاحيات." },
  { id: "community", title: "المجتمع والإشراف", subtitle: "Community & Moderation", path: null, status: "planned", description: "التعليقات والبلاغات والمقترحات والإشراف." },
  { id: "notifications", title: "الإشعارات والرسائل", subtitle: "Notifications", path: "/admin/notifications", status: "active", description: "قنوات الإشعار والقوالب والجداول وحدود الإرسال." },
  { id: "kids-learning", title: "منظومة تعلم الأطفال", subtitle: "Kids Learning", path: "/admin/kids", status: "active", description: "محتوى الأطفال والألعاب والمستويات والأمان." },
  { id: "cloud-infrastructure", title: "البنية السحابية", subtitle: "Cloud Infrastructure", path: "/admin/health", status: "partial", description: "Vercel وSupabase وGitHub وCI وصحة الخدمات." },
  { id: "database-studio", title: "استوديو قاعدة البيانات", subtitle: "Database Studio", path: "/admin/health", status: "partial", description: "جرد الجداول وRLS والترحيلات والفهارس وصحة البيانات." },
  { id: "api-integrations", title: "استوديو التكاملات وAPI", subtitle: "API & Integrations", path: "/admin/health", status: "partial", description: "التكاملات وواجهات API والـ webhooks ومعدلات الفشل." },
  { id: "software-development", title: "مركز التطوير البرمجي", subtitle: "Software Development", path: "/admin/release", status: "partial", description: "الفروع والـ commits وPRs والاختبارات ومراجعات الكود." },
  { id: "release-deployment", title: "الإصدارات والنشر التقني", subtitle: "Release & Deployment", path: "/admin/release", status: "active", description: "Preview وProduction والإصدارات والتراجع." },
  { id: "security-recovery", title: "الأمن والنسخ والتعافي", subtitle: "Security & Recovery", path: "/admin/security", status: "partial", description: "الأمان وMFA وسجل التدقيق والنسخ والاستعادة." }
] as const;

export const OMNIS_CENTER_STATUS_LABELS: Record<OmnisCenterStatus, string> = {
  active: "مركز قائم",
  partial: "تكامل جزئي",
  planned: "ضمن خطة التنفيذ",
};
