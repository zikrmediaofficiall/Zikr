import { NextResponse } from "next/server";
import { getKidsGeneratedVideos } from "@/features/videos/services/videos";
import { isKidsVideoGenerationRequestContent } from "@/features/kids/services/kids-video-request-visibility";
import { supabaseServerAdminRequest } from "@/lib/supabase/admin-rest";
import { classifyKidsVideoGenerationRequestId, getConfirmedPublicKidsVideoSocialPlatforms, resolveKidsVideoSocialPublication } from "@/features/social/services/kids-video-social-visibility";
import { loadKidsSocialQueueRows, type KidsSocialQueueRow } from "@/features/social/services/kids-video-social-query";
import { resolveKidsVideoPublicDisclosure } from "@/features/videos/services/video-source-contract";

export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function confirmedSocialPlatforms(row: KidsSocialQueueRow): string[] {
  return getConfirmedPublicKidsVideoSocialPlatforms(row);
}

export async function GET() {
  try {
    // This service enforces published=true, audience=kids, the Kids generator marker,
    // a passed Kids-specific automated QA snapshot, and playable media.
    const videos = await getKidsGeneratedVideos(60);
    const requestIds = [...new Set(videos.flatMap((video) => {
      const state = classifyKidsVideoGenerationRequestId(video.metadata?.videoGenerationRequestId);
      return state.kind === "valid" ? [state.id] : [];
    }))];

    let requestContentById = new Map<string, Record<string, unknown>>();
    const socialQueueByRequestId = new Map<string, KidsSocialQueueRow[]>();
    let socialQueueReadSucceeded = requestIds.length === 0;
    if (requestIds.length > 0) {
      const filter = requestIds.map(encodeURIComponent).join(",");
      const [requestsResult, socialRowsResult] = await Promise.allSettled([
        supabaseServerAdminRequest<Array<{ id: string; content: unknown }>>(
          "/rest/v1/video_generation_requests?id=in.(" + filter + ")&status=eq.completed&select=id,content",
        ),
        // Include every Kids queue state so a newer supplemental or failed row
        // cannot hide an older confirmed publication or leave a stale badge.
        loadKidsSocialQueueRows(requestIds, supabaseServerAdminRequest),
      ]);
      const requests = requestsResult.status === "fulfilled" ? requestsResult.value : [];
      const socialRows = socialRowsResult.status === "fulfilled" ? socialRowsResult.value : [];
      if (requestsResult.status === "rejected") {
        console.warn("[api/kids/videos] Could not load linked story text:", requestsResult.reason);
      }
      if (socialRowsResult.status === "fulfilled") {
        socialQueueReadSucceeded = true;
      } else {
        console.warn("[api/kids/videos] Could not load linked social posts:", socialRowsResult.reason);
      }

      requestContentById = new Map<string, Record<string, unknown>>();
      for (const row of requests ?? []) {
        const content = asRecord(row.content);
        if (!isKidsVideoGenerationRequestContent(content)) continue;
        requestContentById.set(row.id, content);
      }
      for (const row of socialRows ?? []) {
        if (!row.content_id) continue;
        const rowsForRequest = socialQueueByRequestId.get(row.content_id) ?? [];
        rowsForRequest.push(row);
        socialQueueByRequestId.set(row.content_id, rowsForRequest);
      }
    }

    const feed = videos.map((video) => {
      const metadata = video.metadata ?? {};
      const requestIdState = classifyKidsVideoGenerationRequestId(metadata.videoGenerationRequestId);
      const requestId = requestIdState.kind === "valid" ? requestIdState.id : "";
      const requestContent = requestContentById.get(requestId) ?? {};
      const socialQueueRows = requestIdState.kind === "valid"
        ? socialQueueByRequestId.get(requestId) ?? []
        : [];
      const socialQueueForCaption = socialQueueRows.find((row) => confirmedSocialPlatforms(row).length > 0) ?? null;
      const storyText = typeof metadata.storyText === "string"
        ? metadata.storyText
        : [requestContent.textAr, requestContent.script, requestContent.text]
            .find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;
      const socialCaption = typeof metadata.socialCaption === "string" && metadata.socialCaption.trim()
        ? metadata.socialCaption
        : typeof socialQueueForCaption?.body === "string" && socialQueueForCaption.body.trim()
          ? socialQueueForCaption.body
          : null;
      const disclosure = resolveKidsVideoPublicDisclosure(metadata, video.description, socialCaption);

      return {
        id: video.id,
        title: video.title,
        slug: video.slug,
        description: disclosure.description,
        sourceLabel: disclosure.sourceLabel,
        sourceType: disclosure.sourceType,
        thumbnailUrl: video.thumbnailUrl ?? null,
        createdAt: video.createdAt,
        storyText: storyText?.slice(0, 3000) ?? null,
        socialCaption: disclosure.socialCaption?.slice(0, 4500) ?? null,
        seriesTitle: typeof metadata.seriesTitle === "string"
          ? metadata.seriesTitle
          : typeof requestContent.seriesTitle === "string" ? requestContent.seriesTitle : null,
        seasonNumber: Number.isInteger(metadata.seasonNumber)
          ? metadata.seasonNumber
          : Number.isInteger(requestContent.seasonNumber) ? requestContent.seasonNumber as number : null,
        episodeNumber: Number.isInteger(metadata.episodeNumber)
          ? metadata.episodeNumber
          : Number.isInteger(requestContent.episodeNumber) ? requestContent.episodeNumber as number : null,
        learningObjective: typeof metadata.learningObjective === "string"
          ? metadata.learningObjective
          : typeof requestContent.learningObjective === "string" ? requestContent.learningObjective : null,
        // A missing generation ID cannot prove that no queue row exists.
        // Do not trust legacy catalog metadata for public delivery state.
        socialPublication: requestIdState.kind !== "valid"
          ? null
          : resolveKidsVideoSocialPublication(
              socialQueueRows,
              null,
              socialQueueReadSucceeded,
              false,
            ),
        socialPublicationReadStatus:
          requestIdState.kind !== "valid" || !socialQueueReadSucceeded
            ? "unavailable"
            : "verified",
      };
    });

    return NextResponse.json(feed, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[api/kids/videos] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch Kids videos" }, { status: 500 });
  }
}
