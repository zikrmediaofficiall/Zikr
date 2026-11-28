-- Video Factory V2: clip library for finished clips that were produced manually (for example in Google Flow).
-- Not applied live. Records only: the clip_library provider stays off (CLIP_LIBRARY_ENABLED) until the owner applies this and enables it.
-- Clips are hosted at their canonical media origin; this table stores references and rights metadata, never the video bytes.
create table if not exists public.video_clip_library (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('quran', 'hadith', 'dua', 'adhkar', 'story', 'kids', 'general')),
  audience text not null default 'general' check (audience in ('general', 'kids')),
  video_url text not null check (video_url like 'https://res.cloudinary.com/%/video/upload/%'),
  cloudinary_public_id text not null check (char_length(cloudinary_public_id) between 1 and 255),
  width integer not null check (width between 720 and 3840),
  height integer not null check (height between 720 and 3840),
  duration_seconds numeric(6, 2) not null check (duration_seconds between 2 and 60),
  audio_muted boolean not null default true check (audio_muted is true),
  source_kind text not null check (source_kind in ('flow_manual', 'owned_original', 'stock_licensed', 'other_documented')),
  rights_license text not null check (char_length(rights_license) between 1 and 200),
  rights_evidence text not null check (char_length(rights_evidence) between 1 and 500),
  rights_reviewer text not null check (char_length(rights_reviewer) between 1 and 120),
  rights_reviewed_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'retired')),
  times_used integer not null default 0 check (times_used >= 0),
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint video_clip_library_kids_audience_check check (category <> 'kids' or audience = 'kids')
);
create index if not exists video_clip_library_pick_idx on public.video_clip_library (status, audience, category, times_used, created_at);
alter table public.video_clip_library enable row level security;


-- The service-role worker is the only reader/writer; client roles cannot enumerate or claim clips.
revoke all on table public.video_clip_library from public, anon, authenticated;
grant select, insert, update on table public.video_clip_library to service_role;

-- Atomic use counter update. Never expose this mutation to browser/client roles.
create or replace function public.mark_video_clip_library_used(p_clip_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.video_clip_library
  set times_used = times_used + 1,
      last_used_at = now()
  where id = p_clip_id
    and status = 'approved';
  if not found then
    raise exception 'Clip is not available for use';
  end if;
end;
$$;

revoke all on function public.mark_video_clip_library_used(uuid) from public, anon, authenticated;
grant execute on function public.mark_video_clip_library_used(uuid) to service_role;
