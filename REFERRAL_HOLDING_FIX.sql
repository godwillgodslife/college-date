-- ====================================================
-- REFERRAL FUND HOLDING IMPLEMENTATION (30-DAY LOCK)
-- ====================================================

-- 1. Extend wallet_transactions to support unlocking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallet_transactions' AND column_name='unlocks_at') THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN unlocks_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Update the Referral Milestone Trigger to use pending_balance and unlocks_at
CREATE OR REPLACE FUNCTION check_referral_milestones()
RETURNS TRIGGER AS $$
DECLARE
    referral_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO referral_count 
    FROM public.referrals 
    WHERE referrer_id = NEW.referrer_id;

    -- Milestone: 10 referrals (Wait for 30 Days!)
    IF referral_count = 10 THEN
        -- Create a pending transaction that unlocks 30 days from now
        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, reference_id, description, unlocks_at)
        SELECT 
            NEW.referrer_id, 
            w.id, 
            'referral_bonus', 
            3000.00, 
            'pending', -- Mark as pending
            'milestone_10_' || NEW.referrer_id,
            'Reward for 10 referrals (Unlocks in 30 days)',
            now() + INTERVAL '30 days' -- The Lockdown Period
        FROM public.wallets w 
        WHERE w.user_id = NEW.referrer_id;

        -- Update the pending balance, NOT the available balance
        UPDATE public.wallets 
        SET pending_balance = pending_balance + 3000.00
        WHERE user_id = NEW.referrer_id;
    END IF;

    -- Default reward: 3 free swipes
    UPDATE public.profiles 
    SET free_swipes = free_swipes + 3
    WHERE id = NEW.referrer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the Automatic Fund Sweeper RPC
-- This grabs any 'pending' transaction where 'unlocks_at' has passed, and moves the money to 'available_balance'
CREATE OR REPLACE FUNCTION process_pending_referral_funds(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    rec RECORD;
    unlocked_amount DECIMAL := 0;
BEGIN
    FOR rec IN 
        SELECT id, amount, wallet_id 
        FROM public.wallet_transactions 
        WHERE user_id = p_user_id 
          AND status = 'pending' 
          AND type = 'referral_bonus'
          AND unlocks_at <= now()
    LOOP
        -- 1. Mark transaction as completed and clear unlocks_at
        UPDATE public.wallet_transactions 
        SET status = 'completed', unlocks_at = NULL, description = 'Referral Reward (Unlocked)'
        WHERE id = rec.id;

        -- 2. Move funds from pending to available
        UPDATE public.wallets 
        SET pending_balance = GREATEST(pending_balance - rec.amount, 0), -- Defensive bound
            available_balance = available_balance + rec.amount,
            total_earned = total_earned + rec.amount,
            updated_at = now()
        WHERE id = rec.wallet_id;

        unlocked_amount := unlocked_amount + rec.amount;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'unlocked_total', unlocked_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
