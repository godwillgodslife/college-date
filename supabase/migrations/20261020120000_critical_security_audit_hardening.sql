-- ============================================================================
-- Migration: 20261020120000_critical_security_audit_hardening.sql
-- Description:
--   Comprehensive security hardening addressing findings from red-team audit:
--   1. Fix referral milestone infinite money glitch (VULN-CD-001):
--      - Adds referral_milestones_awarded integer[] to public.wallets.
--      - Rewrites process_referral_milestones with FOR UPDATE locking and
--        idempotent milestone tier tracking.
--   2. Fix unconfirmed admin email spoofing (VULN-CD-004):
--      - Hardens is_app_admin(), admin_is_owner(), and admin_has_permission()
--        to require email_confirmed_at IS NOT NULL.
--   3. Fix pending-avatars storage isolation (VULN-CD-005):
--      - Enforces (storage.foldername(name))[1] = auth.uid()::text on upload and update.
--   4. Prevent self-gifting in process_gift_purchase (VULN-CD-007).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REFERRAL MILESTONE INFINITE MONEY REMEDIATION (VULN-CD-001)
-- ----------------------------------------------------------------------------

-- Ensure referral_milestones_awarded array exists on public.wallets
ALTER TABLE public.wallets
    ADD COLUMN IF NOT EXISTS referral_milestones_awarded integer[] DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.process_referral_milestones(p_referrer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
    v_wallet_id uuid;
    v_milestones integer[];
    v_count bigint;
    v_milestone_tier integer;
    v_reward numeric := 0;
begin
    -- 1. Strict authorization: caller must be the referrer
    if auth.uid() is null or auth.uid() <> p_referrer_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    -- 2. Lock wallet row FOR UPDATE to eliminate concurrent double-claims
    select id, coalesce(referral_milestones_awarded, '{}')
    into v_wallet_id, v_milestones
    from public.wallets
    where user_id = p_referrer_id
    for update;

    if v_wallet_id is null then
        return jsonb_build_object('success', false, 'error', 'Wallet not found');
    end if;

    -- 3. Calculate total referrals (pending + rewarded)
    select count(*) into v_count
    from public.referrals
    where referrer_id = p_referrer_id and status in ('pending', 'rewarded');

    -- Calculate milestone tier (multiples of 10: 10, 20, 30...)
    v_milestone_tier := (v_count / 10)::integer * 10;

    -- 4. Check if this milestone tier has already been awarded
    if v_milestone_tier >= 10 and not (v_milestone_tier = any(v_milestones)) then
        v_reward := 3000;

        -- Atomically credit wallet and append milestone tier
        update public.wallets
        set available_balance = coalesce(available_balance, 0) + v_reward,
            total_earned = coalesce(total_earned, 0) + v_reward,
            referral_milestones_awarded = array_append(coalesce(referral_milestones_awarded, '{}'), v_milestone_tier),
            updated_at = now()
        where id = v_wallet_id;

        -- Record audit transaction
        insert into public.wallet_transactions
            (user_id, wallet_id, type, amount, status, description, metadata)
        values
            (
                p_referrer_id,
                v_wallet_id,
                'referral_milestone_bonus',
                v_reward,
                'completed',
                'Referral Milestone Bonus (' || v_milestone_tier || ' Friends)',
                jsonb_build_object('milestone_tier', v_milestone_tier, 'referral_count', v_count)
            );
    end if;

    -- 5. Mark pending referrals as rewarded
    update public.referrals
    set status = 'rewarded', rewarded_at = now()
    where referrer_id = p_referrer_id and status = 'pending';

    return jsonb_build_object(
        'success', true,
        'referral_count', v_count,
        'bonus_awarded', v_reward,
        'milestone_tier', v_milestone_tier
    );
end;
$$;

REVOKE ALL ON FUNCTION public.process_referral_milestones(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_referral_milestones(uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. ADMIN AUTHENTICATION HARDENING & EMAIL CONFIRMATION ENFORCEMENT (VULN-CD-004)
-- ----------------------------------------------------------------------------

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

  -- Email-based owner check REQUIRES confirmed email address
  if v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
     and v_user.email_confirmed_at is not null then
    return true;
  end if;

  return (coalesce((v_user.raw_app_meta_data->>'is_admin')::boolean, false) = true
    or v_user.raw_app_meta_data->>'role' in ('admin', 'owner', 'super_admin')
    or jsonb_typeof(v_user.raw_app_meta_data->'admin_permissions') = 'array')
    and v_user.email_confirmed_at is not null;
end;
$function$;

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

  -- Owner match REQUIRES confirmed email address
  return (
    v_email in ('godwillgodslife@gmail.com', 'godswillgodwillgodlife@gmail.com', 'jackreecesokieprim@gmail.com')
    and v_user.email_confirmed_at is not null
  ) or (
    v_user.raw_app_meta_data->>'role' in ('owner', 'super_admin')
    and v_user.email_confirmed_at is not null
  );
end;
$function$;

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

  if v_user.id is null or v_user.email_confirmed_at is null then
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
  end if;

  return false;
end;
$function$;

REVOKE ALL ON FUNCTION public.is_app_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_is_owner() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_is_owner() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_has_permission(text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_has_permission(text) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. STORAGE FOLDER ISOLATION FOR PENDING AVATARS (VULN-CD-005)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can upload pending avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload pending avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'pending-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can update own pending avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update own pending avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'pending-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'pending-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ----------------------------------------------------------------------------
-- 4. PROCESS GIFT PURCHASE SELF-GIFTING RESTRICTION (VULN-CD-007)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_gift_purchase(
    p_sender_id uuid,
    p_receiver_id uuid,
    p_gift_id uuid,
    p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
    v_sender_wallet_id uuid;
    v_receiver_wallet_id uuid;
    v_balance numeric;
begin
    if auth.uid() is null or auth.uid() <> p_sender_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    if p_sender_id = p_receiver_id then
        return jsonb_build_object('success', false, 'error', 'Cannot send gifts to yourself');
    end if;

    if p_amount is null or p_amount <= 0 then
        return jsonb_build_object('success', false, 'error', 'Invalid amount');
    end if;

    select id, available_balance
    into v_sender_wallet_id, v_balance
    from public.wallets
    where user_id = p_sender_id
    for update;

    if v_sender_wallet_id is null or coalesce(v_balance, 0) < p_amount then
        return jsonb_build_object('success', false, 'error', 'Insufficient balance');
    end if;

    select id
    into v_receiver_wallet_id
    from public.wallets
    where user_id = p_receiver_id;

    update public.wallets
    set available_balance = available_balance - p_amount,
        total_spent = coalesce(total_spent, 0) + p_amount,
        updated_at = now()
    where id = v_sender_wallet_id;

    insert into public.wallet_transactions
        (user_id, wallet_id, type, amount, status, description, metadata)
    values
        (
          p_sender_id,
          v_sender_wallet_id,
          'gift_purchase',
          p_amount,
          'completed',
          'Gift purchase',
          jsonb_build_object('gift_id', p_gift_id, 'receiver_id', p_receiver_id)
        );

    if v_receiver_wallet_id is not null then
        update public.wallets
        set available_balance = available_balance + (p_amount * 0.8),
            total_earned = coalesce(total_earned, 0) + (p_amount * 0.8),
            updated_at = now()
        where id = v_receiver_wallet_id;

        insert into public.wallet_transactions
            (user_id, wallet_id, type, amount, status, description, metadata)
        values
            (
              p_receiver_id,
              v_receiver_wallet_id,
              'gift_received',
              (p_amount * 0.8),
              'completed',
              'Gift received',
              jsonb_build_object('gift_id', p_gift_id, 'sender_id', p_sender_id)
            );
    end if;

    return jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

CREATE OR REPLACE FUNCTION public.process_gift_purchase(
    p_sender_id uuid,
    p_receiver_id uuid,
    p_gift_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
declare
    v_sender_wallet_id uuid;
    v_receiver_wallet_id uuid;
    v_gift_price numeric;
    v_gift_name text;
    v_sender_balance numeric;
begin
    if auth.uid() is null or auth.uid() <> p_sender_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    if p_sender_id = p_receiver_id then
        return jsonb_build_object('success', false, 'error', 'Cannot send gifts to yourself');
    end if;

    select price, name into v_gift_price, v_gift_name
    from public.gifts
    where id = p_gift_id;

    if not found or v_gift_price is null or v_gift_price <= 0 then
        return jsonb_build_object('success', false, 'error', 'Invalid gift');
    end if;

    select id, available_balance into v_sender_wallet_id, v_sender_balance
    from public.wallets
    where user_id = p_sender_id
    for update;

    if v_sender_balance is null or v_sender_balance < v_gift_price then
        return jsonb_build_object('success', false, 'error', 'Insufficient balance');
    end if;

    select id into v_receiver_wallet_id
    from public.wallets
    where user_id = p_receiver_id;

    update public.wallets
    set available_balance = available_balance - v_gift_price,
        total_spent = total_spent + v_gift_price,
        updated_at = now()
    where id = v_sender_wallet_id;

    insert into public.wallet_transactions
        (user_id, wallet_id, type, amount, status, description, metadata)
    values
        (p_sender_id, v_sender_wallet_id, 'gift_purchase', v_gift_price, 'completed', 'Sent Gift: ' || v_gift_name, jsonb_build_object('receiver_id', p_receiver_id, 'gift_id', p_gift_id));

    if v_receiver_wallet_id is not null then
        update public.wallets
        set available_balance = available_balance + (v_gift_price * 0.5),
            total_earned = total_earned + (v_gift_price * 0.5),
            updated_at = now()
        where id = v_receiver_wallet_id;

        insert into public.wallet_transactions
            (user_id, wallet_id, type, amount, status, description, metadata)
        values
            (p_receiver_id, v_receiver_wallet_id, 'gift_received', (v_gift_price * 0.5), 'completed', 'Received Gift: ' || v_gift_name, jsonb_build_object('sender_id', p_sender_id, 'gift_id', p_gift_id));
    end if;

    return jsonb_build_object('success', true, 'new_balance', v_sender_balance - v_gift_price);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

REVOKE ALL ON FUNCTION public.process_gift_purchase(uuid, uuid, uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_gift_purchase(uuid, uuid, uuid, numeric) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.process_gift_purchase(uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.process_gift_purchase(uuid, uuid, text) TO authenticated, service_role;
