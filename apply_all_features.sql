-- ====================================================
-- CONSOLIDATED FEATURE DEPLOYMENT: Status, Snap, Gifts
-- This script safely creates all tables, fixes constraints, 
-- and initializes the Digital Gifts system.
-- ====================================================

-- 1. STATUS UPDATES (24-hour stories)
CREATE TABLE IF NOT EXISTS public.status_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'text')),
    caption TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS for Status
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public status view" ON public.status_updates;
DROP POLICY IF EXISTS "Users can post status" ON public.status_updates;
DROP POLICY IF EXISTS "Users can delete own status" ON public.status_updates;
CREATE POLICY "Public status view" ON public.status_updates FOR SELECT USING (expires_at > now());
CREATE POLICY "Users can post status" ON public.status_updates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own status" ON public.status_updates FOR DELETE USING (auth.uid() = user_id);

-- 2. DIRECT SNAPS (Private disappearing media)
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

-- RLS for Snaps
ALTER TABLE public.direct_snaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see received snaps" ON public.direct_snaps;
DROP POLICY IF EXISTS "Users can see sent snaps" ON public.direct_snaps;
DROP POLICY IF EXISTS "Users can send snaps" ON public.direct_snaps;
DROP POLICY IF EXISTS "Users can update received snaps" ON public.direct_snaps;
CREATE POLICY "Users can see received snaps" ON public.direct_snaps FOR SELECT USING (auth.uid() = receiver_id);
CREATE POLICY "Users can see sent snaps" ON public.direct_snaps FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Users can send snaps" ON public.direct_snaps FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update received snaps" ON public.direct_snaps FOR UPDATE USING (auth.uid() = receiver_id);

-- 3. GIFTS (Catalog & Inventory)
CREATE TABLE IF NOT EXISTS public.gifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    animation_type TEXT,
    price DECIMAL(10, 2) NOT NULL,
    color TEXT
);

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Everyone can view gifts" ON public.gifts;
CREATE POLICY "Everyone can view gifts" ON public.gifts FOR SELECT USING (true);

-- Seed Gift Inventory
DELETE FROM public.gifts;
INSERT INTO public.gifts (id, name, emoji, price, color, animation_type) VALUES
('digital_rules', 'Digital Rules', '📜', 200, '#64748b', 'slide'),
('code', 'Code', '💻', 500, '#22c55e', 'matrix'),
('zubo', 'Zubo', '🍷', 500, '#9d174d', 'splash'),
('hotsuya', 'Hotsuya', '🍢', 1000, '#ea580c', 'sizzle'),
('l_time', 'L-time', '⌛', 5000, '#ffd700', 'hourglass');

-- 4. TRANSACTION CONSTRAINT FIX (Aggressive Cleanup)
DO $$
BEGIN
    ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;
    
    -- Normalize existing data to match new required types
    UPDATE public.wallet_transactions SET type = 'swipe_purchase' WHERE type IN ('swipe_payment', 'swipe');
    UPDATE public.wallet_transactions SET type = 'swipe_reward' WHERE type IN ('swipe_earning', 'swipe_earnings');
    UPDATE public.wallet_transactions SET type = 'deposit' WHERE type IN ('funding', 'credit');
    
    -- Force any unknown types to 'deposit' to prevent migration failure
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
    ) AND type IS NOT NULL;

    -- Re-apply strict constraint
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
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- 5. UNIFIED GIFT PURCHASE RPC (50/50 Split)
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
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Invalid gift'); END IF;

    -- Split logic (50% to user, 50% to platform)
    receiver_share := gift_price * 0.50;
    platform_share := gift_price * 0.50;

    -- Wallets
    SELECT id, available_balance INTO sender_wallet_id, sender_balance FROM public.wallets WHERE user_id = sender_id;
    IF sender_balance < gift_price THEN RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance'); END IF;
    SELECT id INTO receiver_wallet_id FROM public.wallets WHERE user_id = receiver_id;
    
    -- Deduct from Sender
    UPDATE public.wallets SET available_balance = available_balance - gift_price, total_spent = total_spent + gift_price, updated_at = now() WHERE id = sender_wallet_id;

    -- Log Sender
    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (sender_id, sender_wallet_id, 'gift_purchase', gift_price, 'completed', 'Sent Gift: ' || gift_name, 
    jsonb_build_object('receiver_id', receiver_id, 'gift_id', gift_id, 'receiver_share', receiver_share, 'platform_share', platform_share));

    -- Credit Receiver
    IF receiver_wallet_id IS NOT NULL THEN
        UPDATE public.wallets SET available_balance = available_balance + receiver_share, total_earned = total_earned + receiver_share, updated_at = now() WHERE id = receiver_wallet_id;
        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (receiver_id, receiver_wallet_id, 'gift_received', receiver_share, 'completed', 'Received Gift: ' || gift_name, 
        jsonb_build_object('sender_id', sender_id, 'gift_id', gift_id, 'original_price', gift_price, 'platform_share', platform_share));
    END IF;

    RETURN jsonb_build_object('success', true, 'new_balance', sender_balance - gift_price, 'receiver_share', receiver_share);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
