-- Migration: 20260903160000_rbac_fix_and_audit.sql
-- Purpose:
-- 1. Fix admin_has_permission RBAC legacy fallback vulnerability (remove blanket permissions for role='admin').
-- 2. Audit logging for admin invitation revocation.
-- 3. Insert/update paid_products for wallet funding: wallet_1000 (₦1,000) and wallet_2500 (₦2,500).
-- 4. Expose photo_updated_at in discovery_feed_v3 to enable avatar cache busting.

-- 1. Tighten admin_has_permission
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

  -- Owner always has all permissions (immutable)
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

  -- Strictly deny high-privilege access for legacy accounts without explicit permissions
  if coalesce((v_user.raw_app_meta_data->>'is_admin')::boolean, false) = true or v_user.raw_app_meta_data->>'role' = 'admin' then
    -- Legacy admins NEVER get admin management, admin view, or payout execution
    if v_permission in ('admins.manage', 'admins.view', 'finance.payouts', 'config.write', 'settings.manage') then
      return false;
    end if;
    -- Legacy admins get standard moderation and basic operational view rights
    return v_permission in (
      'users.view', 'users:read', 'users.manage', 'users:moderate',
      'profiles.view', 'profiles.moderate',
      'content.manage', 'content:moderate',
      'reports.view', 'reports.manage',
      'finance.read', 'finance:read', 'payments.view', 'subscriptions.view', 'transactions.view', 'wallets.view',
      'analytics.view'
    );
  end if;

  return false;
end;
$function$;

-- 2. Audit logging for admin invitation revocation
CREATE OR REPLACE FUNCTION public.admin_revoke_invitation(p_invitation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_invitation record;
begin
    if not (public.admin_is_owner() or public.admin_has_permission('admins.manage')) then
        raise exception 'Not authorized';
    end if;

    select * into v_invitation
    from public.admin_invitations
    where id = p_invitation_id;

    if v_invitation.id is null then
        raise exception 'Invitation not found';
    end if;

    update public.admin_invitations
    set status = 'revoked'
    where id = p_invitation_id;

    perform public.admin_write_audit_log(
        'admin_invite_revoked',
        'admin_invitations',
        p_invitation_id,
        jsonb_build_object('email', v_invitation.email, 'role', v_invitation.role)
    );

    return jsonb_build_object('success', true);
end;
$function$;

-- 3. Upsert wallet_1000 and wallet_2500 into paid_products
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
        'wallet_1000',
        'Wallet Top-up NGN 1,000',
        'wallet_funding',
        'paystack',
        'wallet_1000',
        1000,
        'NGN',
        null,
        null,
        1000,
        '["wallet_credit"]'::jsonb,
        array['web', 'android'],
        '{"credit_amount": 1000}'::jsonb
    ),
    (
        'wallet_2500',
        'Wallet Top-up NGN 2,500',
        'wallet_funding',
        'paystack',
        'wallet_2500',
        2500,
        'NGN',
        null,
        null,
        2500,
        '["wallet_credit"]'::jsonb,
        array['web', 'android'],
        '{"credit_amount": 2500}'::jsonb
    )
on conflict (product_id) do update
set display_name = excluded.display_name,
    product_type = excluded.product_type,
    provider = excluded.provider,
    provider_product_id = excluded.provider_product_id,
    amount = excluded.amount,
    currency = excluded.currency,
    wallet_credit_amount = excluded.wallet_credit_amount,
    entitlements = excluded.entitlements,
    platforms = excluded.platforms,
    is_active = true,
    metadata = excluded.metadata,
    updated_at = now();

-- 4. Update discovery_feed_v3 to expose photo_updated_at
DROP VIEW IF EXISTS public.discovery_feed_v3 CASCADE;
CREATE OR REPLACE VIEW public.discovery_feed_v3
WITH (security_invoker = true)
AS
 SELECT p.id,
    p.email,
    p.full_name,
    p.gender,
    p.age,
    p.university,
    p.bio,
    p.phone,
    p.avatar_url,
    p.photos,
    p.role,
    p.is_verified,
    p.is_blocked,
    p.free_swipes_remaining,
    p.created_at,
    p.updated_at,
    p.status_text,
    p.status_updated_at,
    p.referral_code,
    p.coins,
    p.is_online,
    p.last_seen,
    p.referred_by,
    p.free_swipes,
    p.last_seen_at,
    p.match_notifications,
    p.email_notifications,
    p.push_notifications,
    p.show_online_status,
    p.incognito_mode,
    p.voice_intro_url,
    p.anthem,
    p.location_status,
    p.faculty,
    p.department,
    p.level,
    p.genotype,
    p.mbti,
    p.attraction_goal,
    p.onesignal_id,
    p.streak_freeze_count,
    p.current_badge,
    p.username,
    p.completion_score,
    p.is_optimised,
    p.interests,
    p.intro_prompt,
    p.profile_photos,
    p.is_live,
    COALESCE(s.plan_type, 'Free'::text) AS plan_type,
    (EXISTS ( SELECT 1
           FROM boosts b
          WHERE b.user_id = p.id AND b.expires_at > now() AND b.type = '24h_boost'::text)) AS is_boosted,
    p.photo_updated_at
   FROM profiles p
     LEFT JOIN subscriptions s ON s.user_id = p.id
  WHERE COALESCE(p.is_banned, false) = false AND COALESCE(p.is_shadow_banned, false) = false;

GRANT SELECT ON public.discovery_feed_v3 TO authenticated;
GRANT SELECT ON public.discovery_feed_v3 TO anon;
