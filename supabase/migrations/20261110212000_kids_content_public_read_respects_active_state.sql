begin;

drop policy if exists "kids_content_public_read" on public.kids_content;

create policy "kids_content_public_read"
on public.kids_content
for select
to anon, authenticated
using (
  published is true
  and is_active is true
  and (
    type <> 'story'
    or metadata->>'age_appropriate' = 'true'
  )
);

-- Public Kids story visibility requires explicit age-suitability approval in addition
-- to publication and active state. The share counter follows the same rule so
-- unreviewed or rejected stories cannot be exposed or counted as public shares.
create or replace function public.increment_kids_content_shares(p_slug text)
returns table(slug text, shares integer)
language sql
security invoker
set search_path = ''
as $function$
  update public.kids_content
  set shares = coalesce(kids_content.shares, 0) + 1,
      updated_at = now()
  where kids_content.slug = p_slug
    and kids_content.published is true
    and kids_content.is_active is true
    and (
      kids_content.type <> 'story'
      or kids_content.metadata->>'age_appropriate' = 'true'
    )

  returning kids_content.slug, kids_content.shares;
$function$;

revoke all on function public.increment_kids_content_shares(text) from public;
revoke execute on function public.increment_kids_content_shares(text) from anon, authenticated;
grant execute on function public.increment_kids_content_shares(text) to service_role;

commit;
