import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const videoSourceService = readFileSync(
  "src/features/videos/services/video-sources.ts",
  "utf8",
);
const publicStoryService = readFileSync(
  "src/features/stories/services/stories.ts",
  "utf8",
);

test("service-role video story reads enforce the public editorial approval contract", () => {
  const storyQueries = [
    ...videoSourceService.matchAll(/\/rest\/v1\/stories\?([^"`]+)/g),
  ].map((match) => match[1]);

  assert.equal(
    storyQueries.length,
    4,
    "both story resolver paths and both list/fallback paths must be covered",
  );

  for (const query of storyQueries) {
    assert.match(query, /published=eq\.true/);
    assert.match(query, /is_approved=eq\.true/);
    assert.match(query, /user_id=is\.null/);
  }

  assert.match(
    publicStoryService,
    /published=eq\.true&is_approved=eq\.true&user_id=is\.null/,
    "video source selection must stay aligned with the public story service contract",
  );
});
