import { ContentGuide } from "@/components/content/content-guide";
import type { Metadata } from "next";
import { QuranCatalogPage } from "@/features/quran/components/quran-catalog-page";
import { pageMetadata } from "@/lib/site";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "القرآن الكريم",
  description:
    "اقرأ واستمع إلى القرآن الكريم كاملاً: 114 سورة مع التفسير والتلاوات الصوتية بأصوات كبار القراء.",
  path: "/quran",
});

export default async function QuranPage() {
  const isEnglish = (await getRequestLocale()) === "en";
  return (
    <>
      <QuranCatalogPage />
      <div className="container mx-auto px-4 pb-12">
        {isEnglish ? (
          <ContentGuide
            locale="en"
            title="Guide to reading and listening to the Quran"
            intro="This page is the Mushaf index inside Zikr. Choose a surah to read, and use search and resume-reading when available."
            items={[
              "The index covers all 114 surahs, with each surah's verse count and place of revelation from the content database.",
              "From the index you can open a surah page, then the verse and its tafsir where available.",
              "Resume reading saves your place when the Supabase service is configured.",
              "Recitation audio and tafsir are separate from the Quran text, so you can read the text even when an audio source is unavailable.",
            ]}
            links={[
              { label: "Quran: text and audio", href: "https://quran.com/" },
              { label: "Surah Al-Ahzab 41-42: a Quran citation example", href: "https://quran.com/33/41-42" },
            ]}
            note="This page does not rank surahs or reciters. Core religious content comes from the sources configured in the project, with outside links for reference only."
          />
        ) : (
        <ContentGuide
          title="دليل القراءة والاستماع في القرآن الكريم"
          intro="هذه الصفحة هي بوابة فهرس المصحف داخل ذِكر. اختر السورة للقراءة، واستخدم البحث والعودة إلى القراءة السابقة عندما تكون الميزة متاحة."
          items={[
            "الفهرس مبني على السور الـ114، مع بيانات السورة وعدد آياتها ونوع نزولها بحسب قاعدة المحتوى.",
            "يمكن الانتقال من فهرس السور إلى صفحة السورة ثم إلى الآية والتفسير عند توفره.",
            "ميزة متابعة القراءة تحفظ نقطة الاستكمال للمستخدم عندما تكون خدمة Supabase مهيأة.",
            "التلاوات الصوتية والتفسير منفصلان عن نص المصحف، لذلك يمكن استخدام القراءة النصية حتى عند تعذر مصدر صوتي.",
          ]}
          links={[
            { label: "القرآن — نص واستماع", href: "https://quran.com/" },
            { label: "سورة الأحزاب 41–42 — مثال على الإحالة القرآنية", href: "https://quran.com/33/41-42" },
          ]}
          note="الصفحة لا تعطي ترتيبًا تفضيليًا للسور أو القراء. المحتوى الديني الأساسي يُعرض من المصادر المهيأة داخل المشروع، مع روابط خارجية للرجوع فقط."
        />
        )}
      </div>
    </>
  );
}
