-- Admin user search with server-side filters and pagination.
-- This keeps sensitive profile browsing behind an admin RPC and prevents
-- the dashboard from treating a 50-row client slice as the full user base.

create index if not exists idx_profiles_admin_created_at
  on public.profiles(created_at desc);

create index if not exists idx_profiles_admin_status
  on public.profiles(is_banned, is_shadow_banned, is_verified, is_premium, created_at desc);

create or replace function public.admin_search_users(
  p_limit integer default 50,
  p_offset integer default 0,
  p_query text default null,
  p_status text default null,
  p_gender text default null,
  p_university text default null,
  p_verified boolean default null,
  p_premium boolean default null
)
returns table (
  id uuid,
  full_name text,
  email text,
  gender text,
  university text,
  avatar_url text,
  is_banned boolean,
  is_shadow_banned boolean,
  is_verified boolean,
  is_premium boolean,
  created_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  last_active timestamp with time zone,
  total_count bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_query text := nullif(trim(coalesce(p_query, '')), '');
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_gender text := lower(nullif(trim(coalesce(p_gender, '')), ''));
  v_university text := nullif(trim(coalesce(p_university, '')), '');
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if v_status is not null and v_status not in ('active', 'banned', 'shadow') then
    raise exception 'Invalid status filter';
  end if;

  return query
  with filtered as (
    select p.*
    from public.profiles p
    where
      (
        v_query is null
        or coalesce(p.full_name, '') ilike '%' || v_query || '%'
        or coalesce(p.email, '') ilike '%' || v_query || '%'
        or p.id::text = v_query
      )
      and (
        v_status is null
        or (v_status = 'banned' and coalesce(p.is_banned, false))
        or (v_status = 'shadow' and coalesce(p.is_shadow_banned, false))
        or (
          v_status = 'active'
          and not coalesce(p.is_banned, false)
          and not coalesce(p.is_shadow_banned, false)
        )
      )
      and (v_gender is null or lower(coalesce(p.gender, '')) = v_gender)
      and (v_university is null or coalesce(p.university, '') ilike '%' || v_university || '%')
      and (p_verified is null or coalesce(p.is_verified, false) = p_verified)
      and (p_premium is null or coalesce(p.is_premium, false) = p_premium)
  )
  select
    f.id,
    f.full_name::text,
    f.email::text,
    f.gender::text,
    f.university::text,
    f.avatar_url::text,
    coalesce(f.is_banned, false),
    coalesce(f.is_shadow_banned, false),
    coalesce(f.is_verified, false),
    coalesce(f.is_premium, false),
    f.created_at,
    f.last_seen_at,
    f.last_active,
    count(*) over()::bigint as total_count
  from filtered f
  order by f.created_at desc nulls last
  limit v_limit
  offset v_offset;
end;
$function$;

revoke all on function public.admin_search_users(integer, integer, text, text, text, text, boolean, boolean) from public, anon;
grant execute on function public.admin_search_users(integer, integer, text, text, text, text, boolean, boolean) to authenticated;
