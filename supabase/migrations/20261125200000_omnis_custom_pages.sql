-- OMNIS P05-02: custom pages built from typed blocks, with append-only versions.
-- Not applied live. The public route /p/[slug] stays 404 until CUSTOM_PAGES_ENABLED=true.
-- Service role only: RLS enabled with no policies for anon/authenticated.
create table if not exists public.omnis_custom_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  title text not null check (char_length(title) between 1 and 120),
  published_version integer,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.omnis_custom_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.omnis_custom_pages(id) on delete cascade,
  version integer not null check (version >= 1),
  blocks jsonb not null check (jsonb_typeof(blocks) = 'array' and jsonb_array_length(blocks) between 1 and 60),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (page_id, version)
);
create index if not exists omnis_custom_page_versions_page_idx on public.omnis_custom_page_versions (page_id, version desc);

alter table public.omnis_custom_pages enable row level security;
alter table public.omnis_custom_page_versions enable row level security;
revoke all on table public.omnis_custom_pages from anon, authenticated;
revoke all on table public.omnis_custom_page_versions from anon, authenticated;
