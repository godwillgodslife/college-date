-- Migration: 20260904100000_audit_remediation_core.sql
-- Purpose:
-- 1. Harmonize process_swipe_payment with public.swipe_limits (20 free daily swipes)
-- 2. Strengthen admin_update_admin_access owner protection and remove wildcard permissions for legacy admin

CREATE OR REPLACE FUNCTION public.process_swipe_payment(
  p_swiper_id uuid,
  p_swiped_id uuid,
  p_swipe_type text,
  p_client_operation_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_cost numeric;
  v_swiper_wallet_id uuid;
  v_swiper_balance numeric;
  v_has_free_swipe boolean := false;
  v_is_premium boolean := false;
  v_swipe_id uuid;
  v_existing_result jsonb;
  v_result jsonb;
  v_operation_id text := nullif(trim(p_client_operation_id), '');
  v_swipes_used int;
begin
  if auth.uid() is null or auth.uid() <> p_swiper_id then
    return jsonb_build_object('success', false, 'error', 'Not authorized');
  end if;

  if p_swipe_type not in ('standard', 'premium') then
    return jsonb_build_object('success', false, 'error', 'Invalid swipe type');
  end if;

  if v_operation_id is not null then
    insert into public.swipe_payment_operations (
      user_id,
      client_operation_id,
      swiped_id,
      swipe_type
    )
    values (
      p_swiper_id,
      v_operation_id,
      p_swiped_id,
      p_swipe_type
    )
    on conflict (user_id, client_operation_id) do nothing;

    select result
    into v_existing_result
    from public.swipe_payment_operations
    where user_id = p_swiper_id
      and client_operation_id = v_operation_id
    for update;

    if v_existing_result is not null then
      return v_existing_result || jsonb_build_object('idempotent', true);
    end if;
  end if;

  select id
  into v_swipe_id
  from public.swipes
  where swiper_id = p_swiper_id
    and swiped_id = p_swiped_id
  limit 1;

  select
    coalesce(p.is_premium, false)
    or exists (
      select 1
      from public.subscriptions s
      where s.user_id = p_swiper_id
        and s.plan_type = 'Premium'
        and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
    )
  into v_is_premium
  from public.profiles p
  where p.id = p_swiper_id;

  if p_swipe_type = 'premium' then
    v_cost := 5000.00;
  else
    v_cost := 500.00;
  end if;

  if p_swipe_type = 'standard' and coalesce(v_is_premium, false) then
    update public.swipes
    set is_free = true
    where swiper_id = p_swiper_id
      and swiped_id = p_swiped_id
      and status = 'pending';

    v_result := jsonb_build_object('success', true, 'type', 'premium_free');
  elsif p_swipe_type = 'standard' then
    -- Reset or initialize daily swipe limit
    perform public.check_and_reset_swipe_limit(p_swiper_id);

    -- Check if daily free swipes (limit of 20) are available
    select swipes_used into v_swipes_used
    from public.swipe_limits
    where user_id = p_swiper_id
    for update;

    if coalesce(v_swipes_used, 0) < 20 then
      update public.swipe_limits
      set swipes_used = coalesce(swipes_used, 0) + 1
      where user_id = p_swiper_id;

      update public.swipes
      set is_free = true
      where swiper_id = p_swiper_id
        and swiped_id = p_swiped_id
        and status = 'pending';

      v_result := jsonb_build_object('success', true, 'type', 'free', 'used_count', coalesce(v_swipes_used, 0) + 1, 'max_count', 20);
    else
      -- Check if user has bonus free swipes stored on profile
      update public.profiles
      set free_swipes = greatest(coalesce(free_swipes, 0) - 1, 0)
      where id = p_swiper_id
        and coalesce(free_swipes, 0) > 0
      returning true into v_has_free_swipe;

      if v_has_free_swipe then
        update public.swipes
        set is_free = true
        where swiper_id = p_swiper_id
          and swiped_id = p_swiped_id
          and status = 'pending';

        v_result := jsonb_build_object('success', true, 'type', 'free');
      end if;
    end if;
  end if;

  if v_result is null then
    select id, available_balance
    into v_swiper_wallet_id, v_swiper_balance
    from public.wallets
    where user_id = p_swiper_id
    for update;

    if v_swiper_wallet_id is null or coalesce(v_swiper_balance, 0) < v_cost then
      v_result := jsonb_build_object('success', false, 'error', 'Insufficient balance');
    else
      update public.wallets
      set available_balance = available_balance - v_cost,
          total_spent = coalesce(total_spent, 0) + v_cost,
          updated_at = now()
      where id = v_swiper_wallet_id;

      insert into public.wallet_transactions (
        user_id,
        wallet_id,
        type,
        amount,
        status,
        description,
        reference_id,
        metadata
      )
      values (
        p_swiper_id,
        v_swiper_wallet_id,
        'swipe_purchase',
        v_cost,
        'completed',
        upper(p_swipe_type) || ' Swipe Request',
        case when v_operation_id is null then null else 'swipe:' || v_operation_id end,
        jsonb_build_object(
          'target_id', p_swiped_id,
          'swipe_id', v_swipe_id,
          'swipe_type', p_swipe_type,
          'client_operation_id', v_operation_id
        )
      );

      v_result := jsonb_build_object('success', true, 'type', 'paid', 'amount', v_cost);
    end if;
  end if;

  if v_operation_id is not null and coalesce((v_result->>'success')::boolean, false) then
    update public.swipe_payment_operations
    set swipe_id = v_swipe_id,
        result = v_result,
        updated_at = now()
    where user_id = p_swiper_id
      and client_operation_id = v_operation_id;
  elsif v_operation_id is not null then
    delete from public.swipe_payment_operations
    where user_id = p_swiper_id
      and client_operation_id = v_operation_id;
  end if;

  return v_result;
exception when others then
  v_result := jsonb_build_object('success', false, 'error', sqlerrm);

  if v_operation_id is not null then
    delete from public.swipe_payment_operations
    where user_id = p_swiper_id
      and client_operation_id = v_operation_id;
  end if;

  return v_result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.process_swipe_payment(
  p_swiper_id uuid,
  p_swiped_id uuid,
  p_swipe_type text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  select public.process_swipe_payment(p_swiper_id, p_swiped_id, p_swipe_type, null::text);
$function$;

-- Update admin_update_admin_access with strict Super Admin protection
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
  if v_target_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com') then
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
    -- Explicit standard operational permissions, never wildcard
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
