-- Rollback for apply-admin-migrations.sql. Only safe while these tables are still empty (they start empty; nothing writes to them until the feature flags are turned on).
-- Check first: select count(*) from public.automation_runs; (and the other tables). If any hold data you want, export it before running.
begin;
drop table if exists public.automation_dead_letters;
drop table if exists public.automation_runs;
drop table if exists public.automation_workflows;
drop table if exists public.omnis_agent_runs;
drop table if exists public.omnis_agent_proposals;
drop table if exists public.omnis_custom_page_versions;
drop table if exists public.omnis_custom_pages;
drop table if exists public.omnis_push_campaigns;
alter table public.content_library drop column if exists created_by;
alter table public.content_library drop column if exists approved_by;
delete from supabase_migrations.schema_migrations where version in ('20261125170000','20261125180000','20261125190000','20261125200000','20261125220000');
commit;
