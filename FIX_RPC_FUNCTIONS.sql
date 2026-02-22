-- FIX_RPC_FUNCTIONS.sql
-- This script defines the critical RPC functions for swipes and profile updates.

-- 1. [SWIPE LIMIT] - 20 Free Swipes then Pay logic
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
    -- 1. Check if user is a premium subscriber
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
        v_cost := 0;
        v_reward := 0;
    ELSIF v_swipes_used < v_max_free THEN
        v_cost := 0;
        v_reward := 0;
    ELSE
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

    -- 5. Increment Swipe Limit (only for standard swipes)
    IF swipe_type = 'standard' THEN
        UPDATE public.swipe_limits
        SET swipes_used = swipes_used + 1
        WHERE user_id = swiper_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'type', CASE WHEN v_cost = 0 THEN 'free' ELSE 'paid' END,
        'amount', v_cost,
        'remaining_free', CASE WHEN (v_cost = 0 AND NOT v_is_premium) THEN v_max_free - (v_swipes_used + 1) ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. [PROFILE UPDATE] - High-speed profile updates bypass RLS
CREATE OR REPLACE FUNCTION public.update_profile_data(
    p_full_name TEXT DEFAULT NULL,
    p_age INTEGER DEFAULT NULL,
    p_gender TEXT DEFAULT NULL,
    p_university TEXT DEFAULT NULL,
    p_bio TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    UPDATE public.profiles
    SET 
        full_name = COALESCE(p_full_name, full_name),
        age = COALESCE(p_age, age),
        gender = COALESCE(p_gender, gender),
        university = COALESCE(p_university, university),
        bio = COALESCE(p_bio, bio),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        email = COALESCE(p_email, email),
        updated_at = now()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Cleanup existing triggers that might conflict
DROP TRIGGER IF EXISTS on_swipe_recorded_increment ON public.swipes;
DROP FUNCTION IF EXISTS public.increment_swipes_used();

-- 4. Ensure swipe_limits table structure
CREATE TABLE IF NOT EXISTS public.swipe_limits (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    swipes_used INTEGER DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Auto-populate for all existing users
INSERT INTO public.swipe_limits (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
