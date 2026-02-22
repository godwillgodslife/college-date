-- ====================================================
-- FINAL GIFT SYSTEM SYNC & REPAIR
-- This script ensures the database matches the frontend perfectly
-- ====================================================

-- 1. SEED THE GIFTS TABLE WITH CORRECT IDS AND PRICES
-- This matches the JS code in GiftStore.jsx exactly.
INSERT INTO public.gifts (id, name, emoji, price, color, animation_type) VALUES
('rose', 'Digital Rose', '🌹', 200, '#f43f5e', 'bloom'),
('zubo', 'Cold Zobo', '🍷', 200, '#9d174d', 'splash'),
('suya', 'Hot Suya', '🍢', 500, '#ea580c', 'sizzle'),
('airtime', 'Airtime', '📱', 1000, '#2563eb', 'pulse'),
('l_time', 'L-Time', '⌛', 5000, '#ffd700', 'hourglass')
ON CONFLICT (id) DO UPDATE SET 
    price = EXCLUDED.price,
    name = EXCLUDED.name,
    emoji = EXCLUDED.emoji;

-- 2. ENSURE TRANSACTION TYPES ARE ALLOWED
DO $$
BEGIN
    ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
    CHECK (type IN ('deposit', 'swipe_purchase', 'swipe_reward', 'referral_bonus', 'withdrawal', 'gift_purchase', 'gift_received'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. REPAIR THE GIFT PURCHASE RPC (WITH 50% SPLIT LOGIC)
DROP FUNCTION IF EXISTS public.process_gift_purchase(uuid,uuid,text);

CREATE OR REPLACE FUNCTION process_gift_purchase(
    p_sender_id UUID,
    p_receiver_id UUID,
    p_gift_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_sender_wallet_id UUID;
    v_receiver_wallet_id UUID;
    v_gift_price DECIMAL;
    v_gift_name TEXT;
    v_sender_balance DECIMAL;
BEGIN
    -- 1. Get gift details
    SELECT price, name INTO v_gift_price, v_gift_name FROM public.gifts WHERE id = p_gift_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid gift: ' || p_gift_id);
    END IF;

    -- 2. Get sender wallet
    SELECT id, available_balance INTO v_sender_wallet_id, v_sender_balance 
    FROM public.wallets WHERE user_id = p_sender_id;

    IF v_sender_balance IS NULL OR v_sender_balance < v_gift_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Current: ' || COALESCE(v_sender_balance, 0)::TEXT);
    END IF;

    -- 3. Get receiver wallet
    SELECT id INTO v_receiver_wallet_id FROM public.wallets WHERE user_id = p_receiver_id;

    -- 4. Deduct from Sender
    UPDATE public.wallets 
    SET available_balance = available_balance - v_gift_price,
        total_spent = total_spent + v_gift_price,
        updated_at = now()
    WHERE id = v_sender_wallet_id;

    -- 5. Log transaction for Sender
    INSERT INTO public.wallet_transactions 
    (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES 
    (p_sender_id, v_sender_wallet_id, 'gift_purchase', v_gift_price, 'completed', 'Sent Gift: ' || v_gift_name, jsonb_build_object('receiver_id', p_receiver_id, 'gift_id', p_gift_id));

    -- 6. Credit Receiver (50% value)
    IF v_receiver_wallet_id IS NOT NULL THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + (v_gift_price * 0.5),
            total_earned = total_earned + (v_gift_price * 0.5),
            updated_at = now()
        WHERE id = v_receiver_wallet_id;

        INSERT INTO public.wallet_transactions 
        (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES 
        (p_receiver_id, v_receiver_wallet_id, 'gift_received', (v_gift_price * 0.5), 'completed', 'Received Gift: ' || v_gift_name, jsonb_build_object('sender_id', p_sender_id, 'gift_id', p_gift_id));
    END IF;

    RETURN jsonb_build_object('success', true, 'new_balance', v_sender_balance - v_gift_price);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
