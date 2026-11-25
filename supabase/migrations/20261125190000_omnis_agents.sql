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
