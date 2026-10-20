-- ============================================================================
-- Migration: 20261019120000_ultra_premium_billing_and_security_hardening.sql
-- Description:
--   1. Ensures is_ultra column exists on public.profiles.
--   2. Registers ultra_monthly, ultra_2month, and ultra_3month in public.paid_products.
--   3. Updates grant_paid_product_entitlements() to support Elite Ultra entitlements,
--      setting plan_type = 'Elite Ultra' and profiles.is_ultra = true.
--   4. Replaces check_message_off_platform_contact() trigger function to remove
--      the insecure client-supplied isUltraSender metadata bypass, strictly enforcing
--      server-authoritative subscription & profile checks.
--   5. Upgrades admin_get_user_detail() to include is_ultra in the returned profile.
-- ============================================================================

-- 1. ENSURE is_ultra COLUMN ON public.profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'is_ultra'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN is_ultra boolean DEFAULT false;
    END IF;
END $$;

-- 2. REGISTER ELITE ULTRA PRODUCTS IN public.paid_products
INSERT INTO public.paid_products (
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
    is_active,
    metadata
)
VALUES
    (
        'ultra_monthly',
        'The College Date Elite Ultra Monthly',
        'subscription',
        'paystack',
        'ultra_monthly',
        15000,
        'NGN',
        'monthly',
        30,
        null,
        '["ultra", "premium", "unrestricted_contact_sharing", "bio_unmasking", "extended_30s_video", "30_super_swipes", "10_boosts", "6_photos", "confessions_spotlight"]'::jsonb,
        ARRAY['web', 'android'],
        true,
        '{"tier": "ultra", "super_swipes": 30, "boosts": 10, "video_seconds": 30, "photos": 6}'::jsonb
    ),
    (
        'ultra_2month',
        'The College Date Elite Ultra 2-Month',
        'subscription',
        'paystack',
        'ultra_2month',
        30000,
        'NGN',
        '2month',
        60,
        null,
        '["ultra", "premium", "unrestricted_contact_sharing", "bio_unmasking", "extended_30s_video", "30_super_swipes", "10_boosts", "6_photos", "confessions_spotlight"]'::jsonb,
        ARRAY['web', 'android'],
        true,
        '{"tier": "ultra", "super_swipes": 60, "boosts": 20, "video_seconds": 30, "photos": 6}'::jsonb
    ),
    (
        'ultra_3month',
        'The College Date Elite Ultra 3-Month',
        'subscription',
        'paystack',
        'ultra_3month',
        35000,
        'NGN',
        '3month',
        90,
        null,
        '["ultra", "premium", "unrestricted_contact_sharing", "bio_unmasking", "extended_30s_video", "30_super_swipes", "10_boosts", "6_photos", "confessions_spotlight"]'::jsonb,
        ARRAY['web', 'android'],
        true,
        '{"tier": "ultra", "super_swipes": 90, "boosts": 30, "video_seconds": 30, "photos": 6}'::jsonb
    )
ON CONFLICT (product_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    billing_interval = EXCLUDED.billing_interval,
    duration_days = EXCLUDED.duration_days,
    entitlements = EXCLUDED.entitlements,
    platforms = EXCLUDED.platforms,
    is_active = true,
    metadata = EXCLUDED.metadata,
    updated_at = now();

-- 3. UPGRADE grant_paid_product_entitlements() TO HANDLE ULTRA TIERS
CREATE OR REPLACE FUNCTION public.grant_paid_product_entitlements(
    p_user_id uuid,
    p_product_id text,
    p_source text,
    p_source_reference text,
    p_starts_at timestamptz default now(),
    p_expires_at timestamptz default null,
    p_metadata jsonb default '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_product public.paid_products%rowtype;
    v_entitlement text;
    v_expires_at timestamptz;
    v_is_ultra boolean := false;
    v_plan_type text := 'Premium';
BEGIN
    SELECT * INTO v_product
    FROM public.paid_products
    WHERE product_id = p_product_id
      AND is_active = true;

    IF NOT FOUND THEN
        -- Fallback if product_id is an ultra variant not yet in paid_products table
        IF p_product_id LIKE 'ultra_%' THEN
            v_is_ultra := true;
            v_expires_at := COALESCE(p_expires_at, p_starts_at + interval '30 days');
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Product not found');
        END IF;
    ELSE
        v_is_ultra := (v_product.entitlements ? 'ultra') OR (p_product_id LIKE 'ultra_%');
        v_expires_at := COALESCE(
            p_expires_at,
            CASE
                WHEN v_product.duration_days IS NOT NULL THEN p_starts_at + make_interval(days => v_product.duration_days)
                ELSE p_starts_at + interval '30 days'
            END
        );

        -- Record individual entitlements
        FOR v_entitlement IN
            SELECT jsonb_array_elements_text(v_product.entitlements)
        LOOP
            INSERT INTO public.entitlements (
                user_id,
                entitlement_key,
                product_id,
                source,
                source_reference,
                status,
                starts_at,
                expires_at,
                metadata
            )
            VALUES (
                p_user_id,
                v_entitlement,
                p_product_id,
                p_source,
                p_source_reference,
                'active',
                p_starts_at,
                v_expires_at,
                COALESCE(p_metadata, '{}'::jsonb)
            )
            ON CONFLICT (user_id, entitlement_key, source, source_reference) DO UPDATE
            SET status = 'active',
                starts_at = LEAST(public.entitlements.starts_at, EXCLUDED.starts_at),
                expires_at = GREATEST(public.entitlements.expires_at, EXCLUDED.expires_at),
                revoked_at = null,
                metadata = public.entitlements.metadata || EXCLUDED.metadata,
                updated_at = now();
        END LOOP;
    END IF;

    -- Update or insert subscriptions record
    v_plan_type := CASE WHEN v_is_ultra THEN 'Elite Ultra' ELSE 'Premium' END;

    INSERT INTO public.subscriptions (
        user_id,
        plan_type,
        status,
        current_period_end,
        updated_at
    )
    VALUES (
        p_user_id,
        v_plan_type,
        'active',
        v_expires_at,
        now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET plan_type = CASE WHEN v_is_ultra THEN 'Elite Ultra' ELSE public.subscriptions.plan_type END,
        status = 'active',
        current_period_end = GREATEST(COALESCE(public.subscriptions.current_period_end, now()), EXCLUDED.current_period_end),
        updated_at = now();

    -- Authoritatively update user profile
    UPDATE public.profiles
    SET is_premium = true,
        is_ultra = CASE WHEN v_is_ultra THEN true else COALESCE(is_ultra, false) END,
        premium_expires_at = GREATEST(COALESCE(premium_expires_at, now()), v_expires_at)
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'is_ultra', v_is_ultra,
        'plan_type', v_plan_type,
        'expires_at', v_expires_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.grant_paid_product_entitlements(uuid, text, text, text, timestamptz, timestamptz, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_paid_product_entitlements(uuid, text, text, text, timestamptz, timestamptz, jsonb) TO service_role;

-- 4. HARDEN check_message_off_platform_contact() (REMOVES CLIENT METADATA BYPASS)
CREATE OR REPLACE FUNCTION public.check_message_off_platform_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_is_ultra boolean := false;
    v_clean text;
BEGIN
    -- Only evaluate text messages
    IF NEW.type IS DISTINCT FROM 'text' OR NEW.content IS NULL OR length(trim(NEW.content)) = 0 THEN
        RETURN NEW;
    END IF;

    -- Check if sender has active Elite Ultra VIP status from authoritative database records
    SELECT 
        COALESCE(p.is_ultra, false) 
        OR (s.status = 'active' AND s.plan_type ILIKE '%ultra%')
    INTO v_is_ultra
    FROM public.profiles p
    LEFT JOIN public.subscriptions s ON s.user_id = p.id AND s.status = 'active'
    WHERE p.id = NEW.sender_id;

    -- Elite Ultra members bypass all contact-sharing safeguards
    IF v_is_ultra IS TRUE THEN
        RETURN NEW;
    END IF;

    v_clean := lower(NEW.content);

    -- 1. Block external contact links & domains
    IF v_clean ~* '(wa\.me|chat\.whatsapp\.com|api\.whatsapp\.com|t\.me|telegram\.me|instagram\.com|instagr\.am|snapchat\.com|tiktok\.com|vm\.tiktok\.com|discord\.gg|linktr\.ee|beacons\.ai|bit\.ly|tinyurl\.com)' THEN
        RAISE EXCEPTION 'OFF_PLATFORM_CONTACT_BLOCKED: External messenger links are restricted. Upgrade to Elite Ultra (15k) to share external links.';
    END IF;

    -- 2. Block standard Nigerian phone numbers and international format digits (10-14 digits)
    -- Catches: 0803..., 090..., 070..., 081..., +234..., 0 8 0 3..., 0803-123-4567, etc.
    IF regexp_replace(v_clean, '[^0-9]', '', 'g') ~ '(?:234|0)[789][01][0-9]{7,8}' OR
       length(regexp_replace(v_clean, '[^0-9]', '', 'g')) >= 10 THEN
        RAISE EXCEPTION 'OFF_PLATFORM_CONTACT_BLOCKED: Phone numbers are restricted in chat. Upgrade to Elite Ultra (15k) to exchange contacts freely.';
    END IF;

    -- 3. Block email addresses
    IF v_clean ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' THEN
        RAISE EXCEPTION 'OFF_PLATFORM_CONTACT_BLOCKED: Email addresses cannot be shared. Upgrade to Elite Ultra (15k) to exchange contacts freely.';
    END IF;

    -- 4. Block explicit off-platform phrases & handle exchanges
    IF v_clean ~* '\b(my|your|ur|yr)\s+(whatsapp|whatsap|watsapp|ig|insta|instagram|snap|snapchat|tiktok|telegram|digits|phone number|numba|nomba|line)\b' OR
       v_clean ~* '\b(drop|send|give|share)\s+(your|ur|my)\s+(digits|number|whatsapp|ig|snap|handle|contact)\b' OR
       v_clean ~* '\b(add me on|follow me on|hmu on|whatsapp me|snap me)\s+(whatsapp|snap|snapchat|ig|insta|instagram|tiktok|telegram|x)\b' OR
       v_clean ~* '\b(flash|beep)\s+me\b' OR
       v_clean ~* '\b(drop|send)\s+(your|ur)\s+(opay|palmpay)\b' OR
       v_clean ~* '\b(move|talk|chat)\s+(off|outside)\s+(this|the)\s+app\b' THEN
        RAISE EXCEPTION 'OFF_PLATFORM_CONTACT_BLOCKED: Sharing off-platform contacts is restricted. Upgrade to Elite Ultra (15k) to ask any question without safeguards.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_message_off_platform_contact ON public.messages;
CREATE TRIGGER trg_check_message_off_platform_contact
BEFORE INSERT OR UPDATE OF content ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.check_message_off_platform_contact();

-- 5. UPGRADE admin_get_user_detail() TO RETURN is_ultra
CREATE OR REPLACE FUNCTION public.admin_get_user_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_profile jsonb;
  v_wallet jsonb;
  v_transactions jsonb;
BEGIN
  IF NOT (
    public.admin_has_permission('users:read') 
    OR public.admin_has_permission('users:moderate')
    OR public.admin_is_owner()
    OR public.is_app_admin()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT to_jsonb(p)
  INTO v_profile
  FROM (
    SELECT
      id,
      email,
      full_name,
      university,
      gender,
      avatar_url,
      is_banned,
      is_shadow_banned,
      is_verified,
      is_premium,
      is_ultra,
      premium_expires_at,
      created_at,
      last_seen_at,
      last_active
    FROM public.profiles
    WHERE id = p_user_id
  ) p;

  SELECT to_jsonb(w)
  INTO v_wallet
  FROM (
    SELECT
      id,
      user_id,
      available_balance,
      pending_balance,
      total_earned,
      total_spent,
      total_withdrawn,
      updated_at
    FROM public.wallets
    WHERE user_id = p_user_id
  ) w;

  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT
      id,
      user_id,
      wallet_id,
      type,
      amount,
      status,
      description,
      payment_method,
      reference_id,
      created_at
    FROM public.wallet_transactions
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 20
  ) t;

  PERFORM public.admin_write_audit_log(
    'admin_view_user_detail',
    'profile',
    p_user_id,
    jsonb_build_object('transaction_limit', 20)
  );

  RETURN jsonb_build_object(
    'profile', coalesce(v_profile, '{}'::jsonb),
    'wallet', coalesce(v_wallet, '{}'::jsonb),
    'transactions', coalesce(v_transactions, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_detail(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) TO authenticated;
