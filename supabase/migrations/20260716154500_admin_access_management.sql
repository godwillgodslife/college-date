-- Owner-only admin access management.
-- This gives the admin portal a safe path to inspect, grant, restrict, and
-- revoke admin access without trusting user-editable metadata.

create or replace function public.admin_is_owner()
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user auth.users;
  v_email text;
begin
  if auth.uid() is null then
    return false;
  end if;

  select *
  into v_user
  from auth.users
  where id = auth.uid();

  if v_user.id is null then
    return false;
  end if;

  v_email := lower(coalesce(v_user.email, ''));

  return v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com')
    or v_user.raw_app_meta_data->>'role' in ('owner', 'super_admin');
end;
$function$;

create or replace function public.admin_get_admin_access_list()
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  permission_mode text,
  permissions jsonb,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.admin_is_owner() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.full_name::text,
    case
      when lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com')
        or u.raw_app_meta_data->>'role' in ('owner', 'super_admin') then 'owner'
      when jsonb_typeof(u.raw_app_meta_data->'admin_permissions') = 'array' then 'restricted_admin'
      when coalesce((u.raw_app_meta_data->>'is_admin')::boolean, false) = true
        or u.raw_app_meta_data->>'role' = 'admin' then 'legacy_admin'
      else 'admin'
    end as role,
    case
      when lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com')
        or u.raw_app_meta_data->>'role' in ('owner', 'super_admin') then 'owner_full_access'
      when jsonb_typeof(u.raw_app_meta_data->'admin_permissions') = 'array' then 'explicit_permissions'
      else 'legacy_full_access'
    end as permission_mode,
    case
      when lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com')
        or u.raw_app_meta_data->>'role' in ('owner', 'super_admin') then jsonb_build_array('*')
      when jsonb_typeof(u.raw_app_meta_data->'admin_permissions') = 'array' then u.raw_app_meta_data->'admin_permissions'
      else jsonb_build_array('*')
    end as permissions,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com')
    or coalesce((u.raw_app_meta_data->>'is_admin')::boolean, false) = true
    or u.raw_app_meta_data->>'role' in ('admin', 'owner', 'super_admin')
    or jsonb_typeof(u.raw_app_meta_data->'admin_permissions') = 'array'
  order by
    case
      when lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com')
        or u.raw_app_meta_data->>'role' in ('owner', 'super_admin') then 0
      else 1
    end,
    u.created_at desc;
end;
$function$;

create or replace function public.admin_update_admin_access(
  p_target_user_id uuid,
  p_mode text,
  p_permissions text[] default '{}'::text[],
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_mode text := lower(nullif(trim(coalesce(p_mode, '')), ''));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_target auth.users;
  v_target_email text;
  v_permissions text[];
  v_permission text;
  v_allowed text[] := array[
    'users:read',
    'users:moderate',
    'content:moderate',
    'finance:read',
    'finance:payouts',
    'config:write',
    'promo:write',
    'push:broadcast',
    'audit:read'
  ];
  v_metadata jsonb;
begin
  if not public.admin_is_owner() then
    raise exception 'Not authorized';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if v_mode not in ('legacy_admin', 'restricted_admin', 'revoke_admin') then
    raise exception 'Unsupported admin access mode';
  end if;

  if v_reason is null or length(v_reason) < 5 then
    raise exception 'Audit reason must be at least 5 characters';
  end if;

  select *
  into v_target
  from auth.users
  where id = p_target_user_id;

  if v_target.id is null then
    raise exception 'Target user not found';
  end if;

  v_target_email := lower(coalesce(v_target.email, ''));

  if v_target_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com')
    and v_mode = 'revoke_admin' then
    raise exception 'Owner admin access cannot be revoked';
  end if;

  if v_mode = 'restricted_admin' then
    select coalesce(array_agg(distinct lower(trim(permission))) filter (where nullif(trim(permission), '') is not null), '{}'::text[])
    into v_permissions
    from unnest(coalesce(p_permissions, '{}'::text[])) as permissions(permission);

    if coalesce(array_length(v_permissions, 1), 0) = 0 then
      raise exception 'Restricted admins require at least one permission';
    end if;

    foreach v_permission in array v_permissions loop
      if not v_permission = any(v_allowed) then
        raise exception 'Unsupported permission: %', v_permission;
      end if;
    end loop;

    update auth.users
    set raw_app_meta_data = jsonb_strip_nulls(
      (coalesce(raw_app_meta_data, '{}'::jsonb) - 'is_admin')
      || jsonb_build_object(
        'role', 'restricted_admin',
        'admin_permissions', to_jsonb(v_permissions)
      )
    )
    where id = p_target_user_id;
  elsif v_mode = 'legacy_admin' then
    v_permissions := array['*'];

    update auth.users
    set raw_app_meta_data = jsonb_strip_nulls(
      (coalesce(raw_app_meta_data, '{}'::jsonb) - 'admin_permissions')
      || jsonb_build_object(
        'is_admin', true,
        'role', 'admin'
      )
    )
    where id = p_target_user_id;
  elsif v_mode = 'revoke_admin' then
    v_permissions := '{}'::text[];

    update auth.users
    set raw_app_meta_data = jsonb_strip_nulls(
      coalesce(raw_app_meta_data, '{}'::jsonb)
      - 'is_admin'
      - 'role'
      - 'admin_permissions'
    )
    where id = p_target_user_id;
  end if;

  v_metadata := jsonb_build_object(
    'mode', v_mode,
    'permissions', to_jsonb(v_permissions),
    'reason', v_reason,
    'target_email', v_target.email
  );

  perform public.admin_write_audit_log(
    'admin_update_admin_access',
    'admin_access',
    p_target_user_id,
    v_metadata
  );

  return jsonb_build_object(
    'success', true,
    'targetUserId', p_target_user_id,
    'mode', v_mode,
    'permissions', to_jsonb(v_permissions)
  );
end;
$function$;

revoke all on function public.admin_is_owner() from public, anon;
revoke all on function public.admin_get_admin_access_list() from public, anon;
revoke all on function public.admin_update_admin_access(uuid, text, text[], text) from public, anon;

grant execute on function public.admin_is_owner() to authenticated;
grant execute on function public.admin_get_admin_access_list() to authenticated;
grant execute on function public.admin_update_admin_access(uuid, text, text[], text) to authenticated;
