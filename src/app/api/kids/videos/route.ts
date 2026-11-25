import { NextResponse } from "next/server";
import { getKidsGeneratedVideos } from "@/features/videos/services/videos";
import { isKidsVideoGenerationRequestContent } from "@/features/kids/services/kids-video-request-visibility";
import { supabaseServerAdminRequest } from "@/lib/supabase/admin-rest";
import { classifyKidsVideoGenerationRequestId, getConfirmedPublicKidsVideoSocialPlatforms, resolveKidsVideoSocialPublication } from "@/features/social/services/kids-video-social-visibility";
import { loadKidsSocialQueueRows, type KidsSocialQueueRow } from "@/features/social/services/kids-video-social-query";
import { resolveKidsVideoPublicDisclosure } from "@/features/videos/services/video-source-contract";
import {
  buildVideoApprovalSnapshotHashForRequest,
  isAutomatedKidsVideoApprovalRecorded,
  resolveKidsVideoQaStatusForApproval,
  type VideoPublishRequestSnapshot,
} from "@/features/videos/services/video-publish-approval";

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
    // The service enforces published=true, Kids automated QA, a matching current
    // generation-request fingerprint, a matching automated QA approval, and playable media.
    const videos = await getKidsGeneratedVideos(60);
    const requestIds = [...new Set(videos.flatMap((video) => {
      const state = classifyKidsVideoGenerationRequestId(video.metadata?.videoGenerationRequestId);
      return state.kind === "valid" ? [state.id] : [];
    }))];

    const requestById = new Map<string, VideoPublishRequestSnapshot & { id: string }>();
    const socialQueueByRequestId = new Map<string, KidsSocialQueueRow[]>();
    let socialQueueReadSucceeded = requestIds.length === 0;
    if (requestIds.length > 0) {
      const filter = requestIds.map(encodeURIComponent).join(",");
      const [requestsResult, socialRowsResult] = await Promise.allSettled([
        supabaseServerAdminRequest<Array<VideoPublishRequestSnapshot & { id: string }>>(
          "/rest/v1/video_generation_requests?id=in.(" + filter + ")&status=eq.completed&select=id,status,category,video_url,source_hash,content_hash,template_version,content",
          { timeoutMs: 8000, retries: 1, cache: "no-store" },
        ),
        // Include every Kids queue state so a newer supplemental or failed row
        // cannot hide an older confirmed publication or leave a stale badge.
        loadKidsSocialQueueRows(requestIds, supabaseServerAdminRequest),
      ]);
      const requests = requestsResult.status === "fulfilled" ? requestsResult.value : [];
      const socialRows = socialRowsResult.status === "fulfilled" ? socialRowsResult.value : [];
      if (requestsResult.status === "rejected") {
        throw new Error("Could not validate current Kids video approval snapshots.");
      }
      if (socialRowsResult.status === "fulfilled") {
        socialQueueReadSucceeded = true;
      } else {
        console.warn("[api/kids/videos] Could not load linked social posts:", socialRowsResult.reason);
      }

      for (const row of requests ?? []) {
        const content = asRecord(row.content);
        const snapshotHash = buildVideoApprovalSnapshotHashForRequest(row);
        if (!isKidsVideoGenerationRequestContent(content) ||
            !snapshotHash ||
            !isAutomatedKidsVideoApprovalRecorded(content, snapshotHash)) continue;
        requestById.set(row.id, row);
      }
      for (const row of socialRows ?? []) {
        if (!row.content_id) continue;
        const rowsForRequest = socialQueueByRequestId.get(row.content_id) ?? [];
        rowsForRequest.push(row);
        socialQueueByRequestId.set(row.content_id, rowsForRequest);
      }
    }

    const feed = videos.flatMap((video) => {
      const metadata = video.metadata ?? {};
      const requestIdState = classifyKidsVideoGenerationRequestId(metadata.videoGenerationRequestId);
      const requestId = requestIdState.kind === "valid" ? requestIdState.id : "";
      const request = requestById.get(requestId);
      const requestContent = request ? asRecord(request.content) : {};
      const snapshotHash = request ? buildVideoApprovalSnapshotHashForRequest(request) : null;
      const approvedCatalogSnapshot = Boolean(
        request &&
        snapshotHash &&
        isAutomatedKidsVideoApprovalRecorded(requestContent, snapshotHash) &&
        isAutomatedKidsVideoApprovalRecorded(metadata, snapshotHash) &&
        metadata.approvalSnapshotHash === snapshotHash &&
        metadata.approvalReviewerId === requestContent.approvalReviewerId &&
        metadata.approvalReviewedAt === requestContent.approvalReviewedAt &&
        resolveKidsVideoQaStatusForApproval({
          requestContent,
          catalogMetadata: metadata,
          requestId,
          videoUrl: request.video_url ?? "",
          sourceHash: request.source_hash,
          contentHash: request.content_hash,
          templateVersion: request.template_version,
        }) === "passed"
      );
      if (!approvedCatalogSnapshot) return [];
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

      return [{
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
      }];
    });

    return NextResponse.json(feed, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[api/kids/videos] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch Kids videos" }, { status: 500 });
  }
}
