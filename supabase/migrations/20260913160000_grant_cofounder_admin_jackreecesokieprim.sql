-- ============================================================================
-- Migration: 20260913160000_grant_cofounder_admin_jackreecesokieprim.sql
-- Description:
--   Grants full co-founder administrator privileges to jackreecesokieprim@gmail.com.
--   1. Updates is_app_admin() to recognize jackreecesokieprim@gmail.com.
--   2. Updates admin_is_owner() to recognize jackreecesokieprim@gmail.com as platform owner/co-founder.
--   3. Updates admin_has_permission() so jackreecesokieprim@gmail.com retains all permissions (*).
--   4. Updates admin_get_my_access() to return owner role and full access.
--   5. Updates admin_get_admin_access_list() to display co-founder under owner section.
--   6. Protects co-founder from revocation in admin_update_admin_access() and admin_invite_admin().
--   7. Updates auth.users app_metadata with { is_admin: true, role: 'owner', admin_permissions: ['*'] }.
-- ============================================================================

-- 1. Update is_app_admin()
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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

  if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com') then
    return true;
  end if;

  return coalesce((v_user.raw_app_meta_data->>'is_admin')::boolean, false) = true
    or v_user.raw_app_meta_data->>'role' in ('admin', 'owner', 'super_admin')
    or jsonb_typeof(v_user.raw_app_meta_data->'admin_permissions') = 'array';
end;
$function$;

-- 2. Update admin_is_owner()
CREATE OR REPLACE FUNCTION public.admin_is_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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

  return v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
    or v_user.raw_app_meta_data->>'role' in ('owner', 'super_admin');
end;
$function$;

-- 3. Update admin_has_permission()
CREATE OR REPLACE FUNCTION public.admin_has_permission(p_permission text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_user auth.users;
  v_email text;
  v_permission text := lower(nullif(trim(coalesce(p_permission, '')), ''));
  v_permissions jsonb;
  v_aliases text[];
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

  -- Owner / Co-founder always has all permissions (immutable)
  if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com') then
    return true;
  end if;

  if v_user.raw_app_meta_data->>'role' in ('owner', 'super_admin') then
    return true;
  end if;

  -- Build equivalent aliases between dot notation and colon notation
  case v_permission
    when 'users.view', 'users:read' then v_aliases := array['users.view', 'users:read', 'users.manage', 'users:moderate'];
    when 'users.manage', 'users:moderate' then v_aliases := array['users.manage', 'users:moderate'];
    when 'profiles.view' then v_aliases := array['profiles.view', 'users.view', 'users:read'];
    when 'profiles.moderate' then v_aliases := array['profiles.moderate', 'users.manage', 'users:moderate'];
    when 'content.manage', 'content:moderate' then v_aliases := array['content.manage', 'content:moderate'];
    when 'reports.view', 'reports.manage' then v_aliases := array['reports.view', 'reports.manage', 'content.manage', 'content:moderate'];
    when 'finance.read', 'payments.view', 'subscriptions.view', 'transactions.view', 'wallets.view' then
      v_aliases := array['finance.read', 'finance:read', 'payments.view', 'subscriptions.view', 'transactions.view', 'wallets.view'];
    when 'finance.payouts', 'wallets.manage', 'refunds.manage' then
      v_aliases := array['finance.payouts', 'finance:payouts', 'wallets.manage', 'refunds.manage'];
    when 'config.write', 'config:write', 'settings.manage' then
      v_aliases := array['config.write', 'config:write', 'settings.manage'];
    when 'promo.write', 'promo:write' then
      v_aliases := array['promo.write', 'promo:write'];
    when 'push.broadcast', 'push:broadcast', 'notifications.send', 'notifications.manage' then
      v_aliases := array['push.broadcast', 'push:broadcast', 'notifications.send', 'notifications.manage'];
    when 'audit.read', 'audit:read' then
      v_aliases := array['audit.read', 'audit:read'];
    when 'analytics.view' then
      v_aliases := array['analytics.view', 'finance.read', 'finance:read'];
    when 'admins.view', 'admins.manage' then
      v_aliases := array['admins.view', 'admins.manage'];
    else
      v_aliases := array[v_permission];
  end case;

  if jsonb_typeof(v_permissions) = 'array' then
    if v_permissions ? '*' then
      return true;
    end if;

    for i in 1..coalesce(array_length(v_aliases, 1), 0) loop
      if v_permissions ? v_aliases[i] then
        return true;
      end if;
    end loop;
    return false;
  end if;

  -- Strictly deny high-privilege access for legacy accounts without explicit permissions
  if coalesce((v_user.raw_app_meta_data->>'is_admin')::boolean, false) = true or v_user.raw_app_meta_data->>'role' = 'admin' then
    if v_permission in ('admins.manage', 'admins.view', 'finance.payouts', 'config.write', 'settings.manage') then
      return false;
    end if;
    return v_permission in (
      'users.view', 'users:read', 'users.manage', 'users:moderate',
      'profiles.view', 'profiles.moderate',
      'content.manage', 'content:moderate',
      'reports.view', 'reports.manage',
      'finance.read', 'finance:read', 'payments.view', 'subscriptions.view', 'transactions.view', 'wallets.view',
      'promo.write', 'promo:write',
      'push.broadcast', 'push:broadcast', 'notifications.send',
      'audit.read', 'audit:read',
      'analytics.view'
    );
  end if;

  return false;
end;
$function$;

-- 4. Update admin_get_my_access()
CREATE OR REPLACE FUNCTION public.admin_get_my_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
  v_is_owner := v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
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

-- 5. Update admin_get_admin_access_list()
CREATE OR REPLACE FUNCTION public.admin_get_admin_access_list()
RETURNS table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  permission_mode text,
  permissions jsonb,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
      when lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
        or u.raw_app_meta_data->>'role' in ('owner', 'super_admin') then 'owner'
      when jsonb_typeof(u.raw_app_meta_data->'admin_permissions') = 'array' then 'restricted_admin'
      when coalesce((u.raw_app_meta_data->>'is_admin')::boolean, false) = true
        or u.raw_app_meta_data->>'role' = 'admin' then 'legacy_admin'
      else 'admin'
    end as role,
    case
      when lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
        or u.raw_app_meta_data->>'role' in ('owner', 'super_admin') then 'owner_full_access'
      when jsonb_typeof(u.raw_app_meta_data->'admin_permissions') = 'array' then 'explicit_permissions'
      else 'legacy_full_access'
    end as permission_mode,
    case
      when lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
        or u.raw_app_meta_data->>'role' in ('owner', 'super_admin') then jsonb_build_array('*')
      when jsonb_typeof(u.raw_app_meta_data->'admin_permissions') = 'array' then u.raw_app_meta_data->'admin_permissions'
      else jsonb_build_array('*')
    end as permissions,
    u.created_at,
    u.last_sign_in_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
    or coalesce((u.raw_app_meta_data->>'is_admin')::boolean, false) = true
    or u.raw_app_meta_data->>'role' in ('admin', 'owner', 'super_admin')
    or jsonb_typeof(u.raw_app_meta_data->'admin_permissions') = 'array'
  order by
    case
      when lower(coalesce(u.email, '')) in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
        or u.raw_app_meta_data->>'role' in ('owner', 'super_admin') then 0
      else 1
    end,
    u.created_at desc;
end;
$function$;

-- 6. Update admin_update_admin_access()
CREATE OR REPLACE FUNCTION public.admin_update_admin_access(
  p_target_user_id uuid,
  p_mode text,
  p_permissions text[] default '{}'::text[],
  p_reason text default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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

  -- Super Admin / Owner accounts are completely immutable via this RPC
  if v_target_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com') then
    raise exception 'Owner admin access cannot be modified or revoked';
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
    v_permissions := array[
      'users:read', 'users:moderate',
      'content:moderate',
      'finance:read',
      'promo:write',
      'push:broadcast',
      'audit:read'
    ];

    update auth.users
    set raw_app_meta_data = jsonb_strip_nulls(
      (coalesce(raw_app_meta_data, '{}'::jsonb) - 'admin_permissions')
      || jsonb_build_object(
        'is_admin', true,
        'role', 'admin',
        'admin_permissions', to_jsonb(v_permissions)
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
    'target_user_id', p_target_user_id,
    'target_email', v_target.email,
    'mode', v_mode,
    'permissions', to_jsonb(v_permissions)
  );
end;
$function$;

-- 7. Update admin_invite_admin() to protect co-founder email
CREATE OR REPLACE FUNCTION public.admin_invite_admin(
    p_email text,
    p_role text,
    p_permissions text[] default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
    v_email text := lower(trim(coalesce(p_email, '')));
    v_role text := lower(trim(coalesce(p_role, '')));
    v_perms text[];
    v_token text;
    v_invitation_id uuid;
    v_existing_user auth.users;
begin
    if not (public.admin_is_owner() or public.admin_has_permission('admins.manage')) then
        raise exception 'Not authorized to invite administrators';
    end if;

    if v_email is null or v_email not like '%@%' then
        raise exception 'Valid email address is required';
    end if;

    if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com') then
        raise exception 'Owner account cannot be invited';
    end if;

    if v_role = 'super_admin' and not public.admin_is_owner() then
        raise exception 'Only the Super Admin owner can invite another Super Admin';
    end if;

    if p_permissions is not null and array_length(p_permissions, 1) > 0 then
        v_perms := p_permissions;
    else
        v_perms := public.admin_get_role_permissions(v_role);
    end if;

    v_token := encode(gen_random_bytes(24), 'hex');

    -- Insert or update invitation
    insert into public.admin_invitations (
        email,
        role,
        permissions,
        invited_by,
        token,
        status,
        expires_at
    )
    values (
        v_email,
        v_role,
        to_jsonb(v_perms),
        auth.uid(),
        v_token,
        'pending',
        now() + interval '7 days'
    )
    returning id into v_invitation_id;

    -- If user already exists in auth.users, apply role immediately
    select *
    into v_existing_user
    from auth.users
    where lower(email) = v_email;

    if v_existing_user.id is not null then
        update auth.users
        set raw_app_meta_data = jsonb_strip_nulls(
            coalesce(raw_app_meta_data, '{}'::jsonb)
            || jsonb_build_object(
                'is_admin', true,
                'role', v_role,
                'admin_permissions', to_jsonb(v_perms)
            )
        )
        where id = v_existing_user.id;

        update public.admin_invitations
        set status = 'accepted',
            accepted_at = now()
        where id = v_invitation_id;
    end if;

    perform public.admin_write_audit_log(
        'admin_invite_created',
        'admin_invitations',
        v_invitation_id,
        jsonb_build_object(
            'email', v_email,
            'role', v_role,
            'permissions', to_jsonb(v_perms),
            'auto_activated', v_existing_user.id is not null
        )
    );

    return jsonb_build_object(
        'success', true,
        'invitationId', v_invitation_id,
        'email', v_email,
        'role', v_role,
        'token', v_token,
        'autoActivated', v_existing_user.id is not null
    );
end;
$$;

-- 8. Apply owner/co-founder claim directly to auth.users for jackreecesokieprim@gmail.com
UPDATE auth.users
SET raw_app_meta_data = jsonb_strip_nulls(
    coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
        'is_admin', true,
        'role', 'owner',
        'admin_permissions', jsonb_build_array('*')
    )
)
WHERE lower(email) IN ('jackreecesokieprim@gmail.com', 'jackreecesokieprim@gmail')
   OR id IN ('9844ac77-ad4d-4110-bfc6-45146acdf9ad', '77839c50-3535-44d0-ba53-c83b5253832b');

-- 9. Grants
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_my_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_admin_access_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_admin_access(uuid, text, text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_invite_admin(text, text, text[]) TO authenticated;
