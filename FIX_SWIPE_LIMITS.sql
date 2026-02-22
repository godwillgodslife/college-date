-- FIX_SWIPE_LIMITS.sql
-- This script implements the "20 Free Swipes then Pay" logic.

-- 1. Update the process_swipe_payment RPC to handle free swipes
CREATE OR REPLACE FUNCTION public.process_swipe_payment(
    swiper_id UUID,
    swiped_id UUID,
    swipe_type TEXT -- 'standard' or 'premium'
)
RETURNS JSONB AS $$
DECLARE
    v_cost DECIMAL;
    v_reward DECIMAL;
    v_swiper_wallet_id UUID;
    v_swiped_wallet_id UUID;
    v_swiper_balance DECIMAL;
    v_swipes_used INTEGER;
    v_last_reset TIMESTAMP WITH TIME ZONE;
    v_max_free INTEGER := 20;
    v_is_premium BOOLEAN;
BEGIN
    -- 1. Check if user is a premium subscriber (Unlimited free standard swipes)
    SELECT (plan_type = 'Premium' AND status = 'active') INTO v_is_premium 
    FROM public.subscriptions WHERE user_id = swiper_id;

    -- 2. Get current swipe limit state
    SELECT swipes_used, last_reset INTO v_swipes_used, v_last_reset
    FROM public.swipe_limits
    WHERE user_id = swiper_id;

    -- Initialize if missing
    IF NOT FOUND THEN
        INSERT INTO public.swipe_limits (user_id, swipes_used, last_reset)
        VALUES (swiper_id, 0, now())
        RETURNING swipes_used, last_reset INTO v_swipes_used, v_last_reset;
    END IF;

    -- Reset if older than 24 hours
    IF v_last_reset < (now() - INTERVAL '24 hours') THEN
        UPDATE public.swipe_limits
        SET swipes_used = 0, last_reset = now()
        WHERE user_id = swiper_id
        RETURNING swipes_used, last_reset INTO v_swipes_used, v_last_reset;
    END IF;

    -- 3. Determine Cost
    IF swipe_type = 'premium' THEN
        v_cost := 5000.00;
        v_reward := 2500.00;
    ELSIF v_is_premium THEN
        -- Premium subscribers get all standard swipes for free
        v_cost := 0;
        v_reward := 0;
    ELSIF v_swipes_used < v_max_free THEN
        -- Free users get first 20 standard swipes for free
        v_cost := 0;
        v_reward := 0;
    ELSE
        -- After 20, standard swipes cost 500
        v_cost := 500.00;
        v_reward := 250.00;
    END IF;

    -- 4. Process Payment if cost > 0
    IF v_cost > 0 THEN
        SELECT id, available_balance INTO v_swiper_wallet_id, v_swiper_balance 
        FROM public.wallets WHERE user_id = swiper_id;
        
        IF v_swiper_balance < v_cost THEN
            RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Need ₦' || v_cost || ' for this swipe.');
        END IF;

        SELECT id INTO v_swiped_wallet_id FROM public.wallets WHERE user_id = swiped_id;

        -- Deduct from Swiper
        UPDATE public.wallets 
        SET available_balance = available_balance - v_cost,
            total_spent = total_spent + v_cost,
            updated_at = now()
        WHERE id = v_swiper_wallet_id;

        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (swiper_id, v_swiper_wallet_id, 'payment', v_cost, 'completed', 
                UPPER(swipe_type) || ' Swipe Request', jsonb_build_object('target_id', swiped_id, 'swipe_type', swipe_type));

        -- Credit Recipient (50% Split)
        IF v_swiped_wallet_id IS NOT NULL THEN
            UPDATE public.wallets 
            SET available_balance = available_balance + v_reward,
                total_earned = total_earned + v_reward,
                updated_at = now()
            WHERE id = v_swiped_wallet_id;

            INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
            VALUES (swiped_id, v_swiped_wallet_id, 'earning', v_reward, 'completed', 
                    'Earning from ' || UPPER(swipe_type) || ' Swipe', jsonb_build_object('swiper_id', swiper_id, 'swipe_type', swipe_type));
        END IF;
    END IF;

    -- 5. Increment Swipe Limit (only for standard swipes, premium doesn't count toward the 20 free)
    IF swipe_type = 'standard' THEN
        UPDATE public.swipe_limits
        SET swipes_used = swipes_used + 1
        WHERE user_id = swiper_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'type', CASE WHEN v_cost = 0 THEN 'free' ELSE 'paid' END,
        'amount', v_cost,
        'remaining_free', CASE WHEN v_cost = 0 THEN v_max_free - (v_swipes_used + 1) ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Cleanup: We no longer need the trigger from the previous attempt 
-- as the increment is now handled atomically inside the payment function to avoid double-charging/counting.
DROP TRIGGER IF EXISTS on_swipe_recorded_increment ON public.swipes;
DROP FUNCTION IF EXISTS public.increment_swipes_used();

-- 3. Safety: Ensure all current users have a limit record
INSERT INTO public.swipe_limits (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
