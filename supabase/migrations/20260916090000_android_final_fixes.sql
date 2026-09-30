-- Migration: 20260916090000_android_final_fixes.sql
-- Description: 
-- 1. Security definer RPC for public anonymous ask profiles (fixes "Student Not Found")
-- 2. Security definer RPC for anonymous ask message submission (fixes RLS policy violation)
-- 3. ₦100,000 "Lion" coin package in purchase_coins_with_wallet (25,000 coins)
-- 4. ₦100,000 "Campus Lion" gift in send_coin_gift (10,000 coins, ₦80,000 earning credit)

-- ============================================================================
-- 1. PUBLIC ASK PROFILE RPC (Security Definer)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_ask_profile(p_username_or_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean text;
    v_is_uuid boolean;
    v_profile record;
BEGIN
    IF p_username_or_id IS NULL OR length(trim(p_username_or_id)) = 0 THEN
        RETURN NULL;
    END IF;

    v_clean := lower(trim(leading '@' from trim(p_username_or_id)));
    v_is_uuid := p_username_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF v_is_uuid THEN
        SELECT id, full_name, username, avatar_url, university, is_verified, bio, video_url
        INTO v_profile
        FROM public.profiles
        WHERE id = p_username_or_id::uuid
          AND COALESCE(is_banned, false) = false
        LIMIT 1;
    ELSE
        SELECT id, full_name, username, avatar_url, university, is_verified, bio, video_url
        INTO v_profile
        FROM public.profiles
        WHERE lower(username) = v_clean
          AND COALESCE(is_banned, false) = false
        LIMIT 1;
    END IF;

    IF v_profile.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(v_profile);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_ask_profile(text) TO anon, authenticated, service_role;

-- ============================================================================
-- 2. ANONYMOUS ASK MESSAGE SUBMISSION RPC (Security Definer)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_anonymous_ask_message(
    p_recipient_id uuid,
    p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec public.user_anonymous_messages%ROWTYPE;
    v_username text;
    v_snippet text;
BEGIN
    IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
        RAISE EXCEPTION 'Message content cannot be empty';
    END IF;

    IF p_recipient_id IS NULL THEN
        RAISE EXCEPTION 'Recipient ID is required';
    END IF;

    SELECT username INTO v_username
    FROM public.profiles
    WHERE id = p_recipient_id
      AND COALESCE(is_banned, false) = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipient student not found or account is inactive';
    END IF;

    INSERT INTO public.user_anonymous_messages (
        recipient_id,
        recipient_username,
        content
    ) VALUES (
        p_recipient_id,
        COALESCE(v_username, 'student'),
        trim(p_content)
    )
    RETURNING * INTO v_rec;

    -- Send notification to recipient
    v_snippet := substring(trim(p_content) from 1 for 35);
    BEGIN
        INSERT INTO public.notifications (
            user_id,
            actor_id,
            type,
            title,
            content,
            metadata
        ) VALUES (
            p_recipient_id,
            NULL,
            'snapshot_reaction',
            'New Anonymous Message 💌',
            'Someone sent you an anonymous message: "' || v_snippet || '..."',
            '{"url": "/confessions?tab=inbox"}'::jsonb
        );
    EXCEPTION WHEN OTHERS THEN
        -- Defensive ignore notification errors
    END;

    RETURN to_jsonb(v_rec);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_anonymous_ask_message(uuid, text) TO anon, authenticated, service_role;

-- Ensure public insert policy and permissions on user_anonymous_messages
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_anonymous_messages'
    ) THEN
        GRANT INSERT ON TABLE public.user_anonymous_messages TO anon, authenticated;
        GRANT SELECT, UPDATE, DELETE ON TABLE public.user_anonymous_messages TO authenticated;
        GRANT ALL ON TABLE public.user_anonymous_messages TO service_role;
    END IF;
END $$;

-- ============================================================================
-- 3. ₦100,000 LION COIN PACKAGE IN purchase_coins_with_wallet
-- ============================================================================

CREATE OR REPLACE FUNCTION public.purchase_coins_with_wallet(p_package_id TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_wallet public.wallets%ROWTYPE;
    v_coins_to_add INTEGER;
    v_cost_ngn NUMERIC(12,2);
    v_balance_after INTEGER;
    v_ref TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    CASE p_package_id
        WHEN 'coins_starter' THEN
            v_coins_to_add := 100;
            v_cost_ngn := 900.00;
        WHEN 'coins_popular' THEN
            v_coins_to_add := 400;
            v_cost_ngn := 2500.00;
        WHEN 'coins_elite' THEN
            v_coins_to_add := 950;
            v_cost_ngn := 5000.00;
        WHEN 'coins_vip' THEN
            v_coins_to_add := 2500;
            v_cost_ngn := 10000.00;
        WHEN 'coins_lion' THEN
            v_coins_to_add := 25000;
            v_cost_ngn := 100000.00;
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Invalid coin package');
    END CASE;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND OR coalesce(v_wallet.available_balance, 0) < v_cost_ngn THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance. Please top up your wallet.');
    END IF;

    v_ref := 'coin_wall_' || v_user_id || '_' || extract(epoch from now())::bigint;

    UPDATE public.wallets
    SET available_balance = available_balance - v_cost_ngn,
        total_spent = coalesce(total_spent, 0) + v_cost_ngn,
        updated_at = now()
    WHERE id = v_wallet.id;

    INSERT INTO public.wallet_ledger (
        user_id, wallet_id, entry_type, amount, currency, source, source_reference, status, balance_before, balance_after, metadata
    ) VALUES (
        v_user_id, v_wallet.id, 'debit', v_cost_ngn, 'NGN', 'coin_purchase', v_ref, 'posted',
        v_wallet.available_balance, v_wallet.available_balance - v_cost_ngn,
        jsonb_build_object('package_id', p_package_id, 'coins_granted', v_coins_to_add)
    );

    UPDATE public.profiles
    SET coins = coalesce(coins, 0) + v_coins_to_add
    WHERE id = v_user_id
    RETURNING coins INTO v_balance_after;

    INSERT INTO public.coin_transactions (
        user_id, amount, balance_after, transaction_type, reference, source, metadata
    ) VALUES (
        v_user_id, v_coins_to_add, v_balance_after, 'purchase', v_ref, 'wallet_conversion',
        jsonb_build_object('package_id', p_package_id, 'cost_ngn', v_cost_ngn)
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_coin_balance', v_balance_after,
        'new_wallet_balance', v_wallet.available_balance - v_cost_ngn,
        'coins_added', v_coins_to_add
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_coins_with_wallet(TEXT) TO authenticated;

-- ============================================================================
-- 4. ₦100,000 CAMPUS LION GIFT IN send_coin_gift
-- ============================================================================

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
    v_gift_cost INTEGER;
    v_gift_name TEXT;
    v_gift_emoji TEXT;
    v_gift_color TEXT;
    v_earning_credit NUMERIC(12,2);
    v_receiver_wallet_id UUID;
    v_tx_ref TEXT;
    v_msg_id UUID;
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

    CASE p_gift_id
        WHEN 'rose' THEN
            v_gift_cost := 20;
            v_gift_name := 'Digital Rose';
            v_gift_emoji := '🌹';
            v_gift_color := '#f43f5e';
        WHEN 'zobo' THEN
            v_gift_cost := 20;
            v_gift_name := 'Cold Zobo';
            v_gift_emoji := '🍷';
            v_gift_color := '#9d174d';
        WHEN 'suya' THEN
            v_gift_cost := 50;
            v_gift_name := 'Hot Suya';
            v_gift_emoji := '🍢';
            v_gift_color := '#ea580c';
        WHEN 'airtime' THEN
            v_gift_cost := 100;
            v_gift_name := 'Airtime Charm';
            v_gift_emoji := '📱';
            v_gift_color := '#2563eb';
        WHEN 'bouquet' THEN
            v_gift_cost := 200;
            v_gift_name := 'Campus Bouquet';
            v_gift_emoji := '💐';
            v_gift_color := '#10b981';
        WHEN 'crown' THEN
            v_gift_cost := 500;
            v_gift_name := 'Royal Crown';
            v_gift_emoji := '👑';
            v_gift_color := '#ffd700';
        WHEN 'lion' THEN
            v_gift_cost := 10000;
            v_gift_name := 'Campus Lion';
            v_gift_emoji := '🦁';
            v_gift_color := '#f59e0b';
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Unknown gift ID');
    END CASE;

    SELECT coins INTO v_sender_coins
    FROM public.profiles
    WHERE id = v_sender_id
    FOR UPDATE;

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

    INSERT INTO public.messages (
        match_id, sender_id, content, type, metadata
    ) VALUES (
        p_match_id, v_sender_id, 'Sent ' || v_gift_name || ' ' || v_gift_emoji, 'gift',
        jsonb_build_object(
            'gift_id', p_gift_id,
            'gift_name', v_gift_name,
            'gift_emoji', v_gift_emoji,
            'gift_color', v_gift_color,
            'gift_coins', v_gift_cost
        )
    )
    RETURNING id INTO v_msg_id;

    RETURN jsonb_build_object(
        'success', true,
        'remaining_coins', v_sender_coins,
        'gift_name', v_gift_name,
        'gift_emoji', v_gift_emoji,
        'message_id', v_msg_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_coin_gift(UUID, TEXT, UUID) TO authenticated;
