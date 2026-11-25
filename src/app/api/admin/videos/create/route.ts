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
import { buildKidsSeriesEpisode, validateCanonicalKidsEpisodeSnapshot } from "@/features/videos/data/kids-story-factory";
import { buildProphetEpisodeCandidate, validateProphetEpisodeForQueue } from "@/features/videos/data/prophet-story-series";
import { HADY_SHOW } from "@/features/videos/shows/hady-show";
import { SHOW_TOPIC_BACKGROUNDS, SHOW_TOPIC_THEMES, backgroundForTheme } from "@/features/videos/shows/topic-backgrounds";
import { validateHadyEpisodeForProduction, type HadyEpisode } from "@/features/videos/shows/episode-contract";
import { resolvePromotionalVideoScheduledAt, resolvePromotionalVideoConcept, DEFAULT_PROMO_VIDEO_TIME_ZONE } from "@/features/videos/data/promotional-video-campaign";
import { getServerEnv } from "@/lib/env";

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
    const requestedHookStyle = submittedContent.hookStyle ?? "balanced";
    if (!["balanced", "question", "reflection", "action"].includes(String(requestedHookStyle))) {
      return NextResponse.json({ error: "أسلوب افتتاحية الفيديو غير مدعوم." }, { status: 400 });
    }
    let content: Record<string, unknown> = { ...submittedContent, hookStyle: requestedHookStyle };
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
      const maxNarrationLength = content.workflow === "hady-program" ? 7000 : 2500;
      if (narration.length < 30 || narration.length > maxNarrationLength) {
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


    if (content.workflow === "kids-series") {
      const sequence = Number(submittedContent.factorySequence);
      const episode = buildKidsSeriesEpisode(sequence);
      const snapshot = validateCanonicalKidsEpisodeSnapshot({
        factorySequence: sequence,
        sourceId: submittedContent.sourceId,
        text: typeof body.narration === "string" ? body.narration : submittedContent.textAr,
        seriesId: submittedContent.seriesId,
        seasonNumber: submittedContent.seasonNumber,
        episodeNumber: submittedContent.episodeNumber,
        learningObjective: submittedContent.learningObjective,
      });
      if (!snapshot.ok) {
        return NextResponse.json({ error: "قصة الأطفال لا تطابق الحلقة الأصلية المعتمدة: " + snapshot.errors.join(" | ") }, { status: 422 });
      }
      content = {
        ...content,
        type: "kids_story_episode",
        sourceType: "original_kids_fiction",
        sourceId: episode.sourceId,
        sourceUrl: `${getServerEnv().NEXT_PUBLIC_SITE_URL}/kids`,
        sourceLabel: "قصة تربوية خيالية أصلية من ذِكر — ليست آية أو حديثًا أو واقعة تاريخية.",
        textAr: episode.text,
        text: episode.text,
        script: episode.text,
        prompt: episode.text,
        audience: "kids",
        contentFormat: "series_episode",
        seriesId: episode.seriesId,
        seriesTitle: episode.seriesTitle,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
        episodeTitle: episode.episodeTitle,
        ageGroup: episode.ageGroup,
        learningObjective: episode.learningObjective,
        visualTheme: episode.visualTheme,
        style: episode.visualTheme,
        generationMode: episode.generationMode,
        factorySequence: sequence,
        voiceProfile: "kids_friendly",
        publicPath: "/kids",
        aiMode: "original_kids_story",
      };
      narration = episode.text;
    }

    if (content.workflow === "prophet-story") {
      if (category !== "other") {
        return NextResponse.json({ error: "قصص الأنبياء تُنشأ عبر مسار قصص الأنبياء المراجع فقط." }, { status: 422 });
      }
      const prophetId = typeof submittedContent.prophetId === "string" ? submittedContent.prophetId : "";
      const beatSequence = Number(submittedContent.beatSequence);
      const candidate = buildProphetEpisodeCandidate(prophetId, beatSequence);
      const verifiedReferences = Array.isArray(submittedContent.verifiedReferences)
        ? submittedContent.verifiedReferences.filter((value): value is string => typeof value === "string")
        : [];
      const review = {
        status: "approved" as const,
        reviewerId: auth.profile.id,
        reviewedAt: new Date().toISOString(),
        sourceReferencesVerified: verifiedReferences,
        unsupportedDetailsRemoved: submittedContent.unsupportedDetailsRemoved === true,
        scriptReviewed: submittedContent.scriptReviewed === true,
        childSafetyReviewed: submittedContent.childSafetyReviewed === true,
        symbolicClayVisualsReviewed: submittedContent.symbolicClayVisualsReviewed === true,
      };
      if (!candidate) {
        return NextResponse.json({ error: "مشهد قصة الأنبياء غير موجود في سجل البحث." }, { status: 404 });
      }
      const reviewResult = validateProphetEpisodeForQueue(candidate, review);
      if (!reviewResult.ok) {
        return NextResponse.json({ error: "مراجعة قصة الأنبياء غير مكتملة: " + reviewResult.errors.join(" | ") }, { status: 422 });
      }
      const firstSourceUrl = candidate.sourceUrls[0];
      if (!firstSourceUrl || !candidate.sourceUrls.every((url) => /^https:\/\//i.test(url))) {
        return NextResponse.json({ error: "مراجع القصة غير صالحة؛ تم إيقاف الإنتاج." }, { status: 422 });
      }
      const storyText = candidate.researchSummaryAr;
      content = {
        ...content,
        type: "prophet_story_episode",
        workflow: "prophet-story",
        sourceType: "prophet_story",
        sourceId: candidate.id,
        sourceUrl: firstSourceUrl,
        sourceLabel: "مراجع قرآنية مرشحة راجعها محرر ذِكر: " + candidate.sourceReferences.join("، "),
        additionalSources: candidate.sourceUrls.slice(1).map((url, index) => ({
          label: "مرجع قرآني " + (index + 2),
          url,
        })),
        textAr: storyText,
        text: storyText,
        script: storyText,
        prompt: storyText,
        audience: "kids",
        contentFormat: "series_episode",
        prophetId: candidate.prophetId,
        prophetBeatSequence: candidate.episodeNumber,
        seriesId: candidate.seriesId,
        seriesTitle: candidate.seriesTitleAr,
        seasonNumber: 1,
        episodeNumber: candidate.episodeNumber,
        episodeTitle: candidate.episodeTitleAr,
        ageGroup: "مناسب للأسرة والأطفال",
        learningObjective: "عرض المعنى القرآني دون إضافة تفاصيل غير مثبتة",
        visualTheme: "kids-nature",
        visualBackground: "kids-nature",
        clayVisualGuidance: candidate.clayVisualGuidance,
        prophetVisualRules: candidate.visualRules,
        excludedDetails: candidate.excludedDetails,
        prophetSourceReview: {
          status: "approved",
          reviewerId: review.reviewerId,
          reviewedAt: review.reviewedAt,
          sourceReferencesVerified: review.sourceReferencesVerified,
          unsupportedDetailsRemoved: review.unsupportedDetailsRemoved,
          scriptReviewed: review.scriptReviewed,
          childSafetyReviewed: review.childSafetyReviewed,
          symbolicClayVisualsReviewed: review.symbolicClayVisualsReviewed,
        },
        generationMode: "source_locked_prophet_research",
        voiceProfile: "kids_friendly",
        publicPath: "/kids",
        aiMode: "source_locked",
        sourceVerifiedAtRequest: true,
      };
      narration = storyText;
    }

    if (content.workflow === "promo-campaign") {
      const campaignKey = typeof submittedContent.campaignKey === "string" ? submittedContent.campaignKey : "";
      const localDate = typeof submittedContent.localDate === "string" ? submittedContent.localDate : "";
      const slot = Number(submittedContent.slot);
      const timeZone = DEFAULT_PROMO_VIDEO_TIME_ZONE;
      const concept = resolvePromotionalVideoConcept(campaignKey);
      const scheduledAt = resolvePromotionalVideoScheduledAt(localDate, slot, timeZone);
      if (!concept || !scheduledAt || scheduledAt.getTime() < Date.now() + 15 * 60_000 ||
          title !== concept.title || description !== concept.description) {
        return NextResponse.json({ error: "فكرة الحملة أو موعدها غير صالح. اختر أحد المواعيد الترويجية المعتمدة القادمة." }, { status: 422 });
      }
      const baseUrl = getServerEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
      const featureUrl = baseUrl + concept.featurePath;
      const downloadUrl = baseUrl + concept.ctaPath;
      const automationKey = `promo-manual:${localDate}:${slot}:${concept.key}`;
      content = {
        ...content,
        type: "promotional_product_video",
        workflow: "promo-campaign",
        sourceType: "marketing",
        sourceId: `promo:${concept.key}:${localDate}:${slot}`,
        sourceUrl: featureUrl,
        sourceLabel: "محتوى ترويجي أصلي من منصة ذِكر — عرض لمزايا الموقع والتطبيق",
        campaignKey: concept.key,
        campaignVariant: concept.variationIndex,
        campaignFeature: concept.featureKey,
        campaignFeaturePath: concept.featurePath,
        campaignCtaPath: concept.ctaPath,
        hook: concept.hook,
        ctaUrl: downloadUrl,
        textAr: concept.narration,
        text: concept.narration,
        script: concept.narration,
        publicPath: concept.featurePath,
        visualTheme: concept.visualTheme,
        automationKey,
        promoScheduleTimeZone: timeZone,
        promoScheduledAt: scheduledAt.toISOString(),
        aiMode: "marketing_promo",
        voiceProfile: "egyptian_male_story",
        videoFormat: "vertical",
        resolution: "1080x1920",
      };
      narration = concept.narration;
    }

    if (content.workflow === "hady-program") {
      const theme = typeof submittedContent.theme === "string" ? submittedContent.theme : "";
      const sourceCategory = submittedContent.sourceCategory === "hadith" ? "hadith"
        : submittedContent.sourceCategory === "story" ? "story" : "";
      const sourceId = typeof submittedContent.sourceId === "string" ? submittedContent.sourceId.trim() : "";
      const rawSegments = Array.isArray(submittedContent.segments) ? submittedContent.segments : [];
      const requiredSegmentIds = HADY_SHOW.segments.map((segment) => segment.id);
      const validSegments = rawSegments.length === requiredSegmentIds.length &&
        rawSegments.every((segment, index) => segment && typeof segment === "object" &&
          (segment as Record<string, unknown>).id === requiredSegmentIds[index] &&
          typeof (segment as Record<string, unknown>).text === "string");
      if (!SHOW_TOPIC_THEMES.includes(theme as never) || !sourceCategory || !sourceId ||
          submittedContent.humanReviewed !== true || !validSegments) {
        return NextResponse.json({ error: "أكمل موضوع الحلقة والمصدر والمراجعة البشرية والأجزاء الخمسة قبل الإنتاج." }, { status: 422 });
      }
      const verifiedSource = await resolveVideoSource(sourceCategory, sourceId);
      if (!verifiedSource) {
        return NextResponse.json({ error: "مصدر حلقة هادي غير موجود أو غير منشور؛ حدّث المصادر واختر مصدرًا موثقًا." }, { status: 422 });
      }
      const sourceKind = sourceCategory === "hadith" ? "hadith" as const : "seerah" as const;
      const segments = rawSegments.map((segment, index) => ({
        id: requiredSegmentIds[index],
        text: String((segment as Record<string, unknown>).text),
        ...(index === 2 ? {
          sourceRefs: [{ kind: sourceKind, reference: verifiedSource.id, verified: true }],
        } : {}),
      }));
      const episode = {
        week: Number.isInteger(Number(submittedContent.week)) ? Number(submittedContent.week) : 1,
        titleAr: title,
        theme,
        background: backgroundForTheme(theme as keyof typeof SHOW_TOPIC_BACKGROUNDS),
        segments,
        review: {
          status: "approved" as const,
          reviewer: auth.profile.id,
          reviewedAt: new Date().toISOString(),
        },
      } as HadyEpisode;
      const knownBackgrounds = new Set(Object.values(SHOW_TOPIC_BACKGROUNDS).flatMap((entry) => [entry.primary, ...entry.alternates]));
      const episodeCheck = validateHadyEpisodeForProduction(episode, knownBackgrounds);
      if (!episodeCheck.ok) {
        return NextResponse.json({ error: "حلقة هادي لم تجتز فحص النص والمصدر والمدة: " + episodeCheck.errors.join(" | ") }, { status: 422 });
      }
      const scriptText = episode.segments.map((segment) => segment.text).join("\n\n");
      content = {
        ...content,
        type: "hady_episode",
        workflow: "hady-program",
        hadyShowId: HADY_SHOW.id,
        hadyEpisode: episode,
        hadySourceReference: {
          category: sourceCategory,
          id: verifiedSource.id,
          label: verifiedSource.sourceLabel,
          url: verifiedSource.sourceUrl,
        },
        hadyReview: episode.review,
        sourceType: "editorial",
        sourceLabel: "برنامج دقيقتين مع هادي — نص محرر راجع مصدره",
        sourceUrl: verifiedSource.sourceUrl,
        sourceId: verifiedSource.id,
        textAr: scriptText,
        text: scriptText,
        script: scriptText,
        prompt: scriptText,
        aiMode: "hady_program",
        voiceProfile: HADY_SHOW.host.hostVoiceProfile,
        audience: "general",
        visualTheme: "calm",
        visualBackground: backgroundForTheme(theme as keyof typeof SHOW_TOPIC_BACKGROUNDS),
        maxDurationSeconds: 120,
        videoFormat: "vertical",
        resolution: "1080x1920",
        publicPath: "/videos",
      };
      narration = scriptText;
      source = verifiedSource;
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

    // The two-minute Hady format is a server-validated editorial exception to the 60s Shorts cap.
    if (content.workflow === "hady-program") content.maxDurationSeconds = 135;

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
      metadata: { category, sourceVerified: Boolean(source) || Boolean(content.prophetSourceReview), hasHumanAudio: Boolean(humanAudioUrl), humanAudioAssetId, templateVersionId: typeof content.templateVersionId === "string" ? content.templateVersionId : null, templateVersion: typeof content.templateVersion === "string" ? content.templateVersion : null },
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
        sourceVerified: Boolean(source) || Boolean(content.prophetSourceReview),
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
