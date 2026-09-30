-- ============================================================================
-- Migration: 20260911160000_android_functional_fixes_and_vibe.sql
-- Description:
--   1. Inserts 3-month (₦7,200) and Annual (₦31,800) products into paid_products.
--   2. Creates atomic security-definer RPC `send_chat_vibe(p_recipient_id)` with ₦500 wallet deduction.
--   3. Adds trigger to keep `confessions.comment_count` updated when comments are posted.
--   4. Ensures `confession_comments` is in `supabase_realtime` publication.
-- ============================================================================

-- 1. ADD PREMIUM 3-MONTH AND ANNUAL PRODUCTS
INSERT INTO public.paid_products (
    product_id,
    display_name,
    product_type,
    provider,
    provider_product_id,
    amount,
    currency,
    billing_interval,
    duration_days,
    wallet_credit_amount,
    entitlements,
    platforms,
    is_active,
    metadata
)
VALUES
(
    'premium_3month',
    'The College Date Premium 3-Month',
    'subscription',
    'paystack',
    'premium_3month',
    7200,
    'NGN',
    'quarterly',
    90,
    null,
    '["premium", "unlimited_swipes", "see_admirers", "see_profile_viewers", "advanced_filters", "premium_badge"]'::jsonb,
    ARRAY['web', 'android'],
    true,
    '{"restore_policy": "active_entitlement_only", "savings": 1500, "original_total": 8700}'::jsonb
),
(
    'premium_annual',
    'The College Date Premium Annual',
    'subscription',
    'paystack',
    'premium_annual',
    31800,
    'NGN',
    'yearly',
    365,
    null,
    '["premium", "unlimited_swipes", "see_admirers", "see_profile_viewers", "advanced_filters", "premium_badge"]'::jsonb,
    ARRAY['web', 'android'],
    true,
    '{"restore_policy": "active_entitlement_only", "savings": 3000, "original_total": 34800}'::jsonb
)
ON CONFLICT (product_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    amount = EXCLUDED.amount,
    duration_days = EXCLUDED.duration_days,
    platforms = EXCLUDED.platforms,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata,
    updated_at = now();

-- 2. CONFESSIONS COMMENT COUNTER TRIGGER & REALTIME
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_confession_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.confessions
        SET comment_count = COALESCE(comment_count, 0) + 1
        WHERE id = NEW.confession_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.confessions
        SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1)
        WHERE id = OLD.confession_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_confession_comment_counter ON public.confession_comments;
CREATE TRIGGER trg_confession_comment_counter
AFTER INSERT OR DELETE ON public.confession_comments
FOR EACH ROW
EXECUTE FUNCTION public.sync_confession_comment_count();

-- Backfill existing comment counts
UPDATE public.confessions c
SET comment_count = (
    SELECT count(*)
    FROM public.confession_comments cc
    WHERE cc.confession_id = c.id
);

-- Ensure confession_comments is in supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'confession_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.confession_comments;
    END IF;
END $$;

-- 3. ATOMIC CHAT VIBE (₦500 WALLET DEDUCTION & MATCH/CONVERSATION ACTIVATION)
CREATE OR REPLACE FUNCTION public.send_chat_vibe(p_recipient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_id uuid := auth.uid();
    v_wallet_id uuid;
    v_balance numeric(12, 2);
    v_cost numeric(12, 2) := 500.00;
    v_balance_after numeric(12, 2);
    v_tx_ref text := 'vibe-' || gen_random_uuid()::text;
    v_match_id uuid;
    v_sender_name text;
    v_recipient_name text;
    v_user1 uuid;
    v_user2 uuid;
BEGIN
    -- Validation
    IF v_sender_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required.');
    END IF;

    IF v_sender_id = p_recipient_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You cannot send a chat vibe to yourself.');
    END IF;

    -- Check if communication is blocked
    IF EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = v_sender_id AND blocked_id = p_recipient_id)
           OR (blocker_id = p_recipient_id AND blocked_id = v_sender_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Communication is blocked between these accounts.');
    END IF;

    -- Fetch sender name
    SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = v_sender_id;
    SELECT full_name INTO v_recipient_name FROM public.profiles WHERE id = p_recipient_id;

    IF v_recipient_name IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Recipient not found.');
    END IF;

    -- Lock and check sender wallet
    SELECT id, COALESCE(available_balance, 0)
    INTO v_wallet_id, v_balance
    FROM public.wallets
    WHERE user_id = v_sender_id
    FOR UPDATE;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found. Please visit Wallet page.');
    END IF;

    IF v_balance < v_cost THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient wallet balance. Chat Vibe requires ₦500.',
            'available_balance', v_balance,
            'required_amount', v_cost
        );
    END IF;

    -- Deduct ₦500 from sender wallet
    v_balance_after := v_balance - v_cost;
    UPDATE public.wallets
    SET available_balance = v_balance_after,
        total_spent = COALESCE(total_spent, 0) + v_cost,
        updated_at = now()
    WHERE id = v_wallet_id;

    -- Record in wallet_ledger
    INSERT INTO public.wallet_ledger (
        user_id,
        wallet_id,
        entry_type,
        amount,
        currency,
        source,
        source_reference,
        status,
        balance_before,
        balance_after,
        metadata
    ) VALUES (
        v_sender_id,
        v_wallet_id,
        'debit',
        v_cost,
        'NGN',
        'chat_vibe',
        v_tx_ref,
        'posted',
        v_balance,
        v_balance_after,
        jsonb_build_object('recipient_id', p_recipient_id, 'feature', 'chat_vibe')
    );

    -- Record in wallet_transactions
    INSERT INTO public.wallet_transactions (
        user_id,
        wallet_id,
        type,
        amount,
        status,
        description,
        payment_method,
        reference_id,
        metadata
    ) VALUES (
        v_sender_id,
        v_wallet_id,
        'service_payment',
        v_cost,
        'successful',
        'Direct Chat Vibe to ' || COALESCE(v_recipient_name, 'Campus Student'),
        'wallet',
        v_tx_ref,
        jsonb_build_object('recipient_id', p_recipient_id, 'feature', 'chat_vibe')
    );

    -- Create or fetch mutual match
    IF v_sender_id < p_recipient_id THEN
        v_user1 := v_sender_id;
        v_user2 := p_recipient_id;
    ELSE
        v_user1 := p_recipient_id;
        v_user2 := v_sender_id;
    END IF;

    SELECT id INTO v_match_id
    FROM public.matches
    WHERE (user1_id = v_user1 AND user2_id = v_user2);

    IF v_match_id IS NULL THEN
        INSERT INTO public.matches (
            user1_id,
            user2_id,
            user_ids,
            created_at
        ) VALUES (
            v_user1,
            v_user2,
            ARRAY[v_user1, v_user2],
            now()
        ) RETURNING id INTO v_match_id;
    END IF;


    -- Insert system introductory message
    INSERT INTO public.messages (
        match_id,
        sender_id,
        receiver_id,
        content,
        type,
        metadata,
        created_at
    ) VALUES (
        v_match_id,
        v_sender_id,
        p_recipient_id,
        '✨ ' || COALESCE(v_sender_name, 'Someone') || ' started a Chat Vibe! (₦500 Vibe Unlocked)',
        'system',
        jsonb_build_object('vibe_reference', v_tx_ref, 'cost', v_cost),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'match_id', v_match_id,
        'balance_after', v_balance_after,
        'cost', v_cost,
        'reference', v_tx_ref
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_chat_vibe(uuid) TO authenticated;
