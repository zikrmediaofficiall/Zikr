-- OMNIS P12-01: record who created and who approved content so the app can
-- enforce separation of duties (approver must differ from creator).
-- Additive and nullable. Not applied live; app enforcement stays off until
-- EDITORIAL_SOD_ENFORCED=true is set after this migration is applied.
alter table if exists public.content_library add column if not exists created_by uuid;
alter table if exists public.content_library add column if not exists approved_by uuid;
