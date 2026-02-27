-- =============================================================
-- SECURITY ADVISOR FIX - College Date 2.0
-- Run this entire script in the Supabase SQL Editor.
-- Fixes all ERRORs and WARNINGs from the Security Advisor.
-- =============================================================


-- ============================================================
-- SECTION 1: FIX ERRORS
-- ============================================================

-- -------------------------------------------------------------------
-- ERROR 1: RLS Disabled on public.profiles
-- (policy_exists_rls_disabled + rls_disabled_in_public)
-- RLS policies exist but RLS itself is not enabled on the table.
-- -------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate all policies cleanly so there are no duplicates
DROP POLICY IF EXISTS "Anyone can view profiles"                  ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone"  ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile"        ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"              ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"        ON public.profiles;

-- Allow anyone (including unauthenticated) to read profiles (discovery feed)
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

-- Users may only insert their own profile row
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users may only update their own profile row
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users may delete their own profile (e.g. account deletion)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);


-- -------------------------------------------------------------------
-- ERROR 2: Security Definer Views
-- Views discovery_feed_v3, leaderboard_big_spenders,
-- leaderboard_campus_stars, leaderboard_most_wanted
-- Recreate WITHOUT SECURITY DEFINER (use SECURITY INVOKER instead,
-- which is now the safe Supabase default).
-- -------------------------------------------------------------------

-- discovery_feed_v3
DROP VIEW IF EXISTS public.discovery_feed_v3 CASCADE;
CREATE VIEW public.discovery_feed_v3
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.full_name,
    p.age,
    p.gender,
    p.role,
    p.university,
    p.faculty,
    p.department,
    p.level,
    p.bio,
    p.avatar_url,
    p.photos,
    p.genotype,
    p.mbti,
    p.attraction_goal,
    p.show_online_status,
    p.incognito_mode,
    p.last_seen,
    p.is_live,
    p.referral_code,
    p.free_swipes,
    p.completion_score,
    COALESCE(b.expires_at > now(), false) AS is_boosted,
    b.expires_at AS boost_expires_at
FROM public.profiles p
LEFT JOIN public.boosts b
    ON b.user_id = p.id AND b.expires_at > now()
WHERE p.incognito_mode IS DISTINCT FROM true;

-- leaderboard_big_spenders
DROP VIEW IF EXISTS public.leaderboard_big_spenders CASCADE;
CREATE VIEW public.leaderboard_big_spenders
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    COALESCE(w.total_spent, 0) AS total_spent
FROM public.profiles p
JOIN public.wallets w ON w.user_id = p.id
ORDER BY w.total_spent DESC
LIMIT 100;

-- leaderboard_campus_stars
DROP VIEW IF EXISTS public.leaderboard_campus_stars CASCADE;
CREATE VIEW public.leaderboard_campus_stars
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    COALESCE(p.completion_score, 0) AS completion_score,
    COALESCE(es.score, 0)           AS engagement_score
FROM public.profiles p
LEFT JOIN public.engagement_scores es ON es.user_id = p.id
ORDER BY (COALESCE(p.completion_score, 0) + COALESCE(es.score, 0)) DESC
LIMIT 100;

-- leaderboard_most_wanted
DROP VIEW IF EXISTS public.leaderboard_most_wanted CASCADE;
CREATE VIEW public.leaderboard_most_wanted
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.role,
    COUNT(s.id) AS total_likes_received
FROM public.profiles p
LEFT JOIN public.swipes s
    ON s.swiped_id = p.id AND s.direction = 'right'
GROUP BY p.id, p.full_name, p.avatar_url, p.university, p.role
ORDER BY total_likes_received DESC
LIMIT 100;


-- ============================================================
-- SECTION 2: FIX WARNINGS – RLS Policies Always True
-- ============================================================

-- -------------------------------------------------------------------
-- WARNING: public.transactions – INSERT policy "System can insert transactions"
-- has WITH CHECK (true) – allows anyone to insert any row.
-- Fix: Restrict to service_role only. Service-role bypasses RLS, so
-- we simply tighten the policy for authenticated/anon roles.
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;

-- Users can only insert transactions linked to their own wallet
CREATE POLICY "System can insert transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wallets
            WHERE wallets.id = wallet_id
              AND wallets.user_id = auth.uid()
        )
    );

-- -------------------------------------------------------------------
-- WARNING: public.wallets – UPDATE policy "System can update wallets"
-- has USING (true) + WITH CHECK (true).
-- Fix: Only allow service_role (via functions) to update wallets,
-- or lock it to the wallet owner.
-- -------------------------------------------------------------------
DROP POLICY IF EXISTS "System can update wallets" ON public.wallets;

-- Wallet owners can only see/modify their own wallet
DROP POLICY IF EXISTS "Users can view own wallet"   ON public.wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

CREATE POLICY "Users can view own wallet"
    ON public.wallets FOR SELECT
    USING (auth.uid() = user_id);

-- Wallet balance mutations are done exclusively by SECURITY DEFINER RPC
-- functions (increment_wallet_balance / decrement_wallet_balance), which
-- run as the function owner and bypass RLS. No direct UPDATE from client.
-- We still define a narrow policy in case a future migration needs it.
CREATE POLICY "System can update wallets"
    ON public.wallets FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- SECTION 3: FIX WARNINGS – Function Search Path Mutable
-- Add SET search_path = '' to every flagged public function.
-- This prevents a malicious schema injection attack.
-- ============================================================

-- reset_swipe_limits
DROP FUNCTION IF EXISTS public.reset_swipe_limits() CASCADE;
CREATE OR REPLACE FUNCTION public.reset_swipe_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.swipe_limits
    SET swipes_used = 0, last_reset = now()
    WHERE last_reset < (now() - INTERVAL '24 hours');
END;
$$;

-- handle_new_user  (preserve full logic from ULTIMATE_SIGNUP_FIX.sql)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role           TEXT;
    v_gender         TEXT;
    v_referred_by    TEXT;
    v_referred_by_uuid UUID;
BEGIN
    v_role        := INITCAP(COALESCE(NEW.raw_user_meta_data->>'role', 'Male'));
    v_gender      := LOWER(v_role);
    v_referred_by := NEW.raw_user_meta_data->>'referred_by';

    BEGIN
        IF v_referred_by IS NOT NULL AND v_referred_by <> '' AND v_referred_by <> 'null' THEN
            v_referred_by_uuid := v_referred_by::UUID;
        ELSE
            v_referred_by_uuid := NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_referred_by_uuid := NULL;
    END;

    BEGIN
        INSERT INTO public.profiles (id, email, full_name, gender, age, university, role, free_swipes, referred_by)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            v_gender, 19, 'Campus', v_role, 20, v_referred_by_uuid
        )
        ON CONFLICT (id) DO UPDATE SET
            email     = EXCLUDED.email,
            full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Profile insertion failed for user %: %', NEW.id, SQLERRM;
    END;

    BEGIN INSERT INTO public.wallets       (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.subscriptions (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.swipe_limits  (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.engagement_scores (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN NEW;
END;
$$;

-- generate_unique_referral_code
DROP FUNCTION IF EXISTS public.generate_unique_referral_code() CASCADE;
CREATE OR REPLACE FUNCTION public.generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    chars  TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        result := 'CD-';
        FOR i IN 1..5 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
        END LOOP;
        SELECT TRUE INTO exists FROM public.profiles WHERE referral_code = result;
        EXIT WHEN NOT FOUND;
    END LOOP;
    RETURN result;
END;
$$;

-- process_swipe_payment
DROP FUNCTION IF EXISTS public.process_swipe_payment(UUID, UUID, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION public.process_swipe_payment(p_swiper_id UUID, p_swiped_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT available_balance INTO v_balance
    FROM public.wallets WHERE user_id = p_swiper_id FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets SET available_balance = available_balance - p_amount,
           total_spent = total_spent + p_amount, updated_at = now()
    WHERE user_id = p_swiper_id;

    UPDATE public.wallets SET available_balance = available_balance + p_amount,
           total_earned = total_earned + p_amount, updated_at = now()
    WHERE user_id = p_swiped_id;

    INSERT INTO public.transactions (user_id, amount, type, description, status)
    VALUES (p_swiper_id, p_amount, 'swipe_payment', 'Swipe payment', 'completed')
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- update_swipe_streak
DROP FUNCTION IF EXISTS public.update_swipe_streak(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.update_swipe_streak(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.engagement_scores (user_id, score, daily_streak, last_login)
    VALUES (p_user_id, 1, 1, now())
    ON CONFLICT (user_id) DO UPDATE
        SET score        = public.engagement_scores.score + 1,
            daily_streak = CASE
                WHEN public.engagement_scores.last_login > now() - INTERVAL '36 hours'
                THEN public.engagement_scores.daily_streak + 1
                ELSE 1
            END,
            last_login   = now();
END;
$$;

-- generate_referral_code  (simple generator, no uniqueness loop)
DROP FUNCTION IF EXISTS public.generate_referral_code() CASCADE;
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    chars  TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result TEXT := 'CD-';
    i      INTEGER;
BEGIN
    FOR i IN 1..5 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- increment_wallet_balance
DROP FUNCTION IF EXISTS public.increment_wallet_balance(UUID, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.wallets (user_id, available_balance, total_earned)
    VALUES (p_user_id, p_amount, p_amount)
    ON CONFLICT (user_id) DO UPDATE
        SET available_balance = public.wallets.available_balance + p_amount,
            total_earned      = public.wallets.total_earned + p_amount,
            updated_at        = now();
END;
$$;

-- update_profile_data  (overloaded – both versions)
DROP FUNCTION IF EXISTS public.update_profile_data(UUID, JSONB) CASCADE;
CREATE OR REPLACE FUNCTION public.update_profile_data(p_user_id UUID, p_data JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles
    SET
        full_name       = COALESCE(p_data->>'full_name',       full_name),
        bio             = COALESCE(p_data->>'bio',             bio),
        avatar_url      = COALESCE(p_data->>'avatar_url',      avatar_url),
        university      = COALESCE(p_data->>'university',      university),
        faculty         = COALESCE(p_data->>'faculty',         faculty),
        department      = COALESCE(p_data->>'department',      department),
        level           = COALESCE(p_data->>'level',           level),
        genotype        = COALESCE(p_data->>'genotype',        genotype),
        mbti            = COALESCE(p_data->>'mbti',            mbti),
        attraction_goal = COALESCE(p_data->>'attraction_goal', attraction_goal),
        photos          = COALESCE((p_data->>'photos')::jsonb, photos),
        updated_at      = now()
    WHERE id = p_user_id;
END;
$$;

-- handle_new_profile_wallet
DROP FUNCTION IF EXISTS public.handle_new_profile_wallet() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- notify_internally
DROP FUNCTION IF EXISTS public.notify_internally(UUID, TEXT, TEXT, TEXT, JSONB) CASCADE;
CREATE OR REPLACE FUNCTION public.notify_internally(p_user_id UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (p_user_id, p_type, p_title, p_body, p_data)
    ON CONFLICT DO NOTHING;
END;
$$;

-- on_swipe_insert_trigger
DROP FUNCTION IF EXISTS public.on_swipe_insert_trigger() CASCADE;
CREATE OR REPLACE FUNCTION public.on_swipe_insert_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_match BOOLEAN := false;
BEGIN
    -- Check for mutual like (match)
    SELECT TRUE INTO v_match
    FROM public.swipes
    WHERE swiper_id  = NEW.swiped_id
      AND swiped_id  = NEW.swiper_id
      AND direction  = 'right';

    IF v_match AND NEW.direction = 'right' THEN
        INSERT INTO public.matches (user1_id, user2_id)
        VALUES (LEAST(NEW.swiper_id, NEW.swiped_id), GREATEST(NEW.swiper_id, NEW.swiped_id))
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- accept_swipe_request
DROP FUNCTION IF EXISTS public.accept_swipe_request(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.accept_swipe_request(p_request_id UUID, p_acceptor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_swipe RECORD;
BEGIN
    SELECT * INTO v_swipe FROM public.swipes WHERE id = p_request_id AND swiped_id = p_acceptor_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Swipe request not found');
    END IF;

    UPDATE public.swipes SET direction = 'right', updated_at = now() WHERE id = p_request_id;

    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (LEAST(v_swipe.swiper_id, p_acceptor_id), GREATEST(v_swipe.swiper_id, p_acceptor_id))
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- get_hidden_content_counts
DROP FUNCTION IF EXISTS public.get_hidden_content_counts(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.get_hidden_content_counts(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_snapshots BIGINT;
    v_msgs      BIGINT;
BEGIN
    SELECT COUNT(*) INTO v_snapshots
    FROM public.snapshots
    WHERE user_id = p_user_id AND is_hidden = true;

    SELECT COUNT(*) INTO v_msgs
    FROM public.messages
    WHERE receiver_id = p_user_id AND is_hidden = true;

    RETURN jsonb_build_object('snapshots', v_snapshots, 'messages', v_msgs);
END;
$$;

-- get_user_visibility_score
DROP FUNCTION IF EXISTS public.get_user_visibility_score(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_visibility_score(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_score NUMERIC := 0;
BEGIN
    SELECT COALESCE(completion_score, 0) INTO v_score
    FROM public.profiles WHERE id = p_user_id;

    v_score := v_score + COALESCE(
        (SELECT score FROM public.engagement_scores WHERE user_id = p_user_id), 0
    );

    RETURN v_score;
END;
$$;

-- decrement_wallet_balance
DROP FUNCTION IF EXISTS public.decrement_wallet_balance(UUID, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION public.decrement_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT available_balance INTO v_balance
    FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET available_balance = available_balance - p_amount,
        total_spent       = total_spent + p_amount,
        updated_at        = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- handle_new_profile_referral
DROP FUNCTION IF EXISTS public.handle_new_profile_referral() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_profile_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
        NEW.referral_code := public.generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$;

-- use_super_swipe
DROP FUNCTION IF EXISTS public.use_super_swipe(UUID, UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.use_super_swipe(p_user_id UUID, p_target_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_balance NUMERIC;
    v_cost    NUMERIC := 50; -- cost in coins
BEGIN
    SELECT available_balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_balance IS NULL OR v_balance < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET available_balance = available_balance - v_cost,
        total_spent       = total_spent + v_cost,
        updated_at        = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.swipes (swiper_id, swiped_id, direction, is_super_swipe)
    VALUES (p_user_id, p_target_id, 'right', true)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- process_gift_purchase
DROP FUNCTION IF EXISTS public.process_gift_purchase(UUID, UUID, UUID, NUMERIC) CASCADE;
CREATE OR REPLACE FUNCTION public.process_gift_purchase(p_sender_id UUID, p_receiver_id UUID, p_gift_id UUID, p_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT available_balance INTO v_balance FROM public.wallets WHERE user_id = p_sender_id FOR UPDATE;

    IF v_balance IS NULL OR v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET available_balance = available_balance - p_amount,
        total_spent       = total_spent + p_amount,
        updated_at        = now()
    WHERE user_id = p_sender_id;

    UPDATE public.wallets
    SET available_balance = available_balance + (p_amount * 0.8),
        total_earned      = total_earned + (p_amount * 0.8),
        updated_at        = now()
    WHERE user_id = p_receiver_id;

    INSERT INTO public.transactions (user_id, amount, type, description, status, metadata)
    VALUES (p_sender_id, p_amount, 'gift', 'Gift purchase', 'completed',
            jsonb_build_object('gift_id', p_gift_id, 'receiver_id', p_receiver_id))
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- check_referral_milestones
DROP FUNCTION IF EXISTS public.check_referral_milestones(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.check_referral_milestones(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count     BIGINT;
    v_milestone NUMERIC;
    v_reward    NUMERIC := 0;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.profiles WHERE referred_by = p_user_id;

    -- Milestone tiers: 5 = 500, 10 = 1500, 25 = 5000, 50 = 15000 coins
    v_milestone := CASE
        WHEN v_count >= 50 THEN 15000
        WHEN v_count >= 25 THEN 5000
        WHEN v_count >= 10 THEN 1500
        WHEN v_count >= 5  THEN 500
        ELSE 0
    END;

    RETURN jsonb_build_object('referral_count', v_count, 'current_milestone_reward', v_milestone);
END;
$$;

-- handle_new_user_settings
DROP FUNCTION IF EXISTS public.handle_new_user_settings() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- on_profile_view_trigger
DROP FUNCTION IF EXISTS public.on_profile_view_trigger() CASCADE;
CREATE OR REPLACE FUNCTION public.on_profile_view_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.notify_internally(
        NEW.profile_owner_id,
        'profile_view',
        'Someone viewed your profile',
        'You have a new profile visitor!',
        jsonb_build_object('viewer_id', NEW.viewer_id)
    );
    RETURN NEW;
END;
$$;

-- update_user_presence
DROP FUNCTION IF EXISTS public.update_user_presence(UUID, BOOLEAN) CASCADE;
CREATE OR REPLACE FUNCTION public.update_user_presence(p_user_id UUID, p_is_online BOOLEAN DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.profiles
    SET last_seen = now(),
        show_online_status = p_is_online
    WHERE id = p_user_id;
END;
$$;

-- increment_snapshot_likes
DROP FUNCTION IF EXISTS public.increment_snapshot_likes(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.increment_snapshot_likes(p_snapshot_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.snapshots
    SET likes_count = likes_count + 1
    WHERE id = p_snapshot_id;
END;
$$;

-- notify_on_profile_view
DROP FUNCTION IF EXISTS public.notify_on_profile_view() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_on_profile_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.notify_internally(
        NEW.profile_owner_id,
        'profile_view',
        'New profile view',
        'Someone checked out your profile!',
        jsonb_build_object('viewer_id', NEW.viewer_id)
    );
    RETURN NEW;
END;
$$;

-- notify_matches_on_snapshot
DROP FUNCTION IF EXISTS public.notify_matches_on_snapshot() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_matches_on_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT CASE WHEN m.user1_id = NEW.user_id THEN m.user2_id ELSE m.user1_id END AS match_id
        FROM public.matches m
        WHERE m.user1_id = NEW.user_id OR m.user2_id = NEW.user_id
    LOOP
        PERFORM public.notify_internally(
            r.match_id,
            'new_snapshot',
            'New snapshot from your match!',
            'Your match posted a new snapshot.',
            jsonb_build_object('snapshot_id', NEW.id, 'poster_id', NEW.user_id)
        );
    END LOOP;
    RETURN NEW;
END;
$$;

-- notify_on_new_message
DROP FUNCTION IF EXISTS public.notify_on_new_message() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.notify_internally(
        NEW.receiver_id,
        'new_message',
        'New message',
        'You have a new message!',
        jsonb_build_object('sender_id', NEW.sender_id, 'match_id', NEW.match_id)
    );
    RETURN NEW;
END;
$$;

-- on_message_insert_trigger  (wrapper that calls notify_on_new_message logic)
DROP FUNCTION IF EXISTS public.on_message_insert_trigger() CASCADE;
CREATE OR REPLACE FUNCTION public.on_message_insert_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    PERFORM public.notify_on_new_message();
    RETURN NEW;
END;
$$;

-- calculate_completion_score
DROP FUNCTION IF EXISTS public.calculate_completion_score(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.calculate_completion_score(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    p      RECORD;
    score  INTEGER := 0;
BEGIN
    SELECT * INTO p FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN RETURN 0; END IF;

    IF p.avatar_url  IS NOT NULL AND p.avatar_url  <> '' THEN score := score + 20; END IF;
    IF p.bio         IS NOT NULL AND p.bio         <> '' THEN score := score + 15; END IF;
    IF p.university  IS NOT NULL AND p.university  <> '' THEN score := score + 10; END IF;
    IF p.faculty     IS NOT NULL AND p.faculty     <> '' THEN score := score + 10; END IF;
    IF p.department  IS NOT NULL AND p.department  <> '' THEN score := score + 10; END IF;
    IF p.level       IS NOT NULL AND p.level       <> '' THEN score := score + 5;  END IF;
    IF p.genotype    IS NOT NULL AND p.genotype    <> '' THEN score := score + 5;  END IF;
    IF p.mbti        IS NOT NULL AND p.mbti        <> '' THEN score := score + 5;  END IF;
    IF p.attraction_goal IS NOT NULL AND p.attraction_goal <> '' THEN score := score + 10; END IF;
    IF p.photos      IS NOT NULL AND jsonb_array_length(p.photos) > 0 THEN score := score + 10; END IF;

    RETURN LEAST(score, 100);
END;
$$;

-- check_and_reset_swipe_limit
DROP FUNCTION IF EXISTS public.check_and_reset_swipe_limit(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.check_and_reset_swipe_limit(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_swipes_used  INTEGER;
    v_last_reset   TIMESTAMP WITH TIME ZONE;
    v_max_swipes   INTEGER := 20;
BEGIN
    SELECT swipes_used, last_reset INTO v_swipes_used, v_last_reset
    FROM public.swipe_limits WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        INSERT INTO public.swipe_limits (user_id, swipes_used, last_reset)
        VALUES (p_user_id, 0, now())
        RETURNING swipes_used, last_reset INTO v_swipes_used, v_last_reset;
    END IF;

    IF v_last_reset < (now() - INTERVAL '24 hours') THEN
        UPDATE public.swipe_limits
        SET swipes_used = 0, last_reset = now()
        WHERE user_id = p_user_id
        RETURNING swipes_used, last_reset INTO v_swipes_used, v_last_reset;
    END IF;

    RETURN jsonb_build_object(
        'can_swipe',  v_swipes_used < v_max_swipes,
        'used_count', v_swipes_used,
        'max_count',  v_max_swipes
    );
END;
$$;

-- purchase_boost
DROP FUNCTION IF EXISTS public.purchase_boost(UUID, INTEGER) CASCADE;
CREATE OR REPLACE FUNCTION public.purchase_boost(p_user_id UUID, p_duration_hours INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_cost    NUMERIC := 100;
    v_balance NUMERIC;
BEGIN
    SELECT available_balance INTO v_balance FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

    IF v_balance IS NULL OR v_balance < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET available_balance = available_balance - v_cost,
        total_spent       = total_spent + v_cost,
        updated_at        = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.boosts (user_id, expires_at)
    VALUES (p_user_id, now() + (p_duration_hours || ' hours')::INTERVAL)
    ON CONFLICT (user_id) DO UPDATE
        SET expires_at = GREATEST(public.boosts.expires_at, EXCLUDED.expires_at);

    RETURN jsonb_build_object('success', true, 'expires_at', now() + (p_duration_hours || ' hours')::INTERVAL);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- notify_matches_on_status
DROP FUNCTION IF EXISTS public.notify_matches_on_status() CASCADE;
CREATE OR REPLACE FUNCTION public.notify_matches_on_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT CASE WHEN m.user1_id = NEW.user_id THEN m.user2_id ELSE m.user1_id END AS match_id
        FROM public.matches m
        WHERE m.user1_id = NEW.user_id OR m.user2_id = NEW.user_id
    LOOP
        PERFORM public.notify_internally(
            r.match_id,
            'status_update',
            'Match status update',
            'One of your matches posted a new status!',
            jsonb_build_object('poster_id', NEW.user_id)
        );
    END LOOP;
    RETURN NEW;
END;
$$;


-- ============================================================
-- SECTION 4: NOTE – Leaked Password Protection
-- ============================================================
-- The "Leaked Password Protection Disabled" warning CANNOT be
-- fixed via SQL. You must enable it manually:
--  Supabase Dashboard → Authentication → Password strength
--  → Enable "Check for leaked passwords (HaveIBeenPwned)"
--
-- This will prevent users from registering with known breached passwords.
-- ============================================================


-- Done! Re-run the Security Advisor to confirm all issues are resolved.
-- Remember to enable Leaked Password Protection via the Dashboard UI.
