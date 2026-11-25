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
