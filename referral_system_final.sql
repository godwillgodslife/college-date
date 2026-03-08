-- ====================================================
-- REFERRAL SYSTEM FINAL CONSOLIDATED FIX
-- ====================================================

-- 1. Ensure Table Schema is Correct
DO $$ 
BEGIN 
    -- Profiles Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referral_code') THEN
        ALTER TABLE public.profiles ADD COLUMN referral_code TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='referred_by') THEN
        ALTER TABLE public.profiles ADD COLUMN referred_by UUID REFERENCES public.profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='free_swipes') THEN
        ALTER TABLE public.profiles ADD COLUMN free_swipes INTEGER DEFAULT 20;
    END IF;

    -- Transaction Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallet_transactions' AND column_name='unlocks_at') THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN unlocks_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Wallets Columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='pending_balance') THEN
        ALTER TABLE public.wallets ADD COLUMN pending_balance DECIMAL(12, 2) DEFAULT 0.00;
    END IF;
END $$;

-- 2. Ensure Referrals Table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'rewarded', 'completed')),
    reward_awarded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Function to process rewards when a referral is created
-- Awards 3 swipes immediately, and adds ₦500 to pending balance (30-day lock)
CREATE OR REPLACE FUNCTION public.process_referral_rewards()
RETURNS TRIGGER AS $$
DECLARE
    v_wallet_id UUID;
    v_referral_count INTEGER;
BEGIN
    -- 1. Award 3 free swipes to Referrer
    UPDATE public.profiles 
    SET free_swipes = COALESCE(free_swipes, 0) + 3
    WHERE id = NEW.referrer_id;

    -- 2. Award 20 free swipes to Referred User (if they don't have them)
    UPDATE public.profiles 
    SET free_swipes = GREATEST(COALESCE(free_swipes, 0), 20)
    WHERE id = NEW.referred_id;

    -- 3. Get Referrer's Wallet
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = NEW.referrer_id;

    IF v_wallet_id IS NOT NULL THEN
        -- 4. Create Pending Transaction for ₦500
        INSERT INTO public.wallet_transactions (
            user_id, wallet_id, type, amount, status, description, unlocks_at, reference_id
        ) VALUES (
            NEW.referrer_id,
            v_wallet_id,
            'referral_bonus',
            500.00,
            'pending',
            'Referral Reward (Locked 30 days)',
            now() + INTERVAL '30 days',
            'ref_' || NEW.referred_id
        );

        -- 5. Update Pending Balance
        UPDATE public.wallets 
        SET pending_balance = COALESCE(pending_balance, 0) + 500.00
        WHERE id = v_wallet_id;

        -- 6. Check for 10-Referral Milestone (₦3,000 bonus)
        SELECT COUNT(*) INTO v_referral_count 
        FROM public.referrals 
        WHERE referrer_id = NEW.referrer_id;

        IF v_referral_count > 0 AND (v_referral_count % 10) = 0 THEN
            INSERT INTO public.wallet_transactions (
                user_id, wallet_id, type, amount, status, description, unlocks_at, reference_id
            ) VALUES (
                NEW.referrer_id,
                v_wallet_id,
                'referral_bonus',
                3000.00,
                'pending',
                'Milestone Reward: 10 Referrals (Locked 30 days)',
                now() + INTERVAL '30 days',
                'milestone_' || v_referral_count || '_' || NEW.referrer_id
            );

            UPDATE public.wallets 
            SET pending_balance = COALESCE(pending_balance, 0) + 3000.00
            WHERE id = v_wallet_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger for rewards
DROP TRIGGER IF EXISTS tr_on_new_referral ON public.referrals;
CREATE TRIGGER tr_on_new_referral
    AFTER INSERT ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION public.process_referral_rewards();

-- 5. Function to Sync Referrals from Profile referred_by
-- This ensures that if a profile is created with referred_by, a referral row is made
CREATE OR REPLACE FUNCTION public.sync_referral_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referred_by IS NOT NULL THEN
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (NEW.referred_by, NEW.id, 'pending')
        ON CONFLICT (referred_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_referral ON public.profiles;
CREATE TRIGGER tr_sync_referral
    AFTER INSERT OR UPDATE OF referred_by ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_referral_from_profile();

-- 6. RPC to unlock matured rewards
CREATE OR REPLACE FUNCTION public.unlock_matured_rewards(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    rec RECORD;
    unlocked_total DECIMAL := 0;
BEGIN
    FOR rec IN 
        SELECT id, amount, wallet_id, user_id
        FROM public.wallet_transactions 
        WHERE user_id = p_user_id 
          AND status = 'pending' 
          AND type = 'referral_bonus'
          AND unlocks_at <= now()
    LOOP
        -- 1. Mark transaction as completed
        UPDATE public.wallet_transactions 
        SET status = 'completed', 
            unlocks_at = NULL, 
            description = REPLACE(description, '(Locked 30 days)', '(Unlocked)')
        WHERE id = rec.id;

        -- 2. Move funds from pending to available
        UPDATE public.wallets 
        SET pending_balance = GREATEST(COALESCE(pending_balance, 0) - rec.amount, 0),
            available_balance = COALESCE(available_balance, 0) + rec.amount,
            total_earned = COALESCE(total_earned, 0) + rec.amount,
            updated_at = now()
        WHERE id = rec.wallet_id;

        unlocked_total := unlocked_total + rec.amount;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'unlocked_amount', unlocked_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.unlock_matured_rewards(UUID) TO authenticated;
