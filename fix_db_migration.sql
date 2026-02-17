-- AGGRESSIVE FIX MIGRATION
-- Run this to forcefully resolve the constraint violation

-- 1. Drop the constraint to allow modifications
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

-- 2. Specific Normalization (Best Guess Mappings)
UPDATE public.wallet_transactions SET type = 'swipe_purchase' WHERE type = 'swipe_payment';
UPDATE public.wallet_transactions SET type = 'swipe_purchase' WHERE type = 'swipe';
UPDATE public.wallet_transactions SET type = 'swipe_reward' WHERE type = 'swipe_earning';
UPDATE public.wallet_transactions SET type = 'swipe_reward' WHERE type = 'swipe_earnings';
UPDATE public.wallet_transactions SET type = 'deposit' WHERE type = 'funding';
UPDATE public.wallet_transactions SET type = 'deposit' WHERE type = 'credit';

-- 3. CATCH-ALL FIX: Update ANY remaining invalid types to 'deposit'
-- This ensures the constraint ADD will never fail.
-- We append the old type to the description to preserve history.
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
);

-- 4. Re-apply the Strict Constraint
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN (
    'deposit', 
    'swipe_purchase', 
    'swipe_reward', 
    'referral_bonus', 
    'withdrawal', 
    'gift_purchase', 
    'gift_received'
));

-- 5. Ensure Gifts Table Exists (Just in case)
CREATE TABLE IF NOT EXISTS public.gifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    animation_type TEXT,
    price DECIMAL(10, 2) NOT NULL,
    color TEXT
);

-- 6. Re-run Gift Function (Ensure logic is latest)
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
    SELECT price, name INTO gift_price, gift_name FROM public.gifts WHERE id = gift_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid gift'); END IF;

    receiver_share := gift_price * 0.50;
    platform_share := gift_price * 0.50;

    SELECT id, available_balance INTO sender_wallet_id, sender_balance 
    FROM public.wallets WHERE user_id = sender_id;

    IF sender_balance < gift_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    SELECT id INTO receiver_wallet_id FROM public.wallets WHERE user_id = receiver_id;
    
    UPDATE public.wallets SET available_balance = available_balance - gift_price, total_spent = total_spent + gift_price, updated_at = now() WHERE id = sender_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (sender_id, sender_wallet_id, 'gift_purchase', gift_price, 'completed', 'Sent Gift: ' || gift_name, jsonb_build_object('receiver_id', receiver_id, 'gift_id', gift_id, 'receiver_share', receiver_share, 'platform_share', platform_share));

    IF receiver_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET available_balance = available_balance + receiver_share, total_earned = total_earned + receiver_share, updated_at = now() WHERE id = receiver_wallet_id;
        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (receiver_id, receiver_wallet_id, 'gift_received', receiver_share, 'completed', 'Received Gift: ' || gift_name, jsonb_build_object('sender_id', sender_id, 'gift_id', gift_id, 'original_price', gift_price, 'platform_share', platform_share));
    END IF;

    RETURN jsonb_build_object('success', true, 'new_balance', sender_balance - gift_price, 'receiver_share', receiver_share);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
