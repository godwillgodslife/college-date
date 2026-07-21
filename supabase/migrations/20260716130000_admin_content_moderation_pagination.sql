-- Admin content moderation search with server-side filters and pagination.

create index if not exists idx_confessions_admin_created_at
  on public.confessions(created_at desc);

create index if not exists idx_confessions_admin_university_created_at
  on public.confessions(university, created_at desc);

create index if not exists idx_confession_reports_admin_status_created_at
  on public.confession_reports(status, created_at desc);

create or replace function public.admin_get_confessions(
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null,
  p_university text default null,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
returns table (
  id uuid,
  content text,
  university text,
  user_id uuid,
  created_at timestamp with time zone,
  total_count bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_university text := nullif(trim(coalesce(p_university, '')), '');
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  with filtered as (
    select c.*
    from public.confessions c
    where
      (v_search is null or coalesce(c.content, '') ilike '%' || v_search || '%' or c.id::text = v_search)
      and (v_university is null or coalesce(c.university, '') ilike '%' || v_university || '%')
      and (p_from is null or c.created_at >= p_from)
      and (p_to is null or c.created_at <= p_to)
  )
  select
    f.id,
    f.content::text,
    f.university::text,
    f.user_id,
    f.created_at,
    count(*) over()::bigint as total_count
  from filtered f
  order by f.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

create or replace function public.admin_get_confession_reports(
  p_limit integer default 50,
  p_offset integer default 0,
  p_status text default 'pending',
  p_search text default null,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
returns table (
  id uuid,
  confession_id uuid,
  reporter_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamp with time zone,
  confession_content text,
  confession_university text,
  confession_created_at timestamp with time zone,
  total_count bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  with filtered as (
    select
      r.id,
      r.confession_id,
      r.reporter_id,
      r.reason,
      r.details,
      r.status,
      r.created_at,
      c.content as confession_content,
      c.university as confession_university,
      c.created_at as confession_created_at
    from public.confession_reports r
    left join public.confessions c on c.id = r.confession_id
    where
      (v_status is null or lower(coalesce(r.status, '')) = v_status)
      and (
        v_search is null
        or coalesce(r.reason, '') ilike '%' || v_search || '%'
        or coalesce(r.details, '') ilike '%' || v_search || '%'
        or coalesce(c.content, '') ilike '%' || v_search || '%'
        or r.id::text = v_search
        or r.confession_id::text = v_search
      )
      and (p_from is null or r.created_at >= p_from)
      and (p_to is null or r.created_at <= p_to)
  )
  select
    f.id,
    f.confession_id,
    f.reporter_id,
    f.reason::text,
    f.details::text,
    f.status::text,
    f.created_at,
    f.confession_content::text,
    f.confession_university::text,
    f.confession_created_at,
    count(*) over()::bigint as total_count
  from filtered f
  order by f.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

revoke all on function public.admin_get_confessions(integer, integer, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
revoke all on function public.admin_get_confession_reports(integer, integer, text, text, timestamp with time zone, timestamp with time zone) from public, anon;

grant execute on function public.admin_get_confessions(integer, integer, text, text, timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.admin_get_confession_reports(integer, integer, text, text, timestamp with time zone, timestamp with time zone) to authenticated;
