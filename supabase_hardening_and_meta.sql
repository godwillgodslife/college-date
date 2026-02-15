-- ====================================================
-- ECOSYSTEM HARDENING & PREMIUM ENHANCEMENT
-- ====================================================

-- 1. Secure SWIPES Table
-- Prevent duplicate swipes to the same person (and duplicate charges)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_swipe_idx 
ON public.swipes (swiper_id, swiped_id) 
WHERE status != 'declined'; -- Allow re-swiping if previously declined (optional design choice)

-- 2. Add Message Teasers for Premium Engagement
ALTER TABLE public.swipes 
ADD COLUMN IF NOT EXISTS message_teaser TEXT;

-- 3. Hardened process_swipe_payment (Atomic Checks & Race Condition Prevention)
CREATE OR REPLACE FUNCTION process_swipe_payment(
    swiper_id UUID,
    swiped_id UUID,
    swipe_type TEXT -- 'standard' or 'premium'
)
RETURNS JSONB AS $$
DECLARE
    cost DECIMAL;
    reward DECIMAL;
    swiper_wallet_id UUID;
    swiped_wallet_id UUID;
    swiper_balance DECIMAL;
    is_free_swipe BOOLEAN := false;
BEGIN
    -- Set costs based on type
    IF swipe_type = 'premium' THEN
        cost := 5000.00;
        reward := 2500.00;
    ELSE
        cost := 500.00;
        reward := 250.00;
    END IF;

    -- 1. ATOMIC CHECK: Check if an active swipe already exists (Double-Spend Prevention)
    IF EXISTS (
        SELECT 1 FROM public.swipes 
        WHERE swiper_id = process_swipe_payment.swiper_id 
        AND swiped_id = process_swipe_payment.swiped_id 
        AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You already have a pending request for this user.');
    END IF;

    -- 2. Check for free swipes (only for standard)
    IF swipe_type = 'standard' THEN
        UPDATE public.profiles 
        SET free_swipes = free_swipes - 1
        WHERE id = swiper_id AND free_swipes > 0
        RETURNING true INTO is_free_swipe;
        
        IF is_free_swipe THEN
            RETURN jsonb_build_object('success', true, 'type', 'free');
        END IF;
    END IF;

    -- 3. PAID Logic with ROW LOCKING
    -- Select for update prevents concurrent transactions from reading/updating the same wallet
    SELECT id, available_balance INTO swiper_wallet_id, swiper_balance 
    FROM public.wallets 
    WHERE user_id = swiper_id
    FOR UPDATE;
    
    IF swiper_balance < cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Need ₦' || cost);
    END IF;

    -- Get recipient info
    SELECT id INTO swiped_wallet_id FROM public.wallets WHERE user_id = swiped_id;

    -- Deduct from Swiper
    UPDATE public.wallets 
    SET available_balance = available_balance - cost,
        total_spent = total_spent + cost,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (swiper_id, swiper_wallet_id, 'swipe_purchase', cost, 'completed', 
            UPPER(swipe_type) || ' Swipe Request', jsonb_build_object('target_id', swiped_id, 'swipe_type', swipe_type));

    -- Credit Recipient (50% Split) - Handled separately if exists
    IF swiped_wallet_id IS NOT NULL THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + reward,
            total_earned = total_earned + reward,
            updated_at = now()
        WHERE id = swiped_wallet_id;

        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (swiped_id, swiped_wallet_id, 'swipe_reward', reward, 'completed', 
                'Earning from ' || UPPER(swipe_type) || ' Swipe', jsonb_build_object('swiper_id', swiper_id, 'swipe_type', swipe_type));
    END IF;

    RETURN jsonb_build_object('success', true, 'type', 'paid', 'amount', cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Authorized accept_swipe_request
CREATE OR REPLACE FUNCTION accept_swipe_request(
    swipe_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_swiper_id UUID;
    v_swiped_id UUID;
    v_match_id UUID;
    v_caller_id UUID := auth.uid();
BEGIN
    -- CRITICAL FIX: Only the targeted user can accept the request
    SELECT swiper_id, swiped_id INTO v_swiper_id, v_swiped_id
    FROM public.swipes
    WHERE id = swipe_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

    -- Authorization Guard
    IF v_swiped_id != v_caller_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You are not the recipient of this request');
    END IF;

    -- 2. Update Swipe Status
    UPDATE public.swipes SET status = 'accepted' WHERE id = swipe_id;

    -- 3. Create persistent match entry
    INSERT INTO public.matches (user1_id, user2_id, user_ids)
    VALUES (LEAST(v_swiper_id, v_swiped_id), GREATEST(v_swiper_id, v_swiped_id), ARRAY[v_swiper_id, v_swiped_id])
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
        SELECT id INTO v_match_id FROM public.matches 
        WHERE user1_id = LEAST(v_swiper_id, v_swiped_id) AND user2_id = GREATEST(v_swiper_id, v_swiped_id);
    END IF;

    RETURN jsonb_build_object('success', true, 'match_id', v_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
