-- ==============================================
-- FREE SWIPE ECONOMY & EXPLOIT FIX
-- ==============================================

-- 1. ADAPT SCHEMA: Track free swipes securely
ALTER TABLE public.swipes ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;

-- 2. UPDATE PAYMENT RPC: Flag free transactions natively
CREATE OR REPLACE FUNCTION public.process_swipe_payment(
    p_swiper_id UUID,
    p_swiped_id UUID,
    p_swipe_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    cost DECIMAL;
    swiper_wallet_id UUID;
    swiper_balance DECIMAL;
    has_free_swipe BOOLEAN := false;
BEGIN
    -- Set costs
    IF p_swipe_type = 'premium' THEN
        cost := 5000.00;
    ELSE
        cost := 500.00;
    END IF;

    -- Check for free swipes on standard requests
    IF p_swipe_type = 'standard' THEN
        UPDATE public.profiles 
        SET free_swipes = free_swipes - 1
        WHERE id = p_swiper_id AND free_swipes > 0
        RETURNING true INTO has_free_swipe;
        
        IF has_free_swipe THEN
            -- CRITICAL FIX: Mark this connection attempt as unpaid 
            -- so the recipient doesn't get free money on acceptance
            UPDATE public.swipes 
            SET is_free = true 
            WHERE swiper_id = p_swiper_id AND swiped_id = p_swiped_id AND status = 'pending';
            
            RETURN jsonb_build_object('success', true, 'type', 'free');
        END IF;
    END IF;

    -- PAID Logic
    SELECT id, available_balance INTO swiper_wallet_id, swiper_balance 
    FROM public.wallets WHERE user_id = p_swiper_id;
    
    IF swiper_balance < cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Deduct from Swiper
    UPDATE public.wallets 
    SET available_balance = available_balance - cost,
        total_spent = total_spent + cost,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (p_swiper_id, swiper_wallet_id, 'swipe_purchase', cost, 'completed', 
            UPPER(p_swipe_type) || ' Swipe Request', jsonb_build_object('target_id', p_swiped_id, 'swipe_type', p_swipe_type));

    RETURN jsonb_build_object('success', true, 'type', 'paid', 'amount', cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. UPDATE ACCEPTANCE RPC: Neutralize rewards for free interactions
CREATE OR REPLACE FUNCTION public.accept_swipe_request(p_swipe_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_swiper_id UUID;
    v_swiped_id UUID;
    v_swipe_type TEXT;
    v_is_free BOOLEAN;
    v_reward DECIMAL;
    v_swiped_wallet_id UUID;
    v_match_id UUID;
BEGIN
    -- 1. Get swipe details including the new is_free flag
    SELECT swiper_id, swiped_id, type, COALESCE(is_free, false) 
    INTO v_swiper_id, v_swiped_id, v_swipe_type, v_is_free
    FROM public.swipes
    WHERE id = p_swipe_id AND status = 'pending' AND swiped_id = auth.uid();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found or unauthorized');
    END IF;

    -- 2. Calculate Reward
    IF v_swipe_type = 'premium' THEN
        v_reward := 2500.00;
    ELSIF v_swipe_type = 'standard' AND v_is_free = false THEN
        v_reward := 250.00;
    ELSE
        -- Free swipes generate 0 money. Stops fake inflation immediately.
        v_reward := 0.00;
    END IF;

    -- 3. Update Swipe Status
    UPDATE public.swipes SET status = 'accepted' WHERE id = p_swipe_id;

    -- 4. Credit Recipient (Wallet Reward)
    SELECT id INTO v_swiped_wallet_id FROM public.wallets WHERE user_id = v_swiped_id;
    
    IF v_swiped_wallet_id IS NOT NULL AND v_reward > 0 THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + v_reward,
            total_earned = total_earned + v_reward,
            updated_at = now()
        WHERE id = v_swiped_wallet_id;

        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (v_swiped_id, v_swiped_wallet_id, 'swipe_reward', v_reward, 'completed', 
                'Earning from ' || UPPER(v_swipe_type) || ' Swipe', jsonb_build_object('swiper_id', v_swiper_id, 'swipe_type', v_swipe_type));
    END IF;

    -- 5. Create Match
    INSERT INTO public.matches (user1_id, user2_id, user_ids)
    VALUES (
        LEAST(v_swiper_id, v_swiped_id),
        GREATEST(v_swiper_id, v_swiped_id),
        ARRAY[v_swiper_id, v_swiped_id]
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
        SELECT id INTO v_match_id FROM public.matches 
        WHERE user1_id = LEAST(v_swiper_id, v_swiped_id) AND user2_id = GREATEST(v_swiper_id, v_swiped_id);
    END IF;

    -- 6. Notify Swiper
    PERFORM public.notify_internally(
        v_swiper_id,
        v_swiped_id,
        'swipe_accepted',
        'It''s a Match!',
        'Your connection request was accepted! You can now start chatting.',
        jsonb_build_object('match_id', v_match_id)
    );

    -- 7. Notify Swiped
    PERFORM public.notify_internally(
        v_swiped_id,
        v_swiper_id,
        'swipe_accepted',
        'It''s a Match!',
        'You accepted the request! You can now start chatting.',
        jsonb_build_object('match_id', v_match_id)
    );

    RETURN jsonb_build_object('success', true, 'match_id', v_match_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
