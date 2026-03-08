-- ====================================================
-- MASTER FIX SCRIPT: DISCOVERY, REFERRALS, & PAYOUTS
-- Run this in your Supabase SQL Editor to resolve all 404/406 errors
-- ====================================================

-- 1. PROFILES SCHEMA UPGRADE (Discovery & Live Mode)
DO $$ 
BEGIN 
    -- Completion & Discovery
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
        UPDATE public.profiles SET username = split_part(email, '@', 1) WHERE username IS NULL;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='completion_score') THEN
        ALTER TABLE public.profiles ADD COLUMN completion_score INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='interests') THEN
        ALTER TABLE public.profiles ADD COLUMN interests JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Multi-Photo & Live Mode
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='profile_photos') THEN
        ALTER TABLE public.profiles ADD COLUMN profile_photos TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_seen_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_live') THEN
        ALTER TABLE public.profiles ADD COLUMN is_live BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Populate existing photos into array
UPDATE public.profiles
SET profile_photos = ARRAY[avatar_url]
WHERE (profile_photos IS NULL OR array_length(profile_photos, 1) IS NULL)
AND avatar_url IS NOT NULL;

-- 2. PAYOUTS & REFERRALS TABLES (Fixes 406 Error)
CREATE TABLE IF NOT EXISTS public.payout_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    paypal_email TEXT,
    preferred_method TEXT CHECK (preferred_method IN ('bank', 'paypal')) DEFAULT 'bank',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(referrer_id, referred_id)
);

ALTER TABLE public.payout_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own payout details" ON public.payout_details;
CREATE POLICY "Users can manage their own payout details" ON public.payout_details 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" ON public.referrals
FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

GRANT ALL ON public.payout_details TO authenticated;
GRANT ALL ON public.referrals TO authenticated;

-- 3. RECREATE DISCOVERY VIEW (So the grid loads properly)
DROP VIEW IF EXISTS discovery_feed_v3;
CREATE VIEW discovery_feed_v3 AS
SELECT 
    p.*,
    COALESCE(s.plan_type, 'Free') as plan_type,
    EXISTS (SELECT 1 FROM boosts b WHERE b.user_id = p.id AND b.expires_at > now()) as is_boosted
FROM public.profiles p
LEFT JOIN public.subscriptions s ON s.user_id = p.id;
GRANT SELECT ON discovery_feed_v3 TO anon, authenticated;

-- 4. REFERRAL PENDING FUNDS RPC (Fixes 404 Error)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallet_transactions' AND column_name='unlocks_at') THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN unlocks_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

CREATE OR REPLACE FUNCTION process_pending_referral_funds(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    rec RECORD;
    unlocked_amount DECIMAL := 0;
BEGIN
    FOR rec IN 
        SELECT id, amount, wallet_id 
        FROM public.wallet_transactions 
        WHERE user_id = p_user_id AND status = 'pending' AND type = 'referral_bonus' AND unlocks_at <= now()
    LOOP
        UPDATE public.wallet_transactions SET status = 'completed', unlocks_at = NULL, description = 'Referral Reward (Unlocked)' WHERE id = rec.id;
        UPDATE public.wallets 
        SET pending_balance = GREATEST(pending_balance - rec.amount, 0),
            available_balance = available_balance + rec.amount,
            total_earned = total_earned + rec.amount,
            updated_at = now()
        WHERE id = rec.wallet_id;
        unlocked_amount := unlocked_amount + rec.amount;
    END LOOP;
    RETURN jsonb_build_object('success', true, 'unlocked_total', unlocked_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. SWIPE LIMITS & PRESENCE RPC
DROP FUNCTION IF EXISTS public.check_and_reset_swipe_limit(UUID);

CREATE OR REPLACE FUNCTION check_and_reset_swipe_limit(p_user_id UUID)
RETURNS TABLE (can_swipe BOOLEAN, used_count INTEGER, max_count INTEGER) AS $$
DECLARE
    v_used INTEGER;
    v_last_reset TIMESTAMP WITH TIME ZONE;
    v_max INTEGER;
BEGIN
    SELECT free_swipes INTO v_max FROM public.profiles WHERE id = p_user_id;
    IF v_max IS NULL THEN v_max := 20; END IF;
    SELECT swipes_used, last_reset INTO v_used, v_last_reset FROM public.swipe_limits WHERE user_id = p_user_id;
    
    IF v_used IS NULL THEN
        INSERT INTO public.swipe_limits (user_id, swipes_used, last_reset) VALUES (p_user_id, 0, now());
        v_used := 0;
    ELSIF v_last_reset < now() - INTERVAL '24 hours' THEN
        UPDATE public.swipe_limits SET swipes_used = 0, last_reset = now() WHERE user_id = p_user_id;
        v_used := 0;
    END IF;
    RETURN QUERY SELECT (v_used < v_max), v_used, v_max;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles SET last_seen_at = now(), is_live = true WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime for Live Mode tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;
