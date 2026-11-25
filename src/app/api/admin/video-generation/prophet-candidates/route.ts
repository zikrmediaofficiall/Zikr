import { NextResponse } from "next/server";
import { requireAdminApi } from "@/features/admin/services/admin";
import { buildProphetEpisodeCandidate, PROPHET_STORY_RESEARCH_CANDIDATES } from "@/features/videos/data/prophet-story-series";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi("video.manage");
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status, headers: { "Cache-Control": "no-store" } });
  }
  const candidates = PROPHET_STORY_RESEARCH_CANDIDATES.flatMap((story) =>
    story.storyBeats.flatMap((beat) => {
      const candidate = buildProphetEpisodeCandidate(story.id, beat.sequence);
      return candidate ? [{
        id: candidate.id,
        prophetId: candidate.prophetId,
        prophetAr: candidate.prophetAr,
        beatSequence: candidate.episodeNumber,
        title: candidate.episodeTitleAr,
        summary: candidate.researchSummaryAr,
        sourceReferences: candidate.sourceReferences,
        sourceUrls: candidate.sourceUrls,
        excludedDetails: candidate.excludedDetails,
        clayVisualGuidance: candidate.clayVisualGuidance,
        visualRules: candidate.visualRules,
        editorialStatus: candidate.editorialStatus,
        autoPublishEligible: candidate.autoPublishEligible,
      }] : [];
    }),
  );
  return NextResponse.json({ candidates, total: candidates.length }, { headers: { "Cache-Control": "no-store" } });
}
