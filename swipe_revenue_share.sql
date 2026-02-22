-- ====================================================
-- PHASE 3: PREMIUM SWIPE REVENUE SHARING (50/50)
-- ====================================================

CREATE OR REPLACE FUNCTION process_swipe_payment(
    swiper_id UUID,
    swiped_id UUID,
    swipe_type TEXT
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
BEGIN
    -- 1. Set costs and rewards (50/50 Split)
    IF swipe_type = 'premium' THEN
        cost := 5000.00;
        reward := 2500.00;
    ELSE
        cost := 500.00;
        reward := 250.00;
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

    -- 3. PAID Logic: Swiper Deduction
    SELECT id, available_balance INTO swiper_wallet_id, swiper_balance 
    FROM public.wallets WHERE user_id = swiper_id;
    
    IF swiper_balance < cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Need ₦' || cost);
    END IF;

    -- 4. Get recipient Info
    SELECT role INTO swiped_role FROM public.profiles WHERE id = swiped_id;
    SELECT id INTO swiped_wallet_id FROM public.wallets WHERE user_id = swiped_id;

    -- 5. Deduct from Swiper
    UPDATE public.wallets 
    SET available_balance = available_balance - cost,
        total_spent = total_spent + cost,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (swiper_id, swiper_wallet_id, 'swipe_purchase', cost, 'completed', 
            UPPER(swipe_type) || ' Swipe Request', jsonb_build_object('target_id', swiped_id, 'swipe_type', swipe_type));

    -- 6. Credit Recipient (50% Split) - Specifically for 'Female' role as per business model
    -- If swiped_role = 'Female' AND swiped_wallet_id IS NOT NULL THEN
    IF swiped_wallet_id IS NOT NULL AND swiped_role = 'Female' THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + reward,
            total_earned = total_earned + reward,
            updated_at = now()
        WHERE id = swiped_wallet_id;

        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (swiped_id, swiped_wallet_id, 'earning', reward, 'completed', 
                'Earning from ' || UPPER(swipe_type) || ' Swipe', 
                jsonb_build_object('swiper_id', swiper_id, 'swipe_type', swipe_type, 'share_percentage', 50));
    END IF;

    RETURN jsonb_build_object('success', true, 'type', 'paid', 'amount', cost, 'recipient_reward', reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
