-- LAUNCH RECONCILIATION SCRIPT
-- Resolves 406 (Not Acceptable) and 409 (Conflict/FK Violation) errors

-- 1. Ensure profiles table has ALL columns requested by notificationService.js
-- This avoids 406 errors when selecting match_notifications, etc.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS match_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS incognito_mode BOOLEAN DEFAULT false;

-- 2. Fix Wallets Table and RLS
-- Ensure wallets table is robust
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    available_balance DECIMAL(12,2) DEFAULT 0.00,
    pending_balance DECIMAL(12,2) DEFAULT 0.00,
    total_earned DECIMAL(12,2) DEFAULT 0.00,
    total_spent DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id)
);

-- 3. Fix Profile Views Foreign Key
-- The error "violates foreign key constraint profile_views_viewer_id_fkey"
-- suggest the constraint refers to a table that doesn't have the user ID.
-- We must ensure it refers to auth.users or public.profiles (if public.profiles is synced).
ALTER TABLE public.profile_views DROP CONSTRAINT IF EXISTS profile_views_viewer_id_fkey;
ALTER TABLE public.profile_views ADD CONSTRAINT profile_views_viewer_id_fkey 
    FOREIGN KEY (viewer_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profile_views DROP CONSTRAINT IF EXISTS profile_views_profile_owner_id_fkey;
ALTER TABLE public.profile_views ADD CONSTRAINT profile_views_profile_owner_id_fkey 
    FOREIGN KEY (profile_owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Fix Swipes Foreign Key
ALTER TABLE public.swipes DROP CONSTRAINT IF EXISTS swipes_swiper_id_fkey;
ALTER TABLE public.swipes ADD CONSTRAINT swipes_swiper_id_fkey 
    FOREIGN KEY (swiper_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.swipes DROP CONSTRAINT IF EXISTS swipes_swiped_id_fkey;
ALTER TABLE public.swipes ADD CONSTRAINT swipes_swiped_id_fkey 
    FOREIGN KEY (swiped_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Fix RPC check_and_reset_swipe_limit
-- Ensure it returns the correct structure to avoid 409/Type errors
CREATE OR REPLACE FUNCTION public.check_and_reset_swipe_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_swipes_used INTEGER;
    v_last_reset TIMESTAMP WITH TIME ZONE;
    v_max_swipes INTEGER := 20; -- Default limit
BEGIN
    -- Get current state
    SELECT swipes_used, last_reset INTO v_swipes_used, v_last_reset
    FROM public.swipe_limits
    WHERE user_id = p_user_id;

    -- If no record, create one
    IF NOT FOUND THEN
        INSERT INTO public.swipe_limits (user_id, swipes_used, last_reset)
        VALUES (p_user_id, 0, now())
        RETURNING swipes_used, last_reset INTO v_swipes_used, v_last_reset;
    END IF;

    -- Reset if older than 24 hours
    IF v_last_reset < (now() - INTERVAL '24 hours') THEN
        UPDATE public.swipe_limits
        SET swipes_used = 0, last_reset = now()
        WHERE user_id = p_user_id
        RETURNING swipes_used, last_reset INTO v_swipes_used, v_last_reset;
    END IF;

    RETURN jsonb_build_object(
        'can_swipe', v_swipes_used < v_max_swipes,
        'used_count', v_swipes_used,
        'max_count', v_max_swipes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Final QC: Ensure RLS is sane for testing
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets
    FOR SELECT USING (auth.uid() = user_id);
