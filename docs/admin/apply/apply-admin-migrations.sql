-- ZIKR admin migrations: paste into Supabase SQL editor and run ONCE, after a backup exists.
-- Order: 170000 content_library SoD columns, 180000 automation, 190000 agents, 200000 custom pages, 220000 push campaigns.
-- NOT included on purpose: 20261125210000 (source gate, stays off) and 20261125160000 (reciter English names, optional data update).
-- All statements are additive (create ... if not exists / add column if not exists). Runs in one transaction: any error rolls back everything.
begin;

-- ===== 20261125170000_content_library_separation_of_duties.sql =====
-- OMNIS P12-01: record who created and who approved content so the app can
-- enforce separation of duties (approver must differ from creator).
-- Additive and nullable. Not applied live; app enforcement stays off until
-- EDITORIAL_SOD_ENFORCED=true is set after this migration is applied.
alter table if exists public.content_library add column if not exists created_by uuid;
alter table if exists public.content_library add column if not exists approved_by uuid;

-- ===== 20261125180000_omnis_automation_engine.sql =====
-- OMNIS P10: workflow definitions, runs and dead letters.
-- Not applied live. The app engine stays off until AUTOMATION_ENGINE_ENABLED=true.
-- Service role only: RLS enabled with no policies for anon/authenticated.
create table if not exists public.automation_workflows (
  key text primary key,
  definition jsonb not null,
  enabled boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null references public.automation_workflows(key) on delete cascade,
  idempotency_key text not null,
  mode text not null check (mode in ('dry_run', 'live')),
  status text not null check (status in ('skipped', 'needs_approval', 'running', 'succeeded', 'dead_letter')),
  attempts integer not null default 0,
  approved_by uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (workflow_key, idempotency_key, mode)
);
create index if not exists automation_runs_workflow_created_idx on public.automation_runs (workflow_key, created_at desc);

create table if not exists public.automation_dead_letters (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.automation_runs(id) on delete cascade,
  failed_action text not null,
  attempts integer not null,
  error text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.automation_workflows enable row level security;
alter table public.automation_runs enable row level security;
alter table public.automation_dead_letters enable row level security;

-- ===== 20261125190000_omnis_agents.sql =====
-- OMNIS P13: agent runs and reviewable proposals.
-- Not applied live. The app stays off until OMNIS_AGENTS_ENABLED=true.
-- Service role only: RLS enabled with no policies for anon/authenticated.
create table if not exists public.omnis_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  tool text not null,
  tokens integer not null default 0,
  allowed boolean not null,
  deny_reason text,
  created_at timestamptz not null default now()
);
create index if not exists omnis_agent_runs_agent_created_idx on public.omnis_agent_runs (agent_key, created_at desc);

create table if not exists public.omnis_agent_proposals (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null,
  title text not null,
  target text not null,
  diff text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists omnis_agent_proposals_status_idx on public.omnis_agent_proposals (status, created_at desc);

alter table public.omnis_agent_runs enable row level security;
alter table public.omnis_agent_proposals enable row level security;

-- ===== 20261125200000_omnis_custom_pages.sql =====
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

-- ===== 20261125220000_omnis_push_campaigns.sql =====
-- OMNIS P05-03: push broadcast campaigns with a two-person approval step.
-- Not applied live. Records and approvals only: no sender reads this table until a sender is built and approved by the owner.
create table if not exists public.omnis_push_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 240),
  link text check (link is null or link like '/%'),
  audience text not null check (audience in ('all', 'android', 'web')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'cancelled')),
  created_by uuid not null,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (approved_by is null or approved_by <> created_by)
);
create index if not exists omnis_push_campaigns_status_idx on public.omnis_push_campaigns (status, created_at desc);
alter table public.omnis_push_campaigns enable row level security;

-- Record the versions so the Supabase CLI does not try to re-apply them.
insert into supabase_migrations.schema_migrations (version, name) values ('20261125170000', 'content_library_separation_of_duties') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261125180000', 'omnis_automation_engine') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261125190000', 'omnis_agents') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261125200000', 'omnis_custom_pages') on conflict (version) do nothing;
insert into supabase_migrations.schema_migrations (version, name) values ('20261125220000', 'omnis_push_campaigns') on conflict (version) do nothing;

commit;
