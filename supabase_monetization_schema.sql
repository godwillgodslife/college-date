-- ====================================================
-- PHASE 2: PRODUCTION-GRADE FINANCIAL LEDGER
-- ====================================================

-- 1. Extend PROFILES for role-based metadata
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('Male', 'Female')),
ADD COLUMN IF NOT EXISTS free_swipes INTEGER DEFAULT 0;

-- 2. WALLETS Table (Accounting Layer)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    available_balance DECIMAL(12, 2) DEFAULT 0.00,
    pending_balance DECIMAL(12, 2) DEFAULT 0.00,
    total_earned DECIMAL(12, 2) DEFAULT 0.00,
    total_spent DECIMAL(12, 2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'NGN',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. WALLET_TRANSACTIONS Table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('deposit', 'swipe_purchase', 'swipe_reward', 'referral_bonus', 'withdrawal')),
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    reference_id TEXT UNIQUE, -- Flutterwave or internal ref
    description TEXT,
    metadata JSONB, -- For storing swipe IDs or referred user IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. REFERRALS Table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    reward_type TEXT DEFAULT 'free_swipes' CHECK (reward_type IN ('free_swipes', 'cash_bonus')),
    reward_amount DECIMAL(12, 2) DEFAULT 3.00,
    is_milestone BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. WITHDRAWALS Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    type TEXT CHECK (type IN ('referral', 'swipe_earnings')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    bank_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT min_withdrawal_referral CHECK (type <> 'referral' OR amount >= 10000),
    CONSTRAINT min_withdrawal_swipe CHECK (type <> 'swipe_earnings' OR amount >= 15000)
);

-- ====================================================
-- RLS POLICIES (Security Layer)
-- ====================================================

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.wallet_transactions;
DROP POLICY IF EXISTS "Users can view their own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can request withdrawals" ON public.withdrawals;

-- Wallets: View only
CREATE POLICY "Users can view their own wallet" ON public.wallets
FOR SELECT USING (auth.uid() = user_id);

-- Transactions: View only
CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
FOR SELECT USING (auth.uid() = user_id);

-- Withdrawals: View & Create, but not Update
CREATE POLICY "Users can view their own withdrawals" ON public.withdrawals
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can request withdrawals" ON public.withdrawals
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ====================================================
-- TRIGGERS & FUNCTIONS (Atomic Logic)
-- ====================================================

-- Function to handle Referral Milestones (10 referrals = 3,000 NGN)
CREATE OR REPLACE FUNCTION check_referral_milestones()
RETURNS TRIGGER AS $$
DECLARE
    referral_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO referral_count 
    FROM public.referrals 
    WHERE referrer_id = NEW.referrer_id;

    -- Milestone: 10 referrals
    IF referral_count = 10 THEN
        -- Create a bonus transaction
        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, reference_id, description)
        SELECT 
            NEW.referrer_id, 
            w.id, 
            'referral_bonus', 
            3000.00, 
            'completed', 
            'milestone_10_' || NEW.referrer_id,
            'Reward for 10 referrals'
        FROM public.wallets w 
        WHERE w.user_id = NEW.referrer_id;

        -- Update balance
        UPDATE public.wallets 
        SET available_balance = available_balance + 3000.00
        WHERE user_id = NEW.referrer_id;
    END IF;

    -- Default reward: 3 free swipes
    UPDATE public.profiles 
    SET free_swipes = free_swipes + 3
    WHERE id = NEW.referrer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_referral ON public.referrals;
CREATE TRIGGER on_new_referral
    AFTER INSERT ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION check_referral_milestones();

-- Atomic function to process swipe payment
-- Splits: 500 NGN cost -> 250 girl, 250 platform
CREATE OR REPLACE FUNCTION process_swipe_payment(
    swiper_id UUID,
    swiped_id UUID,
    is_free BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    swiper_wallet_id UUID;
    swiped_wallet_id UUID;
    swiper_balance DECIMAL;
    swiped_role TEXT;
    tx_id UUID;
BEGIN
    -- 1. Check if it's a free swipe
    IF is_free THEN
        UPDATE public.profiles 
        SET free_swipes = free_swipes - 1
        WHERE id = swiper_id AND free_swipes > 0;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'No free swipes available');
        END IF;
        
        RETURN jsonb_build_object('success', true, 'type', 'free');
    END IF;

    -- 2. PAID Swipe Logic
    -- Get swiper wallet
    SELECT id, available_balance INTO swiper_wallet_id, swiper_balance 
    FROM public.wallets WHERE user_id = swiper_id;
    
    IF swiper_balance < 500 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Get swiped user role
    SELECT role INTO swiped_role FROM public.profiles WHERE id = swiped_id;
    SELECT id INTO swiped_wallet_id FROM public.wallets WHERE user_id = swiped_id;

    -- Update Swiper (Deduct 500)
    UPDATE public.wallets 
    SET available_balance = available_balance - 500,
        total_spent = total_spent + 500,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    -- Log Swiper Transaction
    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (swiper_id, swiper_wallet_id, 'swipe_purchase', 500, 'completed', 'Paid Swipe', jsonb_build_object('target_id', swiped_id));

    -- If Female, Update Recipient (Credit 250)
    IF swiped_role = 'Female' AND swiped_wallet_id IS NOT NULL THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + 250,
            total_earned = total_earned + 250,
            updated_at = now()
        WHERE id = swiped_wallet_id;

        -- Log Recipient Transaction
        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (swiped_id, swiped_wallet_id, 'swipe_reward', 250, 'completed', 'Swipe Earning', jsonb_build_object('swiper_id', swiper_id));
    END IF;

    RETURN jsonb_build_object('success', true, 'type', 'paid');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- INITIALIZATION logic
-- ====================================================

-- Ensure every user has a wallet
INSERT INTO public.wallets (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
