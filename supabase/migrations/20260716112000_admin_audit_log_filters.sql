create or replace function public.admin_get_audit_logs(
  p_limit integer default 100,
  p_offset integer default 0,
  p_action text default null,
  p_target_type text default null,
  p_admin_query text default null,
  p_search text default null,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
returns table (
  id uuid,
  admin_user_id uuid,
  admin_email text,
  admin_name text,
  action text,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone,
  total_count bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_action text := nullif(trim(coalesce(p_action, '')), '');
  v_target_type text := nullif(trim(coalesce(p_target_type, '')), '');
  v_admin_query text := nullif(trim(coalesce(p_admin_query, '')), '');
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  with filtered_logs as (
    select
      l.id,
      l.admin_user_id,
      coalesce(p.email, u.email)::text as admin_email,
      p.full_name::text as admin_name,
      l.action,
      l.target_type,
      l.target_id,
      l.metadata,
      l.created_at
    from public.admin_audit_logs l
    left join public.profiles p on p.id = l.admin_user_id
    left join auth.users u on u.id = l.admin_user_id
    where
      (v_action is null or l.action = v_action)
      and (v_target_type is null or l.target_type = v_target_type)
      and (p_from is null or l.created_at >= p_from)
      and (p_to is null or l.created_at <= p_to)
      and (
        v_admin_query is null
        or coalesce(p.email, u.email, '') ilike '%' || v_admin_query || '%'
        or coalesce(p.full_name, '') ilike '%' || v_admin_query || '%'
        or l.admin_user_id::text ilike '%' || v_admin_query || '%'
      )
      and (
        v_search is null
        or l.action ilike '%' || v_search || '%'
        or coalesce(l.target_type, '') ilike '%' || v_search || '%'
        or coalesce(l.target_id::text, '') ilike '%' || v_search || '%'
        or coalesce(l.metadata::text, '') ilike '%' || v_search || '%'
      )
  )
  select
    fl.id,
    fl.admin_user_id,
    fl.admin_email,
    fl.admin_name,
    fl.action,
    fl.target_type,
    fl.target_id,
    fl.metadata,
    fl.created_at,
    count(*) over() as total_count
  from filtered_logs fl
  order by fl.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

revoke all on function public.admin_get_audit_logs(integer, integer, text, text, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
grant execute on function public.admin_get_audit_logs(integer, integer, text, text, text, text, timestamp with time zone, timestamp with time zone) to authenticated;
