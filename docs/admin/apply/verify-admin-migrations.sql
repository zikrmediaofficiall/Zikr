-- Expect 8 rows in the first query and 2 rows in the second.
select table_name from information_schema.tables where table_schema='public' and table_name in
 ('automation_workflows','automation_runs','automation_dead_letters','omnis_agent_runs','omnis_agent_proposals','omnis_custom_pages','omnis_custom_page_versions','omnis_push_campaigns') order by 1;
select column_name from information_schema.columns where table_schema='public' and table_name='content_library' and column_name in ('created_by','approved_by') order by 1;
-- Expect 5 rows.
select version from supabase_migrations.schema_migrations where version in ('20261125170000','20261125180000','20261125190000','20261125200000','20261125220000') order by 1;
-- Expect 8 rows, all rowsecurity = true.
select tablename, rowsecurity from pg_tables where schemaname='public' and tablename in ('automation_workflows','automation_runs','automation_dead_letters','omnis_agent_runs','omnis_agent_proposals','omnis_custom_pages','omnis_custom_page_versions','omnis_push_campaigns') order by 1;
