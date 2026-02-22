-- REINTRODUCE FEATURES: Status, Snaps, Gifts
-- Run this in your Supabase SQL Editor

-- 1. STATUS UPDATES
CREATE TABLE IF NOT EXISTS public.status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'text')),
    caption TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public status view" ON public.status_updates
    FOR SELECT USING (expires_at > now());

CREATE POLICY "Users can post status" ON public.status_updates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own status" ON public.status_updates
    FOR DELETE USING (auth.uid() = user_id);

-- 2. DIRECT SNAPS (Private Disappearing Media)
CREATE TABLE IF NOT EXISTS public.direct_snaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened')),
    viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.direct_snaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see received snaps" ON public.direct_snaps
    FOR SELECT USING (auth.uid() = receiver_id);

CREATE POLICY "Users can see sent snaps" ON public.direct_snaps
    FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Users can send snaps" ON public.direct_snaps
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Update snap status (mark as opened)
CREATE POLICY "Users can update received snaps" ON public.direct_snaps
    FOR UPDATE USING (auth.uid() = receiver_id);

-- 3. GIFTS
CREATE TABLE IF NOT EXISTS public.gifts (
    id TEXT PRIMARY KEY, -- e.g. 'rose', 'zobo'
    name TEXT NOT NULL,
    emoji TEXT,
    animation_type TEXT, -- 'lottie', 'css', etc
    price DECIMAL(10, 2) NOT NULL,
    color TEXT
);

-- Seed basic gifts
INSERT INTO public.gifts (id, name, emoji, price, color, animation_type) VALUES
('rose', 'Digital Rose', '🌹', 200, '#f43f5e', 'bloom'),
('zobo', 'Cold Zobo', '🍷', 200, '#9d174d', 'splash'),
('suya', 'Hot Suya', '🍢', 500, '#ea580c', 'sizzle'),
('airtime', 'Airtime', '📱', 1000, '#2563eb', 'pulse'),
('l_time', 'L-Time', '⌛', 5000, '#ffd700', 'hourglass')
ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view gifts" ON public.gifts FOR SELECT USING (true);


-- 4. UPDATE WALLET TRANSACTIONS TYPE
-- We need to drop the constraint and add a new one to include 'gift_purchase'
DO $$
BEGIN
    ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
    ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
    CHECK (type IN ('deposit', 'swipe_purchase', 'swipe_reward', 'referral_bonus', 'withdrawal', 'gift_purchase', 'gift_received'));
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;


-- 5. FUNCTION TO PROCESS GIFT PURCHASE
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
    -- Get gift details
    SELECT price, name INTO v_gift_price, v_gift_name FROM public.gifts WHERE id = p_gift_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid gift: ' || p_gift_id);
    END IF;

    -- Get sender wallet
    SELECT id, available_balance INTO v_sender_wallet_id, v_sender_balance 
    FROM public.wallets WHERE user_id = p_sender_id;

    IF v_sender_balance IS NULL OR v_sender_balance < v_gift_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Current: ' || COALESCE(v_sender_balance, 0)::TEXT);
    END IF;

    -- Get receiver wallet (if any)
    SELECT id INTO v_receiver_wallet_id FROM public.wallets WHERE user_id = p_receiver_id;

    -- Deduct from Sender
    UPDATE public.wallets 
    SET available_balance = available_balance - v_gift_price,
        total_spent = total_spent + v_gift_price,
        updated_at = now()
    WHERE id = v_sender_wallet_id;

    -- Log transaction for Sender
    INSERT INTO public.wallet_transactions 
    (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES 
    (p_sender_id, v_sender_wallet_id, 'gift_purchase', v_gift_price, 'completed', 'Sent Gift: ' || v_gift_name, jsonb_build_object('receiver_id', p_receiver_id, 'gift_id', p_gift_id));

    -- Credit Receiver (50% value)
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
