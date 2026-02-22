-- RESTORE DISCOVERY & FIX LIMITS (v3)
-- This script is now self-contained with the scoring function.

-- 0. Function to calculate completion score
CREATE OR REPLACE FUNCTION public.calculate_completion_score(p_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_profile RECORD;
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_id;
    
    -- ✅ Add clear photo (+30%)
    IF v_profile.avatar_url IS NOT NULL AND v_profile.avatar_url <> '' THEN
        v_score := v_score + 30;
    END IF;

    -- ✅ Add 3 interests (+15%)
    IF v_profile.interests IS NOT NULL AND jsonb_array_length(v_profile.interests) >= 3 THEN
        v_score := v_score + 15;
    END IF;

    -- ✅ Add bio (+20%)
    IF v_profile.bio IS NOT NULL AND length(trim(v_profile.bio)) >= 10 THEN
        v_score := v_score + 20;
    END IF;

    -- ✅ Add campus year/level (+10%)
    IF v_profile.level IS NOT NULL AND v_profile.level <> '' THEN
        v_score := v_score + 10;
    END IF;

    -- ✅ Verify email (+10%)
    IF v_profile.email IS NOT NULL AND v_profile.email LIKE '%@%' THEN
        v_score := v_score + 10;
    END IF;

    -- ✅ Add short intro prompt (+15%)
    IF v_profile.intro_prompt IS NOT NULL AND length(trim(v_profile.intro_prompt)) >= 5 THEN
        v_score := v_score + 15;
    END IF;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Correct Swipe Limit Logic (Server Side)
CREATE OR REPLACE FUNCTION public.check_and_reset_swipe_limit(p_user_id UUID)
RETURNS TABLE (
    can_swipe BOOLEAN,
    used_count INTEGER,
    max_count INTEGER
) AS $$
DECLARE
    v_last_reset TIMESTAMP WITH TIME ZONE;
    v_used INTEGER;
    v_is_premium BOOLEAN;
BEGIN
    -- 1. Check Premium Status (Unlimited)
    SELECT (plan_type = 'Premium' AND status = 'active') INTO v_is_premium 
    FROM public.subscriptions WHERE user_id = p_user_id;

    IF v_is_premium THEN
        RETURN QUERY SELECT TRUE, 0, 999;
        RETURN;
    END IF;

    -- 2. Get/Init limits
    SELECT swipes_used, last_reset INTO v_used, v_last_reset 
    FROM public.swipe_limits WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        -- Safely initialize
        INSERT INTO public.swipe_limits (user_id, swipes_used, last_reset)
        VALUES (p_user_id, 0, now())
        ON CONFLICT (user_id) DO UPDATE SET swipes_used = 0, last_reset = now()
        RETURNING swipes_used, last_reset INTO v_used, v_last_reset;
    END IF;

    -- 3. Reset logic: If last reset was more than 24h ago
    IF v_last_reset < now() - INTERVAL '24 hours' THEN
        UPDATE public.swipe_limits 
        SET swipes_used = 0, last_reset = now()
        WHERE user_id = p_user_id;
        v_used := 0;
    END IF;

    -- 4. Return correct counts
    RETURN QUERY SELECT (v_used < 20), v_used, 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Recalculate Completion Scores
-- Ensures users don't get the 'under 60%' message if they've actually filled data
UPDATE public.profiles p
SET completion_score = public.calculate_completion_score(p.id)
WHERE completion_score IS NULL OR completion_score = 0;

-- 3. Diagnostic: Reset current user context (Run this if tests still show 0)
-- This ensures the first user (likely you) is reset for discovery.
UPDATE public.swipe_limits 
SET swipes_used = 0, last_reset = now()
WHERE user_id IN (SELECT id FROM public.profiles LIMIT 1);
