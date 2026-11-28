-- Video Factory V2: clip library for finished clips that were produced manually (for example in Google Flow).
-- Not applied live. Records only: the clip_library provider stays off (CLIP_LIBRARY_ENABLED) until the owner applies this and enables it.
-- Clips are hosted at their canonical media origin; this table stores references and rights metadata, never the video bytes.
create table if not exists public.video_clip_library (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  category text not null check (category in ('quran', 'hadith', 'dua', 'adhkar', 'story', 'kids', 'general')),
  audience text not null default 'general' check (audience in ('general', 'kids')),
  video_url text not null check (video_url like 'https://%'),
  cloudinary_public_id text,
  width integer not null check (width between 320 and 3840),
  height integer not null check (height between 320 and 3840),
  duration_seconds numeric(6, 2) not null check (duration_seconds between 2 and 60),
  audio_muted boolean not null default true,
  source_kind text not null check (source_kind in ('flow_manual', 'owned_original', 'stock_licensed', 'other_documented')),
  rights_license text not null check (char_length(rights_license) between 1 and 200),
  rights_evidence text not null check (char_length(rights_evidence) between 1 and 500),
  rights_reviewer text not null check (char_length(rights_reviewer) between 1 and 120),
  rights_reviewed_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'retired')),
  times_used integer not null default 0 check (times_used >= 0),
  last_used_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists video_clip_library_pick_idx on public.video_clip_library (status, audience, category, times_used, created_at);
alter table public.video_clip_library enable row level security;
