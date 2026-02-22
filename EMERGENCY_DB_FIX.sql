-- EMERGENCY DATABASE FIX: SCHEMA ALIGNMENT & VIEW RECREATION
-- This script fixes "Could not load profiles" (400) and Referral (400) errors.

-- 1. Ensure missing columns exist in public.profiles
DO $$ 
BEGIN 
    -- Add username if missing (Referrals & Dashboard dependency)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
        -- Populate username from email prefix as fallback
        UPDATE public.profiles SET username = split_part(email, '@', 1) WHERE username IS NULL;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;

    -- Ensure completion columns exist (Profile Optimisation dependency)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='completion_score') THEN
        ALTER TABLE public.profiles ADD COLUMN completion_score INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_optimised') THEN
        ALTER TABLE public.profiles ADD COLUMN is_optimised BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='interests') THEN
        ALTER TABLE public.profiles ADD COLUMN interests JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='intro_prompt') THEN
        ALTER TABLE public.profiles ADD COLUMN intro_prompt TEXT;
    END IF;
END $$;

-- 2. Recreate Discovery View (Must be dropped and recreated to pick up new columns)
DROP VIEW IF EXISTS discovery_feed_v3;
CREATE VIEW discovery_feed_v3 AS
SELECT 
    p.*,
    get_user_visibility_score(p.id) as visibility_score,
    COALESCE(s.plan_type, 'Free') as plan_type,
    EXISTS (SELECT 1 FROM boosts b WHERE b.user_id = p.id AND b.expires_at > now()) as is_boosted
FROM 
    public.profiles p
LEFT JOIN 
    public.subscriptions s ON s.user_id = p.id;

-- 3. Ensure Payout Details table exists (Fixes 406 Not Acceptable)
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

-- 4. Ensure Referrals table exists (Fixes Referrals 400 if it was missing)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(referrer_id, referred_id)
);

-- 5. RLS Policies & Grants (Critical for frontend access)
ALTER TABLE public.payout_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own payout details" ON public.payout_details;
CREATE POLICY "Users can manage their own payout details" ON public.payout_details 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" ON public.referrals
FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

GRANT SELECT ON discovery_feed_v3 TO anon, authenticated;
GRANT ALL ON public.payout_details TO authenticated;
GRANT ALL ON public.referrals TO authenticated;

-- 6. Refresh the visibility score function to ensure it uses the latest profiles table columns if needed
-- (The existing function is fine as it uses user_uuid and SELECT last_seen_at)
