import { NextRequest, NextResponse } from "next/server";
import { hasExplicitKidsVideoIntentMarker, normalizeVideoAudience } from "@/features/videos/services/video-audience-visibility";
import { requireAdminApi } from "@/features/admin/services/admin";
import { requireAdminStepUpApi } from "@/features/admin/services/security";
import { readBoundedJsonBody } from "@/lib/request/bounded-json-body";
import { recordAdminAuditEvent } from "@/features/admin/services/audit";
import { runPostCommitAudit } from "@/features/admin/services/post-commit-audit";
import { createVideoGenerationRequest } from "@/features/videos/services/video-automation";
import { resolveVideoSource } from "@/features/videos/services/video-sources";
import { resolveCuratedVideoSource } from "@/features/videos/data/curated-content";
import { supabaseServerAdminRequest } from "@/lib/supabase/server";
import { isVideoTemplateAssetAllowedForAudience, parseVideoTemplateConfig } from "@/features/videos/services/template-config";
import { versionedTemplateLabel } from "@/features/videos/services/video-template-version";
import { resolveVideoResolution } from "@/features/videos/services/video-render-contract";
import { isReadyAdminNarrationAsset, parseAdminNarrationAssetUrl } from "@/features/media/services/video-audio-source";
import { LAYL_EPISODES, LAYL_PROGRAM_ID } from "@/features/videos/data/layl-program";

const VALID_CATEGORIES = [
  "quran",
  "hadith",
  "story",
  "dua",
  "adhkar",
  "other",
] as const;
const SOURCE_LOCKED_CATEGORIES = new Set<string>([
  "quran",
  "hadith",
  "story",
  "dua",
  "adhkar",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}


export async function POST(request: NextRequest) {
  const auth = await requireAdminStepUpApi("video.manage", "/admin/video/studio");
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.error, nextPath: "nextPath" in auth ? auth.nextPath : undefined },
      { status: auth.status, headers: { "Cache-Control": "no-store" } },
    );

  try {
    const bodyResult = await readBoundedJsonBody(request, 64 * 1024);
    if (!bodyResult.ok) {
      return NextResponse.json(
        { error: bodyResult.error },
        { status: bodyResult.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    const body: unknown = bodyResult.value;
    if (!isObject(body))
      return NextResponse.json(
        { error: "بيانات طلب الفيديو غير صالحة." },
        { status: 400 }
      );

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const category = typeof body.category === "string" ? body.category : "";
    if (
      title.length < 3 ||
      title.length > 180 ||
      description.length < 5 ||
      description.length > 1000
    ) {
      return NextResponse.json(
        { error: "أدخل عنوانًا (3–180 حرفًا) ووصفًا (5–1000 حرف)." },
        { status: 400 }
      );
    }
    if (
      !VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])
    ) {
      return NextResponse.json(
        { error: "تصنيف الفيديو غير صالح." },
        { status: 400 }
      );
    }

    const submittedContent = isObject(body.content) ? body.content : {};
    const submittedKidsIntent = hasExplicitKidsVideoIntentMarker(submittedContent);
    let content: Record<string, unknown> = { ...submittedContent };
    // Audio provenance is server-owned. Never trust URLs or ownership fields
    // supplied inside the generic content object.
    delete content.audioUrl;
    delete content.audioSource;
    delete content.audioMediaAssetId;
    delete content.audioMediaAssetOwnerId;
    delete content.audio;
    const qualityProfile = {
      version: "2026.1",
      audience: category === "other" ? "general" : "family",
      hookSeconds: 3,
      structure: ["hook", "context", "source", "reflection", "action", "cta"],
      visualBeats: 6,
      pacing: category === "quran" || category === "adhkar" ? "calm" : "dynamic",
      captions: true,
      sourceCard: category !== "other",
      endCard: true,
      safeArea: true,
      audioMix: "voice-first",
      reviewRequired: true,
    } as const;
    content = {
      ...content, qualityProfile, approvalStatus: "awaiting_human_review",
      approvalReviewedAt: null, qualityReview: null,
      aiDisclosure: {
        version: "2026-01",
        statementAr: "قد تُستخدم أدوات الذكاء الاصطناعي في العناصر المرئية والتعليقات المصاحبة؛ النص المرجعي الديني يظل مقفلاً من المصدر الموثوق.",
        sourceTextLocked: SOURCE_LOCKED_CATEGORIES.has(category),
      },
    };
    let narration = "";
    let source: Awaited<ReturnType<typeof resolveVideoSource>> = null;

    if (SOURCE_LOCKED_CATEGORIES.has(category)) {
      const sourceId =
        typeof body.sourceId === "string" ? body.sourceId.trim() : "";
      if (!sourceId) {
        return NextResponse.json(
          { error: "اختر نصًا منشورًا من مكتبة المصادر قبل إنشاء الفيديو." },
          { status: 400 }
        );
      }
      source = await resolveVideoSource(category, sourceId);
      if (!source)
        source = resolveCuratedVideoSource(sourceId) as typeof source;
      if (!source || source.category !== category) {
        return NextResponse.json(
          {
            error:
              "المصدر غير موجود أو غير منشور أو لا يحتوي على مرجع موثوق. حدّث قائمة المصادر واختر مصدرًا آخر.",
          },
          { status: 422 }
        );
      }
      narration = source.text;
      content = {
        ...content,
        type: category,
        sourceType: category,
        sourceId: source.id,
        sourceUrl: source.sourceUrl,
        sourceLabel: source.sourceLabel,
        textAr: source.text,
        text: source.text,
        prompt: source.text,
        aiMode: "source_locked",
        sourceVerifiedAtRequest: true,
        audience: source.audience ?? "general",
        ...(source.seriesId ? { seriesId: source.seriesId } : {}),
        ...(source.seriesTitle ? { seriesTitle: source.seriesTitle } : {}),
        ...(Number.isInteger(source.seasonNumber) ? { seasonNumber: source.seasonNumber } : {}),
        ...(Number.isInteger(source.episodeNumber) ? { episodeNumber: source.episodeNumber } : {}),
        ...(source.episodeTitle ? { episodeTitle: source.episodeTitle } : {}),
        ...(source.ageGroup ? { ageGroup: source.ageGroup } : {}),
        ...(source.learningObjective ? { learningObjective: source.learningObjective } : {}),
        ...(source.visualTheme ? { visualTheme: source.visualTheme } : {}),
        ...(source.generationMode ? { generationMode: source.generationMode } : {}),
        ...(Number.isInteger(source.factorySequence) ? { factorySequence: source.factorySequence } : {}),
        ...(source.audience === "kids" ? { voiceProfile: "kids_friendly", contentFormat: "series_episode" } : {}),
        ...(source.audioUrl ? { audioUrl: source.audioUrl } : {}),
        ...(source.grade ? { gradeAr: source.grade } : {}),
        ...(source.additionalSources?.length
          ? { additionalSources: source.additionalSources }
          : {}),
        ...(category === "quran"
          ? {
              surahId: Number(source.id.split(":")[1]),
              ayahNumber: Number(source.id.split(":")[2]),
            }
          : {}),
      };
    } else {
      const candidate =
        typeof body.narration === "string" ? body.narration : "";
      narration = candidate.replace(/\s+/g, " ").trim();
      if (narration.length < 30 || narration.length > 2500) {
        return NextResponse.json(
          { error: "النص العام يجب أن يكون بين 30 و2500 حرف." },
          { status: 400 }
        );
      }
      content = {
        ...content,
        type: category,
        text: narration,
        script: narration,
        prompt: narration,
        aiMode: "general_reminder",
      };
    }

    if (content.workflow === "layl-program") {
      const episodeNumber = Number(submittedContent.episodeNumber);
      const episode = LAYL_EPISODES.find((item) => item.number === episodeNumber);
      const validEpisodeRequest =
        category === "other" &&
        submittedContent.seriesId === LAYL_PROGRAM_ID &&
        Boolean(episode) &&
        submittedContent.sourceLabel === episode?.referenceLabel &&
        submittedContent.sourceUrl === episode?.referenceUrl &&
        submittedContent.visualBackground === episode?.visualBackground;
      if (!validEpisodeRequest || !episode) {
        return NextResponse.json(
          { error: "بيانات حلقة برنامج ليل أو مرجعها غير معتمد." },
          { status: 422, headers: { "Cache-Control": "no-store" } },
        );
      }
      content = {
        ...content,
        programId: LAYL_PROGRAM_ID,
        maxDurationSeconds: 120,
        voiceProfile: "egyptian_male_story",
        visualTheme: "layl",
        visualBackground: episode.visualBackground,
        skipSocialPublish: true,
        sourceType: "editorial",
        sourceLabel: episode.referenceLabel,
        sourceUrl: episode.referenceUrl,
        editorialNote: episode.editorialNote,
        seriesId: LAYL_PROGRAM_ID,
        seriesTitle: "دقيقتين مع ليل",
        seasonNumber: 1,
        episodeNumber: episode.number,
        episodeTitle: episode.title,
        audience: "general",
        videoFormat: "vertical",
        resolution: "1080x1920",
      };
    } else {
      // Program-only render privileges are server-owned and cannot be requested by generic clients.
      delete content.programId;
      delete content.maxDurationSeconds;
    }

    const requestedAudience = normalizeVideoAudience(content.audience);
    if (!requestedAudience) {
      return NextResponse.json({ error: "فئة الجمهور غير معروفة؛ تم إيقاف إنشاء الفيديو." }, { status: 422 });
    }
    if ((submittedKidsIntent || hasExplicitKidsVideoIntentMarker(content)) && requestedAudience !== "kids") {
      return NextResponse.json(
        { error: "توجد علامات محتوى أطفال مع فئة جمهور عامة؛ حدّد فئة الأطفال وامتلك صلاحية إدارة قسم الأطفال." },
        { status: 422 },
      );
    }
    content = { ...content, audience: requestedAudience };

    if (requestedAudience === "kids") {
      const kidsAuth = await requireAdminApi("kids.manage");
      if (!kidsAuth.ok) {
        return NextResponse.json(
          { error: kidsAuth.error },
          { status: kidsAuth.status, headers: { "Cache-Control": "no-store" } },
        );
      }
      if (kidsAuth.profile.id !== auth.profile.id) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    if (typeof content.templateVersionId === "string" && content.templateVersionId.trim()) {
      const versionId = content.templateVersionId.trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(versionId)) {
        return NextResponse.json({ error: "إصدار القالب المحدد غير صالح." }, { status: 400 });
      }
      const versions = await supabaseServerAdminRequest<Array<{
        id: string; template_id: string; version: number; config: unknown; status: string;
      }>>(
        `/rest/v1/video_template_versions?id=eq.${encodeURIComponent(versionId)}&select=id,template_id,version,config,status&limit=1`,
      );
      const templateVersion = versions?.[0];
      if (!templateVersion || templateVersion.status !== "active") {
        return NextResponse.json({ error: "اختر إصدار قالب نشطًا؛ المسودات والإصدارات القديمة لا تقبل طلبات إنتاج جديدة." }, { status: 409 });
      }
      const templates = await supabaseServerAdminRequest<Array<{
        id: string; slug: string; audience: "general" | "kids";
      }>>(
        `/rest/v1/video_templates?id=eq.${encodeURIComponent(templateVersion.template_id)}&select=id,slug,audience&limit=1`,
      );
      const template = templates?.[0];
      const config = parseVideoTemplateConfig(templateVersion.config);
      if (!template || !config || !isVideoTemplateAssetAllowedForAudience(config.assetKey, template.audience)) {
        return NextResponse.json({ error: "إعدادات القالب لا تجتاز تحقق محرك الرندر." }, { status: 422 });
      }
      if (requestedAudience !== template.audience) {
        return NextResponse.json({ error: "القالب المختار لا يتوافق مع فئة الجمهور لهذا الفيديو." }, { status: 422 });
      }
      content = {
        ...content,
        templateVersion: versionedTemplateLabel(template.slug, templateVersion.version),
        templateAssetKey: config.assetKey,
        templateAudience: template.audience,
        templateMotion: config.motion,
        templateConfigSnapshot: config,
        videoFormat: config.defaultFormat,
        resolution: config.defaultFormat === "vertical" ? "1080x1920" : "1920x1080",
      };
    }

    try {
      const resolution = resolveVideoResolution(content.resolution, content.videoFormat);
      content = {
        ...content,
        resolution,
        videoFormat: resolution === "1920x1080" ? "horizontal" : "vertical",
      };
    } catch {
      return NextResponse.json(
        { error: "مقاس الفيديو غير مدعوم. اختر 9:16 أو 16:9." },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    }

    let humanAudioUrl: string | null = null;
    let humanAudioAssetId: string | null = null;
    if (typeof body.humanAudioUrl === "string" && body.humanAudioUrl.trim()) {
      if (category === "quran") {
        return NextResponse.json(
          {
            error:
              "تلاوة القرآن تستخدم تسجيل التلاوة المرتبط بالآية؛ لا يمكن استبداله بتسجيل غير مرتبط بالمصدر.",
          },
          { status: 400 }
        );
      }
      const parsedAudio = parseAdminNarrationAssetUrl(
        body.humanAudioUrl,
        process.env.CLOUDINARY_CLOUD_NAME?.trim(),
      );
      const requestedAssetId = typeof body.humanAudioAssetId === "string" ? body.humanAudioAssetId.trim() : "";
      if (!parsedAudio || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedAssetId)) {
        return NextResponse.json(
          { error: "ارفع التسجيل من الاستوديو واختر أصل الوسائط المسجل المرتبط به." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
      const trackedAssets = await supabaseServerAdminRequest<Array<{
        id: string; url: string; storage_path: string; mime_type: string | null;
        media_type: string | null; asset_type: string | null; size_bytes: number | string | null;
        created_by: string | null; published: boolean; metadata: unknown;
      }>>(
        `/rest/v1/media_assets?select=id,url,storage_path,mime_type,media_type,asset_type,size_bytes,created_by,published,metadata&id=eq.${encodeURIComponent(requestedAssetId)}&url=eq.${encodeURIComponent(parsedAudio.url)}&storage_path=eq.${encodeURIComponent(parsedAudio.publicId)}&created_by=eq.${encodeURIComponent(auth.profile.id)}&limit=2`,
      );
      const trackedAsset = Array.isArray(trackedAssets) && trackedAssets.length === 1 ? trackedAssets[0] : null;
      if (!trackedAsset || !isReadyAdminNarrationAsset(trackedAsset, {
        assetId: requestedAssetId,
        url: parsedAudio.url,
        publicId: parsedAudio.publicId,
        uploaderId: auth.profile.id,
      })) {
        return NextResponse.json(
          { error: "التسجيل غير موجود في مكتبة الوسائط أو لم تكتمل مراجعته وسجل تدقيقه؛ لم يتم إرفاقه بطلب الفيديو." },
          { status: 409, headers: { "Cache-Control": "no-store" } },
        );
      }
      humanAudioUrl = parsedAudio.url;
      humanAudioAssetId = trackedAsset.id;
      content = {
        ...content,
        audioUrl: humanAudioUrl,
        audioSource: "human_recording",
        audioMediaAssetId: humanAudioAssetId,
        audioMediaAssetOwnerId: auth.profile.id,
      };
    }

    const result = await createVideoGenerationRequest({
      title,
      description,
      category,
      content,
    });
    if (!result)
      return NextResponse.json(
        { error: "تعذر حفظ طلب توليد الفيديو." },
        { status: 500 }
      );
    const auditRecorded = await runPostCommitAudit(
      () => recordAdminAuditEvent({
      action: "video_generation.create",
      permission: "video.manage",
      resourceType: "video_generation_requests",
      resourceId: result.id,
      metadata: { category, sourceVerified: Boolean(source), hasHumanAudio: Boolean(humanAudioUrl), humanAudioAssetId, templateVersionId: typeof content.templateVersionId === "string" ? content.templateVersionId : null, templateVersion: typeof content.templateVersion === "string" ? content.templateVersion : null },
      }),
      (auditError) => console.error("[api/admin/videos/create] audit event failed after committed mutation:", auditError),
    );

    return NextResponse.json(
      {
        ...result,
        auditRecorded,
        audioChoice: humanAudioUrl
          ? "human_recording"
          : category === "quran"
            ? "source_quran_recitation"
            : "arabic_neural_tts",
        sourceVerified: Boolean(source),
        humanAudioAssetId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/admin/videos/create] POST:", error);
    return NextResponse.json(
      { error: "تعذر إنشاء طلب الفيديو." },
      { status: 500 }
    );
  }
}
