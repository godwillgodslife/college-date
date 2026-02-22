-- PROFILE OPTIMISATION SYSTEM: DATABASE UPDATES
-- This script adds columns and triggers for profile completion gamification.

-- 1. Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS intro_prompt TEXT,
ADD COLUMN IF NOT EXISTS completion_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_optimised BOOLEAN DEFAULT false;

-- 2. Function to calculate completion score
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
    -- Note: In this system, signup requires email, but we'll check if it's set as a proxy for 'verified'
    -- Or we can assume +10% for being an active user.
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

-- 3. Trigger Function to update score automatically
CREATE OR REPLACE FUNCTION public.handle_profile_completion_update()
RETURNS TRIGGER AS $$
DECLARE
    v_new_score INTEGER;
BEGIN
    v_new_score := public.calculate_completion_score(NEW.id);
    
    -- Avoid recursion by checking if score changed
    IF NEW.completion_score IS DISTINCT FROM v_new_score THEN
        NEW.completion_score := v_new_score;
        NEW.is_optimised := (v_new_score = 100);
        
        -- Special Reward: If they hit 100% for the first time, give them 10 free swipes
        IF v_new_score = 100 AND (OLD.completion_score IS NULL OR OLD.completion_score < 100) THEN
            NEW.free_swipes := COALESCE(NEW.free_swipes, 0) + 10;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bind Trigger
DROP TRIGGER IF EXISTS tr_profile_completion ON public.profiles;
CREATE TRIGGER tr_profile_completion
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profile_completion_update();

-- 5. Visibility Algorithm Update: Weighing Completion Score
-- Update the discovery feed view if it exists, otherwise we'll handle it in the query
-- Check existing discovery_feed_v3
DO $$
BEGIN
    -- This is a hint for how to modify the discovery logic later
    -- Profiles under 60% completion appear less in discovery
    RAISE NOTICE 'Visibility logic will be updated in swipeService or a view';
END $$;
