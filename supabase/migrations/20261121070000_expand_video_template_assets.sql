-- Expand the renderer-backed Video Factory with the three shipped general-audience SVG scenes.
-- The UI already lists these assets; this migration makes them selectable and versionable in the registry.
ALTER TABLE public.video_templates
  DROP CONSTRAINT IF EXISTS video_templates_asset_key_check;

ALTER TABLE public.video_templates
  ADD CONSTRAINT video_templates_asset_key_check CHECK (
    asset_key = ANY (ARRAY[
      'calm', 'dawn', 'emerald', 'gold', 'night', 'paper', 'rose',
      'andalusian-arch', 'midnight-skyline', 'oasis-dawn',
      'lantern-glow', 'geometric-mosaic', 'moonlit-sea', 'desert-caravan', 'olive-grove', 'manuscript-library',
      'kids-garden', 'kids-nature', 'kids-neighborhood', 'kids-workshop'
    ]::text[])
  );

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
  IF v_asset IS NULL
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

  IF (v_audience = 'kids' AND NOT (v_asset = ANY (ARRAY[
      'kids-garden', 'kids-nature', 'kids-neighborhood', 'kids-workshop'
    ]::text[])))
     OR (v_audience = 'general' AND NOT (v_asset = ANY (ARRAY[
      'calm', 'dawn', 'emerald', 'gold', 'night', 'paper', 'rose',
      'andalusian-arch', 'midnight-skyline', 'oasis-dawn',
      'lantern-glow', 'geometric-mosaic', 'moonlit-sea', 'desert-caravan', 'olive-grove', 'manuscript-library'
    ]::text[]))) THEN
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
  ('10000000-0000-4000-8000-000000000012', 'andalusian-arch', 'القوس الأندلسي', 'مشهد معماري بزخارف هندسية وأقواس متداخلة للمحتوى التأملي والقصصي.', 'general', 'andalusian-arch'),
  ('10000000-0000-4000-8000-000000000013', 'midnight-skyline', 'أفق منتصف الليل', 'مشهد ليلي بسماء مرصعة بالنجوم وأفق مدينة هادئ لمقاطع الذكر والتدبر.', 'general', 'midnight-skyline'),
  ('10000000-0000-4000-8000-000000000014', 'oasis-dawn', 'واحة الفجر', 'مشهد شروق دافئ بواحة ونخيل وكثبان رملية للمحتوى الصباحي.', 'general', 'oasis-dawn'),
  ('10000000-0000-4000-8000-000000000015', 'lantern-glow', 'فوانيس مضيئة', 'إضاءة فوانيس دافئة وأقواس شرقية لمقاطع التدبر والذكر الهادئة.', 'general', 'lantern-glow'),
  ('10000000-0000-4000-8000-000000000016', 'geometric-mosaic', 'فسيفساء هندسية', 'طبقات زخارف هندسية متداخلة وألوان زمردية وذهبية للمحتوى المعرفي.', 'general', 'geometric-mosaic'),
  ('10000000-0000-4000-8000-000000000017', 'moonlit-sea', 'بحر تحت القمر', 'سماء ليلية وبحر متدرج وانعكاس قمري للمقاطع التأملية.', 'general', 'moonlit-sea'),
  ('10000000-0000-4000-8000-000000000018', 'desert-caravan', 'قافلة الصحراء', 'كثبان دافئة وقافلة بعيدة لقصص الرحلات والتاريخ والعبر.', 'general', 'desert-caravan'),
  ('10000000-0000-4000-8000-000000000019', 'olive-grove', 'بستان الزيتون', 'تلال زيتون هادئة وضوء صباحي للمحتوى الطبيعي والروحي.', 'general', 'olive-grove'),
  ('10000000-0000-4000-8000-000000000020', 'manuscript-library', 'مكتبة المخطوطات', 'مكتبة تراثية وكتاب مفتوح لمقاطع العلم والقراءة والقصص.', 'general', 'manuscript-library')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.video_template_versions (
  template_id, version, config, status, is_system_seed
)
SELECT
  template.id,
  1,
  jsonb_build_object('assetKey', template.asset_key, 'defaultFormat', 'vertical', 'motion', 'slow'),
  'active',
  true
FROM public.video_templates AS template
WHERE template.slug IN ('andalusian-arch', 'midnight-skyline', 'oasis-dawn', 'lantern-glow', 'geometric-mosaic', 'moonlit-sea', 'desert-caravan', 'olive-grove', 'manuscript-library')
ON CONFLICT (template_id, version) DO NOTHING;

COMMENT ON CONSTRAINT video_templates_asset_key_check ON public.video_templates IS
  'Renderer-backed SVG assets. New audience-specific assets must be registered here and in template-config.ts.';
