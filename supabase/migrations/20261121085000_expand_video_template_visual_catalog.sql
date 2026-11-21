-- Expand the renderer-backed visual library without changing the immutable review lifecycle.
-- Every asset is a local SVG. Existing audience controls and approval transitions remain enforced.
ALTER TABLE public.video_templates
  DROP CONSTRAINT IF EXISTS video_templates_asset_key_check;

ALTER TABLE public.video_templates
  ADD CONSTRAINT video_templates_asset_key_check
  CHECK (asset_key IN (
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
    'lantern-glow',
    'geometric-mosaic',
    'moonlit-sea',
    'desert-caravan',
    'olive-grove',
    'manuscript-library',
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
    'kids-garden',
    'kids-nature',
    'kids-neighborhood',
    'kids-workshop',
    'kids-space',
    'kids-ocean',
    'kids-forest',
    'kids-playground',
    'kids-classroom',
    'kids-adventure'
  ));

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

  IF (v_audience = 'kids' AND NOT (v_asset = ANY (ARRAY['kids-garden', 'kids-nature', 'kids-neighborhood', 'kids-workshop', 'kids-space', 'kids-ocean', 'kids-forest', 'kids-playground', 'kids-classroom', 'kids-adventure']::text[])))
     OR (v_audience = 'general' AND NOT (v_asset = ANY (ARRAY['calm', 'dawn', 'emerald', 'gold', 'night', 'paper', 'rose', 'andalusian-arch', 'midnight-skyline', 'oasis-dawn', 'lantern-glow', 'geometric-mosaic', 'moonlit-sea', 'desert-caravan', 'olive-grove', 'manuscript-library', 'desert-dusk', 'coastal-blue', 'botanical', 'library', 'geometric', 'marble', 'cinematic', 'starfield', 'mountain-dawn', 'heritage', 'minimal-studio', 'rainy-window']::text[]))) THEN
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

INSERT INTO public.video_templates (id, slug, title, description, audience, asset_key)
VALUES
  ('10000000-0000-4000-8000-000000000042', 'desert-dusk', 'غروب الصحراء', 'مشهد سينمائي دافئ للقصص والمحتوى التأملي.', 'general', 'desert-dusk'),
  ('10000000-0000-4000-8000-000000000043', 'coastal-blue', 'ساحل أزرق', 'خلفيات بحرية هادئة للدعاء والتأمل.', 'general', 'coastal-blue'),
  ('10000000-0000-4000-8000-000000000044', 'botanical', 'حديقة زيتونية', 'مشهد نباتي طبيعي للأذكار والمحتوى الهادئ.', 'general', 'botanical'),
  ('10000000-0000-4000-8000-000000000045', 'library', 'مكتبة المعرفة', 'أجواء مكتبة وكتب للمحتوى التعليمي والمعرفي.', 'general', 'library'),
  ('10000000-0000-4000-8000-000000000046', 'geometric', 'زخارف هندسية', 'نقوش هندسية متوازنة للمحتوى النصي.', 'general', 'geometric'),
  ('10000000-0000-4000-8000-000000000047', 'marble', 'رخام هادئ', 'ملمس رخامي أنيق للنصوص والاقتباسات.', 'general', 'marble'),
  ('10000000-0000-4000-8000-000000000048', 'cinematic', 'إضاءة سينمائية', 'إضاءة مسرحية ناعمة للقصص والعروض.', 'general', 'cinematic'),
  ('10000000-0000-4000-8000-000000000049', 'starfield', 'سماء مرصعة', 'سماء ليلية بنجوم وخطوط ضوئية هادئة.', 'general', 'starfield'),
  ('10000000-0000-4000-8000-000000000050', 'mountain-dawn', 'قمم الفجر', 'مشهد جبلي مضيء لبدايات القصص.', 'general', 'mountain-dawn'),
  ('10000000-0000-4000-8000-000000000051', 'heritage', 'طراز تراثي', 'أقواس وزخارف معمارية بطابع تراثي.', 'general', 'heritage'),
  ('10000000-0000-4000-8000-000000000052', 'minimal-studio', 'استوديو بسيط', 'خلفية تجريدية قليلة التفاصيل للمحتوى المركز.', 'general', 'minimal-studio'),
  ('10000000-0000-4000-8000-000000000053', 'rainy-window', 'نافذة المطر', 'مشهد نافذة ومطر للمحتوى الوجداني الهادئ.', 'general', 'rainy-window'),
  ('10000000-0000-4000-8000-000000000054', 'kids-space', 'فضاء الأطفال', 'مشهد فضائي مبسط للمحتوى التعليمي المخصص للأطفال.', 'kids', 'kids-space'),
  ('10000000-0000-4000-8000-000000000055', 'kids-ocean', 'محيط الأطفال', 'عالم بحري مرح للتعلم والقصص المناسبة للأطفال.', 'kids', 'kids-ocean'),
  ('10000000-0000-4000-8000-000000000056', 'kids-forest', 'غابة الأطفال', 'غابة ملونة وآمنة للحكايات التعليمية للأطفال.', 'kids', 'kids-forest'),
  ('10000000-0000-4000-8000-000000000057', 'kids-playground', 'ملعب الألوان', 'أشكال مرحة للحكايات والأنشطة التعليمية.', 'kids', 'kids-playground'),
  ('10000000-0000-4000-8000-000000000058', 'kids-classroom', 'فصل المعرفة', 'مشهد كتب وفصل للتعلم المبسط.', 'kids', 'kids-classroom'),
  ('10000000-0000-4000-8000-000000000059', 'kids-adventure', 'مغامرة الطبيعة', 'جبال وبوصلة لمحتوى الاستكشاف الآمن للأطفال.', 'kids', 'kids-adventure')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.video_template_versions (template_id, version, config, status, is_system_seed)
SELECT template.id, 1,
  jsonb_build_object('assetKey', template.asset_key, 'defaultFormat', 'vertical', 'motion', 'slow'),
  'active', true
FROM public.video_templates AS template
WHERE template.slug IN ('desert-dusk', 'coastal-blue', 'botanical', 'library', 'geometric', 'marble', 'cinematic', 'starfield', 'mountain-dawn', 'heritage', 'minimal-studio', 'rainy-window', 'kids-space', 'kids-ocean', 'kids-forest', 'kids-playground', 'kids-classroom', 'kids-adventure')
ON CONFLICT (template_id, version) DO NOTHING;

COMMENT ON CONSTRAINT video_templates_asset_key_check ON public.video_templates IS
  'Allowlisted local SVG assets for the General and Kids video template catalogs; audience matching is enforced by the service and RPC.';
