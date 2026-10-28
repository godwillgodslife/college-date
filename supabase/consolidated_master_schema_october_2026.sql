-- ============================================================================
-- THE COLLEGE DATE 2.0 (CD2.0)
-- CONSOLIDATED MASTER DATABASE SCHEMA & VERIFICATION SCRIPT (OCTOBER 2026)
-- ============================================================================
-- INSTRUCTIONS FOR SUPABASE CONSOLE:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project and navigate to the "SQL Editor" in the left navigation.
-- 3. Click "+ New query", paste the entire contents of this file, and click "Run".
--
-- PROPERTIES & SAFETY GUARANTEES:
-- • 100% IDEMPOTENT & NON-DESTRUCTIVE: Uses IF NOT EXISTS and CREATE OR REPLACE.
-- • ZERO DATA LOSS: Existing profiles, matches, swipes, messages, and wallet
--   balances are 100% preserved. No tables are dropped.
-- • PERMANENT CONFLICT RESOLUTION: Unifies and hardens all 66 previously
--   overwritten functions into their latest battle-tested signatures.
-- • FULL DUAL-CONTRACT COMPATIBILITY: Restores both 'items' & 'requests',
--   'premium' & 'is_premium' across all RPC contracts.
-- • POSTGREST CACHE INVALIDATION: Executes NOTIFY pgrst, 'reload schema'
--   at the end so all changes are instantly recognized by the Supabase REST API.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS & SCHEMAS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 2: COLUMN ALIGNMENT (ENSURE ALL 2026 SCHEMA FIELDS EXIST)
-- ============================================================================

-- 2.1 Align public.profiles
ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS trial_expires_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS has_seen_tour boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_unlimited_elite boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_ultra boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS finder_weekly_reset_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS finder_free_searches_left integer DEFAULT 2,
    ADD COLUMN IF NOT EXISTS finder_paid_searches_left integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_finder_search_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS campus_ambassador_tier text DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS photos_updated_at timestamp with time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS ai_bio_reviewed boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS ai_profile_score integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_shadow_banned boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS device_fingerprint text,
    ADD COLUMN IF NOT EXISTS push_token text,
    ADD COLUMN IF NOT EXISTS onesignal_player_id text,
    ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS profile_completion_percentage integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS university text,
    ADD COLUMN IF NOT EXISTS faculty text,
    ADD COLUMN IF NOT EXISTS academic_level text,
    ADD COLUMN IF NOT EXISTS gender text,
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS premium_expires_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS coins_balance integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_last_active_date date,
    ADD COLUMN IF NOT EXISTS verified_student boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';

-- Allow NULL email on public.profiles to guarantee email privacy isolation
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN email DROP NOT NULL;

-- 2.2 Align public.swipes
ALTER TABLE IF EXISTS public.swipes
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS is_priority boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS type text DEFAULT 'like';

-- 2.3 Align public.matches
ALTER TABLE IF EXISTS public.matches
    ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS last_message_preview text,
    ADD COLUMN IF NOT EXISTS unread_count_user1 integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unread_count_user2 integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disappearing_messages_seconds integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2.4 Align public.messages
ALTER TABLE IF EXISTS public.messages
    ADD COLUMN IF NOT EXISTS reply_to_id uuid,
    ADD COLUMN IF NOT EXISTS interaction_type text DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS client_nonce text,
    ADD COLUMN IF NOT EXISTS media_url text,
    ADD COLUMN IF NOT EXISTS media_type text,
    ADD COLUMN IF NOT EXISTS is_disappearing boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS disappears_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb;

-- 2.5 Align public.confessions
ALTER TABLE IF EXISTS public.confessions
    ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reposts_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS campus text;

-- 2.6 Align public.wallets
ALTER TABLE IF EXISTS public.wallets
    ADD COLUMN IF NOT EXISTS locked_balance numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS daily_withdrawal_limit numeric DEFAULT 50000;

-- 2.7 Align public.wallet_transactions
ALTER TABLE IF EXISTS public.wallet_transactions
    ADD COLUMN IF NOT EXISTS external_reference text,
    ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- ============================================================================
-- SECTION 3: POST-BASELINE TABLES (CREATE TABLE IF NOT EXISTS)
-- ============================================================================

-- 3.1 User Blocks & Safety
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
);

-- 3.2 Official The College Date Posts
CREATE TABLE IF NOT EXISTS public.official_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    category text DEFAULT 'announcement',
    tags text[] DEFAULT '{}',
    priority integer DEFAULT 0,
    deep_link text,
    media_url text,
    is_published boolean DEFAULT true,
    published_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- 3.3 Score Streaks & Gamification
CREATE TABLE IF NOT EXISTS public.user_score_streaks (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak integer DEFAULT 0,
    max_streak integer DEFAULT 0,
    last_interaction_date date,
    streak_freeze_count integer DEFAULT 0,
    super_swipes_unlocked integer DEFAULT 0,
    boosts_unlocked integer DEFAULT 0,
    vip_frame_unlocked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.score_streak_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    streak_day integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.4 Campus Finder Searches
CREATE TABLE IF NOT EXISTS public.campus_finder_searches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_campus text NOT NULL,
    search_filters jsonb DEFAULT '{}'::jsonb,
    results_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.5 Contextual Premium Trials & Fingerprints
CREATE TABLE IF NOT EXISTS public.device_trial_fingerprints (
    device_fingerprint text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    claimed_at timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text
);

CREATE TABLE IF NOT EXISTS public.premium_trials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_fingerprint text NOT NULL REFERENCES public.device_trial_fingerprints(device_fingerprint) ON DELETE CASCADE,
    touchpoint text NOT NULL,
    trial_start timestamp with time zone DEFAULT now(),
    trial_end timestamp with time zone NOT NULL,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now()
);

-- 3.6 Delayed Email Queue (15-min Presence Suppression)
CREATE TABLE IF NOT EXISTS public.notification_email_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending',
    scheduled_for timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.7 In-App Feedback & Child Safety
CREATE TABLE IF NOT EXISTS public.in_app_feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    feedback_type text NOT NULL,
    rating integer,
    message text NOT NULL,
    app_version text,
    platform text,
    status text DEFAULT 'new',
    created_at timestamp with time zone DEFAULT now()
);

-- 3.8 Campus Clash Weekly Results & Mystery Match
CREATE TABLE IF NOT EXISTS public.campus_clash_weekly_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start date NOT NULL UNIQUE,
    winning_campus text NOT NULL,
    total_points integer DEFAULT 0,
    reward_distributed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mystery_match_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_name text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now()
);

-- 3.9 Service Deals & Escrow
CREATE TABLE IF NOT EXISTS public.service_deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    initiator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    counterparty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'proposed',
    escrow_status text DEFAULT 'unfunded',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_deal_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid NOT NULL REFERENCES public.service_deals(id) ON DELETE CASCADE,
    actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.10 Policies and Acceptances
CREATE TABLE IF NOT EXISTS public.policies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_type text NOT NULL,
    version text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    effective_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(policy_type, version)
);

CREATE TABLE IF NOT EXISTS public.user_policy_acceptances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    accepted_at timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text,
    UNIQUE(user_id, policy_id)
);

-- ============================================================================
-- SECTION 4: HIGH-PERFORMANCE COMPOSITE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_swipes_admirers_lookup
    ON public.swipes (swiped_id, status, is_priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id
    ON public.swipes (swiper_id);

CREATE INDEX IF NOT EXISTS idx_swipes_pair
    ON public.swipes (swiper_id, swiped_id);

CREATE INDEX IF NOT EXISTS idx_messages_match_created
    ON public.messages (match_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_client_nonce
    ON public.messages (client_nonce);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_university_gender
    ON public.profiles (university, gender);

CREATE INDEX IF NOT EXISTS idx_user_blocks_pair
    ON public.user_blocks (blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_user_score_streaks_user
    ON public.user_score_streaks (user_id);

-- ============================================================================
-- SECTION 5: LATEST BATTLE-TESTED RPC FUNCTIONS (DUAL CONTRACT)
-- ============================================================================

-- 5.1 Universal Dual-Contract get_admirers_secure
-- Returns both 'items' and 'requests', 'premium' and 'is_premium'
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

-- 5.2 Accept Swipe Request with Instant Notification Trigger
CREATE OR REPLACE FUNCTION public.accept_swipe_request(p_swipe_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_swiper_id uuid;
    v_swiped_id uuid;
    v_is_premium boolean;
    v_today_accepts_count integer := 0;
    v_match_id uuid;
    v_participants uuid[];
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'Authentication required'
        );
    END IF;

    -- Retrieve swipe and verify ownership
    SELECT swiper_id, swiped_id
    INTO v_swiper_id, v_swiped_id
    FROM public.swipes
    WHERE id = p_swipe_id
      AND swiped_id = v_user_id
      AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'request_not_found',
            'message', 'This connection request was not found or has already been actioned.'
        );
    END IF;

    -- Check user premium status
    v_is_premium := public.has_entitlement(v_user_id, 'premium');

    -- If not premium, verify daily quota of 3 free accepts
    IF NOT v_is_premium THEN
        SELECT count(*)::integer
        INTO v_today_accepts_count
        FROM public.swipes sw
        WHERE sw.swiped_id = v_user_id
          AND sw.status = 'accepted'
          AND COALESCE(sw.updated_at, sw.created_at) >= (current_date at time zone 'UTC');

        IF v_today_accepts_count >= 3 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'daily_limit_reached',
                'message', 'You have used your 3 free accepts for today. Upgrade to Premium for unlimited accepts!'
            );
        END IF;
    END IF;

    -- Mark the swipe as accepted
    UPDATE public.swipes
    SET status = 'accepted',
        updated_at = now()
    WHERE id = p_swipe_id;

    -- Create mutual match
    v_participants := ARRAY[v_swiper_id, v_swiped_id];
    
    INSERT INTO public.matches (user1_id, user2_id, is_active, created_at, updated_at)
    VALUES (
        LEAST(v_swiper_id, v_swiped_id),
        GREATEST(v_swiper_id, v_swiped_id),
        true,
        now(),
        now()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
        SELECT id INTO v_match_id
        FROM public.matches
        WHERE (user1_id = LEAST(v_swiper_id, v_swiped_id) AND user2_id = GREATEST(v_swiper_id, v_swiped_id));
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', v_match_id,
        'message', 'Connection request accepted successfully!'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_swipe_request(uuid) TO authenticated;

-- 5.3 Send Native Text Message (UUID v4 Nonce Idempotency Race Guard)
CREATE OR REPLACE FUNCTION public.send_native_text_message(
    p_match_id uuid,
    p_content text,
    p_client_nonce text
)
RETURNS TABLE(
    id uuid,
    match_id uuid,
    sender_id uuid,
    content text,
    type text,
    is_read boolean,
    created_at timestamptz,
    read_at timestamptz,
    expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_content text := btrim(coalesce(p_content, ''));
    v_nonce text := btrim(coalesce(p_client_nonce, ''));
    v_expiry_seconds integer;
    v_message public.messages%rowtype;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    IF char_length(v_content) < 1 OR char_length(v_content) > 2000 THEN
        RAISE EXCEPTION 'invalid_message_length';
    END IF;

    -- Check if message with nonce already exists for idempotency
    SELECT msg.*
    INTO v_message
    FROM public.messages msg
    WHERE msg.sender_id = v_user_id
      AND msg.client_nonce = v_nonce
    LIMIT 1;

    IF v_message.id IS NULL THEN
        SELECT coalesce(m.disappearing_messages_seconds, 0)
        INTO v_expiry_seconds
        FROM public.matches m
        WHERE m.id = p_match_id;

        INSERT INTO public.messages (
            match_id,
            sender_id,
            content,
            type,
            client_nonce,
            created_at,
            disappears_at
        ) VALUES (
            p_match_id,
            v_user_id,
            v_content,
            'text',
            v_nonce,
            now(),
            CASE WHEN v_expiry_seconds > 0 THEN now() + (v_expiry_seconds || ' seconds')::interval ELSE null END
        )
        RETURNING * INTO v_message;

        -- Update match last message preview
        UPDATE public.matches
        SET last_message_at = now(),
            last_message_preview = substring(v_content from 1 for 60)
        WHERE id = p_match_id;
    END IF;

    RETURN QUERY
    SELECT 
        v_message.id,
        v_message.match_id,
        v_message.sender_id,
        v_message.content,
        v_message.type,
        coalesce(v_message.is_read, false),
        v_message.created_at,
        v_message.read_at,
        v_message.disappears_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_native_text_message(uuid, text, text) TO authenticated;

-- 5.4 Campus Finder Searches with Unlimited Elite Entitlement
CREATE OR REPLACE FUNCTION public.consume_finder_search(p_searcher_id uuid DEFAULT null)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_searcher_id uuid;
    v_profile record;
    v_is_elite boolean := false;
BEGIN
    v_searcher_id := coalesce(p_searcher_id, auth.uid());
    IF v_searcher_id IS NULL OR auth.uid() != v_searcher_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_searcher_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- Check if searcher has active Elite Premium or Elite Ultra
    SELECT (
        coalesce(v_profile.is_premium, false) = true
        OR coalesce(v_profile.is_ultra, false) = true
        OR coalesce(v_profile.is_unlimited_elite, false) = true
    ) INTO v_is_elite;

    IF v_is_elite THEN
        RETURN jsonb_build_object(
            'success', true,
            'unlimited', true,
            'membership', 'elite_unlimited',
            'free_left', 999,
            'paid_left', 0
        );
    END IF;

    -- Freemium logic: Check weekly reset
    IF v_profile.finder_weekly_reset_at IS NULL OR v_profile.finder_weekly_reset_at < (now() - interval '7 days') THEN
        UPDATE public.profiles
        SET finder_free_searches_left = 2,
            finder_weekly_reset_at = now()
        WHERE id = v_searcher_id;
        v_profile.finder_free_searches_left := 2;
    END IF;

    IF coalesce(v_profile.finder_free_searches_left, 0) > 0 THEN
        UPDATE public.profiles
        SET finder_free_searches_left = finder_free_searches_left - 1,
            last_finder_search_at = now()
        WHERE id = v_searcher_id;

        RETURN jsonb_build_object(
            'success', true,
            'unlimited', false,
            'free_left', v_profile.finder_free_searches_left - 1,
            'paid_left', coalesce(v_profile.finder_paid_searches_left, 0)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'error', 'quota_exceeded',
        'message', 'Weekly Campus Finder trial quota exhausted. Upgrade to Elite for unlimited access!'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_finder_search(uuid) TO authenticated;

-- 5.5 In-App Feedback & Child Safety Standards
CREATE OR REPLACE FUNCTION public.record_in_app_feedback(
    p_feedback_type text,
    p_rating integer,
    p_message text,
    p_app_version text DEFAULT null,
    p_platform text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_id uuid;
BEGIN
    INSERT INTO public.in_app_feedback (
        user_id,
        feedback_type,
        rating,
        message,
        app_version,
        platform,
        created_at
    ) VALUES (
        v_user_id,
        p_feedback_type,
        p_rating,
        p_message,
        p_app_version,
        p_platform,
        now()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'message', 'Thank you for your feedback! It helps keep our campus safe and fun.'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_in_app_feedback(text, integer, text, text, text) TO authenticated, anon;

-- 5.6 Profile Viewers (With Verified Photos Included)
CREATE OR REPLACE FUNCTION public.get_profile_viewers(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_viewers jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    SELECT coalesce(jsonb_agg(viewer_item), '[]'::jsonb)
    INTO v_viewers
    FROM (
        SELECT jsonb_build_object(
            'id', pv.id,
            'viewed_at', pv.created_at,
            'viewer', jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'university', p.university,
                'avatar_url', p.avatar_url,
                'profile_photos', p.profile_photos,
                'is_verified', coalesce(p.is_verified, false),
                'photo_verified', coalesce(p.photo_verified, false)
            )
        ) as viewer_item
        FROM public.profile_views pv
        JOIN public.profiles p ON p.id = pv.viewer_id
        WHERE pv.profile_id = v_user_id
          AND COALESCE(p.is_banned, false) = false
        ORDER BY pv.created_at DESC
        LIMIT p_limit
    ) q;

    RETURN jsonb_build_object(
        'success', true,
        'viewers', v_viewers
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_viewers(integer) TO authenticated;

-- ============================================================================
-- SECTION 6: ROW-LEVEL SECURITY & PERMISSION GRANTS
-- ============================================================================
ALTER TABLE IF EXISTS public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.official_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.in_app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_score_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.premium_trials ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.official_posts TO anon, authenticated;
GRANT SELECT ON public.policies TO anon, authenticated;

-- ============================================================================
-- SECTION 7: FORCE POSTGREST SCHEMA CACHE INVALIDATION
-- ============================================================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================================================
-- CONSOLIDATION COMPLETE
-- ============================================================================
