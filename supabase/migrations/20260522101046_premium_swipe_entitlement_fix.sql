-- Premium entitlement fixes for Android RevenueCat purchases.
-- Premium users should get unlimited standard swipes without wallet charges,
-- and free/unlimited swipes should not create wallet rewards when accepted.

CREATE OR REPLACE FUNCTION public.check_and_reset_swipe_limit(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_used integer;
    v_last_reset timestamp with time zone;
    v_max integer := 20;
    v_is_premium boolean := false;
BEGIN
    SELECT COALESCE(is_premium, false)
    INTO v_is_premium
    FROM public.profiles
    WHERE id = p_user_id;

    IF COALESCE(v_is_premium, false) THEN
        RETURN jsonb_build_object(
            'can_swipe', true,
            'used_count', 0,
            'max_count', 999999,
            'is_premium', true
        );
    END IF;

    SELECT swipes_used, last_reset
    INTO v_used, v_last_reset
    FROM public.swipe_limits
    WHERE user_id = p_user_id;

    IF v_used IS NULL THEN
        INSERT INTO public.swipe_limits (user_id, swipes_used, last_reset)
        VALUES (p_user_id, 0, now())
        ON CONFLICT (user_id) DO NOTHING;

        v_used := 0;
        v_last_reset := now();
    END IF;

    IF v_last_reset < now() - interval '24 hours' THEN
        UPDATE public.swipe_limits
        SET swipes_used = 0,
            last_reset = now()
        WHERE user_id = p_user_id;

        v_used := 0;
    END IF;

    RETURN jsonb_build_object(
        'can_swipe', COALESCE(v_used, 0) < v_max,
        'used_count', COALESCE(v_used, 0),
        'max_count', v_max,
        'is_premium', false
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.process_swipe_payment(
    p_swiper_id uuid,
    p_swiped_id uuid,
    p_swipe_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cost numeric;
    swiper_wallet_id uuid;
    swiper_balance numeric;
    has_free_swipe boolean := false;
    v_is_premium boolean := false;
BEGIN
    SELECT COALESCE(is_premium, false)
    INTO v_is_premium
    FROM public.profiles
    WHERE id = p_swiper_id;

    IF p_swipe_type = 'premium' THEN
        cost := 5000.00;
    ELSE
        cost := 500.00;
    END IF;

    IF p_swipe_type = 'standard' AND COALESCE(v_is_premium, false) THEN
        UPDATE public.swipes
        SET is_free = true
        WHERE swiper_id = p_swiper_id
          AND swiped_id = p_swiped_id
          AND status = 'pending';

        RETURN jsonb_build_object('success', true, 'type', 'premium_free');
    END IF;

    IF p_swipe_type = 'standard' THEN
        PERFORM public.check_and_reset_swipe_limit(p_swiper_id);

        UPDATE public.profiles
        SET free_swipes = GREATEST(COALESCE(free_swipes, 0) - 1, 0)
        WHERE id = p_swiper_id
          AND COALESCE(free_swipes, 0) > 0
        RETURNING true INTO has_free_swipe;

        IF has_free_swipe THEN
            UPDATE public.swipes
            SET is_free = true
            WHERE swiper_id = p_swiper_id
              AND swiped_id = p_swiped_id
              AND status = 'pending';

            RETURN jsonb_build_object('success', true, 'type', 'free');
        END IF;
    END IF;

    SELECT id, available_balance
    INTO swiper_wallet_id, swiper_balance
    FROM public.wallets
    WHERE user_id = p_swiper_id
    FOR UPDATE;

    IF swiper_wallet_id IS NULL OR COALESCE(swiper_balance, 0) < cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    UPDATE public.wallets
    SET available_balance = available_balance - cost,
        total_spent = COALESCE(total_spent, 0) + cost,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (
        p_swiper_id,
        swiper_wallet_id,
        'swipe_purchase',
        cost,
        'completed',
        upper(p_swipe_type) || ' Swipe Request',
        jsonb_build_object('target_id', p_swiped_id, 'swipe_type', p_swipe_type)
    );

    RETURN jsonb_build_object('success', true, 'type', 'paid', 'amount', cost);
END;
$$;
