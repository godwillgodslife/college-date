-- ============================================================
-- REFERRAL FIX – College Date 2.0
-- Run in Supabase SQL Editor.
-- Fixes referral attribution + adds maturity_date for withdrawals
-- ============================================================

-- 1. Ensure referrals table has all required columns
CREATE TABLE IF NOT EXISTS public.referrals (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status       TEXT DEFAULT 'pending',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (referred_id)  -- each user can only be referred once
);

ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS rewarded_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on referrals
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" ON public.referrals
    FOR SELECT USING (auth.uid() = referrer_id);

-- 2. Add maturity_date to wallets for the 30-day lock
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS pending_maturity_date TIMESTAMP WITH TIME ZONE;

-- 3. The referral attribution trigger function
--    Fires AFTER a new profile is created with a referred_by value
DROP FUNCTION IF EXISTS public.handle_referral_on_signup() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_referrer_id UUID;
BEGIN
    -- Only act if the new profile was referred by someone
    IF NEW.referred_by IS NULL THEN
        RETURN NEW;
    END IF;

    v_referrer_id := NEW.referred_by;

    -- Insert referral record (ignore if already exists)
    BEGIN
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (v_referrer_id, NEW.id, 'pending')
        ON CONFLICT (referred_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Award 3 bonus free swipes to the referrer immediately
    BEGIN
        UPDATE public.profiles
        SET free_swipes = COALESCE(free_swipes, 20) + 3
        WHERE id = v_referrer_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Award 20 free swipes to the new referred user (ensure they have the default)
    BEGIN
        UPDATE public.profiles
        SET free_swipes = GREATEST(COALESCE(free_swipes, 0), 20)
        WHERE id = NEW.id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Set pending balance maturity date (30 days from now) on referrer's wallet
    BEGIN
        UPDATE public.wallets
        SET pending_balance = COALESCE(pending_balance, 0) + 500,     -- ₦500 referral earning locked
            pending_maturity_date = CASE
                WHEN pending_maturity_date IS NULL OR pending_maturity_date < now()
                THEN now() + INTERVAL '30 days'
                ELSE pending_maturity_date
            END,
            updated_at = now()
        WHERE user_id = v_referrer_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN NEW;
END;
$$;

-- Attach to profiles table (AFTER INSERT)
DROP TRIGGER IF EXISTS on_referred_profile_created ON public.profiles;
CREATE TRIGGER on_referred_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_referral_on_signup();

-- 4. Referral milestone reward function (call manually or via cron)
DROP FUNCTION IF EXISTS public.process_referral_milestones(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.process_referral_milestones(p_referrer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count    BIGINT;
    v_reward   NUMERIC := 0;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.referrals
    WHERE referrer_id = p_referrer_id AND status IN ('pending', 'rewarded');

    -- Milestone: every 10 referrals = ₦3,000 bonus
    IF v_count > 0 AND (v_count % 10) = 0 THEN
        v_reward := 3000;
        UPDATE public.wallets
        SET available_balance = available_balance + v_reward,
            total_earned      = total_earned + v_reward,
            updated_at        = now()
        WHERE user_id = p_referrer_id;
    END IF;

    -- Mark pending as rewarded
    UPDATE public.referrals
    SET status = 'rewarded', rewarded_at = now()
    WHERE referrer_id = p_referrer_id AND status = 'pending';

    RETURN jsonb_build_object(
        'referral_count', v_count,
        'bonus_awarded',  v_reward
    );
END;
$$;

-- ============================================================
-- Done! Run this once then re-test referral sign-up flow.
-- ============================================================
