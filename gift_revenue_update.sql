-- FINAL GIFT REVENUE UPDATE
-- Run this in Supabase SQL Editor

-- 1. Ensure GIFTS Table Exists
CREATE TABLE IF NOT EXISTS public.gifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    animation_type TEXT,
    price DECIMAL(10, 2) NOT NULL,
    color TEXT
);

-- 2. Enable RLS for Gifts
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view gifts" ON public.gifts;
CREATE POLICY "Everyone can view gifts" ON public.gifts FOR SELECT USING (true);

-- 3. Update Gift Inventory
DELETE FROM public.gifts;
INSERT INTO public.gifts (id, name, emoji, price, color, animation_type) VALUES
('digital_rules', 'Digital Rules', '📜', 200, '#64748b', 'slide'),
('code', 'Code', '💻', 500, '#22c55e', 'matrix'),
('zubo', 'Zubo', '🍷', 500, '#9d174d', 'splash'),
('hotsuya', 'Hotsuya', '🍢', 1000, '#ea580c', 'sizzle'),
('l_time', 'L-time', '⌛', 5000, '#ffd700', 'hourglass');

-- 4. Fix Wallet Transactions Constraints (AGGRESSIVE CLEANUP)
DO $$
BEGIN
    ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
    
    -- A. Specific Mapping (try to preserve intent)
    UPDATE public.wallet_transactions SET type = 'swipe_purchase' WHERE type IN ('swipe_payment', 'swipe');
    UPDATE public.wallet_transactions SET type = 'swipe_reward' WHERE type IN ('swipe_earning', 'swipe_earnings');
    UPDATE public.wallet_transactions SET type = 'deposit' WHERE type IN ('funding', 'credit');
    
    -- B. CATCH-ALL: Convert ANY remaining unknown types to 'deposit'
    -- This guarantees the constraint below will pass.
    UPDATE public.wallet_transactions 
    SET 
        description = COALESCE(description, '') || ' [Original Type: ' || type || ']',
        type = 'deposit'
    WHERE type NOT IN (
        'deposit', 
        'swipe_purchase', 
        'swipe_reward', 
        'referral_bonus', 
        'withdrawal', 
        'gift_purchase', 
        'gift_received'
    ) AND type IS NOT NULL; -- Ignore NULLs if allowed, or they will fail later if column is NOT NULL

    -- C. Apply the Strict Constraint
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
    CHECK (type IN ('deposit', 'swipe_purchase', 'swipe_reward', 'referral_bonus', 'withdrawal', 'gift_purchase', 'gift_received'));
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 5. Refined Transaction Logic (50/50 Split)
CREATE OR REPLACE FUNCTION process_gift_purchase(
    sender_id UUID,
    receiver_id UUID,
    gift_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    sender_wallet_id UUID;
    receiver_wallet_id UUID;
    gift_price DECIMAL;
    sender_balance DECIMAL;
    receiver_share DECIMAL;
    platform_share DECIMAL;
    gift_name TEXT;
BEGIN
    -- Get gift details
    SELECT price, name INTO gift_price, gift_name FROM public.gifts WHERE id = gift_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid gift');
    END IF;

    -- Calculate shares
    receiver_share := gift_price * 0.50;
    platform_share := gift_price * 0.50;

    -- Get sender wallet
    SELECT id, available_balance INTO sender_wallet_id, sender_balance 
    FROM public.wallets WHERE user_id = sender_id;

    IF sender_balance < gift_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Get receiver wallet
    SELECT id INTO receiver_wallet_id FROM public.wallets WHERE user_id = receiver_id;
    
    -- 1. Deduct from Sender
    UPDATE public.wallets 
    SET available_balance = available_balance - gift_price,
        total_spent = total_spent + gift_price,
        updated_at = now()
    WHERE id = sender_wallet_id;

    -- 2. Log Sender Transaction
    INSERT INTO public.wallet_transactions 
    (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES 
    (
        sender_id, 
        sender_wallet_id, 
        'gift_purchase', 
        gift_price, 
        'completed', 
        'Sent Gift: ' || gift_name, 
        jsonb_build_object(
            'receiver_id', receiver_id, 
            'gift_id', gift_id,
            'receiver_share', receiver_share,
            'platform_share', platform_share
        )
    );

    -- 3. Credit Receiver (50% Earnings)
    IF receiver_wallet_id IS NOT NULL THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + receiver_share,
            total_earned = total_earned + receiver_share,
            updated_at = now()
        WHERE id = receiver_wallet_id;

        -- 4. Log Receiver Transaction
        INSERT INTO public.wallet_transactions 
        (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES 
        (
            receiver_id, 
            receiver_wallet_id, 
            'gift_received', 
            receiver_share, 
            'completed', 
            'Received Gift: ' || gift_name, 
            jsonb_build_object(
                'sender_id', sender_id, 
                'gift_id', gift_id,
                'original_price', gift_price,
                'platform_share', platform_share
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', sender_balance - gift_price,
        'receiver_share', receiver_share
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
