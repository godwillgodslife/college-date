-- 1. Drop Duplicate Triggers on profiles
DROP TRIGGER IF EXISTS on_referred_profile_created ON public.profiles;
DROP TRIGGER IF EXISTS on_referred_profile_updated ON public.profiles;

-- 2. Drop Redundant Trigger Function
DROP FUNCTION IF EXISTS public.handle_referral_on_signup();

-- 3. Update process_referral_rewards to set pending_maturity_date
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

    -- 2. Award 20 free swipes to Referred User
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

        -- 5. Update Pending Balance & Maturity Date
        UPDATE public.wallets 
        SET pending_balance = COALESCE(pending_balance, 0) + 500.00,
            pending_maturity_date = CASE
                WHEN pending_maturity_date IS NULL OR pending_maturity_date < now()
                THEN now() + INTERVAL '30 days'
                ELSE pending_maturity_date
            END,
            updated_at = now()
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
            SET pending_balance = COALESCE(pending_balance, 0) + 3000.00,
                pending_maturity_date = now() + INTERVAL '30 days',
                updated_at = now()
            WHERE id = v_wallet_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger to auto-generate referral code on profiles BEFORE INSERT
DROP TRIGGER IF EXISTS on_profile_created_referral ON public.profiles;
CREATE TRIGGER on_profile_created_referral
    BEFORE INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION handle_new_profile_referral();
