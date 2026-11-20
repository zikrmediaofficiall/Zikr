-- Replace the legacy MD5(random()) scheduler token with 244 bits of
-- cryptographically generated UUID entropy. Both pg_cron and the Edge Functions
-- read this row through get_push_scheduler_secret() at request time, so the
-- rotation is atomic and does not require an environment-variable change.
--
-- Only the scheduler_secret key is touched. A valid 64-character lowercase hex
-- token is left unchanged, making this migration safe to replay.

insert into public.push_runtime_settings as current_settings (key, value)
values (
  'scheduler_secret',
  jsonb_build_object(
    'secret',
    replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
  )
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now()
where coalesce(current_settings.value ->> 'secret', '') !~ '^[0-9a-f]{64}$';

do $$
declare
  secret_value text;
begin
  select value ->> 'secret'
    into secret_value
  from public.push_runtime_settings
  where key = 'scheduler_secret';

  if secret_value is null or secret_value !~ '^[0-9a-f]{64}$' then
    raise exception 'PRAYER_SCHEDULER_SECRET_ENTROPY_GUARD_FAILED';
  end if;
end;
$$;
