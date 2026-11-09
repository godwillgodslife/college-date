-- =============================================================================
-- LAYER 5: DEFINITIVE DE-CLASHING, OVERLOAD PURGE, REGRESSION FIXES & LOCKDOWN
-- =============================================================================
-- This final authoritative layer resolves every historical clash across the 110
-- migrations and legacy scripts:
--   5.1 Drops obsolete/un-gated function overloads that cause PGRST203 ambiguity or bypass RBAC
--   5.2 Drops duplicate legacy triggers so notifications and hooks never double-fire
--   5.3 Restores & hardens the 4 RPCs that only existed in legacy root scripts
--       (purchase_boost, use_super_swipe, send_super_swipe, update_swipe_streak)
--   5.4 Fixes copy-paste regressions in admin_get_user_detail, admin_get_withdrawals,
--       admin_get_transactions, get_current_profile, check_and_reset_swipe_limit, and get_admirers_secure
--   5.5 Re-asserts strict least-privilege grants and revokes anon/public execution on sensitive RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 PURGE OBSOLETE / AMBIGUOUS FUNCTION OVERLOADS
-- -----------------------------------------------------------------------------
-- Drop old 8-parameter admin_search_users (replaced by 9-parameter version with p_activity)
DROP FUNCTION IF EXISTS public.admin_search_users(integer, integer, text, text, text, text, boolean, boolean);
DROP FUNCTION IF EXISTS public.admin_search_users(text, text, text, text, boolean, boolean, integer, integer);

-- Drop old un-gated 2-parameter admin_set_app_config (replaced by 3-parameter version with p_reason & RBAC)
DROP FUNCTION IF EXISTS public.admin_set_app_config(text, jsonb);

-- Drop old un-gated 1-parameter admin_deactivate_promo_code (replaced by 2-parameter version with p_reason & RBAC)
DROP FUNCTION IF EXISTS public.admin_deactivate_promo_code(uuid);

-- Drop old un-gated 2-parameter admin_get_transactions (replaced by 10-parameter filtered RBAC version)
DROP FUNCTION IF EXISTS public.admin_get_transactions(integer, integer);

-- Drop old un-gated 2-parameter admin_get_audit_logs (replaced by 8-parameter filtered RBAC version)
DROP FUNCTION IF EXISTS public.admin_get_audit_logs(integer, integer);

-- Drop old 6-parameter insert_notification (replaced by 16-parameter Notification 2.0 version)
DROP FUNCTION IF EXISTS public.insert_notification(uuid, uuid, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.insert_notification(uuid, text, text, text, jsonb, text);

-- Drop unsafe 1-parameter calculate_completion_score(uuid) (trigger version calculate_completion_score() is canonical)
DROP FUNCTION IF EXISTS public.calculate_completion_score(uuid);

-- Drop legacy update_profile_data overloads (superseded by update_current_profile)
DROP FUNCTION IF EXISTS public.update_profile_data(text, integer, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_profile_data(text, integer, text, text, text, text, text);

-- -----------------------------------------------------------------------------
-- 5.2 PURGE DUPLICATE LEGACY TRIGGERS & RE-BIND CANONICAL PROFILE TRIGGERS
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS profile_view_notification_trigger ON public.profile_views;
DROP TRIGGER IF EXISTS on_referred_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_referred_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS confession_notification_trigger ON public.confessions;
DROP TRIGGER IF EXISTS swipe_notification_trigger ON public.swipes;
DROP TRIGGER IF EXISTS trg_protect_profile_trust_badges ON public.profiles;

DROP TRIGGER IF EXISTS trigger_calculate_completion_score ON public.profiles;
CREATE TRIGGER trigger_calculate_completion_score
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_completion_score();

DROP TRIGGER IF EXISTS track_photo_update ON public.profiles;
CREATE TRIGGER track_photo_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_photo_timestamp();

-- -----------------------------------------------------------------------------
-- 5.3 HARDENED BOOST & SWIPE STREAK RPCs (PREVIOUSLY ONLY IN LEGACY ROOT SQL)
-- -----------------------------------------------------------------------------

-- 5.3.1 purchase_boost: Hardened with auth.uid() verification and FOR UPDATE wallet row lock
CREATE OR REPLACE FUNCTION public.purchase_boost(
    p_user_id uuid,
    p_boost_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_cost numeric;
    v_wallet_id uuid;
    v_balance numeric;
    v_multiplier numeric;
    v_expires_at timestamp with time zone;
    v_description text;
    v_boost_id uuid;
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF p_boost_type = '24h_boost' THEN
        v_cost := 1000.00;
        v_multiplier := 2.0;
        v_expires_at := now() + interval '24 hours';
        v_description := '24h Visibility Boost';
    ELSIF p_boost_type = 'super_swipe' THEN
        v_cost := 500.00;
        v_multiplier := 1.0;
        v_expires_at := now() + interval '30 days';
        v_description := 'Super Swipe Credit';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid boost type');
    END IF;

    SELECT id, available_balance
    INTO v_wallet_id, v_balance
    FROM public.wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF COALESCE(v_balance, 0) < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Need ₦' || v_cost || ', have ₦' || COALESCE(v_balance, 0));
    END IF;

    UPDATE public.wallets
    SET available_balance = available_balance - v_cost,
        total_spent = COALESCE(total_spent, 0) + v_cost,
        updated_at = now()
    WHERE id = v_wallet_id;

    INSERT INTO public.boosts (user_id, type, expires_at, multiplier)
    VALUES (p_user_id, p_boost_type, v_expires_at, v_multiplier)
    RETURNING id INTO v_boost_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (
        p_user_id,
        v_wallet_id,
        'boost_purchase',
        v_cost,
        'completed',
        v_description,
        jsonb_build_object('boost_id', v_boost_id, 'boost_type', p_boost_type)
    );

    RETURN jsonb_build_object(
        'success', true,
        'boost_id', v_boost_id,
        'boost_type', p_boost_type,
        'expires_at', v_expires_at,
        'amount_charged', v_cost
    );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_boost(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_boost(uuid, text) TO authenticated, service_role;

-- 5.3.2 use_super_swipe: Hardened with auth.uid() check and FOR UPDATE SKIP LOCKED boost lock
CREATE OR REPLACE FUNCTION public.use_super_swipe(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_boost_id uuid;
BEGIN
    IF v_caller_id IS DISTINCT FROM p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
    END IF;

    SELECT id INTO v_boost_id
    FROM public.boosts
    WHERE user_id = p_user_id
      AND type = 'super_swipe'
      AND expires_at > now()
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_boost_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No super swipe credits available');
    END IF;

    UPDATE public.boosts
    SET expires_at = now()
    WHERE id = v_boost_id;

    RETURN jsonb_build_object('success', true, 'used_boost_id', v_boost_id, 'boost_id', v_boost_id);
END;
$$;

REVOKE ALL ON FUNCTION public.use_super_swipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_super_swipe(uuid) TO authenticated, service_role;

-- 5.3.3 send_super_swipe: Consumes one super_swipe boost credit and records priority right swipe
CREATE OR REPLACE FUNCTION public.send_super_swipe(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_boost_id uuid;
    v_swipe_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    IF p_target_id IS NULL OR p_target_id = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid target');
    END IF;

    SELECT id INTO v_boost_id
    FROM public.boosts
    WHERE user_id = v_user_id
      AND type = 'super_swipe'
      AND expires_at > now()
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_boost_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No super swipe credits available');
    END IF;

    INSERT INTO public.swipes (
        swiper_id,
        swiped_id,
        direction,
        type,
        status,
        is_priority,
        is_free,
        message_teaser,
        created_at
    )
    VALUES (
        v_user_id,
        p_target_id,
        'right',
        'premium',
        'pending',
        true,
        true,
        'Sent a Super Swipe',
        now()
    )
    ON CONFLICT (swiper_id, swiped_id) DO UPDATE
    SET direction = 'right',
        type = 'premium',
        status = 'pending',
        is_priority = true,
        is_free = true,
        message_teaser = 'Sent a Super Swipe',
        created_at = now()
    RETURNING id INTO v_swipe_id;

    UPDATE public.boosts
    SET expires_at = now()
    WHERE id = v_boost_id;

    RETURN jsonb_build_object(
        'success', true,
        'swipe_id', v_swipe_id,
        'used_boost_id', v_boost_id,
        'boost_id', v_boost_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.send_super_swipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_super_swipe(uuid) TO authenticated, service_role;

-- 5.3.4 update_swipe_streak: Atomic engagement streak updater for swiping
DROP FUNCTION IF EXISTS public.update_swipe_streak(uuid);
CREATE OR REPLACE FUNCTION public.update_swipe_streak(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_streak integer := 1;
    v_score integer := 1;
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized', 'streak', 0);
    END IF;

    INSERT INTO public.engagement_scores (
        user_id,
        score,
        daily_streak,
        last_login,
        last_swipe_at,
        streak_updated_at
    )
    VALUES (
        p_user_id,
        1,
        1,
        now(),
        now(),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET score = COALESCE(public.engagement_scores.score, 0) + 1,
        daily_streak = CASE
            WHEN public.engagement_scores.last_swipe_at IS NULL THEN 1
            WHEN date_trunc('day', public.engagement_scores.last_swipe_at) = date_trunc('day', now())
                THEN GREATEST(COALESCE(public.engagement_scores.daily_streak, 1), 1)
            WHEN public.engagement_scores.last_swipe_at > now() - interval '36 hours'
                THEN COALESCE(public.engagement_scores.daily_streak, 0) + 1
            ELSE 1
        END,
        last_login = now(),
        last_swipe_at = now(),
        streak_updated_at = now()
    RETURNING daily_streak, score INTO v_streak, v_score;

    RETURN jsonb_build_object(
        'success', true,
        'streak', COALESCE(v_streak, 1),
        'score', COALESCE(v_score, 1)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.update_swipe_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_swipe_streak(uuid) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5.4 REGRESSION FIXES (MERGING SECURITY + EMAIL ISOLATION + ULTRA + RBAC)
-- -----------------------------------------------------------------------------

-- 5.4.0 get_admirers_secure & composite swipe indexes (from 20261023150000)
-- ============================================================================
-- Migration: 20261023150000_fix_get_admirers_secure_contract_and_indexes.sql
-- Description:
--   1. Restores backward-compatible data contract in public.get_admirers_secure:
--      Returns 'items' AND 'requests' arrays, 'premium' AND 'is_premium' flags,
--      'upgrade_required', and 'daily_limit', guaranteeing full parity with
--      both web (Requests.jsx, Chat.jsx) and native Android/iOS client parsing.
--   2. Preserves strict email privacy: safe swiper profile projection with NO email,
--      NO phone number, NO sensitive auth tokens.
--   3. Adds high-performance composite indexes on public.swipes for sub-50ms
--      connection request queries and eliminates cold query timeouts.
-- ============================================================================

-- 1. High-Performance Indexes for connection requests / admirers queries
CREATE INDEX IF NOT EXISTS idx_swipes_admirers_lookup
    ON public.swipes (swiped_id, status, is_priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id
    ON public.swipes (swiper_id);

-- 2. Update get_admirers_secure with universal dual contract & safe email projection
CREATE OR REPLACE FUNCTION public.get_admirers_secure(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_is_premium boolean;
    v_total integer := 0;
    v_today_accepts_count integer := 0;
    v_free_accepts_remaining integer := 3;
    v_items jsonb := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'Authentication required'
        );
    END IF;

    -- Check if user is premium
    v_is_premium := public.has_entitlement(v_user_id, 'premium');

    -- Count total pending swipes targeting the user (excluding shadow-banned or banned swipers)
    SELECT count(*)::integer
    INTO v_total
    FROM public.swipes sw
    JOIN public.profiles p ON p.id = sw.swiper_id
    WHERE sw.swiped_id = v_user_id
      AND sw.status = 'pending'
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(p.is_shadow_banned, false) = false;

    -- Count how many requests the user has accepted today (UTC)
    SELECT count(*)::integer
    INTO v_today_accepts_count
    FROM public.swipes sw
    WHERE sw.swiped_id = v_user_id
      AND sw.status = 'accepted'
      AND COALESCE(sw.updated_at, sw.created_at) >= (current_date at time zone 'UTC');

    IF v_is_premium THEN
        v_free_accepts_remaining := 999;
    ELSE
        v_free_accepts_remaining := GREATEST(0, 3 - v_today_accepts_count);
    END IF;

    IF NOT v_is_premium THEN
        -- For freemium users, unlock up to 3 admirers so they can accept/decline them, lock the rest
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT
                CASE
                    WHEN row_number() over (ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC) <= 3 THEN
                        jsonb_build_object(
                            'id', sw.id,
                            'swiper_id', sw.swiper_id,
                            'swiped_id', sw.swiped_id,
                            'type', sw.type,
                            'status', sw.status,
                            'is_priority', coalesce(sw.is_priority, false),
                            'message_teaser', sw.message_teaser,
                            'created_at', sw.created_at,
                            'locked', false,
                            'swiper', jsonb_build_object(
                                'id', p.id,
                                'full_name', p.full_name,
                                'username', p.username,
                                'gender', p.gender,
                                'age', p.age,
                                'university', p.university,
                                'faculty', p.faculty,
                                'department', p.department,
                                'level', p.level,
                                'avatar_url', p.avatar_url,
                                'profile_photos', p.profile_photos,
                                'photo_updated_at', p.photo_updated_at,
                                'is_verified', coalesce(p.is_verified, false),
                                'photo_verified', coalesce(p.photo_verified, false),
                                'bio', p.bio,
                                'interests', p.interests,
                                'intro_prompt', p.intro_prompt,
                                'voice_intro_url', p.voice_intro_url,
                                'anthem', p.anthem,
                                'attraction_goal', p.attraction_goal,
                                'last_seen_at', p.last_seen_at,
                                'last_active', p.last_active,
                                'is_live', p.is_live,
                                'completion_score', p.completion_score,
                                'current_badge', p.current_badge
                            )
                        )
                    ELSE
                        jsonb_build_object(
                            'id', sw.id,
                            'swiper_id', sw.swiper_id,
                            'swiped_id', sw.swiped_id,
                            'type', sw.type,
                            'status', sw.status,
                            'is_priority', coalesce(sw.is_priority, false),
                            'created_at', sw.created_at,
                            'locked', true,
                            'swiper', jsonb_build_object(
                                'full_name', 'Secret Admirer 🔒',
                                'university', p.university,
                                'avatar_url', null,
                                'is_verified', false
                            )
                        )
                END as item
            FROM public.swipes sw
            JOIN public.profiles p ON p.id = sw.swiper_id
            WHERE sw.swiped_id = v_user_id
              AND sw.status = 'pending'
              AND COALESCE(p.is_banned, false) = false
              AND COALESCE(p.is_shadow_banned, false) = false
            ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC
            LIMIT p_limit
        ) q;
    ELSE
        -- Premium: fully visible with safe fields (NO EMAIL, NO PHONE)
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT
                jsonb_build_object(
                    'id', sw.id,
                    'swiper_id', sw.swiper_id,
                    'swiped_id', sw.swiped_id,
                    'type', sw.type,
                    'status', sw.status,
                    'is_priority', coalesce(sw.is_priority, false),
                    'message_teaser', sw.message_teaser,
                    'created_at', sw.created_at,
                    'locked', false,
                    'swiper', jsonb_build_object(
                        'id', p.id,
                        'full_name', p.full_name,
                        'username', p.username,
                        'gender', p.gender,
                        'age', p.age,
                        'university', p.university,
                        'faculty', p.faculty,
                        'department', p.department,
                        'level', p.level,
                        'avatar_url', p.avatar_url,
                        'profile_photos', p.profile_photos,
                        'photo_updated_at', p.photo_updated_at,
                        'is_verified', coalesce(p.is_verified, false),
                        'photo_verified', coalesce(p.photo_verified, false),
                        'bio', p.bio,
                        'interests', p.interests,
                        'intro_prompt', p.intro_prompt,
                        'voice_intro_url', p.voice_intro_url,
                        'anthem', p.anthem,
                        'attraction_goal', p.attraction_goal,
                        'last_seen_at', p.last_seen_at,
                        'last_active', p.last_active,
                        'is_live', p.is_live,
                        'completion_score', p.completion_score,
                        'current_badge', p.current_badge
                    )
                ) as item
            FROM public.swipes sw
            JOIN public.profiles p ON p.id = sw.swiper_id
            WHERE sw.swiped_id = v_user_id
              AND sw.status = 'pending'
              AND COALESCE(p.is_banned, false) = false
              AND COALESCE(p.is_shadow_banned, false) = false
            ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC
            LIMIT p_limit
        ) q;
    END IF;

    -- Return full dual contract for 100% web & native compatibility
    RETURN jsonb_build_object(
        'success', true,
        'items', v_items,
        'requests', v_items,
        'premium', v_is_premium,
        'is_premium', v_is_premium,
        'upgrade_required', (NOT v_is_premium AND v_total > 3),
        'daily_limit', 3,
        'total_count', v_total,
        'free_accepts_remaining', v_free_accepts_remaining,
        'today_accepts_count', v_today_accepts_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admirers_secure(integer) TO authenticated;


-- 5.4.1 get_current_profile: Join auth.users so logged-in user sees their own email
--       even while public.profiles.email is forced to NULL for cross-user privacy
CREATE OR REPLACE FUNCTION public.get_current_profile()
RETURNS TABLE(
    id uuid,
    email text,
    full_name text,
    age integer,
    gender text,
    university text,
    bio text,
    avatar_url text,
    photos text[],
    profile_photos text[],
    is_verified boolean,
    is_premium boolean,
    role text,
    phone text,
    faculty text,
    department text,
    level text,
    mbti text,
    interests jsonb,
    attraction_goal text,
    interest_gender text,
    referral_code text,
    referred_by uuid,
    is_onboarded boolean,
    completion_score integer,
    intro_prompt text,
    voice_intro_url text,
    anthem text,
    location_status text,
    is_online boolean,
    is_live boolean,
    last_seen timestamp with time zone,
    last_seen_at timestamp with time zone,
    last_active timestamp with time zone,
    photo_updated_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT
        p.id,
        COALESCE(u.email, p.email)::text AS email,
        p.full_name,
        p.age,
        p.gender,
        p.university,
        p.bio,
        p.avatar_url,
        p.photos,
        p.profile_photos,
        p.is_verified,
        p.is_premium,
        p.role,
        p.phone,
        p.faculty,
        p.department,
        p.level,
        p.mbti,
        p.interests,
        p.attraction_goal,
        p.interest_gender,
        p.referral_code,
        p.referred_by,
        p.is_onboarded,
        p.completion_score,
        p.intro_prompt,
        p.voice_intro_url,
        p.anthem,
        p.location_status,
        p.is_online,
        p.is_live,
        p.last_seen,
        p.last_seen_at,
        p.last_active,
        p.photo_updated_at,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_current_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_profile() TO authenticated, service_role;

-- 5.4.2 check_and_reset_swipe_limit: Includes is_ultra + active subscriptions + FOR UPDATE lock
CREATE OR REPLACE FUNCTION public.check_and_reset_swipe_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_role text := current_setting('role', true);
    v_used integer;
    v_last_reset timestamp with time zone;
    v_max integer := 20;
    v_is_premium boolean := false;
BEGIN
    IF v_user_id IS NOT NULL AND v_user_id <> p_user_id AND v_role <> 'service_role' THEN
        RETURN jsonb_build_object('success', false, 'error', 'not_authorized');
    END IF;

    SELECT
        COALESCE(p.is_premium, false)
        OR COALESCE(p.is_ultra, false)
        OR EXISTS (
            SELECT 1
            FROM public.subscriptions s
            WHERE s.user_id = p_user_id
              AND (s.plan_type IN ('Premium', 'Ultra', 'Elite', 'Elite Ultra', 'FreeTrial') OR s.plan_type ILIKE '%premium%' OR s.plan_type ILIKE '%ultra%')
              AND s.status = 'active'
              AND (s.current_period_end IS NULL OR s.current_period_end > now())
        )
    INTO v_is_premium
    FROM public.profiles p
    WHERE p.id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'profile_missing');
    END IF;

    IF COALESCE(v_is_premium, false) THEN
        RETURN jsonb_build_object(
            'success', true,
            'can_swipe', true,
            'used_count', 0,
            'max_count', 999999,
            'is_premium', true
        );
    END IF;

    SELECT sl.swipes_used, sl.last_reset
    INTO v_used, v_last_reset
    FROM public.swipe_limits sl
    WHERE sl.user_id = p_user_id
    FOR UPDATE;

    IF v_used IS NULL THEN
        INSERT INTO public.swipe_limits (user_id, swipes_used, last_reset)
        VALUES (p_user_id, 0, now())
        ON CONFLICT (user_id) DO NOTHING;

        v_used := 0;
        v_last_reset := now();
    END IF;

    IF v_last_reset < now() - interval '24 hours' THEN
        UPDATE public.swipe_limits
        SET swipes_used = 0,
            last_reset = now()
        WHERE user_id = p_user_id;

        v_used := 0;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'can_swipe', COALESCE(v_used, 0) < v_max,
        'used_count', COALESCE(v_used, 0),
        'max_count', v_max,
        'is_premium', false
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_reset_swipe_limit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_reset_swipe_limit(uuid) TO authenticated, service_role;

-- 5.4.3 admin_get_user_detail: Merges Oct 19 (is_ultra, wallet_id, audit log, REVOKE) + Oct 21 (auth.users email join)
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
    OR public.admin_has_permission('users.view')
    OR public.admin_has_permission('users:moderate')
    OR public.admin_is_owner()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT to_jsonb(prof)
  INTO v_profile
  FROM (
    SELECT
      p.id,
      coalesce(u.email, p.email)::text AS email,
      p.full_name,
      p.university,
      p.gender,
      p.avatar_url,
      p.is_banned,
      p.is_shadow_banned,
      p.is_verified,
      p.is_premium,
      coalesce(p.is_ultra, false) AS is_ultra,
      p.premium_expires_at,
      p.created_at,
      p.last_seen_at,
      p.last_active
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_user_id
  ) prof;

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

REVOKE ALL ON FUNCTION public.admin_get_user_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) TO authenticated, service_role;

-- 5.4.4 admin_get_withdrawals: Merges July 16 (finance:read/finance:payouts RBAC + pending-first ordering) + Oct 21 (auth.users email join)
CREATE OR REPLACE FUNCTION public.admin_get_withdrawals(
  p_limit integer default 100,
  p_offset integer default 0,
  p_status text default null
)
RETURNS table (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  university text,
  gender text,
  amount numeric,
  type text,
  status text,
  bank_details jsonb,
  created_at timestamp with time zone,
  processed_at timestamp with time zone,
  processed_by uuid,
  admin_note text,
  rejection_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_status text := nullif(trim(coalesce(p_status, '')), '');
begin
  if not (
    public.admin_has_permission('finance:read')
    or public.admin_has_permission('finance:payouts')
    or public.admin_has_permission('wallet:read')
    or public.admin_has_permission('finance.view')
    or public.admin_is_owner()
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    w.id,
    w.user_id,
    p.full_name::text,
    coalesce(u.email, p.email)::text as email,
    p.university::text,
    p.gender::text,
    w.amount,
    w.type::text,
    w.status::text,
    w.bank_details,
    w.created_at,
    w.processed_at,
    w.processed_by,
    w.admin_note::text,
    w.rejection_reason::text
  from public.withdrawals w
  left join public.profiles p on p.id = w.user_id
  left join auth.users u on u.id = w.user_id
  where (v_status is null or lower(w.status) = lower(v_status))
  order by
    case when w.status = 'pending' then 0 else 1 end,
    w.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_withdrawals(integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_withdrawals(integer, integer, text) TO authenticated, service_role;

-- 5.4.5 admin_get_transactions: Merges July 16 10-arg signature with auth.users email join
CREATE OR REPLACE FUNCTION public.admin_get_transactions(
  p_limit integer default 100,
  p_offset integer default 0,
  p_search text default null,
  p_university text default null,
  p_gender text default null,
  p_type text default null,
  p_status text default null,
  p_source text default null,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
RETURNS table (
  id uuid,
  user_id uuid,
  full_name text,
  university text,
  gender text,
  type text,
  amount numeric,
  status text,
  description text,
  payment_method text,
  reference_id text,
  created_at timestamp with time zone,
  total_count bigint,
  total_amount numeric,
  credit_amount numeric,
  debit_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_university text := nullif(trim(coalesce(p_university, '')), '');
  v_gender text := lower(nullif(trim(coalesce(p_gender, '')), ''));
  v_type text := lower(nullif(trim(coalesce(p_type, '')), ''));
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_source text := lower(nullif(trim(coalesce(p_source, '')), ''));
begin
  if not (
    public.admin_has_permission('finance:read')
    or public.admin_has_permission('finance:payouts')
    or public.admin_has_permission('wallet:read')
    or public.admin_has_permission('finance.view')
    or public.admin_is_owner()
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  with filtered as (
    select
      wt.id,
      wt.user_id,
      p.full_name,
      p.university,
      p.gender,
      wt.type,
      wt.amount,
      wt.status,
      wt.description,
      wt.payment_method,
      wt.reference_id,
      wt.created_at
    from public.wallet_transactions wt
    left join public.profiles p on wt.user_id = p.id
    left join auth.users u on wt.user_id = u.id
    where
      (
        v_search is null
        or coalesce(p.full_name, '') ilike '%' || v_search || '%'
        or coalesce(u.email, p.email, '') ilike '%' || v_search || '%'
        or coalesce(p.university, '') ilike '%' || v_search || '%'
        or coalesce(wt.description, '') ilike '%' || v_search || '%'
        or coalesce(wt.reference_id, '') ilike '%' || v_search || '%'
        or wt.id::text = v_search
        or wt.user_id::text = v_search
      )
      and (v_university is null or coalesce(p.university, '') ilike '%' || v_university || '%')
      and (v_gender is null or lower(coalesce(p.gender, '')) = v_gender)
      and (v_type is null or lower(coalesce(wt.type, '')) = v_type)
      and (v_status is null or lower(coalesce(wt.status, '')) = v_status)
      and (v_source is null or lower(coalesce(wt.payment_method, 'wallet')) = v_source)
      and (p_from is null or wt.created_at >= p_from)
      and (p_to is null or wt.created_at <= p_to)
  ),
  totals as (
    select
      count(*)::bigint as total_count,
      coalesce(sum(ft.amount), 0)::numeric as total_amount,
      coalesce(sum(case when lower(coalesce(ft.type, '')) = 'credit' then ft.amount else 0 end), 0)::numeric as credit_amount,
      coalesce(sum(case when lower(coalesce(ft.type, '')) = 'debit' then ft.amount else 0 end), 0)::numeric as debit_amount
    from filtered ft
  )
  select
    f.id,
    f.user_id,
    f.full_name::text,
    f.university::text,
    f.gender::text,
    f.type::text,
    f.amount,
    f.status::text,
    f.description::text,
    f.payment_method::text,
    f.reference_id::text,
    f.created_at,
    t.total_count,
    t.total_amount,
    t.credit_amount,
    t.debit_amount
  from filtered f
  cross join totals t
  order by f.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_transactions(integer, integer, text, text, text, text, text, text, timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_transactions(integer, integer, text, text, text, text, text, text, timestamp with time zone, timestamp with time zone) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5.5 ZERO-TRUST PRIVILEGE LOCKDOWN (REVOKE ANON EXECUTION ON PRIVILEGED RPCs)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Revoke PUBLIC and anon execution from all SECURITY DEFINER functions in public schema
    -- except validate_referral_code(text) which is required on the pre-auth signup screen.
    FOR r IN
        SELECT p.oid::regprocedure AS fn_sig, p.proname
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
          AND p.proname NOT IN ('validate_referral_code')
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon;', r.fn_sig);
    END LOOP;

    -- Restrict internal queue/cron worker functions strictly to service_role
    FOR r IN
        SELECT p.oid::regprocedure AS fn_sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'claim_notification_email_batch',
              'fetch_pending_notification_emails',
              'mark_notification_email_result',
              'enqueue_delayed_notification_email',
              'dispatch_campus_retention_reminders',
              'grant_paid_product_entitlements',
              'write_payment_audit_log'
          )
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated;', r.fn_sig);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role;', r.fn_sig);
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 5.6 FINAL SCHEMA CACHE RELOAD
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
