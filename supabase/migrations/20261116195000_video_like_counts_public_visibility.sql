BEGIN;

-- Aggregate engagement for an unpublished or otherwise non-public video must
-- remain private even though the summary table is readable by anon/authenticated.
-- The EXISTS subquery is evaluated under the caller's role, so videos_public_read
-- applies its complete general/Kids publication policy to the referenced row.
DROP POLICY IF EXISTS "Public can read video like totals"
  ON public.video_like_counts;

CREATE POLICY "Public can read video like totals"
  ON public.video_like_counts
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.videos AS visible_video
      WHERE visible_video.id = video_like_counts.video_id
    )
  );

-- Authenticated clients must not create likes for videos that their role cannot
-- see through the public catalog policy. The API route also checks visibility,
-- but this protects direct PostgREST inserts that bypass the route.
DROP POLICY IF EXISTS "Users can like videos as themselves"
  ON public.video_likes;

CREATE POLICY "Users can like videos as themselves"
  ON public.video_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.videos AS visible_video
      WHERE visible_video.id = video_likes.video_id
    )
  );

COMMIT;
