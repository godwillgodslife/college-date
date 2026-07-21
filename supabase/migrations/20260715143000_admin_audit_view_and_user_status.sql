-- Admin audit visibility and reason-required user status changes.

create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_action text,
  p_status boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_target public.profiles%rowtype;
  v_audit_action text;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if auth.uid() = p_user_id and v_action in ('ban', 'shadow') and p_status is true then
    raise exception 'Admins cannot ban or shadow-ban themselves';
  end if;

  if v_action not in ('ban', 'shadow', 'verify') then
    raise exception 'Invalid user status action';
  end if;

  if length(v_reason) < 5 then
    raise exception 'Admin reason is required';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_user_id;

  if v_target.id is null then
    raise exception 'User profile not found';
  end if;

  if v_action = 'ban' then
    update public.profiles
    set is_banned = p_status
    where id = p_user_id;
    v_audit_action := case when p_status then 'admin_ban_user' else 'admin_unban_user' end;
  elsif v_action = 'shadow' then
    update public.profiles
    set is_shadow_banned = p_status
    where id = p_user_id;
    v_audit_action := case when p_status then 'admin_shadow_user' else 'admin_unshadow_user' end;
  else
    update public.profiles
    set is_verified = p_status
    where id = p_user_id;
    v_audit_action := case when p_status then 'admin_verify_user' else 'admin_unverify_user' end;
  end if;

  perform public.admin_write_audit_log(
    v_audit_action,
    'profile',
    p_user_id,
    jsonb_build_object(
      'status', p_status,
      'reason', v_reason,
      'target_email', v_target.email,
      'target_name', v_target.full_name
    )
  );

  return jsonb_build_object(
    'ok', true,
    'action', v_action,
    'status', p_status,
    'user_id', p_user_id
  );
end;
$function$;

create or replace function public.admin_get_audit_logs(
  p_limit integer default 100,
  p_offset integer default 0
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
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  return query
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
  order by l.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

revoke all on function public.admin_set_user_status(uuid, text, boolean, text) from public, anon;
revoke all on function public.admin_get_audit_logs(integer, integer) from public, anon;

grant execute on function public.admin_set_user_status(uuid, text, boolean, text) to authenticated;
grant execute on function public.admin_get_audit_logs(integer, integer) to authenticated;
