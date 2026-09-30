-- ============================================================================
-- The College Date: "College Date Active" Liquidity, Retention & Earnings System
-- Migration: 20260920150000_college_date_active_system.sql
-- Description: Server-authoritative campus ambassador & daily engagement ledger,
--              cohort configuration, qualification evaluation, and wallet settlement.
-- ============================================================================

-- 1. Campaign & Cohort Configuration
CREATE TABLE IF NOT EXISTS public.active_program_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    is_active BOOLEAN NOT NULL DEFAULT true,
    daily_reward NUMERIC(10,2) NOT NULL DEFAULT 625.00,
    monthly_target NUMERIC(10,2) NOT NULL DEFAULT 15000.00,
    min_qualifying_days INTEGER NOT NULL DEFAULT 24,
    max_qualifying_days INTEGER NOT NULL DEFAULT 30,
    required_daily_swipes INTEGER NOT NULL DEFAULT 15,
    required_daily_chats INTEGER NOT NULL DEFAULT 3,
    required_score_streak BOOLEAN NOT NULL DEFAULT true,
    max_participants INTEGER NOT NULL DEFAULT 500,
    pilot_campuses TEXT[] DEFAULT ARRAY[]::TEXT[], -- Empty means all campus universities
    pilot_genders TEXT[] DEFAULT ARRAY['Female', 'female']::TEXT[], -- Strictly Female cohort
    min_profile_completion INTEGER NOT NULL DEFAULT 60,
    payout_day_of_month INTEGER NOT NULL DEFAULT 28,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default configuration row
INSERT INTO public.active_program_config (id, is_active, daily_reward, monthly_target, min_qualifying_days, required_daily_swipes, required_daily_chats, pilot_genders)
VALUES ('default', true, 625.00, 15000.00, 24, 15, 3, ARRAY['Female', 'female']::TEXT[])
ON CONFLICT (id) DO UPDATE
SET daily_reward = 625.00,
    monthly_target = 15000.00,
    min_qualifying_days = 24,
    required_daily_swipes = 15,
    required_daily_chats = 3,
    pilot_genders = ARRAY['Female', 'female']::TEXT[],
    updated_at = now();

-- 2. Participant Accounts per Monthly Cycle
CREATE TABLE IF NOT EXISTS public.active_program_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('enrolled', 'active', 'paused', 'disqualified', 'graduated')),
    current_month_key TEXT NOT NULL, -- Format: 'YYYY-MM', e.g. '2026-09'
    qualifying_days_count INTEGER NOT NULL DEFAULT 0 CHECK (qualifying_days_count >= 0),
    accrued_earnings NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (accrued_earnings >= 0),
    last_qualified_date DATE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, current_month_key)
);

CREATE INDEX IF NOT EXISTS idx_active_participants_user_month 
    ON public.active_program_participants(user_id, current_month_key);

-- 3. Daily Activity & Qualification Ledger
CREATE TABLE IF NOT EXISTS public.active_program_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES public.active_program_participants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT (current_timestamp AT TIME ZONE 'UTC')::date,
    day_key TEXT NOT NULL, -- Format: 'YYYY-MM-DD', e.g. '2026-09-20'
    swipes_count INTEGER NOT NULL DEFAULT 0,
    conversations_responded INTEGER NOT NULL DEFAULT 0,
    score_streak_completed BOOLEAN NOT NULL DEFAULT false,
    is_qualified BOOLEAN NOT NULL DEFAULT false,
    earned_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (earned_amount >= 0),
    qualification_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_active_daily_logs_user_date 
    ON public.active_program_daily_logs(user_id, activity_date);

-- 4. Monthly Settlement & Ledger Reconciliation
CREATE TABLE IF NOT EXISTS public.active_program_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL, -- e.g. '2026-09'
    total_qualifying_days INTEGER NOT NULL DEFAULT 0,
    total_earned NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    wallet_credited BOOLEAN NOT NULL DEFAULT false,
    wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'credited', 'rejected')),
    settled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, month_key)
);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.active_program_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_program_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_program_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_program_settlements ENABLE ROW LEVEL SECURITY;

-- Config RLS: Authenticated users can read configuration; Admins can update
DROP POLICY IF EXISTS "Authenticated users can read active program config" ON public.active_program_config;
CREATE POLICY "Authenticated users can read active program config"
    ON public.active_program_config FOR SELECT
    TO authenticated
    USING (true);

-- Participants RLS: Users can view own participation records
DROP POLICY IF EXISTS "Users can view own active participant record" ON public.active_program_participants;
CREATE POLICY "Users can view own active participant record"
    ON public.active_program_participants FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Daily Logs RLS: Users can view own daily logs
DROP POLICY IF EXISTS "Users can view own active daily logs" ON public.active_program_daily_logs;
CREATE POLICY "Users can view own active daily logs"
    ON public.active_program_daily_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Settlements RLS: Users can view own settlements
DROP POLICY IF EXISTS "Users can view own active settlements" ON public.active_program_settlements;
CREATE POLICY "Users can view own active settlements"
    ON public.active_program_settlements FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================================
-- RPC: Get Active Program Status (Transparent Dashboard Resolver)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_program_status(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_target_user_id UUID;
    v_caller_id UUID := auth.uid();
    v_config RECORD;
    v_participant RECORD;
    v_user_profile RECORD;
    v_today DATE := (current_timestamp AT TIME ZONE 'UTC')::date;
    v_today_key TEXT := to_char(v_today, 'YYYY-MM-DD');
    v_month_key TEXT := to_char(v_today, 'YYYY-MM');
    v_daily_log RECORD;
    v_today_swipes INTEGER := 0;
    v_today_chats INTEGER := 0;
    v_streak_done BOOLEAN := false;
    v_is_eligible BOOLEAN := false;
    v_gifts_ngn NUMERIC(12,2) := 0.00;
    v_payout_date_str TEXT;
BEGIN
    v_target_user_id := COALESCE(p_user_id, v_caller_id);
    IF v_target_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Security Guard: Caller can only view own status unless admin
    IF v_caller_id <> v_target_user_id THEN
        -- Allow if admin
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = v_caller_id AND (role = 'admin' OR role = 'super_admin')
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access');
        END IF;
    END IF;

    -- Fetch Program Config
    SELECT * INTO v_config FROM public.active_program_config WHERE id = 'default' LIMIT 1;
    IF v_config IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Program configuration not found');
    END IF;

    -- Fetch User Profile
    SELECT id, gender, role, university, completion_score, is_banned, is_shadow_banned
    INTO v_user_profile
    FROM public.profiles
    WHERE id = v_target_user_id;

    -- Evaluate Eligibility: Strictly female campus ambassadors with profile completion >= 60%
    IF v_user_profile.id IS NOT NULL 
       AND NOT COALESCE(v_user_profile.is_banned, false)
       AND NOT COALESCE(v_user_profile.is_shadow_banned, false)
       AND (
           LOWER(COALESCE(v_user_profile.gender, '')) = 'female' OR
           LOWER(COALESCE(v_user_profile.role, '')) = 'female'
       )
       AND (
           array_length(v_config.pilot_genders, 1) IS NULL OR
           EXISTS (
               SELECT 1 FROM unnest(v_config.pilot_genders) g 
               WHERE LOWER(g) = LOWER(COALESCE(v_user_profile.gender, '')) 
                  OR LOWER(g) = LOWER(COALESCE(v_user_profile.role, ''))
           )
       )
       AND (array_length(v_config.pilot_campuses, 1) IS NULL OR array_length(v_config.pilot_campuses, 1) = 0 OR v_user_profile.university = ANY(v_config.pilot_campuses))
       AND COALESCE(v_user_profile.completion_score, 0) >= v_config.min_profile_completion
    THEN
        v_is_eligible := true;
    END IF;

    -- Fetch Participant Record for current month
    SELECT * INTO v_participant
    FROM public.active_program_participants
    WHERE user_id = v_target_user_id AND current_month_key = v_month_key;

    -- Count Today's Swipes
    SELECT COUNT(*)::integer INTO v_today_swipes
    FROM public.swipes
    WHERE swiper_id = v_target_user_id
      AND (created_at AT TIME ZONE 'UTC')::date = v_today;

    -- Count Today's Messages Sent
    SELECT COUNT(*)::integer INTO v_today_chats
    FROM public.messages
    WHERE sender_id = v_target_user_id
      AND (created_at AT TIME ZONE 'UTC')::date = v_today;

    -- Check Today's Score Streak
    SELECT EXISTS (
        SELECT 1 FROM public.score_streak_events
        WHERE user_id = v_target_user_id AND event_date = v_today
    ) INTO v_streak_done;

    -- Fetch Existing Daily Log for Today
    SELECT * INTO v_daily_log
    FROM public.active_program_daily_logs
    WHERE user_id = v_target_user_id AND activity_date = v_today;

    -- Fetch Gifts Earned this month
    SELECT COALESCE(SUM(amount), 0.00)::numeric(12,2) INTO v_gifts_ngn
    FROM public.wallet_transactions
    WHERE user_id = v_target_user_id
      AND type = 'gift_received'
      AND status = 'completed'
      AND to_char((created_at AT TIME ZONE 'UTC'), 'YYYY-MM') = v_month_key;

    v_payout_date_str := v_month_key || '-' || lpad(v_config.payout_day_of_month::text, 2, '0');

    RETURN jsonb_build_object(
        'success', true,
        'is_active', v_config.is_active,
        'enrolled', (v_participant.id IS NOT NULL),
        'status', COALESCE(v_participant.status, 'not_enrolled'),
        'is_eligible', v_is_eligible,
        'current_month_key', v_month_key,
        'accrued_earnings', COALESCE(v_participant.accrued_earnings, 0.00),
        'monthly_target', v_config.monthly_target,
        'daily_reward', v_config.daily_reward,
        'qualifying_days_count', COALESCE(v_participant.qualifying_days_count, 0),
        'min_qualifying_days', v_config.min_qualifying_days,
        'max_qualifying_days', v_config.max_qualifying_days,
        'remaining_days_needed', GREATEST(0, v_config.min_qualifying_days - COALESCE(v_participant.qualifying_days_count, 0)),
        'progress_percentage', LEAST(100, ROUND((COALESCE(v_participant.accrued_earnings, 0.00) / GREATEST(1.00, v_config.monthly_target) * 100.00)::numeric, 1)),
        'today_qualified', COALESCE(v_daily_log.is_qualified, false),
        'today_progress', jsonb_build_object(
            'swipes_count', v_today_swipes,
            'required_swipes', v_config.required_daily_swipes,
            'swipes_done', (v_today_swipes >= v_config.required_daily_swipes),
            'chats_count', v_today_chats,
            'required_chats', v_config.required_daily_chats,
            'chats_done', (v_today_chats >= v_config.required_daily_chats),
            'streak_done', v_streak_done,
            'required_streak', v_config.required_score_streak
        ),
        'gifts_received_ngn', v_gifts_ngn,
        'payout_date', v_payout_date_str,
        'min_withdrawal_threshold', 15000.00
    );
END;
$$;

-- ============================================================================
-- RPC: Enroll in Active Program (Server-Validated Onboarding)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enroll_in_active_program(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_month_key TEXT := to_char((current_timestamp AT TIME ZONE 'UTC')::date, 'YYYY-MM');
    v_status_check JSONB;
    v_participant_id UUID;
    v_count INTEGER;
    v_max_participants INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Evaluate Eligibility via get_active_program_status
    v_status_check := public.get_active_program_status(v_user_id);
    IF NOT (v_status_check->>'is_eligible')::boolean THEN
        RETURN jsonb_build_object('success', false, 'error', 'College Date Active is exclusively available for verified female campus ambassadors with profile completion of at least 60%.');
    END IF;

    -- Check participant cap
    SELECT max_participants INTO v_max_participants FROM public.active_program_config WHERE id = 'default';
    SELECT COUNT(*)::integer INTO v_count 
    FROM public.active_program_participants 
    WHERE current_month_key = v_month_key AND status = 'active';

    IF v_count >= COALESCE(v_max_participants, 500) THEN
        RETURN jsonb_build_object('success', false, 'error', 'The active program cohort for this month is currently full. Try again next cycle.');
    END IF;

    -- Insert or return existing enrollment
    INSERT INTO public.active_program_participants (
        user_id, status, current_month_key, qualifying_days_count, accrued_earnings
    ) VALUES (
        v_user_id, 'active', v_month_key, 0, 0.00
    )
    ON CONFLICT (user_id, current_month_key) DO UPDATE
    SET status = 'active', updated_at = now()
    RETURNING id INTO v_participant_id;

    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant_id,
        'month_key', v_month_key,
        'message', 'Welcome to College Date Active! Start your daily qualifying activity today.'
    );
END;
$$;

-- ============================================================================
-- RPC: Evaluate Daily Qualification (Atomic Server Authority)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.evaluate_active_daily_qualification(p_user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_today DATE := (current_timestamp AT TIME ZONE 'UTC')::date;
    v_today_key TEXT := to_char(v_today, 'YYYY-MM-DD');
    v_month_key TEXT := to_char(v_today, 'YYYY-MM');
    v_config RECORD;
    v_participant RECORD;
    v_today_swipes INTEGER := 0;
    v_today_chats INTEGER := 0;
    v_streak_done BOOLEAN := false;
    v_is_qualified BOOLEAN := false;
    v_reward NUMERIC(10,2) := 0.00;
    v_existing_log RECORD;
    v_idempotency TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    -- Fetch Config
    SELECT * INTO v_config FROM public.active_program_config WHERE id = 'default';
    IF v_config IS NULL OR NOT v_config.is_active THEN
        RETURN jsonb_build_object('success', false, 'error', 'Active program is currently disabled');
    END IF;

    -- Fetch Participant
    SELECT * INTO v_participant
    FROM public.active_program_participants
    WHERE user_id = v_user_id AND current_month_key = v_month_key AND status = 'active';

    IF v_participant IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User is not enrolled in College Date Active for this month');
    END IF;

    -- Check if today is already finalized and qualified
    SELECT * INTO v_existing_log
    FROM public.active_program_daily_logs
    WHERE user_id = v_user_id AND activity_date = v_today;

    IF v_existing_log IS NOT NULL AND v_existing_log.is_qualified THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_qualified', true,
            'earned_amount', v_existing_log.earned_amount,
            'qualifying_days_count', v_participant.qualifying_days_count,
            'accrued_earnings', v_participant.accrued_earnings
        );
    END IF;

    -- Count Real Activities
    SELECT COUNT(*)::integer INTO v_today_swipes
    FROM public.swipes
    WHERE swiper_id = v_user_id
      AND (created_at AT TIME ZONE 'UTC')::date = v_today;

    SELECT COUNT(*)::integer INTO v_today_chats
    FROM public.messages
    WHERE sender_id = v_user_id
      AND (created_at AT TIME ZONE 'UTC')::date = v_today;

    SELECT EXISTS (
        SELECT 1 FROM public.score_streak_events
        WHERE user_id = v_user_id AND event_date = v_today
    ) INTO v_streak_done;

    -- Evaluate criteria
    IF v_today_swipes >= v_config.required_daily_swipes
       AND v_today_chats >= v_config.required_daily_chats
       AND (v_streak_done OR NOT v_config.required_score_streak)
    THEN
        v_is_qualified := true;
        -- Cap total monthly earnings at monthly_target
        v_reward := LEAST(v_config.daily_reward, GREATEST(0.00, v_config.monthly_target - v_participant.accrued_earnings));
    END IF;

    v_idempotency := 'active_log_' || v_user_id::text || '_' || v_today_key;

    -- Upsert Daily Log
    INSERT INTO public.active_program_daily_logs (
        participant_id, user_id, activity_date, day_key, swipes_count,
        conversations_responded, score_streak_completed, is_qualified,
        earned_amount, qualification_details, idempotency_key
    ) VALUES (
        v_participant.id, v_user_id, v_today, v_today_key, v_today_swipes,
        v_today_chats, v_streak_done, v_is_qualified, v_reward,
        jsonb_build_object(
            'swipes_count', v_today_swipes,
            'required_swipes', v_config.required_daily_swipes,
            'chats_count', v_today_chats,
            'required_chats', v_config.required_daily_chats,
            'streak_completed', v_streak_done
        ),
        v_idempotency
    )
    ON CONFLICT (user_id, activity_date) DO UPDATE
    SET swipes_count = EXCLUDED.swipes_count,
        conversations_responded = EXCLUDED.conversations_responded,
        score_streak_completed = EXCLUDED.score_streak_completed,
        is_qualified = EXCLUDED.is_qualified,
        earned_amount = EXCLUDED.earned_amount,
        qualification_details = EXCLUDED.qualification_details,
        updated_at = now();

    -- If newly qualified, update participant monthly totals atomically
    IF v_is_qualified AND (v_existing_log IS NULL OR NOT v_existing_log.is_qualified) THEN
        UPDATE public.active_program_participants
        SET qualifying_days_count = qualifying_days_count + 1,
            accrued_earnings = accrued_earnings + v_reward,
            last_qualified_date = v_today,
            updated_at = now()
        WHERE id = v_participant.id
        RETURNING qualifying_days_count, accrued_earnings INTO v_participant.qualifying_days_count, v_participant.accrued_earnings;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'is_qualified', v_is_qualified,
        'earned_today', v_reward,
        'qualifying_days_count', v_participant.qualifying_days_count,
        'accrued_earnings', v_participant.accrued_earnings,
        'swipes_count', v_today_swipes,
        'chats_count', v_today_chats,
        'streak_done', v_streak_done
    );
END;
$$;

-- ============================================================================
-- RPC: Settle Monthly Active Earnings (Admin/Cron Ledger Settlement)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.settle_monthly_active_earnings(p_month_key TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_month TEXT := COALESCE(p_month_key, to_char((current_timestamp AT TIME ZONE 'UTC')::date, 'YYYY-MM'));
    v_config RECORD;
    v_participant RECORD;
    v_wallet_id UUID;
    v_tx_id UUID;
    v_settlement_id UUID;
    v_processed_count INTEGER := 0;
    v_total_amount NUMERIC(12,2) := 0.00;
BEGIN
    -- Only admin can trigger manual settlement
    IF v_caller_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = v_caller_id AND (role = 'admin' OR role = 'super_admin')
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Admin privileges required');
        END IF;
    END IF;

    -- Fetch Program Config
    SELECT * INTO v_config FROM public.active_program_config WHERE id = 'default';

    FOR v_participant IN 
        SELECT * FROM public.active_program_participants
        WHERE current_month_key = v_month
          AND status = 'active'
          AND accrued_earnings > 0
          AND qualifying_days_count >= COALESCE(v_config.min_qualifying_days, 24)
          AND NOT EXISTS (
              SELECT 1 FROM public.active_program_settlements s 
              WHERE s.user_id = active_program_participants.user_id 
                AND s.month_key = v_month 
                AND s.wallet_credited = true
          )
    LOOP
        -- Ensure recipient wallet exists
        INSERT INTO public.wallets (user_id, available_balance, total_earned)
        VALUES (v_participant.user_id, 0.00, 0.00)
        ON CONFLICT (user_id) DO NOTHING;

        SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = v_participant.user_id;

        -- Credit wallet balance
        UPDATE public.wallets
        SET available_balance = available_balance + v_participant.accrued_earnings,
            total_earned = total_earned + v_participant.accrued_earnings,
            updated_at = now()
        WHERE id = v_wallet_id;

        -- Record wallet transaction
        INSERT INTO public.wallet_transactions (
            user_id, wallet_id, type, amount, status, description, metadata
        ) VALUES (
            v_participant.user_id, v_wallet_id, 'ambassador_payout', v_participant.accrued_earnings,
            'completed', 'College Date Active Monthly Earnings (' || v_month || ')',
            jsonb_build_object(
                'month_key', v_month,
                'qualifying_days', v_participant.qualifying_days_count,
                'participant_id', v_participant.id
            )
        )
        RETURNING id INTO v_tx_id;

        -- Create Settlement Record
        INSERT INTO public.active_program_settlements (
            user_id, month_key, total_qualifying_days, total_earned,
            wallet_credited, wallet_transaction_id, status, settled_at
        ) VALUES (
            v_participant.user_id, v_month, v_participant.qualifying_days_count,
            v_participant.accrued_earnings, true, v_tx_id, 'credited', now()
        );

        v_processed_count := v_processed_count + 1;
        v_total_amount := v_total_amount + v_participant.accrued_earnings;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'month_key', v_month,
        'processed_participants', v_processed_count,
        'total_amount_credited_ngn', v_total_amount
    );
END;
$$;

-- Grant Execution Rights
GRANT EXECUTE ON FUNCTION public.get_active_program_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enroll_in_active_program(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_active_daily_qualification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_monthly_active_earnings(TEXT) TO authenticated;
