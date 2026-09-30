-- Migration: 20260903140000_payment_architecture_and_multi_admin.sql
-- Purpose:
-- 1. Non-destructive payment ledger separation (is_test, environment columns on wallet_transactions).
-- 2. Classify existing test/sandbox data safely.
-- 3. Register super_swipe and 24h_boost in paid_products and update platform support.
-- 4. Extend process_verified_payment() for boosts, super swipes, and wallet funding with strict idempotency.
-- 5. Multi-admin roles, permissions engine, invitations table, and server-side role enforcement.
-- 6. Update admin_get_dashboard_stats() to cleanly separate real production revenue from test/sandbox revenue.

-- 1. Add is_test and environment to public.wallet_transactions
alter table public.wallet_transactions 
add column if not exists is_test boolean not null default false,
add column if not exists environment text default 'production';

-- Classify existing test records:
-- 21 Google Play sandbox records:
update public.wallet_transactions
set is_test = true, environment = 'SANDBOX'
where payment_method = 'google_play'
   or metadata->>'source' = 'revenuecat'
   or metadata->>'environment' = 'SANDBOX'
   or coalesce((metadata->>'is_sandbox')::boolean, false) = true;

-- Test Super Swipe records for developer godwillgodslife@gmail.com:
update public.wallet_transactions
set is_test = true, environment = 'DEVELOPMENT'
where user_id = '31a0609f-cfce-4168-aa8e-d79257f742b9'
  and (description ilike '%super swipe%' or metadata->>'boost_type' = 'super_swipe');

-- Pending deposit/subscription checkout attempts:
update public.wallet_transactions
set is_test = true, environment = 'TEST'
where status = 'pending' and type in ('deposit', 'subscription');

-- 2. Update and register products in public.paid_products
insert into public.paid_products (
    product_id,
    display_name,
    product_type,
    provider,
    provider_product_id,
    amount,
    currency,
    billing_interval,
    duration_days,
    wallet_credit_amount,
    entitlements,
    platforms,
    metadata
)
values
    (
        'super_swipe',
        'Super Swipe Credit',
        'consumable',
        'paystack',
        'super_swipe',
        500,
        'NGN',
        null,
        30,
        null,
        '["super_swipe"]'::jsonb,
        array['web', 'android'],
        '{"feature": "super_swipe", "multiplier": 1.0}'::jsonb
    ),
    (
        '24h_boost',
        '24h Visibility Boost',
        'boost',
        'paystack',
        '24h_boost',
        1000,
        'NGN',
        null,
        1,
        null,
        '["24h_boost"]'::jsonb,
        array['web', 'android'],
        '{"feature": "24h_boost", "multiplier": 2.0, "duration_hours": 24}'::jsonb
    )
on conflict (product_id) do update
set display_name = excluded.display_name,
    product_type = excluded.product_type,
    provider = excluded.provider,
    provider_product_id = excluded.provider_product_id,
    amount = excluded.amount,
    currency = excluded.currency,
    billing_interval = excluded.billing_interval,
    duration_days = excluded.duration_days,
    wallet_credit_amount = excluded.wallet_credit_amount,
    entitlements = excluded.entitlements,
    platforms = excluded.platforms,
    is_active = true,
    metadata = excluded.metadata,
    updated_at = now();

-- Update platforms for wallet funding products so both web and android are enabled
update public.paid_products
set platforms = array['web', 'android'],
    updated_at = now()
where product_type = 'wallet_funding';

-- 3. Extend process_verified_payment RPC
create or replace function public.process_verified_payment(
    p_provider text,
    p_provider_reference text,
    p_provider_status text default 'success',
    p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_attempt public.payment_attempts%rowtype;
    v_product public.paid_products%rowtype;
    v_wallet_id uuid;
    v_before numeric(12, 2);
    v_after numeric(12, 2);
    v_amount numeric(12, 2);
    v_tx_id uuid;
    v_boost_id uuid;
    v_expires_at timestamptz;
    v_multiplier numeric(4, 2);
    v_entitlement_result jsonb;
begin
    select *
    into v_attempt
    from public.payment_attempts
    where provider = p_provider
      and provider_reference = p_provider_reference
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Payment attempt not found');
    end if;

    if v_attempt.status = 'processed' then
        return jsonb_build_object(
            'success', true,
            'idempotent', true,
            'payment_attempt_id', v_attempt.id,
            'product_id', v_attempt.product_id,
            'message', 'Payment already processed'
        );
    end if;

    if v_attempt.status in ('failed', 'mismatch', 'abandoned') then
        return jsonb_build_object('success', false, 'error', 'Payment attempt cannot be processed from status ' || v_attempt.status);
    end if;

    select *
    into v_product
    from public.paid_products
    where product_id = v_attempt.product_id
      and is_active = true;

    if not found then
        update public.payment_attempts
        set status = 'failed',
            provider_status = p_provider_status,
            provider_response = coalesce(p_provider_payload, '{}'::jsonb),
            updated_at = now()
        where id = v_attempt.id;

        return jsonb_build_object('success', false, 'error', 'Paid product is not active');
    end if;

    update public.payment_attempts
    set status = 'verified',
        provider_status = p_provider_status,
        provider_response = coalesce(p_provider_payload, '{}'::jsonb),
        verified_at = coalesce(verified_at, now()),
        updated_at = now()
    where id = v_attempt.id;

    insert into public.wallets (user_id, available_balance, total_earned)
    values (v_attempt.user_id, 0, 0)
    on conflict (user_id) do nothing;

    select id, coalesce(available_balance, 0)
    into v_wallet_id, v_before
    from public.wallets
    where user_id = v_attempt.user_id
    for update;

    if v_product.product_type = 'wallet_funding' then
        v_amount := coalesce(v_product.wallet_credit_amount, v_attempt.expected_amount);
        v_after := coalesce(v_before, 0) + v_amount;

        update public.wallets
        set available_balance = v_after,
            total_earned = coalesce(total_earned, 0) + v_amount,
            updated_at = now()
        where id = v_wallet_id;

        insert into public.wallet_ledger (
            user_id,
            wallet_id,
            entry_type,
            amount,
            currency,
            source,
            source_reference,
            status,
            balance_before,
            balance_after,
            metadata
        )
        values (
            v_attempt.user_id,
            v_wallet_id,
            'credit',
            v_amount,
            v_attempt.currency,
            p_provider,
            p_provider_reference,
            'posted',
            v_before,
            v_after,
            jsonb_build_object('product_id', v_product.product_id, 'payment_attempt_id', v_attempt.id)
        );

        insert into public.wallet_transactions (
            user_id,
            wallet_id,
            type,
            amount,
            status,
            description,
            payment_method,
            reference_id,
            metadata
        )
        values (
            v_attempt.user_id,
            v_wallet_id,
            'deposit',
            v_amount,
            'completed',
            v_product.display_name,
            p_provider,
            p_provider_reference,
            jsonb_build_object('product_id', v_product.product_id, 'payment_attempt_id', v_attempt.id)
        )
        returning id into v_tx_id;

    elsif v_product.product_type = 'subscription' then
        v_entitlement_result := public.grant_paid_product_entitlements(
            v_attempt.user_id,
            v_product.product_id,
            p_provider,
            p_provider_reference,
            now(),
            null,
            jsonb_build_object('payment_attempt_id', v_attempt.id, 'provider_status', p_provider_status)
        );

        if not coalesce((v_entitlement_result->>'success')::boolean, false) then
            raise exception '%', coalesce(v_entitlement_result->>'error', 'Unable to grant entitlement');
        end if;

        update public.wallets
        set total_spent = coalesce(total_spent, 0) + v_attempt.expected_amount,
            updated_at = now()
        where id = v_wallet_id;

        insert into public.wallet_transactions (
            user_id,
            wallet_id,
            type,
            amount,
            status,
            description,
            payment_method,
            reference_id,
            metadata
        )
        values (
            v_attempt.user_id,
            v_wallet_id,
            'subscription',
            v_attempt.expected_amount,
            'completed',
            v_product.display_name,
            p_provider,
            p_provider_reference,
            jsonb_build_object(
                'product_id', v_product.product_id,
                'payment_attempt_id', v_attempt.id,
                'entitlement_result', v_entitlement_result
            )
        )
        returning id into v_tx_id;

    elsif v_product.product_type = 'boost' or v_product.product_id = '24h_boost' then
        v_expires_at := now() + interval '24 hours';
        v_multiplier := 2.0;

        insert into public.boosts (user_id, type, expires_at, multiplier)
        values (v_attempt.user_id, '24h_boost', v_expires_at, v_multiplier)
        returning id into v_boost_id;

        update public.wallets
        set total_spent = coalesce(total_spent, 0) + v_attempt.expected_amount,
            updated_at = now()
        where id = v_wallet_id;

        insert into public.wallet_transactions (
            user_id,
            wallet_id,
            type,
            amount,
            status,
            description,
            payment_method,
            reference_id,
            metadata
        )
        values (
            v_attempt.user_id,
            v_wallet_id,
            'payment',
            v_attempt.expected_amount,
            'completed',
            v_product.display_name,
            p_provider,
            p_provider_reference,
            jsonb_build_object(
                'product_id', v_product.product_id,
                'boost_id', v_boost_id,
                'boost_type', '24h_boost',
                'expires_at', v_expires_at,
                'payment_attempt_id', v_attempt.id
            )
        )
        returning id into v_tx_id;

    elsif v_product.product_type = 'consumable' or v_product.product_id = 'super_swipe' then
        v_expires_at := now() + interval '30 days';
        v_multiplier := 1.0;

        insert into public.boosts (user_id, type, expires_at, multiplier)
        values (v_attempt.user_id, 'super_swipe', v_expires_at, v_multiplier)
        returning id into v_boost_id;

        update public.wallets
        set total_spent = coalesce(total_spent, 0) + v_attempt.expected_amount,
            updated_at = now()
        where id = v_wallet_id;

        insert into public.wallet_transactions (
            user_id,
            wallet_id,
            type,
            amount,
            status,
            description,
            payment_method,
            reference_id,
            metadata
        )
        values (
            v_attempt.user_id,
            v_wallet_id,
            'payment',
            v_attempt.expected_amount,
            'completed',
            v_product.display_name,
            p_provider,
            p_provider_reference,
            jsonb_build_object(
                'product_id', v_product.product_id,
                'boost_id', v_boost_id,
                'boost_type', 'super_swipe',
                'expires_at', v_expires_at,
                'payment_attempt_id', v_attempt.id
            )
        )
        returning id into v_tx_id;

    else
        return jsonb_build_object('success', false, 'error', 'Unsupported product type for payment processing: ' || v_product.product_type);
    end if;

    update public.payment_attempts
    set status = 'processed',
        processed_at = now(),
        updated_at = now()
    where id = v_attempt.id;

    insert into public.payment_audit_logs (
        actor_user_id,
        action,
        provider,
        provider_reference,
        product_id,
        result,
        metadata
    )
    values (
        v_attempt.user_id,
        'process_verified_payment',
        p_provider,
        p_provider_reference,
        v_product.product_id,
        'success',
        jsonb_build_object(
            'payment_attempt_id', v_attempt.id,
            'transaction_id', v_tx_id,
            'product_type', v_product.product_type
        )
    );

    return jsonb_build_object(
        'success', true,
        'payment_attempt_id', v_attempt.id,
        'transaction_id', v_tx_id,
        'product_id', v_product.product_id,
        'product_type', v_product.product_type,
        'amount', v_attempt.expected_amount,
        'currency', v_attempt.currency
    );
end;
$$;

revoke all on function public.process_verified_payment(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.process_verified_payment(text, text, text, jsonb) to service_role;

-- 4. Multi-Admin Invitations Table & Roles Architecture
create table if not exists public.admin_invitations (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    role text not null,
    permissions jsonb not null default '[]'::jsonb,
    invited_by uuid references auth.users(id),
    token text unique not null,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
    expires_at timestamptz not null default (now() + interval '7 days'),
    created_at timestamptz not null default now(),
    accepted_at timestamptz
);

create index if not exists idx_admin_invitations_email on public.admin_invitations(lower(email));
create index if not exists idx_admin_invitations_token on public.admin_invitations(token);

alter table public.admin_invitations enable row level security;

drop policy if exists "Admins can view invitations" on public.admin_invitations;
create policy "Admins can view invitations"
on public.admin_invitations for select
to authenticated
using (public.admin_is_owner() or public.admin_has_permission('admins.manage') or public.admin_has_permission('admins.view'));

-- Standard role permissions helper
create or replace function public.admin_get_role_permissions(p_role text)
returns text[]
language plpgsql
immutable
as $$
declare
    v_role text := lower(trim(coalesce(p_role, '')));
begin
    case v_role
        when 'super_admin' then
            return array['*'];
        when 'admin' then
            return array[
                'users.view', 'users.manage', 'profiles.view', 'profiles.moderate',
                'content.manage', 'reports.view', 'reports.manage',
                'payments.view', 'wallets.view', 'wallets.manage', 'subscriptions.view', 'transactions.view',
                'refunds.manage', 'boosts.manage', 'super_swipes.manage',
                'notifications.send', 'notifications.manage', 'analytics.view',
                'admins.view', 'settings.manage'
            ];
        when 'moderator' then
            return array[
                'users.view', 'profiles.view', 'profiles.moderate',
                'content.manage', 'reports.view', 'reports.manage'
            ];
        when 'support' then
            return array[
                'users.view', 'profiles.view', 'transactions.view',
                'wallets.view', 'reports.view'
            ];
        when 'finance' then
            return array[
                'payments.view', 'wallets.view', 'wallets.manage',
                'subscriptions.view', 'transactions.view', 'refunds.manage',
                'analytics.view'
            ];
        when 'content_manager' then
            return array[
                'content.manage', 'notifications.send', 'notifications.manage', 'settings.manage'
            ];
        when 'marketing' then
            return array[
                'notifications.send', 'analytics.view', 'boosts.manage'
            ];
        when 'analyst' then
            return array[
                'analytics.view', 'transactions.view', 'users.view'
            ];
        else
            return array['users.view', 'audit:read'];
    end case;
end;
$$;

-- Enhanced admin_has_permission supporting granular dot notation and legacy colon aliases
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

  -- Owner always has all permissions
  if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com') then
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

  -- Legacy admins keep full access
  return coalesce((v_user.raw_app_meta_data->>'is_admin')::boolean, false) = true
    or v_user.raw_app_meta_data->>'role' = 'admin';
end;
$function$;

-- Admin invitations RPCs
create or replace function public.admin_invite_admin(
    p_email text,
    p_role text,
    p_permissions text[] default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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

    if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com') then
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

create or replace function public.admin_accept_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_token text := trim(coalesce(p_token, ''));
    v_invitation public.admin_invitations%rowtype;
    v_user auth.users;
begin
    if auth.uid() is null then
        raise exception 'Must be logged in to accept admin invitation';
    end if;

    select *
    into v_user
    from auth.users
    where id = auth.uid();

    select *
    into v_invitation
    from public.admin_invitations
    where token = v_token
      and status = 'pending'
      and expires_at > now()
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Invitation invalid or expired');
    end if;

    if lower(coalesce(v_user.email, '')) != lower(v_invitation.email) then
        return jsonb_build_object('success', false, 'error', 'Invitation is for a different email address');
    end if;

    update auth.users
    set raw_app_meta_data = jsonb_strip_nulls(
        coalesce(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'is_admin', true,
            'role', v_invitation.role,
            'admin_permissions', v_invitation.permissions
        )
    )
    where id = v_user.id;

    update public.admin_invitations
    set status = 'accepted',
        accepted_at = now()
    where id = v_invitation.id;

    perform public.admin_write_audit_log(
        'admin_invite_accepted',
        'admin_invitations',
        v_invitation.id,
        jsonb_build_object(
            'user_id', v_user.id,
            'email', v_user.email,
            'role', v_invitation.role
        )
    );

    return jsonb_build_object('success', true, 'role', v_invitation.role);
end;
$$;

create or replace function public.admin_revoke_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
begin
    if not (public.admin_is_owner() or public.admin_has_permission('admins.manage')) then
        raise exception 'Not authorized';
    end if;

    update public.admin_invitations
    set status = 'revoked'
    where id = p_invitation_id;

    return jsonb_build_object('success', true);
end;
$$;

create or replace function public.admin_get_admin_invitations()
returns table (
    id uuid,
    email text,
    role text,
    permissions jsonb,
    status text,
    expires_at timestamptz,
    created_at timestamptz,
    accepted_at timestamptz
)
language plpgsql
security definer
set search_path to ''
as $$
begin
    if not (public.admin_is_owner() or public.admin_has_permission('admins.manage') or public.admin_has_permission('admins.view')) then
        raise exception 'Not authorized';
    end if;

    return query
    select
        ai.id,
        ai.email,
        ai.role,
        ai.permissions,
        ai.status,
        ai.expires_at,
        ai.created_at,
        ai.accepted_at
    from public.admin_invitations ai
    order by ai.created_at desc;
end;
$$;

grant execute on function public.admin_invite_admin(text, text, text[]) to authenticated;
grant execute on function public.admin_accept_invitation(text) to authenticated;
grant execute on function public.admin_revoke_invitation(uuid) to authenticated;
grant execute on function public.admin_get_admin_invitations() to authenticated;

-- 5. Updated admin_get_dashboard_stats() with strict separation of production and test revenue
create or replace function public.admin_get_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_prod_cash_revenue numeric := 0;
  v_test_sandbox_revenue numeric := 0;
  v_today_prod_cash_revenue numeric := 0;
  v_app_spend_revenue numeric := 0;
  v_pending_payments numeric := 0;
  v_google_play_prod_gross numeric := 0;
  v_google_play_sandbox_gross numeric := 0;
  v_paystack_prod_gross numeric := 0;
  v_paystack_test_gross numeric := 0;
  v_payout_liability numeric := 0;
  v_dau integer := 0;
  v_new_signups integer := 0;
  v_university_stats jsonb := '[]'::jsonb;
begin
  if not (public.admin_has_permission('finance:read') or public.admin_has_permission('finance.read') or public.admin_has_permission('finance:payouts')) then
    raise exception 'Not authorized';
  end if;

  -- 1. Real Production Revenue (strictly excludes test/sandbox data)
  select
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('deposit', 'subscription', 'payment')
        and coalesce(wt.is_test, false) = false
        and coalesce(wt.environment, 'production') = 'production'
        and coalesce(wt.metadata->>'environment', 'PRODUCTION') = 'PRODUCTION'
        and coalesce((wt.metadata->>'is_sandbox')::boolean, false) = false
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and (
          coalesce(wt.is_test, false) = true
          or coalesce(wt.environment, 'production') != 'production'
          or coalesce(wt.metadata->>'environment', 'PRODUCTION') != 'PRODUCTION'
          or coalesce((wt.metadata->>'is_sandbox')::boolean, false) = true
        )
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('deposit', 'subscription', 'payment')
        and coalesce(wt.is_test, false) = false
        and coalesce(wt.environment, 'production') = 'production'
        and wt.created_at >= current_date
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('swipe_purchase', 'boost_purchase', 'gift_purchase')
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status = 'pending'
        and wt.type in ('deposit', 'subscription', 'payment')
    ), 0),
    -- Google Play Prod vs Sandbox
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and (wt.payment_method = 'google_play' or wt.metadata->>'source' = 'revenuecat')
        and coalesce(wt.is_test, false) = false
        and coalesce(wt.environment, 'production') = 'production'
        and coalesce(wt.metadata->>'environment', 'PRODUCTION') = 'PRODUCTION'
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and (wt.payment_method = 'google_play' or wt.metadata->>'source' = 'revenuecat')
        and (
          coalesce(wt.is_test, false) = true
          or coalesce(wt.environment, 'production') != 'production'
          or coalesce(wt.metadata->>'environment', 'PRODUCTION') != 'PRODUCTION'
          or coalesce((wt.metadata->>'is_sandbox')::boolean, false) = true
        )
    ), 0),
    -- Paystack Prod vs Test
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.payment_method = 'paystack'
        and coalesce(wt.is_test, false) = false
        and coalesce(wt.environment, 'production') = 'production'
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.payment_method = 'paystack'
        and (coalesce(wt.is_test, false) = true or coalesce(wt.environment, 'production') != 'production')
    ), 0)
  into
    v_prod_cash_revenue,
    v_test_sandbox_revenue,
    v_today_prod_cash_revenue,
    v_app_spend_revenue,
    v_pending_payments,
    v_google_play_prod_gross,
    v_google_play_sandbox_gross,
    v_paystack_prod_gross,
    v_paystack_test_gross
  from public.wallet_transactions wt;

  select coalesce(sum(coalesce(w.available_balance, 0) + coalesce(w.pending_balance, 0)), 0)
  into v_payout_liability
  from public.wallets w
  join public.profiles p on p.id = w.user_id
  where lower(coalesce(p.gender, '')) = 'female'
    and coalesce(p.is_banned, false) = false
    and coalesce(p.is_shadow_banned, false) = false;

  select count(*)
  into v_dau
  from public.engagement_scores
  where last_login >= now() - interval '24 hours';

  select count(*)
  into v_new_signups
  from public.profiles
  where created_at >= current_date;

  select coalesce(jsonb_agg(sub), '[]'::jsonb)
  into v_university_stats
  from (
    select
      coalesce(nullif(trim(university), ''), 'Unspecified') as university,
      count(*) as student_count
    from public.profiles
    group by coalesce(nullif(trim(university), ''), 'Unspecified')
    order by student_count desc
    limit 6
  ) sub;

  return jsonb_build_object(
    'verified_cash_revenue', v_prod_cash_revenue,
    'today_verified_cash_revenue', v_today_prod_cash_revenue,
    'test_sandbox_revenue', v_test_sandbox_revenue,
    'app_spend_revenue', v_app_spend_revenue,
    'pending_payments', v_pending_payments,
    'google_play_gross', v_google_play_prod_gross,
    'google_play_sandbox_gross', v_google_play_sandbox_gross,
    'paystack_prod_gross', v_paystack_prod_gross,
    'paystack_test_gross', v_paystack_test_gross,
    'payout_liability', v_payout_liability,
    'dau', v_dau,
    'new_signups_today', v_new_signups,
    'university_stats', v_university_stats
  );
end;
$function$;

revoke all on function public.admin_get_dashboard_stats() from public, anon;
grant execute on function public.admin_get_dashboard_stats() to authenticated;
