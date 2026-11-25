import Link from "next/link";
import { Container } from "@/components/ui/container";
import { requireAdminPermission } from "@/features/admin/services/admin";
import { getRequestLocale } from "@/lib/i18n/server";
import TemplateStudioClient from "@/features/admin/video-templates/components/template-studio-client";

export const dynamic = "force-dynamic";

export default async function VideoFactoryTemplatesPage() {
  await requireAdminPermission("video.manage");
  const locale = await getRequestLocale();
  const isEnglish = locale === "en";
  return (
    <Container className={`space-y-8 py-10 ${isEnglish ? "text-left" : "text-right"}`} dir={isEnglish ? "ltr" : "rtl"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/video" className="text-xs text-brand-gold/60 hover:text-brand-gold">{isEnglish ? "← Back to Video Factory" : "← العودة إلى مصنع الفيديو"}</Link>
        <Link href="/admin/video/qa" className="text-xs text-brand-cream/50 hover:text-brand-gold">{isEnglish ? "Quality Center" : "مركز الجودة"}</Link>
      </div>
      <TemplateStudioClient locale={locale} />
    </Container>
  );
}
