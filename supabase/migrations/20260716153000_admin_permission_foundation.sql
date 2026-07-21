-- Admin permission foundation.
-- Backward-compatible rules:
-- - owner emails always get full access
-- - legacy app_metadata.is_admin/role=admin users keep full access unless
--   app_metadata.admin_permissions is explicitly set
-- - future restricted admins can be represented with admin_permissions array

create or replace function public.is_app_admin()
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

  if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com') then
    return true;
  end if;

  return coalesce((v_user.raw_app_meta_data->>'is_admin')::boolean, false) = true
    or v_user.raw_app_meta_data->>'role' in ('admin', 'owner', 'super_admin')
    or jsonb_typeof(v_user.raw_app_meta_data->'admin_permissions') = 'array';
end;
$function$;

create or replace function public.admin_has_permission(p_permission text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user auth.users;
  v_email text;
  v_permission text := lower(nullif(trim(coalesce(p_permission, '')), ''));
  v_permissions jsonb;
begin
  if v_permission is null or auth.uid() is null then
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
  v_permissions := v_user.raw_app_meta_data->'admin_permissions';

  if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com') then
    return true;
  end if;

  if v_user.raw_app_meta_data->>'role' in ('owner', 'super_admin') then
    return true;
  end if;

  if jsonb_typeof(v_permissions) = 'array' then
    return v_permissions ? v_permission or v_permissions ? '*';
  end if;

  -- Legacy admins keep full access until they are migrated to explicit permissions.
  return coalesce((v_user.raw_app_meta_data->>'is_admin')::boolean, false) = true
    or v_user.raw_app_meta_data->>'role' = 'admin';
end;
$function$;

create or replace function public.admin_get_my_access()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user auth.users;
  v_email text;
  v_is_owner boolean := false;
  v_permissions jsonb;
  v_role text;
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  select *
  into v_user
  from auth.users
  where id = auth.uid();

  if v_user.id is null or not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  v_email := lower(coalesce(v_user.email, ''));
  v_is_owner := v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com')
    or v_user.raw_app_meta_data->>'role' in ('owner', 'super_admin');
  v_permissions := v_user.raw_app_meta_data->'admin_permissions';
  v_role := case
    when v_is_owner then 'owner'
    when jsonb_typeof(v_permissions) = 'array' then 'restricted_admin'
    when coalesce((v_user.raw_app_meta_data->>'is_admin')::boolean, false) = true
      or v_user.raw_app_meta_data->>'role' = 'admin' then 'legacy_admin'
    else 'admin'
  end;

  return jsonb_build_object(
    'isAdmin', true,
    'role', v_role,
    'isOwner', v_is_owner,
    'permissionMode', case
      when v_is_owner then 'owner_full_access'
      when jsonb_typeof(v_permissions) = 'array' then 'explicit_permissions'
      else 'legacy_full_access'
    end,
    'permissions', case
      when v_is_owner then jsonb_build_array('*')
      when jsonb_typeof(v_permissions) = 'array' then v_permissions
      else jsonb_build_array('*')
    end,
    'email', v_user.email
  );
end;
$function$;

-- Start enforcing explicit permission checks for the new high-risk broadcast
-- target preview RPC. Legacy full-access admins remain compatible.
create or replace function public.admin_get_push_broadcast_targets(
  p_segment text default 'all',
  p_test_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_segment text := lower(coalesce(nullif(trim(p_segment), ''), 'all'));
  v_now timestamptz := now();
  v_result jsonb;
begin
  if not public.admin_has_permission('push:broadcast') then
    raise exception 'Not authorized';
  end if;

  if v_segment in ('total subscriptions', 'all users', 'all_users') then
    v_segment := 'all';
  elsif v_segment in ('active users', 'active', 'active_users') then
    v_segment := 'active_7d';
  elsif v_segment in ('inactive users', 'inactive', 'inactive_users') then
    v_segment := 'inactive_7d';
  end if;

  if v_segment not in ('all', 'active_7d', 'inactive_7d') then
    raise exception 'Unsupported push segment: %', p_segment;
  end if;

  with eligible as (
    select distinct
      d.user_id,
      d.onesignal_subscription_id
    from public.user_notification_devices d
    join public.profiles p on p.id = d.user_id
    where d.revoked_at is null
      and nullif(trim(coalesce(d.onesignal_subscription_id, '')), '') is not null
      and coalesce(d.permission_status, 'unknown') <> 'denied'
      and coalesce(p.push_notifications, true) = true
      and coalesce(p.marketing_notifications, true) = true
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
      and (
        p_test_user_id is null
        or d.user_id = p_test_user_id
      )
      and (
        p_test_user_id is not null
        or v_segment = 'all'
        or (
          v_segment = 'active_7d'
          and coalesce(p.last_seen_at, p.last_active, p.created_at) >= v_now - interval '7 days'
        )
        or (
          v_segment = 'inactive_7d'
          and coalesce(p.last_seen_at, p.last_active, p.created_at) < v_now - interval '7 days'
        )
      )
  ),
  summary as (
    select
      count(distinct user_id)::integer as user_count,
      count(distinct onesignal_subscription_id)::integer as device_count,
      coalesce(jsonb_agg(distinct user_id) filter (where user_id is not null), '[]'::jsonb) as user_ids,
      coalesce(jsonb_agg(distinct onesignal_subscription_id) filter (where onesignal_subscription_id is not null), '[]'::jsonb) as subscription_ids
    from eligible
  )
  select jsonb_build_object(
    'segment', v_segment,
    'userCount', user_count,
    'deviceCount', device_count,
    'userIds', user_ids,
    'subscriptionIds', subscription_ids,
    'generatedAt', v_now
  )
  into v_result
  from summary;

  return coalesce(v_result, jsonb_build_object(
    'segment', v_segment,
    'userCount', 0,
    'deviceCount', 0,
    'userIds', '[]'::jsonb,
    'subscriptionIds', '[]'::jsonb,
    'generatedAt', v_now
  ));
end;
$function$;

revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.admin_has_permission(text) from public, anon;
revoke all on function public.admin_get_my_access() from public, anon;
revoke all on function public.admin_get_push_broadcast_targets(text, uuid) from public, anon;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.admin_has_permission(text) to authenticated;
grant execute on function public.admin_get_my_access() to authenticated;
grant execute on function public.admin_get_push_broadcast_targets(text, uuid) to authenticated;
