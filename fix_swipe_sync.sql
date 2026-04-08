-- ==========================================================
-- SWIPE SYNCHRONIZATION AND LIMIT FIX
-- Fixes the Dual-State Bug causing the UI to show 20 swipes
-- but failing on the backend.
-- ==========================================================

-- 1. Ensure `check_and_reset_swipe_limit` is perfectly aligned
DROP FUNCTION IF EXISTS check_and_reset_swipe_limit(UUID);
CREATE OR REPLACE FUNCTION check_and_reset_swipe_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_used INTEGER;
    v_last_reset TIMESTAMP WITH TIME ZONE;
    v_max INTEGER := 20; -- Global max free swipes per day
BEGIN
    SELECT swipes_used, last_reset INTO v_used, v_last_reset
    FROM public.swipe_limits
    WHERE user_id = p_user_id;
    
    -- If no record exists, create one
    IF v_used IS NULL THEN
        INSERT INTO public.swipe_limits (user_id, swipes_used, last_reset)
        VALUES (p_user_id, 0, now())
        ON CONFLICT (user_id) DO NOTHING;
        
        v_used := 0;
        v_last_reset := now();
    END IF;

    -- Reset logic (past 24 hours)
    IF v_last_reset < now() - INTERVAL '24 hours' THEN
        UPDATE public.swipe_limits
        SET swipes_used = 0, last_reset = now()
        WHERE user_id = p_user_id;
        
        v_used := 0;
    END IF;

    RETURN jsonb_build_object(
        'can_swipe', COALESCE(v_used, 0) < v_max,
        'used_count', COALESCE(v_used, 0),
        'max_count', v_max
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. REWRITE the payment processor to USE `swipe_limits` 
--    instead of `profiles.free_swipes`.
DROP FUNCTION IF EXISTS process_swipe_payment(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION process_swipe_payment(
    p_swiper_id UUID,
    p_swiped_id UUID,
    p_swipe_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    cost DECIMAL;
    reward DECIMAL;
    swiper_wallet_id UUID;
    swiped_wallet_id UUID;
    swiper_balance DECIMAL;
    swiped_role TEXT;
    is_free_swipe BOOLEAN := false;
    current_swipes_used INTEGER;
BEGIN
    -- 1. Set costs and rewards (50/50 Split)
    IF p_swipe_type = 'premium' THEN
        cost := 5000.00;
        reward := 2500.00;
    ELSE
        cost := 500.00;
        reward := 250.00;
    END IF;

    -- 2. UNIFIED FREE SWIPE LOGIC (using swipe_limits table)
    IF p_swipe_type = 'standard' THEN
        -- Run the reset check immediately before processing
        PERFORM check_and_reset_swipe_limit(p_swiper_id);

        SELECT swipes_used INTO current_swipes_used
        FROM public.swipe_limits
        WHERE user_id = p_swiper_id;

        IF current_swipes_used < 20 THEN
            -- Free swipe granted! Increment the usage
            UPDATE public.swipe_limits 
            SET swipes_used = swipes_used + 1
            WHERE user_id = p_swiper_id;
            
            -- Optional: Keep profiles.free_swipes in sync for fallback
            UPDATE public.profiles 
            SET free_swipes = GREATEST(0, 20 - (current_swipes_used + 1))
            WHERE id = p_swiper_id;

            RETURN jsonb_build_object('success', true, 'type', 'free');
        END IF;
    END IF;

    -- 3. PAID Logic: Swiper Deduction
    SELECT id, available_balance INTO swiper_wallet_id, swiper_balance 
    FROM public.wallets WHERE user_id = p_swiper_id;
    
    IF swiper_wallet_id IS NULL OR swiper_balance < cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Need ₦' || cost);
    END IF;

    -- 4. Get recipient Info
    SELECT role INTO swiped_role FROM public.profiles WHERE id = p_swiped_id;
    SELECT id INTO swiped_wallet_id FROM public.wallets WHERE user_id = p_swiped_id;

    -- 5. Deduct from Swiper
    UPDATE public.wallets 
    SET available_balance = available_balance - cost,
        total_spent = total_spent + cost,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (p_swiper_id, swiper_wallet_id, 'swipe_purchase', cost, 'completed', 
            UPPER(p_swipe_type) || ' Swipe Request', jsonb_build_object('target_id', p_swiped_id, 'swipe_type', p_swipe_type));

    -- 6. Credit Recipient (50% Split) - Specifically for 'Female' role
    IF swiped_wallet_id IS NOT NULL AND swiped_role = 'Female' THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + reward,
            total_earned = total_earned + reward,
            updated_at = now()
        WHERE id = swiped_wallet_id;

        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (p_swiped_id, swiped_wallet_id, 'earning', reward, 'completed', 
                'Earning from ' || UPPER(p_swipe_type) || ' Swipe', 
                jsonb_build_object('swiper_id', p_swiper_id, 'swipe_type', p_swipe_type, 'share_percentage', 50));
    END IF;

    RETURN jsonb_build_object('success', true, 'type', 'paid', 'amount', cost, 'recipient_reward', reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
