-- Extend the local scene library to 50 renderer-backed templates.
-- General and Kids assets remain isolated in the version RPC as well as application QA.
ALTER TABLE public.video_templates
  DROP CONSTRAINT IF EXISTS video_templates_asset_key_check;

ALTER TABLE public.video_templates
  ADD CONSTRAINT video_templates_asset_key_check
  CHECK (asset_key = ANY (ARRAY[
    'calm',
    'dawn',
    'emerald',
    'gold',
    'night',
    'paper',
    'rose',
    'andalusian-arch',
    'midnight-skyline',
    'oasis-dawn',
    'desert-caravan',
    'geometric-mosaic',
    'lantern-glow',
    'manuscript-library',
    'moonlit-sea',
    'olive-grove',
    'desert-dusk',
    'coastal-blue',
    'botanical',
    'library',
    'geometric',
    'marble',
    'cinematic',
    'starfield',
    'mountain-dawn',
    'heritage',
    'minimal-studio',
    'rainy-window',
    'watercolor-sky',
    'old-city',
    'desert-rose',
    'mosaic-blue',
    'satin-night',
    'sunlit-arch',
    'olive-branch',
    'minimal-cream',
    'kids-garden',
    'kids-nature',
    'kids-neighborhood',
    'kids-workshop',
    'kids-space',
    'kids-ocean',
    'kids-forest',
    'kids-playground',
    'kids-classroom',
    'kids-adventure',
    'kids-jungle',
    'kids-robotics',
    'kids-animals',
    'kids-weather'
  ]::text[]));

CREATE OR REPLACE FUNCTION public.admin_create_video_template_version(
  p_template_id uuid,
  p_config jsonb,
  p_actor_user_id uuid
)
RETURNS TABLE(id uuid, version integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_audience text;
  v_version integer;
  v_asset text;
BEGIN
  IF p_actor_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles AS actor WHERE actor.id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'valid actor is required' USING ERRCODE = '22023';
  END IF;
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RAISE EXCEPTION 'template config must be a JSON object' USING ERRCODE = '22023';
  END IF;

  v_asset := p_config ->> 'assetKey';
  IF p_config ->> 'assetKey' IS NULL
     OR p_config ->> 'defaultFormat' IS NULL
     OR p_config ->> 'motion' IS NULL
     OR p_config ->> 'defaultFormat' NOT IN ('vertical', 'horizontal')
     OR p_config ->> 'motion' NOT IN ('slow', 'fade') THEN
    RAISE EXCEPTION 'unsupported template format or motion' USING ERRCODE = '22023';
  END IF;

  SELECT audience INTO v_audience
  FROM public.video_templates
  WHERE video_templates.id = p_template_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'video template not found' USING ERRCODE = 'P0002';
  END IF;

  IF (v_audience = 'kids' AND NOT (v_asset = ANY (ARRAY['kids-garden', 'kids-nature', 'kids-neighborhood', 'kids-workshop', 'kids-space', 'kids-ocean', 'kids-forest', 'kids-playground', 'kids-classroom', 'kids-adventure', 'kids-jungle', 'kids-robotics', 'kids-animals', 'kids-weather']::text[])))
     OR (v_audience = 'general' AND NOT (v_asset = ANY (ARRAY['calm', 'dawn', 'emerald', 'gold', 'night', 'paper', 'rose', 'andalusian-arch', 'midnight-skyline', 'oasis-dawn', 'desert-caravan', 'geometric-mosaic', 'lantern-glow', 'manuscript-library', 'moonlit-sea', 'olive-grove', 'desert-dusk', 'coastal-blue', 'botanical', 'library', 'geometric', 'marble', 'cinematic', 'starfield', 'mountain-dawn', 'heritage', 'minimal-studio', 'rainy-window', 'watercolor-sky', 'old-city', 'desert-rose', 'mosaic-blue', 'satin-night', 'sunlit-arch', 'olive-branch', 'minimal-cream']::text[]))) THEN
    RAISE EXCEPTION 'asset does not match template audience' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(MAX(video_template_versions.version), 0) + 1
  INTO v_version
  FROM public.video_template_versions
  WHERE video_template_versions.template_id = p_template_id;

  RETURN QUERY
  INSERT INTO public.video_template_versions AS inserted (
    template_id, version, config, status, is_system_seed, created_by
  )
  VALUES (p_template_id, v_version, p_config, 'draft', false, p_actor_user_id)
  RETURNING inserted.id, inserted.version;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_create_video_template_version(uuid, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_video_template_version(uuid, jsonb, uuid)
  TO service_role;

INSERT INTO public.video_templates (id, slug, title, description, audience, asset_key)
VALUES
  ('10000000-0000-4000-8000-000000000030', 'watercolor-sky', 'سماء مائية', 'مشهد ناعم بتدرجات مائية للقراءة والتأمل.', 'general', 'watercolor-sky'),
  ('10000000-0000-4000-8000-000000000031', 'old-city', 'مدينة عتيقة', 'خلفية معمارية مستوحاة من الأقواس والأحياء التاريخية.', 'general', 'old-city'),
  ('10000000-0000-4000-8000-000000000032', 'desert-rose', 'وردة الصحراء', 'تدرجات وردية رملية للمحتوى الوجداني والقصصي.', 'general', 'desert-rose'),
  ('10000000-0000-4000-8000-000000000033', 'mosaic-blue', 'فسيفساء زرقاء', 'نقوش هندسية زرقاء للمحتوى التعليمي والنصي.', 'general', 'mosaic-blue'),
  ('10000000-0000-4000-8000-000000000034', 'satin-night', 'ليل حريري', 'مشهد ليلي هادئ مع إضاءة ناعمة للقصص والتأمل.', 'general', 'satin-night'),
  ('10000000-0000-4000-8000-000000000035', 'sunlit-arch', 'قوس مشمس', 'أقواس مضيئة بألوان طبيعية للمحتوى المعرفي.', 'general', 'sunlit-arch'),
  ('10000000-0000-4000-8000-000000000036', 'olive-branch', 'غصن زيتون', 'تفاصيل نباتية هادئة للأذكار والتذكير.', 'general', 'olive-branch'),
  ('10000000-0000-4000-8000-000000000037', 'minimal-cream', 'استوديو عاجي', 'خلفية كريمية بسيطة لرفع وضوح النص والعناوين.', 'general', 'minimal-cream'),
  ('10000000-0000-4000-8000-000000000038', 'kids-jungle', 'أدغال الأطفال', 'أوراق وأشكال مرحة لقصص الطبيعة للأطفال.', 'kids', 'kids-jungle'),
  ('10000000-0000-4000-8000-000000000039', 'kids-robotics', 'روبوتات الأطفال', 'أشكال تعليمية عن الروبوتات والتقنية للأطفال.', 'kids', 'kids-robotics'),
  ('10000000-0000-4000-8000-000000000040', 'kids-animals', 'حيوانات الأطفال', 'أشكال حيوانية مبسطة للتعلم والقصص.', 'kids', 'kids-animals'),
  ('10000000-0000-4000-8000-000000000041', 'kids-weather', 'طقس الأطفال', 'مشهد مبسط للشمس والسحب والمطر للأطفال.', 'kids', 'kids-weather')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.video_template_versions (template_id, version, config, status, is_system_seed)
SELECT template.id, 1,
  jsonb_build_object('assetKey', template.asset_key, 'defaultFormat', 'vertical', 'motion', 'slow'),
  'active', true
FROM public.video_templates AS template
WHERE template.slug IN ('watercolor-sky', 'old-city', 'desert-rose', 'mosaic-blue', 'satin-night', 'sunlit-arch', 'olive-branch', 'minimal-cream', 'kids-jungle', 'kids-robotics', 'kids-animals', 'kids-weather')
ON CONFLICT (template_id, version) DO NOTHING;

COMMENT ON CONSTRAINT video_templates_asset_key_check ON public.video_templates IS
  'Allowlisted local SVG assets for the 36 General and 14 Kids video templates; the version RPC and render QA enforce audience matching.';
