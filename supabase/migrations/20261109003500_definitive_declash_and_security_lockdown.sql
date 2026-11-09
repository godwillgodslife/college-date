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
--       admin_get_transactions, get_current_profile, and check_and_reset_swipe_limit
--   5.5 Re-asserts strict least-privilege grants and revokes anon/public execution on sensitive RPCs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5.1 PURGE OBSOLETE / AMBIGUOUS FUNCTION OVERLOADS
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_search_users(text, text, text, text, boolean, boolean, integer, integer);
DROP FUNCTION IF EXISTS public.admin_set_app_config(text, jsonb);
DROP FUNCTION IF EXISTS public.admin_deactivate_promo_code(uuid);
DROP FUNCTION IF EXISTS public.admin_get_transactions(integer, integer);
DROP FUNCTION IF EXISTS public.admin_get_audit_logs(integer, integer);
DROP FUNCTION IF EXISTS public.insert_notification(uuid, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.calculate_completion_score(uuid);

-- -----------------------------------------------------------------------------
-- 5.2 PURGE DUPLICATE LEGACY TRIGGERS & RE-BIND CANONICAL PROFILE TRIGGERS
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS profile_view_notification_trigger ON public.profile_views;
DROP TRIGGER IF EXISTS on_referred_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_referred_profile_updated ON public.profiles;
DROP TRIGGER IF EXISTS confession_notification_trigger ON public.confessions;
DROP TRIGGER IF EXISTS swipe_notification_trigger ON public.swipes;

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
        'payment',
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

-- 5.3.2 use_super_swipe: Hardened with auth.uid() check and FOR UPDATE boost lock
CREATE OR REPLACE FUNCTION public.use_super_swipe(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id uuid := auth.uid();
    v_boost_id uuid;
BEGIN
    IF v_caller_id IS NULL OR v_caller_id <> p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    SELECT id INTO v_boost_id
    FROM public.boosts
    WHERE user_id = p_user_id
      AND type = 'super_swipe'
      AND expires_at > now()
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_boost_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No Super Swipe credits available');
    END IF;

    UPDATE public.boosts
    SET expires_at = now()
    WHERE id = v_boost_id;

    RETURN jsonb_build_object('success', true, 'boost_id', v_boost_id);
END;
$$;

REVOKE ALL ON FUNCTION public.use_super_swipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_super_swipe(uuid) TO authenticated, service_role;

-- 5.3.3 send_super_swipe: Consumes one super_swipe boost credit and records priority right swipe
CREATE OR REPLACE FUNCTION public.send_super_swipe(p_target_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
        RETURN jsonb_build_object('success', false, 'error', 'Invalid target profile');
    END IF;

    SELECT id INTO v_boost_id
    FROM public.boosts
    WHERE user_id = v_user_id
      AND type = 'super_swipe'
      AND expires_at > now()
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_boost_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No Super Swipe credits available');
    END IF;

    UPDATE public.boosts
    SET expires_at = now()
    WHERE id = v_boost_id;

    INSERT INTO public.swipes (
        swiper_id,
        swiped_id,
        direction,
        type,
        status,
        is_priority,
        is_free,
        created_at
    )
    VALUES (
        v_user_id,
        p_target_id,
        'right',
        'super_swipe',
        'pending',
        true,
        false,
        now()
    )
    ON CONFLICT (swiper_id, swiped_id) DO UPDATE
    SET direction = 'right',
        type = 'super_swipe',
        status = 'pending',
        is_priority = true,
        created_at = now()
    RETURNING id INTO v_swipe_id;

    RETURN jsonb_build_object(
        'success', true,
        'swipe_id', v_swipe_id,
        'boost_id', v_boost_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.send_super_swipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_super_swipe(uuid) TO authenticated, service_role;

-- 5.3.4 update_swipe_streak: Atomic engagement streak updater for swiping
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
              AND s.plan_type IN ('Premium', 'Ultra', 'Elite', 'FreeTrial')
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
SET search_path = public, extensions
AS $$
DECLARE
    v_profile jsonb;
    v_wallet jsonb;
    v_subscription jsonb;
    v_Swipe_limits jsonb;
    v_transactions jsonb;
    v_withdrawals jsonb;
    v_reports_against jsonb;
    v_reports_by jsonb;
    v_referrals jsonb;
    v_audit_logs jsonb;
    v_counts jsonb;
BEGIN
    IF NOT public.admin_has_permission('users:read') THEN
        RAISE EXCEPTION 'Forbidden: admin users:read permission required';
    END IF;

    SELECT to_jsonb(p_row)
    INTO v_profile
    FROM (
        SELECT
            p.id,
            p.full_name,
            COALESCE(u.email, p.email) AS email,
            p.phone,
            p.gender,
            p.age,
            p.university,
            p.department,
            p.faculty,
            p.level,
            p.bio,
            p.avatar_url,
            p.photos,
            p.profile_photos,
            p.role,
            COALESCE(p.is_verified, false) AS is_verified,
            COALESCE(p.photo_verified, false) AS photo_verified,
            COALESCE(p.is_premium, false) AS is_premium,
            COALESCE(p.is_ultra, false) AS is_ultra,
            COALESCE(p.is_banned, false) AS is_banned,
            COALESCE(p.is_shadow_banned, false) AS is_shadow_banned,
            COALESCE(p.is_blocked, false) AS is_blocked,
            COALESCE(p.is_onboarded, false) AS is_onboarded,
            COALESCE(p.free_swipes, 0) AS free_swipes,
            COALESCE(p.completion_score, 0) AS completion_score,
            p.referral_code,
            p.referred_by,
            p.ai_review_status,
            p.ai_review_score,
            p.ai_review_Flags,
            p.ai_review_summary,
            p.last_seen_at,
            p.last_active,
            p.created_at,
            p.updated_at
        FROM public.profiles p
        LEFT JOIN auth.users u ON u.id = p.id
        WHERE p.id = p_user_id
    ) p_row;

    IF v_profile IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    SELECT to_jsonb(w_row)
    INTO v_wallet
    FROM (
        SELECT
            w.id,
            w.user_id,
            COALESCE(w.available_balance, 0) AS available_balance,
            COALESCE(w.pending_balance, 0) AS pending_balance,
            COALESCE(w.total_earned, 0) AS total_earned,
            COALESCE(w.total_spent, 0) AS total_spent,
            COALESCE(w.total_withdrawn, 0) AS total_withdrawn,
            w.updated_at
        FROM public.wallets w
        WHERE w.user_id = p_user_id
    ) w_row;

    SELECT to_jsonb(s_row)
    INTO v_subscription
    FROM (
        SELECT
            s.id,
            s.user_id,
            s.plan_type,
            s.status,
            s.current_period_start,
            s.current_period_end,
            s.payment_reference,
            s.created_at,
            s.updated_at
        FROM public.subscriptions s
        WHERE s.user_id = p_user_id
        ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
        LIMIT 1
    ) s_row;

    SELECT to_jsonb(sl_row)
    INTO v_Swipe_limits
    FROM (
        SELECT
            sl.user_id,
            COALESCE(sl.swipes_used, 0) AS swipes_used,
            sl.last_reset
        FROM public.swipe_limits sl
        WHERE sl.user_id = p_user_id
    ) sl_row;

    SELECT COALESCE(jsonb_agg(t_row), '[]'::jsonb)
    INTO v_transactions
    FROM (
        SELECT
            t.id,
            t.wallet_id,
            t.user_id,
            t.type,
            t.amount,
            t.status,
            t.description,
            t.reference_id,
            t.metadata,
            t.created_at
        FROM public.wallet_transactions t
        WHERE t.user_id = p_user_id
        ORDER BY t.created_at DESC
        LIMIT 25
    ) t_row;

    SELECT COALESCE(jsonb_agg(wd_row), '[]'::jsonb)
    INTO v_withdrawals
    FROM (
        SELECT
            w.id,
            w.user_id,
            w.amount,
            w.status,
            w.bank_name,
            w.account_number,
            w.account_name,
            w.admin_notes,
            w.payout_reference,
            w.reviewed_by,
            w.reviewed_at,
            w.created_at,
            w.processed_at
        FROM public.withdrawals w
        WHERE w.user_id = p_user_id
        ORDER BY w.created_at DESC
        LIMIT 15
    ) wd_row;

    SELECT COALESCE(jsonb_agg(ra_row), '[]'::jsonb)
    INTO v_reports_against
    FROM (
        SELECT
            r.id,
            r.reporter_id,
            rp.full_name AS reporter_name,
            r.reason,
            r.details,
            r.status,
            r.created_at
        FROM public.reports r
        LEFT JOIN public.profiles rp ON rp.id = r.reporter_id
        WHERE r.reported_id = p_user_id
        ORDER BY r.created_at DESC
        LIMIT 15
    ) ra_row;

    SELECT COALESCE(jsonb_agg(rb_row), '[]'::jsonb)
    INTO v_reports_by
    FROM (
        SELECT
            r.id,
            r.reported_id,
            tp.full_name AS reported_name,
            r.reason,
            r.details,
            r.status,
            r.created_at
        FROM public.reports r
        LEFT JOIN public.profiles tp ON tp.id = r.reported_id
        WHERE r.reporter_id = p_user_id
        ORDER BY r.created_at DESC
        LIMIT 15
    ) rb_row;

    SELECT COALESCE(jsonb_agg(ref_row), '[]'::jsonb)
    INTO v_referrals
    FROM (
        SELECT
            rf.id,
            rf.referrer_id,
            rf.referred_id,
            p2.full_name AS referred_name,
            rf.status,
            rf.reward_amount,
            rf.created_at
        FROM public.referrals rf
        LEFT JOIN public.profiles p2 ON p2.id = rf.referred_id
        WHERE rf.referrer_id = p_user_id OR rf.referred_id = p_user_id
        ORDER BY rf.created_at DESC
        LIMIT 20
    ) ref_row;

    SELECT COALESCE(jsonb_agg(al_row), '[]'::jsonb)
    INTO v_audit_logs
    FROM (
        SELECT
            l.id,
            l.admin_user_id,
            ap.full_name AS admin_name,
            l.action,
            l.target_type,
            l.target_id,
            l.metadata,
            l.created_at
        FROM public.admin_audit_logs l
        LEFT JOIN public.profiles ap ON ap.id = l.admin_user_id
        WHERE l.target_id = p_user_id::text
        ORDER BY l.created_at DESC
        LIMIT 25
    ) al_row;

    SELECT jsonb_build_object(
        'swipes_sent', (SELECT count(*) FROM public.swipes WHERE swiper_id = p_user_id),
        'swipes_received', (SELECT count(*) FROM public.swipes WHERE swiped_id = p_user_id AND direction = 'right'),
        'matches_count', (SELECT count(*) FROM public.matches WHERE user1_id = p_user_id OR user2_id = p_user_id),
        'messages_sent', (SELECT count(*) FROM public.messages WHERE sender_id = p_user_id),
        'confessions_count', (SELECT count(*) FROM public.confessions WHERE user_id = p_user_id),
        'reports_against_count', (SELECT count(*) FROM public.reports WHERE reported_id = p_user_id),
        'referrals_made_count', (SELECT count(*) FROM public.referrals WHERE referrer_id = p_user_id)
    )
    INTO v_counts;

    PERFORM public.admin_write_audit_log(
        'admin_view_user_detail',
        'profile',
        p_user_id::text,
        jsonb_build_object('viewed_user_id', p_user_id)
    );

    RETURN jsonb_build_object(
        'success', true,
        'profile', v_profile,
        'wallet', COALESCE(v_wallet, jsonb_build_object('available_balance', 0, 'pending_balance', 0, 'total_earned', 0, 'total_spent', 0, 'total_withdrawn', 0)),
        'subscription', v_subscription,
        'swipe_limits', v_Swipe_limits,
        'counts', v_counts,
        'transactions', v_transactions,
        'withdrawals', v_withdrawals,
        'reports_against', v_reports_against,
        'reports_by', v_reports_by,
        'referrals', v_referrals,
        'audit_logs', v_audit_logs
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_detail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_user_detail(uuid) TO authenticated, service_role;

-- 5.4.4 admin_get_withdrawals: Merges strict finance RBAC & pending-first ordering with auth.users email join
CREATE OR REPLACE FUNCTION public.admin_get_withdrawals(
    p_status text DEFAULT NULL,
    p_search text DEFAULT NULL,
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
    v_search text := nullif(btrim(coalesce(p_search, '')), '');
    v_limit integer := greatest(1, least(coalesce(p_limit, 100), 250));
    v_offset integer := greatest(0, coalesce(p_offset, 0));
    v_total bigint := 0;
    v_pending_count bigint := 0;
    v_pending_amount numeric := 0;
    v_items jsonb := '[]'::jsonb;
BEGIN
    IF NOT (public.admin_has_permission('finance:read') OR public.admin_has_permission('finance:payouts')) THEN
        RAISE EXCEPTION 'Forbidden: finance permission required';
    END IF;

    SELECT
        count(*),
        COALESCE(sum(w.amount), 0)
    INTO v_pending_count, v_pending_amount
    FROM public.withdrawals w
    WHERE w.status = 'pending';

    SELECT count(*)
    INTO v_total
    FROM public.withdrawals w
    LEFT JOIN public.profiles p ON p.id = w.user_id
    LEFT JOIN auth.users u ON u.id = w.user_id
    WHERE (v_status IS NULL OR v_status = 'all' OR lower(coalesce(w.status, '')) = v_status)
      AND (
          v_search IS NULL
          OR coalesce(p.full_name, '') ILIKE '%' || v_search || '%'
          OR coalesce(u.email, p.email, '') ILIKE '%' || v_search || '%'
          OR coalesce(w.bank_name, '') ILIKE '%' || v_search || '%'
          OR coalesce(w.account_number, '') ILIKE '%' || v_search || '%'
          OR coalesce(w.account_name, '') ILIKE '%' || v_search || '%'
          OR coalesce(w.payout_reference, '') ILIKE '%' || v_search || '%'
          OR w.user_id::text ILIKE '%' || v_search || '%'
          OR w.id::text ILIKE '%' || v_search || '%'
      );

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_items
    FROM (
        SELECT
            w.id,
            w.user_id,
            p.full_name AS user_name,
            COALESCE(u.email, p.email) AS user_email,
            p.university AS user_university,
            p.avatar_url AS user_avatar_url,
            COALESCE(p.is_banned, false) AS user_is_banned,
            COALESCE(p.is_shadow_banned, false) AS user_is_shadow_banned,
            w.amount,
            w.bank_name,
            w.account_number,
            w.account_name,
            w.status,
            w.admin_notes,
            w.payout_reference,
            w.reviewed_by,
            rp.full_name AS reviewed_by_name,
            w.reviewed_at,
            w.created_at,
            w.processed_at,
            COALESCE(wl.available_balance, 0) AS wallet_available_balance,
            COALESCE(wl.pending_balance, 0) AS wallet_pending_balance,
            COALESCE(wl.total_withdrawn, 0) AS wallet_total_withdrawn
        FROM public.withdrawals w
        LEFT JOIN public.profiles p ON p.id = w.user_id
        LEFT JOIN auth.users u ON u.id = w.user_id
        LEFT JOIN public.profiles rp ON rp.id = w.reviewed_by
        LEFT JOIN public.wallets wl ON wl.user_id = w.user_id
        WHERE (v_status IS NULL OR v_status = 'all' OR lower(coalesce(w.status, '')) = v_status)
          AND (
              v_search IS NULL
              OR coalesce(p.full_name, '') ILIKE '%' || v_search || '%'
              OR coalesce(u.email, p.email, '') ILIKE '%' || v_search || '%'
              OR coalesce(w.bank_name, '') ILIKE '%' || v_search || '%'
              OR coalesce(w.account_number, '') ILIKE '%' || v_search || '%'
              OR coalesce(w.account_name, '') ILIKE '%' || v_search || '%'
              OR coalesce(w.payout_reference, '') ILIKE '%' || v_search || '%'
              OR w.user_id::text ILIKE '%' || v_search || '%'
              OR w.id::text ILIKE '%' || v_search || '%'
          )
        ORDER BY
            CASE WHEN w.status = 'pending' THEN 0 ELSE 1 END,
            w.created_at DESC
        LIMIT v_limit
        OFFSET v_offset
    ) t;

    RETURN jsonb_build_object(
        'items', v_items,
        'total', v_total,
        'pending_count', v_pending_count,
        'pending_amount', v_pending_amount,
        'limit', v_limit,
        'offset', v_offset
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_withdrawals(text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_withdrawals(text, text, integer, integer) TO authenticated, service_role;

-- 5.4.5 admin_get_transactions: Joins auth.users so searching transactions by email works with profiles.email = NULL
CREATE OR REPLACE FUNCTION public.admin_get_transactions(
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0,
    p_search text DEFAULT NULL,
    p_type text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_min_amount numeric DEFAULT NULL,
    p_max_amount numeric DEFAULT NULL,
    p_start_at timestamp with time zone DEFAULT NULL,
    p_end_at timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    wallet_id uuid,
    user_id uuid,
    user_name text,
    user_email text,
    user_university text,
    type text,
    amount numeric,
    status text,
    description text,
    reference_id text,
    metadata jsonb,
    created_at timestamp with time zone,
    total_count bigint,
    completed_amount_sum numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_search text := nullif(btrim(coalesce(p_search, '')), '');
    v_type text := lower(nullif(btrim(coalesce(p_type, '')), ''));
    v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
    v_limit integer := greatest(1, least(coalesce(p_limit, 100), 250));
    v_offset integer := greatest(0, coalesce(p_offset, 0));
BEGIN
    IF NOT public.admin_has_permission('finance:read') THEN
        RAISE EXCEPTION 'Forbidden: finance:read permission required';
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT
            wt.id,
            wt.wallet_id,
            wt.user_id,
            p.full_name AS user_name,
            COALESCE(u.email, p.email)::text AS user_email,
            p.university AS user_university,
            wt.type,
            wt.amount,
            wt.status,
            wt.description,
            wt.reference_id,
            wt.metadata,
            wt.created_at
        FROM public.wallet_transactions wt
        LEFT JOIN public.profiles p ON p.id = wt.user_id
        LEFT JOIN auth.users u ON u.id = wt.user_id
        WHERE (p_user_id IS NULL OR wt.user_id = p_user_id)
          AND (v_type IS NULL OR v_type = 'all' OR lower(coalesce(wt.type, '')) = v_type)
          AND (v_status IS NULL OR v_status = 'all' OR lower(coalesce(wt.status, '')) = v_status)
          AND (p_min_amount IS NULL OR wt.amount >= p_min_amount)
          AND (p_max_amount IS NULL OR wt.amount <= p_max_amount)
          AND (p_start_at IS NULL OR wt.created_at >= p_start_at)
          AND (p_end_at IS NULL OR wt.created_at <= p_end_at)
          AND (
              v_search IS NULL
              OR coalesce(p.full_name, '') ILIKE '%' || v_search || '%'
              OR coalesce(u.email, p.email, '') ILIKE '%' || v_search || '%'
              OR coalesce(p.university, '') ILIKE '%' || v_search || '%'
              OR coalesce(wt.description, '') ILIKE '%' || v_search || '%'
              OR coalesce(wt.reference_id, '') ILIKE '%' || v_search || '%'
              OR coalesce(wt.type, '') ILIKE '%' || v_search || '%'
              OR wt.user_id::text ILIKE '%' || v_search || '%'
              OR wt.id::text ILIKE '%' || v_search || '%'
          )
    ),
    totals AS (
        SELECT
            count(*)::bigint AS matched_count,
            COALESCE(sum(f.amount) FILTER (WHERE f.status = 'completed'), 0)::numeric AS completed_sum
        FROM filtered f
    )
    SELECT
        f.id,
        f.wallet_id,
        f.user_id,
        f.user_name,
        f.user_email,
        f.user_university,
        f.type,
        f.amount,
        f.status,
        f.description,
        f.reference_id,
        f.metadata,
        f.created_at,
        t.matched_count AS total_count,
        t.completed_sum AS completed_amount_sum
    FROM filtered f
    CROSS JOIN totals t
    ORDER BY f.created_at DESC
    LIMIT v_limit
    OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_transactions(integer, integer, text, text, text, uuid, numeric, numeric, timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_transactions(integer, integer, text, text, text, uuid, numeric, numeric, timestamp with time zone, timestamp with time zone) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5.5 FINAL SCHEMA CACHE RELOAD
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
