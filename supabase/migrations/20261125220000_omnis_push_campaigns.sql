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
