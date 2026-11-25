-- OMNIS P06-01: extend the "verified source before publish" rule from content_library to other
-- content tables. NOT applied live. Enforcement is OFF per table until a row is set to enforced.
-- Only the transition to published is checked, so rows already published (media_assets has 30
-- without a source at the time of writing) are never blocked from ordinary edits.
create table if not exists public.omnis_source_gate_config (
  table_name text primary key check (table_name in ('kids_game_questions', 'media_assets')),
  enforced boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.omnis_source_gate_config enable row level security;
revoke all on public.omnis_source_gate_config from anon, authenticated;
insert into public.omnis_source_gate_config (table_name) values ('kids_game_questions'), ('media_assets')
  on conflict (table_name) do nothing;

create or replace function public.enforce_source_on_publish()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.published is true
     and (tg_op = 'INSERT' or old.published is distinct from true)
     and exists (select 1 from public.omnis_source_gate_config c where c.table_name = tg_table_name and c.enforced) then
    if new.source_id is null then raise exception 'CONTENT_PUBLISH_REQUIRES_SOURCE'; end if;
    if not exists (select 1 from public.content_sources s where s.id = new.source_id and s.verified) then
      raise exception 'CONTENT_PUBLISH_REQUIRES_VERIFIED_SOURCE';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.enforce_source_on_publish() from public, anon, authenticated;

drop trigger if exists kids_game_questions_source_gate on public.kids_game_questions;
create trigger kids_game_questions_source_gate before insert or update on public.kids_game_questions
  for each row execute function public.enforce_source_on_publish();
drop trigger if exists media_assets_source_gate on public.media_assets;
create trigger media_assets_source_gate before insert or update on public.media_assets
  for each row execute function public.enforce_source_on_publish();
