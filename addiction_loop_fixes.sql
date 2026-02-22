-- ====================================================
-- PHASE 1: ADDICTION LOOP & RETENTION FIXES
-- ====================================================

-- 1. Enhance engagement_scores for Streaks
ALTER TABLE public.engagement_scores
ADD COLUMN IF NOT EXISTS last_swipe_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS streak_updated_at TIMESTAMP WITH TIME ZONE;

-- 2. Add Streak Freeze and Badges to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS streak_freeze_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_badge TEXT DEFAULT 'Campus Newbie';

-- 3. Function to handle Swipe Streaks (Atomic)
CREATE OR REPLACE FUNCTION update_swipe_streak(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_last_swipe TIMESTAMP WITH TIME ZONE;
    v_current_streak INTEGER;
    v_score_boost INTEGER := 0;
BEGIN
    SELECT daily_streak, last_swipe_at INTO v_current_streak, v_last_swipe
    FROM public.engagement_scores
    WHERE user_id = p_user_id;

    -- If no record, initialize (should be handled by trigger but safe check)
    IF NOT FOUND THEN
        INSERT INTO public.engagement_scores (user_id, daily_streak, last_swipe_at)
        VALUES (p_user_id, 1, now());
        RETURN jsonb_build_object('success', true, 'streak', 1, 'boost', 0);
    END IF;

    -- Logic:
    -- 1. If swiped today: Do nothing to streak
    -- 2. If swiped yesterday: Streak + 1
    -- 3. If missed a day: Reset to 1 (unless freeze available - handled in future)
    
    IF v_last_swipe > now() - INTERVAL '24 hours' THEN
        -- Already swiped in last 24h, just update last_swipe_at
        UPDATE public.engagement_scores SET last_swipe_at = now() WHERE user_id = p_user_id;
    ELSIF v_last_swipe > now() - INTERVAL '48 hours' THEN
        -- Swiped yesterday! Increment
        v_current_streak := v_current_streak + 1;
        v_score_boost := 50; -- Engagement score bonus
        UPDATE public.engagement_scores 
        SET daily_streak = v_current_streak, 
            last_swipe_at = now(),
            score = score + v_score_boost,
            streak_updated_at = now()
        WHERE user_id = p_user_id;
    ELSE
        -- Missed more than 24h gap (48h total)
        v_current_streak := 1;
        UPDATE public.engagement_scores 
        SET daily_streak = 1, 
            last_swipe_at = now(),
            streak_updated_at = now()
        WHERE user_id = p_user_id;
    END IF;

    -- Update Badge based on streak
    IF v_current_streak >= 14 THEN
        UPDATE public.profiles SET current_badge = 'Campus Legend 🔥' WHERE id = p_user_id;
    ELSIF v_current_streak >= 7 THEN
        UPDATE public.profiles SET current_badge = 'Campus Star ⭐' WHERE id = p_user_id;
    ELSIF v_current_streak >= 3 THEN
        UPDATE public.profiles SET current_badge = 'Regular' WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object('success', true, 'streak', v_current_streak, 'boost', v_score_boost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
