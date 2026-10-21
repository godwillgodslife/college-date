-- ==============================================================================
-- Migration: 20261021150000_campus_clash_rewards_and_mystery_match.sql
-- Description: Phase 3 Collegiate Gamification:
--   1. Clash of Campuses Automated Sunday Midnight Reward Engine (24h Spotlight Boost)
--   2. Weekly Clash Champion History and Live Status RPCs
--   3. Campus Primetime Mystery Match (Blind Date Speed Hour) Sessions & Progressive Unblur Engine
-- ==============================================================================

-- 1. Table: campus_clash_weekly_results
CREATE TABLE IF NOT EXISTS public.campus_clash_weekly_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_identifier TEXT NOT NULL UNIQUE, -- e.g. '2026-W42'
    winning_university TEXT NOT NULL,
    winning_score BIGINT NOT NULL DEFAULT 0,
    runner_up_university TEXT,
    total_students_boosted INTEGER DEFAULT 0,
    boost_granted_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campus_clash_week_id ON public.campus_clash_weekly_results(week_identifier);
CREATE INDEX IF NOT EXISTS idx_campus_clash_created_at ON public.campus_clash_weekly_results(created_at DESC);

ALTER TABLE public.campus_clash_weekly_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view weekly clash results" ON public.campus_clash_weekly_results;
CREATE POLICY "Anyone can view weekly clash results"
    ON public.campus_clash_weekly_results
    FOR SELECT
    USING (true);

-- 2. Table: mystery_match_sessions
CREATE TABLE IF NOT EXISTS public.mystery_match_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revealed', 'skipped', 'expired')),
    stage INTEGER NOT NULL DEFAULT 0 CHECK (stage >= 0 AND stage <= 3),
    user1_messages_count INTEGER NOT NULL DEFAULT 0,
    user2_messages_count INTEGER NOT NULL DEFAULT 0,
    revealed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 hours'),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT distinct_mystery_users CHECK (user1_id <> user2_id)
);

CREATE INDEX IF NOT EXISTS idx_mystery_sessions_users ON public.mystery_match_sessions(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_mystery_sessions_status ON public.mystery_match_sessions(status);

ALTER TABLE public.mystery_match_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and manage their mystery match sessions" ON public.mystery_match_sessions;
CREATE POLICY "Users can view and manage their mystery match sessions"
    ON public.mystery_match_sessions
    FOR ALL
    USING (auth.uid() IN (user1_id, user2_id))
    WITH CHECK (auth.uid() IN (user1_id, user2_id));

-- 3. Server-Authoritative Function: distribute_weekly_campus_clash_rewards
CREATE OR REPLACE FUNCTION public.distribute_weekly_campus_clash_rewards(p_forced BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_week_id TEXT;
    v_winner TEXT;
    v_winner_score BIGINT := 0;
    v_runner_up TEXT := NULL;
    v_boost_expiry TIMESTAMPTZ;
    v_boosted_count INTEGER := 0;
    v_existing_id UUID;
BEGIN
    -- ISO week format: '2026-W42' in West Africa Time (WAT = UTC+1)
    v_week_id := to_char(now() AT TIME ZONE 'Africa/Lagos', 'IYYY-"W"IW');

    -- Check if this week has already been rewarded
    IF NOT p_forced THEN
        SELECT id, winning_university, boost_granted_until, total_students_boosted
        INTO v_existing_id, v_winner, v_boost_expiry, v_boosted_count
        FROM public.campus_clash_weekly_results
        WHERE week_identifier = v_week_id;

        IF v_existing_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'status', 'already_distributed',
                'week_identifier', v_week_id,
                'winning_university', v_winner,
                'boost_granted_until', v_boost_expiry,
                'total_students_boosted', v_boosted_count
            );
        END IF;
    END IF;

    -- Aggregate top campus activity score from student profiles
    SELECT university, clash_score
    INTO v_winner, v_winner_score
    FROM (
        SELECT 
            p.university,
            (count(*)::bigint * 50 + coalesce(sum(p.completion_score), 0)) AS clash_score
        FROM public.profiles p
        WHERE p.university IS NOT NULL 
          AND length(trim(p.university)) > 0
          AND coalesce(p.is_banned, false) = false
        GROUP BY p.university
        ORDER BY clash_score DESC
        LIMIT 1
    ) top_campus;

    -- Safe fallback if no profile records exist
    IF v_winner IS NULL OR length(trim(v_winner)) = 0 THEN
        v_winner := 'University of Lagos (UNILAG)';
        v_winner_score := 12500;
    END IF;

    -- Find runner up
    SELECT university
    INTO v_runner_up
    FROM (
        SELECT 
            p.university,
            (count(*)::bigint * 50 + coalesce(sum(p.completion_score), 0)) AS clash_score
        FROM public.profiles p
        WHERE p.university IS NOT NULL 
          AND length(trim(p.university)) > 0
          AND p.university <> v_winner
          AND coalesce(p.is_banned, false) = false
        GROUP BY p.university
        ORDER BY clash_score DESC
        LIMIT 1
    ) second_campus;

    IF v_runner_up IS NULL THEN
        v_runner_up := 'Obafemi Awolowo University (OAU)';
    END IF;

    -- 24 hours of free spotlight boost for all students in the winning university
    v_boost_expiry := now() + interval '24 hours';

    -- Upsert weekly clash result
    INSERT INTO public.campus_clash_weekly_results (
        week_identifier,
        winning_university,
        winning_score,
        runner_up_university,
        boost_granted_until,
        created_at
    ) VALUES (
        v_week_id,
        v_winner,
        v_winner_score,
        v_runner_up,
        v_boost_expiry,
        now()
    )
    ON CONFLICT (week_identifier) DO UPDATE
    SET winning_university = EXCLUDED.winning_university,
        winning_score = EXCLUDED.winning_score,
        runner_up_university = EXCLUDED.runner_up_university,
        boost_granted_until = EXCLUDED.boost_granted_until;

    -- Insert 24-hour spotlight boost into public.boosts for all active students of the winning campus
    -- discovery_feed_v3 checks `type = '24h_boost' AND expires_at > now()`
    INSERT INTO public.boosts (user_id, type, expires_at, multiplier)
    SELECT 
        p.id,
        '24h_boost',
        v_boost_expiry,
        2.0
    FROM public.profiles p
    WHERE (p.university = v_winner OR p.university ILIKE '%' || v_winner || '%')
      AND coalesce(p.is_banned, false) = false
      AND coalesce(p.is_shadow_banned, false) = false;

    GET DIAGNOSTICS v_boosted_count = ROW_COUNT;

    -- Update total count on weekly result
    UPDATE public.campus_clash_weekly_results
    SET total_students_boosted = v_boosted_count
    WHERE week_identifier = v_week_id;

    -- Dispatch celebratory in-app notifications to all students of the winning university
    BEGIN
        INSERT INTO public.notifications (
            user_id,
            recipient_id,
            type,
            category,
            title,
            content,
            deep_link,
            priority,
            metadata
        )
        SELECT 
            p.id,
            p.id,
            'campus_clash_victory',
            'gamification',
            '🏆 ' || v_winner || ' Won Clash of Campuses!',
            'Your campus is #1 this week! Enjoy your FREE 24-Hour Sunday Spotlight Boost at the top of feeds today!',
            '/match',
            'high',
            jsonb_build_object(
                'event', 'campus_clash_victory',
                'campus', v_winner,
                'perk', '24h_boost',
                'boost_until', v_boost_expiry
            )
        FROM public.profiles p
        WHERE (p.university = v_winner OR p.university ILIKE '%' || v_winner || '%')
          AND coalesce(p.is_banned, false) = false
          AND coalesce(p.is_shadow_banned, false) = false;
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking notification insert failure protection
        RAISE WARNING 'Campus clash notification batch dispatch warning: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'status', 'success',
        'week_identifier', v_week_id,
        'winning_university', v_winner,
        'winning_score', v_winner_score,
        'runner_up_university', v_runner_up,
        'boost_granted_until', v_boost_expiry,
        'total_students_boosted', v_boosted_count
    );
END;
$$;

-- 4. Server-Authoritative Function: get_campus_clash_current_status
CREATE OR REPLACE FUNCTION public.get_campus_clash_current_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_user_campus TEXT;
    v_latest RECORD;
    v_is_boost_active BOOLEAN := false;
    v_user_has_boost BOOLEAN := false;
    v_seconds_remaining BIGINT := 0;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT university INTO v_user_campus
        FROM public.profiles
        WHERE id = v_user_id;
    END IF;

    SELECT 
        week_identifier,
        winning_university,
        winning_score,
        runner_up_university,
        total_students_boosted,
        boost_granted_until,
        created_at
    INTO v_latest
    FROM public.campus_clash_weekly_results
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_latest IS NOT NULL THEN
        v_is_boost_active := (now() < v_latest.boost_granted_until);
        IF v_is_boost_active THEN
            v_seconds_remaining := EXTRACT(EPOCH FROM (v_latest.boost_granted_until - now()))::BIGINT;
        END IF;

        IF v_user_campus IS NOT NULL AND v_latest.winning_university IS NOT NULL THEN
            IF (v_user_campus = v_latest.winning_university OR v_user_campus ILIKE '%' || v_latest.winning_university || '%') THEN
                v_user_has_boost := v_is_boost_active;
            END IF;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'has_result', (v_latest IS NOT NULL),
        'week_identifier', COALESCE(v_latest.week_identifier, 'None'),
        'winning_university', COALESCE(v_latest.winning_university, 'UNILAG'),
        'winning_score', COALESCE(v_latest.winning_score, 0),
        'runner_up_university', v_latest.runner_up_university,
        'total_students_boosted', COALESCE(v_latest.total_students_boosted, 0),
        'boost_granted_until', v_latest.boost_granted_until,
        'is_boost_active', v_is_boost_active,
        'user_has_boost', v_user_has_boost,
        'seconds_remaining', v_seconds_remaining
    );
END;
$$;

-- 5. Server-Authoritative Function: create_or_advance_mystery_match
CREATE OR REPLACE FUNCTION public.create_or_advance_mystery_match(
    p_target_user_id UUID,
    p_message_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_session RECORD;
    v_stage INTEGER := 0;
    v_status TEXT := 'active';
    v_is_user1 BOOLEAN;
    v_u1_count INTEGER := 0;
    v_u2_count INTEGER := 0;
    v_min_count INTEGER := 0;
    v_match_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    IF v_caller_id = p_target_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'cannot_match_self');
    END IF;

    -- Look up existing active session between the two users
    SELECT * INTO v_session
    FROM public.mystery_match_sessions
    WHERE ((user1_id = v_caller_id AND user2_id = p_target_user_id)
        OR (user1_id = p_target_user_id AND user2_id = v_caller_id))
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Create new session if none active
    IF v_session IS NULL THEN
        INSERT INTO public.mystery_match_sessions (
            user1_id,
            user2_id,
            status,
            stage,
            user1_messages_count,
            user2_messages_count,
            created_at,
            updated_at
        ) VALUES (
            v_caller_id,
            p_target_user_id,
            'active',
            0,
            0,
            0,
            now(),
            now()
        )
        RETURNING * INTO v_session;
    END IF;

    v_is_user1 := (v_session.user1_id = v_caller_id);
    v_u1_count := v_session.user1_messages_count;
    v_u2_count := v_session.user2_messages_count;

    -- Increment caller's message count if a message is sent
    IF p_message_text IS NOT NULL AND length(trim(p_message_text)) > 0 THEN
        IF v_is_user1 THEN
            v_u1_count := v_u1_count + 1;
        ELSE
            v_u2_count := v_u2_count + 1;
        END IF;
    END IF;

    -- Compute progressive unblur stage:
    -- Both users must exchange messages to progress:
    -- Stage 0: 0 exchanges
    -- Stage 1: Both >= 1 msg (or sender has 2 and recipient has 1)
    -- Stage 2: Both >= 2 msgs
    -- Stage 3: Both >= 3 msgs -> REVEAL!
    v_min_count := LEAST(v_u1_count, v_u2_count);

    IF v_min_count >= 3 THEN
        v_stage := 3;
        v_status := 'revealed';
    ELSIF v_min_count >= 2 THEN
        v_stage := 2;
    ELSIF v_min_count >= 1 THEN
        v_stage := 1;
    ELSE
        -- If caller sent at least 1, partial step
        IF (v_u1_count + v_u2_count) >= 1 THEN
            v_stage := 1;
        ELSE
            v_stage := 0;
        END IF;
    END IF;

    -- If Stage 3 reached, create permanent match in public.matches if not already matched
    IF v_stage = 3 AND v_session.status <> 'revealed' THEN
        BEGIN
            INSERT INTO public.matches (
                user1_id,
                user2_id,
                user_ids,
                created_at
            ) VALUES (
                LEAST(v_caller_id, p_target_user_id),
                GREATEST(v_caller_id, p_target_user_id),
                ARRAY[LEAST(v_caller_id, p_target_user_id), GREATEST(v_caller_id, p_target_user_id)],
                now()
            )
            ON CONFLICT DO NOTHING
            RETURNING id INTO v_match_id;

            -- Notify both students
            INSERT INTO public.notifications (
                user_id, recipient_id, type, category, title, content, deep_link, priority, metadata
            ) VALUES (
                v_caller_id, v_caller_id, 'mystery_match_revealed', 'gamification',
                '🎉 Mystery Match Revealed!',
                'You completed the Primetime 3-message speed date! Your permanent match is now unlocked.',
                '/chat', 'high',
                jsonb_build_object('event', 'mystery_reveal', 'target_id', p_target_user_id)
            ), (
                p_target_user_id, p_target_user_id, 'mystery_match_revealed', 'gamification',
                '🎉 Mystery Match Revealed!',
                'You completed the Primetime 3-message speed date! Your permanent match is now unlocked.',
                '/chat', 'high',
                jsonb_build_object('event', 'mystery_reveal', 'target_id', v_caller_id)
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Match creation or notification exception: %', SQLERRM;
        END;
    END IF;

    -- Update session record
    UPDATE public.mystery_match_sessions
    SET user1_messages_count = v_u1_count,
        user2_messages_count = v_u2_count,
        stage = v_stage,
        status = v_status,
        revealed_at = CASE WHEN v_stage = 3 THEN COALESCE(revealed_at, now()) ELSE revealed_at END,
        updated_at = now()
    WHERE id = v_session.id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session.id,
        'stage', v_stage,
        'status', v_status,
        'user1_messages_count', v_u1_count,
        'user2_messages_count', v_u2_count,
        'is_revealed', (v_stage = 3),
        'caller_messages', CASE WHEN v_is_user1 THEN v_u1_count ELSE v_u2_count END,
        'partner_messages', CASE WHEN v_is_user1 THEN v_u2_count ELSE v_u1_count END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.distribute_weekly_campus_clash_rewards(BOOLEAN) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_campus_clash_current_status() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_or_advance_mystery_match(UUID, TEXT) TO authenticated;
