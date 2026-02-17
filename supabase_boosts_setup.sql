-- ====================================================
-- BOOSTS SETUP: RLS + RPC Functions
-- ====================================================
-- Run this in Supabase SQL Editor

-- ====================================================
-- 1. RLS POLICIES FOR BOOSTS TABLE
-- ====================================================
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;

-- Users can view their own boosts
DROP POLICY IF EXISTS "Users can view their own boosts" ON public.boosts;
CREATE POLICY "Users can view their own boosts" ON public.boosts
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own boosts (via RPC is preferred, but needed as fallback)
DROP POLICY IF EXISTS "Users can insert their own boosts" ON public.boosts;
CREATE POLICY "Users can insert their own boosts" ON public.boosts
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own boosts (for marking super swipes as used)
DROP POLICY IF EXISTS "Users can update their own boosts" ON public.boosts;
CREATE POLICY "Users can update their own boosts" ON public.boosts
FOR UPDATE USING (auth.uid() = user_id);

-- ====================================================
-- 2. PURCHASE BOOST RPC (Atomic Transaction)
-- ====================================================
CREATE OR REPLACE FUNCTION purchase_boost(
    p_user_id UUID,
    p_boost_type TEXT  -- '24h_boost' or 'super_swipe'
)
RETURNS JSONB AS $$
DECLARE
    v_cost DECIMAL;
    v_wallet_id UUID;
    v_balance DECIMAL;
    v_multiplier DECIMAL;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_description TEXT;
    v_boost_id UUID;
BEGIN
    -- 1. Determine cost and parameters
    IF p_boost_type = '24h_boost' THEN
        v_cost := 1000.00;
        v_multiplier := 2.0;
        v_expires_at := now() + INTERVAL '24 hours';
        v_description := '24h Visibility Boost';
    ELSIF p_boost_type = 'super_swipe' THEN
        v_cost := 500.00;
        v_multiplier := 1.0;
        v_expires_at := now() + INTERVAL '30 days'; -- Super swipes expire in 30 days if unused
        v_description := 'Super Swipe Credit';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid boost type');
    END IF;

    -- 2. Get wallet and check balance
    SELECT id, available_balance INTO v_wallet_id, v_balance
    FROM public.wallets WHERE user_id = p_user_id;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
    END IF;

    IF v_balance < v_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Need ₦' || v_cost || ', have ₦' || v_balance);
    END IF;

    -- 3. Deduct from wallet
    UPDATE public.wallets
    SET available_balance = available_balance - v_cost,
        total_spent = total_spent + v_cost,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- 4. Create the boost
    INSERT INTO public.boosts (user_id, type, expires_at, multiplier)
    VALUES (p_user_id, p_boost_type, v_expires_at, v_multiplier)
    RETURNING id INTO v_boost_id;

    -- 5. Log the transaction
    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (
        p_user_id,
        v_wallet_id,
        'payment',
        v_cost,
        'completed',
        v_description,
        jsonb_build_object('boost_id', v_boost_id, 'boost_type', p_boost_type)
    );

    RETURN jsonb_build_object(
        'success', true,
        'boost_id', v_boost_id,
        'boost_type', p_boost_type,
        'expires_at', v_expires_at,
        'amount_charged', v_cost
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- 3. USE SUPER SWIPE RPC (Consume one credit)
-- ====================================================
CREATE OR REPLACE FUNCTION use_super_swipe(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_boost_id UUID;
BEGIN
    -- Find the oldest available (unused, unexpired) super swipe
    SELECT id INTO v_boost_id
    FROM public.boosts
    WHERE user_id = p_user_id
      AND type = 'super_swipe'
      AND expires_at > now()
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_boost_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No super swipe credits available');
    END IF;

    -- Mark as used by setting expires_at to now
    UPDATE public.boosts
    SET expires_at = now()
    WHERE id = v_boost_id;

    RETURN jsonb_build_object('success', true, 'used_boost_id', v_boost_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================
-- DONE! Now run the frontend code updates.
-- ====================================================
