-- Migration: 20261021100000_send_coin_gift_notification.sql
-- Description:
-- 1. Updates send_coin_gift RPC to insert an authoritative notification into public.notifications
--    with rich gift metadata (gift_id, gift_name, gift_emoji, gift_coins, earning_credit_ngn, sender_id, sender_name, sender_avatar)
--    so recipient receives real-time TikTok-style gift celebration animation and push notification.
-- 2. Enriches messages.metadata with earning_credit_ngn and sender details.
-- 3. Grants execute on send_coin_gift to authenticated role.

CREATE OR REPLACE FUNCTION public.send_coin_gift(
    p_receiver_id UUID,
    p_gift_id TEXT,
    p_match_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_id UUID := auth.uid();
    v_sender_coins INTEGER;
    v_sender_name TEXT;
    v_sender_avatar TEXT;
    v_gift_cost INTEGER;
    v_gift_name TEXT;
    v_gift_emoji TEXT;
    v_gift_color TEXT;
    v_gift_desc TEXT;
    v_earning_credit NUMERIC(12,2);
    v_receiver_wallet_id UUID;
    v_tx_ref TEXT;
    v_msg_id UUID;
    v_notif_priority TEXT := 'high';
BEGIN
    IF v_sender_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF v_sender_id = p_receiver_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot send gifts to yourself');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = v_sender_id AND blocked_id = p_receiver_id)
           OR (blocker_id = p_receiver_id AND blocked_id = v_sender_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Communication is blocked with this user');
    END IF;

    -- Fetch sender info
    SELECT full_name, avatar_url, coins INTO v_sender_name, v_sender_avatar, v_sender_coins
    FROM public.profiles
    WHERE id = v_sender_id
    FOR UPDATE;

    CASE p_gift_id
        WHEN 'rose' THEN
            v_gift_cost := 20;
            v_gift_name := 'Digital Rose';
            v_gift_emoji := '🌹';
            v_gift_color := '#f43f5e';
            v_gift_desc := 'A classic romantic gesture';
        WHEN 'zobo' THEN
            v_gift_cost := 20;
            v_gift_name := 'Cold Zobo';
            v_gift_emoji := '🍷';
            v_gift_color := '#9d174d';
            v_gift_desc := 'Chilled campus refreshment';
        WHEN 'suya' THEN
            v_gift_cost := 50;
            v_gift_name := 'Hot Suya';
            v_gift_emoji := '🍢';
            v_gift_color := '#ea580c';
            v_gift_desc := 'Spicy peppered night snack';
        WHEN 'airtime' THEN
            v_gift_cost := 100;
            v_gift_name := 'Airtime Charm';
            v_gift_emoji := '📱';
            v_gift_color := '#2563eb';
            v_gift_desc := 'Keep the conversations buzzing';
        WHEN 'bouquet' THEN
            v_gift_cost := 200;
            v_gift_name := 'Campus Bouquet';
            v_gift_emoji := '💐';
            v_gift_color := '#10b981';
            v_gift_desc := 'Delightful arrangement of blossoms';
        WHEN 'crown' THEN
            v_gift_cost := 500;
            v_gift_name := 'Royal Crown';
            v_gift_emoji := '👑';
            v_gift_color := '#ffd700';
            v_gift_desc := 'Ultimate symbol of campus royalty';
        WHEN 'lion' THEN
            v_gift_cost := 10000;
            v_gift_name := 'Campus Lion';
            v_gift_emoji := '🦁';
            v_gift_color := '#f59e0b';
            v_gift_desc := 'The legendary ₦100k Campus Lion gift';
            v_notif_priority := 'critical';
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Unknown gift ID');
    END CASE;

    IF coalesce(v_sender_coins, 0) < v_gift_cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient CD Coins. Please recharge your coins.');
    END IF;

    v_tx_ref := 'gift_' || v_sender_id || '_' || extract(epoch from now())::bigint;

    UPDATE public.profiles
    SET coins = coins - v_gift_cost
    WHERE id = v_sender_id
    RETURNING coins INTO v_sender_coins;

    INSERT INTO public.coin_transactions (
        user_id, amount, balance_after, transaction_type, reference, source, destination_user_id, metadata
    ) VALUES (
        v_sender_id, -v_gift_cost, v_sender_coins, 'gift_sent', v_tx_ref, 'gift_store', p_receiver_id,
        jsonb_build_object('gift_id', p_gift_id, 'gift_name', v_gift_name, 'match_id', p_match_id)
    );

    -- 80% split back to student receiver wallet: 10,000 coins * 10 * 0.8 = ₦80,000 credit
    v_earning_credit := (v_gift_cost * 10 * 0.8)::numeric(12,2);
    
    INSERT INTO public.wallets (user_id, available_balance, total_earned)
    VALUES (p_receiver_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id INTO v_receiver_wallet_id
    FROM public.wallets
    WHERE user_id = p_receiver_id;

    IF v_receiver_wallet_id IS NOT NULL THEN
        UPDATE public.wallets
        SET available_balance = available_balance + v_earning_credit,
            total_earned = coalesce(total_earned, 0) + v_earning_credit,
            updated_at = now()
        WHERE id = v_receiver_wallet_id;

        INSERT INTO public.wallet_transactions (
            user_id, wallet_id, type, amount, status, description, metadata
        ) VALUES (
            p_receiver_id, v_receiver_wallet_id, 'gift_received', v_earning_credit, 'completed',
            'Gift received: ' || v_gift_name,
            jsonb_build_object('gift_id', p_gift_id, 'sender_id', v_sender_id, 'gift_coins', v_gift_cost)
        );
    END IF;

    -- Insert in-chat message
    INSERT INTO public.messages (
        match_id, sender_id, content, type, metadata
    ) VALUES (
        p_match_id, v_sender_id, 'Sent ' || v_gift_name || ' ' || v_gift_emoji, 'gift',
        jsonb_build_object(
            'gift_id', p_gift_id,
            'gift_name', v_gift_name,
            'gift_emoji', v_gift_emoji,
            'gift_color', v_gift_color,
            'gift_coins', v_gift_cost,
            'earning_credit_ngn', v_earning_credit,
            'sender_id', v_sender_id,
            'sender_name', coalesce(v_sender_name, 'Someone Special'),
            'sender_avatar', v_sender_avatar
        )
    )
    RETURNING id INTO v_msg_id;

    -- Insert real-time notification for recipient with gift metadata
    BEGIN
        INSERT INTO public.notifications (
            user_id,
            recipient_id,
            actor_id,
            sender_id,
            type,
            category,
            entity_type,
            entity_id,
            match_id,
            title,
            content,
            deep_link,
            priority,
            metadata
        ) VALUES (
            p_receiver_id,
            p_receiver_id,
            v_sender_id,
            v_sender_id,
            'gift_received',
            'messages',
            'message',
            v_msg_id,
            p_match_id,
            coalesce(v_sender_name, 'Someone') || ' sent you ' || v_gift_name || ' ' || v_gift_emoji,
            'You received ' || v_gift_name || ' (' || v_gift_cost || ' coins)! ₦' || v_earning_credit || ' was added to your earnings.',
            '/chat?id=' || p_match_id,
            v_notif_priority,
            jsonb_build_object(
                'gift_id', p_gift_id,
                'gift_name', v_gift_name,
                'gift_emoji', v_gift_emoji,
                'gift_color', v_gift_color,
                'gift_coins', v_gift_cost,
                'earning_credit_ngn', v_earning_credit,
                'sender_id', v_sender_id,
                'sender_name', coalesce(v_sender_name, 'Someone Special'),
                'sender_avatar', v_sender_avatar,
                'match_id', p_match_id,
                'message_id', v_msg_id
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Notification insertion defensive fallback
    END;

    RETURN jsonb_build_object(
        'success', true,
        'remaining_coins', v_sender_coins,
        'new_coin_balance', v_sender_coins,
        'gift_name', v_gift_name,
        'gift_emoji', v_gift_emoji,
        'message_id', v_msg_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_coin_gift(UUID, TEXT, UUID) TO authenticated;
