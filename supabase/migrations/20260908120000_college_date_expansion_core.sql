-- Migration: 20260908120000_college_date_expansion_core.sql
-- Description: Core schema, security RLS, triggers, and RPCs for:
-- 1. Chat attachments and View Once media
-- 2. User blocking and reporting
-- 3. Live location sharing
-- 4. CD Coins virtual currency ledger
-- 5. Virtual gifts exchange
-- 6. Service Deals marketplace escrow payment-hold

-- ============================================================================
-- 1. EXPAND MESSAGE TYPES
-- ============================================================================
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check 
    CHECK (type IS NULL OR type IN (
        'text', 'image', 'video', 'document', 'voice', 
        'sticker', 'gift', 'emoji', 'call_log', 'system', 
        'deleted', 'location', 'service_deal', 'view_once'
    ));

-- ============================================================================
-- 2. USER BLOCKS TABLE & ENFORCEMENT
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_user_block UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocks" ON public.user_blocks;
CREATE POLICY "Users can view own blocks"
ON public.user_blocks FOR SELECT TO authenticated
USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can insert own blocks" ON public.user_blocks;
CREATE POLICY "Users can insert own blocks"
ON public.user_blocks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.user_blocks;
CREATE POLICY "Users can delete own blocks"
ON public.user_blocks FOR DELETE TO authenticated
USING (auth.uid() = blocker_id);

-- Enforce block on messages via trigger
CREATE OR REPLACE FUNCTION public.check_message_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_other_user UUID;
BEGIN
    SELECT CASE WHEN user1_id = NEW.sender_id THEN user2_id ELSE user1_id END
    INTO v_other_user
    FROM public.matches
    WHERE id = NEW.match_id;

    IF v_other_user IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = NEW.sender_id AND blocked_id = v_other_user)
           OR (blocker_id = v_other_user AND blocked_id = NEW.sender_id)
    ) THEN
        RAISE EXCEPTION 'Communication blocked between users.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_message_block ON public.messages;
CREATE TRIGGER trg_check_message_block
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.check_message_block();

-- ============================================================================
-- 3. USER REPORTS TABLE HARDENING
-- ============================================================================
ALTER TABLE public.reports 
    ADD COLUMN IF NOT EXISTS context_type TEXT DEFAULT 'chat',
    ADD COLUMN IF NOT EXISTS context_id TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_reports_reporter_reported 
ON public.reports(reporter_id, reported_id, created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reporters can view own reports" ON public.reports;
CREATE POLICY "Reporters can view own reports"
ON public.reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Reporters can insert reports" ON public.reports;
CREATE POLICY "Reporters can insert reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- ============================================================================
-- 4. LIVE LOCATION SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.live_location_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_location_match_active 
ON public.live_location_shares(match_id, is_active);

ALTER TABLE public.live_location_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view live location" ON public.live_location_shares;
CREATE POLICY "Participants can view live location"
ON public.live_location_shares FOR SELECT TO authenticated
USING (auth.uid() IN (sender_id, recipient_id));

DROP POLICY IF EXISTS "Sender can insert live location" ON public.live_location_shares;
CREATE POLICY "Sender can insert live location"
ON public.live_location_shares FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Sender can update live location" ON public.live_location_shares;
CREATE POLICY "Sender can update live location"
ON public.live_location_shares FOR UPDATE TO authenticated
USING (auth.uid() = sender_id);

-- ============================================================================
-- 5. AUTHORITATIVE CD COINS LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'gift_sent', 'gift_received', 'spend', 'refund', 'bonus', 'adjustment')),
    reference TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    destination_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own coin transactions" ON public.coin_transactions;
CREATE POLICY "Users can view own coin transactions"
ON public.coin_transactions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_coins_non_negative;
ALTER TABLE public.profiles ADD CONSTRAINT check_coins_non_negative CHECK (coins >= 0);

-- ============================================================================
-- 6. SERVICE DEALS & ESCROW LEDGER
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.service_deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    current_offer_amount NUMERIC(12,2) NOT NULL CHECK (current_offer_amount > 0),
    last_offered_by UUID NOT NULL REFERENCES public.profiles(id),
    proposed_date TIMESTAMPTZ,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
        'proposed', 'negotiating', 'accepted', 'funded',
        'completed_by_provider', 'released', 'disputed', 'cancelled', 'refunded'
    )),
    held_amount NUMERIC(12,2) DEFAULT 0.00 NOT NULL CHECK (held_amount >= 0),
    client_confirmed_at TIMESTAMPTZ,
    provider_confirmed_at TIMESTAMPTZ,
    dispute_reason TEXT,
    disputed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_deals_match ON public.service_deals(match_id, status);
CREATE INDEX IF NOT EXISTS idx_service_deals_client ON public.service_deals(client_id);
CREATE INDEX IF NOT EXISTS idx_service_deals_provider ON public.service_deals(provider_id);

CREATE TABLE IF NOT EXISTS public.service_deal_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id UUID NOT NULL REFERENCES public.service_deals(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    event_type TEXT NOT NULL,
    amount NUMERIC(12,2),
    note TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_deal_events_deal ON public.service_deal_events(deal_id, created_at ASC);

ALTER TABLE public.service_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_deal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deal participants can view deals" ON public.service_deals;
CREATE POLICY "Deal participants can view deals"
ON public.service_deals FOR SELECT TO authenticated
USING (auth.uid() IN (client_id, provider_id));

DROP POLICY IF EXISTS "Deal participants can view events" ON public.service_deal_events;
CREATE POLICY "Deal participants can view events"
ON public.service_deal_events FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.service_deals d
    WHERE d.id = deal_id AND auth.uid() IN (d.client_id, d.provider_id)
));

-- ============================================================================
-- 7. REALTIME PUBLICATIONS
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_blocks') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'live_location_shares') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_location_shares;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'coin_transactions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'service_deals') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.service_deals;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'service_deal_events') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.service_deal_events;
    END IF;
END $$;

-- ============================================================================
-- 8. RPC FUNCTIONS
-- ============================================================================

-- 8.1 View Once: open_view_once_media
CREATE OR REPLACE FUNCTION public.open_view_once_media(p_message_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_msg public.messages%ROWTYPE;
    v_match public.matches%ROWTYPE;
    v_recipient_id UUID;
    v_is_viewed BOOLEAN;
    v_storage_path TEXT;
    v_media_type TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_msg
    FROM public.messages
    WHERE id = p_message_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message not found');
    END IF;

    IF v_msg.type <> 'view_once' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Message is not a view-once media');
    END IF;

    SELECT * INTO v_match
    FROM public.matches
    WHERE id = v_msg.match_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match conversation not found');
    END IF;

    v_recipient_id := CASE WHEN v_match.user1_id = v_msg.sender_id THEN v_match.user2_id ELSE v_match.user1_id END;

    IF auth.uid() <> v_recipient_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the designated recipient can open view-once media');
    END IF;

    v_is_viewed := coalesce((v_msg.metadata->>'is_viewed')::boolean, false);
    IF v_is_viewed THEN
        RETURN jsonb_build_object('success', false, 'error', 'Media has already expired and cannot be viewed again');
    END IF;

    v_storage_path := v_msg.metadata->>'storage_path';
    v_media_type := coalesce(v_msg.metadata->>'media_type', 'image');

    UPDATE public.messages
    SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'is_viewed', true,
        'viewed_at', now(),
        'viewed_by', auth.uid()
    )
    WHERE id = p_message_id;

    RETURN jsonb_build_object(
        'success', true,
        'storage_path', v_storage_path,
        'media_type', v_media_type,
        'message_id', p_message_id
    );
END;
$$;

-- 8.2 Block & Unblock RPCs
CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF v_user_id = p_blocked_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot block yourself');
    END IF;

    INSERT INTO public.user_blocks (blocker_id, blocked_id)
    VALUES (v_user_id, p_blocked_id)
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

    UPDATE public.live_location_shares
    SET is_active = false, updated_at = now()
    WHERE (sender_id = v_user_id AND recipient_id = p_blocked_id)
       OR (sender_id = p_blocked_id AND recipient_id = v_user_id);

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    DELETE FROM public.user_blocks
    WHERE blocker_id = v_user_id AND blocked_id = p_blocked_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_results JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', b.blocked_id,
        'blocked_at', b.created_at,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'university', p.university
    )), '[]'::jsonb)
    INTO v_results
    FROM public.user_blocks b
    JOIN public.profiles p ON p.id = b.blocked_id
    WHERE b.blocker_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'data', v_results);
END;
$$;

-- 8.3 User Reports RPC
CREATE OR REPLACE FUNCTION public.submit_user_report(
    p_reported_id UUID,
    p_reason TEXT,
    p_description TEXT DEFAULT '',
    p_context_type TEXT DEFAULT 'chat',
    p_context_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reporter_id UUID := auth.uid();
    v_existing_report_id UUID;
    v_report_id UUID;
BEGIN
    IF v_reporter_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF v_reporter_id = p_reported_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot report yourself');
    END IF;

    SELECT id INTO v_existing_report_id
    FROM public.reports
    WHERE reporter_id = v_reporter_id
      AND reported_id = p_reported_id
      AND created_at >= (now() - interval '24 hours')
    LIMIT 1;

    IF v_existing_report_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'A report has already been logged for review.', 'report_id', v_existing_report_id);
    END IF;

    INSERT INTO public.reports (reporter_id, reported_id, reason, description, context_type, context_id, status)
    VALUES (v_reporter_id, p_reported_id, p_reason, coalesce(p_description, ''), p_context_type, p_context_id, 'pending')
    RETURNING id INTO v_report_id;

    RETURN jsonb_build_object('success', true, 'report_id', v_report_id);
END;
$$;

-- 8.4 Coin Purchase via Wallet RPC
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

-- 8.5 Send Coin Gift RPC
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
            'coins', v_gift_cost
        )
    ) RETURNING id INTO v_msg_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_coin_balance', v_sender_coins,
        'message_id', v_msg_id,
        'gift_name', v_gift_name
    );
END;
$$;

-- 8.6 Live Location RPCs
CREATE OR REPLACE FUNCTION public.update_live_location(
    p_match_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_accuracy DOUBLE PRECISION DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_id UUID := auth.uid();
    v_match public.matches%ROWTYPE;
    v_recipient_id UUID;
    v_session_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF v_sender_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Match not found');
    END IF;

    v_recipient_id := CASE WHEN v_match.user1_id = v_sender_id THEN v_match.user2_id ELSE v_match.user1_id END;

    IF EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = v_sender_id AND blocked_id = v_recipient_id)
           OR (blocker_id = v_recipient_id AND blocked_id = v_sender_id)
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Communication is blocked');
    END IF;

    IF NOT public.has_entitlement(v_sender_id, 'premium') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Live location sharing is an Elite Plan feature.');
    END IF;

    v_expires_at := now() + (coalesce(p_duration_minutes, 30) || ' minutes')::interval;

    SELECT id INTO v_session_id
    FROM public.live_location_shares
    WHERE match_id = p_match_id
      AND sender_id = v_sender_id
      AND is_active = true
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_session_id IS NOT NULL THEN
        UPDATE public.live_location_shares
        SET latitude = p_latitude,
            longitude = p_longitude,
            accuracy = p_accuracy,
            updated_at = now()
        WHERE id = v_session_id;
    ELSE
        INSERT INTO public.live_location_shares (
            match_id, sender_id, recipient_id, latitude, longitude, accuracy, expires_at, is_active
        ) VALUES (
            p_match_id, v_sender_id, v_recipient_id, p_latitude, p_longitude, p_accuracy, v_expires_at, true
        ) RETURNING id INTO v_session_id;

        INSERT INTO public.messages (
            match_id, sender_id, content, type, metadata
        ) VALUES (
            p_match_id, v_sender_id, 'Started sharing live location', 'location',
            jsonb_build_object(
                'live_location_id', v_session_id,
                'duration_minutes', p_duration_minutes,
                'is_live', true,
                'expires_at', v_expires_at
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'expires_at', v_expires_at
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.stop_live_location(p_match_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sender_id UUID := auth.uid();
BEGIN
    IF v_sender_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    UPDATE public.live_location_shares
    SET is_active = false, updated_at = now()
    WHERE match_id = p_match_id
      AND sender_id = v_sender_id
      AND is_active = true;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 8.7 Service Deals Escrow Lifecycle RPCs

-- Propose
CREATE OR REPLACE FUNCTION public.propose_service_deal(
    p_match_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_category TEXT,
    p_amount NUMERIC(12,2),
    p_proposed_date TIMESTAMPTZ DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_provider_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_match public.matches%ROWTYPE;
    v_other_user UUID;
    v_client_id UUID;
    v_provider_id UUID;
    v_deal_id UUID;
    v_msg_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal amount must be greater than zero');
    END IF;

    SELECT * INTO v_match
    FROM public.matches
    WHERE id = p_match_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Conversation not found');
    END IF;

    v_other_user := CASE WHEN v_match.user1_id = v_user_id THEN v_match.user2_id ELSE v_match.user1_id END;

    IF p_provider_id IS NOT NULL AND p_provider_id = v_user_id THEN
        v_provider_id := v_user_id;
        v_client_id := v_other_user;
    ELSE
        v_client_id := v_user_id;
        v_provider_id := v_other_user;
    END IF;

    IF p_description ~* '(sex|prostitut|escort\s+service|hooker|nude|drugs|weed|exam\s+runz|expo|runs)' 
       OR p_title ~* '(sex|prostitut|escort\s+service|hooker|nude|drugs|weed|exam\s+runz|expo|runs)' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This deal description contains prohibited service terms. College Date prohibits adult, illegal, or unethical services.');
    END IF;

    INSERT INTO public.service_deals (
        match_id, creator_id, client_id, provider_id,
        title, description, category, amount, current_offer_amount,
        last_offered_by, proposed_date, location, status
    ) VALUES (
        p_match_id, v_user_id, v_client_id, v_provider_id,
        p_title, p_description, p_category, p_amount, p_amount,
        v_user_id, p_proposed_date, p_location, 'proposed'
    ) RETURNING id INTO v_deal_id;

    INSERT INTO public.service_deal_events (
        deal_id, actor_id, event_type, amount, note
    ) VALUES (
        v_deal_id, v_user_id, 'offer_created', p_amount, 'Initial proposal: ₦' || p_amount
    );

    INSERT INTO public.messages (
        match_id, sender_id, content, type, metadata
    ) VALUES (
        p_match_id, v_user_id, 'Service Deal Proposed: ' || p_title || ' (₦' || p_amount || ')', 'service_deal',
        jsonb_build_object(
            'deal_id', v_deal_id,
            'title', p_title,
            'amount', p_amount,
            'category', p_category,
            'status', 'proposed'
        )
    ) RETURNING id INTO v_msg_id;

    RETURN jsonb_build_object(
        'success', true,
        'deal_id', v_deal_id,
        'message_id', v_msg_id
    );
END;
$$;

-- Counter-Offer
CREATE OR REPLACE FUNCTION public.counter_offer_service_deal(
    p_deal_id UUID,
    p_new_amount NUMERIC(12,2),
    p_note TEXT DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deal public.service_deals%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF p_new_amount IS NULL OR p_new_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Counter-offer must be greater than zero');
    END IF;

    SELECT * INTO v_deal
    FROM public.service_deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Service deal not found');
    END IF;

    IF v_user_id NOT IN (v_deal.client_id, v_deal.provider_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF v_deal.status NOT IN ('proposed', 'negotiating') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot counter-offer a deal in status: ' || v_deal.status);
    END IF;

    UPDATE public.service_deals
    SET current_offer_amount = p_new_amount,
        amount = p_new_amount,
        last_offered_by = v_user_id,
        status = 'negotiating',
        updated_at = now()
    WHERE id = p_deal_id;

    INSERT INTO public.service_deal_events (
        deal_id, actor_id, event_type, amount, note
    ) VALUES (
        p_deal_id, v_user_id, 'counter_offer', p_new_amount, coalesce(p_note, 'Counter-offer: ₦' || p_new_amount)
    );

    RETURN jsonb_build_object('success', true, 'new_amount', p_new_amount);
END;
$$;

-- Accept Deal
CREATE OR REPLACE FUNCTION public.accept_service_deal(p_deal_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deal public.service_deals%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_deal
    FROM public.service_deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Service deal not found');
    END IF;

    IF v_user_id NOT IN (v_deal.client_id, v_deal.provider_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF v_deal.last_offered_by = v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You cannot accept your own offer. Awaiting other party.');
    END IF;

    IF v_deal.status NOT IN ('proposed', 'negotiating') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal is already ' || v_deal.status);
    END IF;

    UPDATE public.service_deals
    SET status = 'accepted',
        updated_at = now()
    WHERE id = p_deal_id;

    INSERT INTO public.service_deal_events (
        deal_id, actor_id, event_type, amount, note
    ) VALUES (
        p_deal_id, v_user_id, 'accepted', v_deal.amount, 'Deal accepted at ₦' || v_deal.amount || '. Awaiting funding.'
    );

    RETURN jsonb_build_object('success', true, 'status', 'accepted', 'amount', v_deal.amount);
END;
$$;

-- Fund Deal from Wallet
CREATE OR REPLACE FUNCTION public.fund_service_deal_from_wallet(p_deal_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deal public.service_deals%ROWTYPE;
    v_wallet public.wallets%ROWTYPE;
    v_ref TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_deal
    FROM public.service_deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
    END IF;

    IF v_deal.client_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the client can fund this deal');
    END IF;

    IF v_deal.status NOT IN ('accepted', 'proposed', 'negotiating') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal cannot be funded in status ' || v_deal.status);
    END IF;

    SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND OR coalesce(v_wallet.available_balance, 0) < v_deal.amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient available balance in wallet. Please top up your wallet.');
    END IF;

    v_ref := 'escrow_fund_' || p_deal_id || '_' || extract(epoch from now())::bigint;

    UPDATE public.wallets
    SET available_balance = available_balance - v_deal.amount,
        updated_at = now()
    WHERE id = v_wallet.id;

    INSERT INTO public.wallet_ledger (
        user_id, wallet_id, entry_type, amount, currency, source, source_reference, status, balance_before, balance_after, metadata
    ) VALUES (
        v_user_id, v_wallet.id, 'debit', v_deal.amount, 'NGN', 'deal_escrow_hold', v_ref, 'posted',
        v_wallet.available_balance, v_wallet.available_balance - v_deal.amount,
        jsonb_build_object('deal_id', p_deal_id, 'title', v_deal.title)
    );

    UPDATE public.service_deals
    SET held_amount = v_deal.amount,
        status = 'funded',
        updated_at = now()
    WHERE id = p_deal_id;

    INSERT INTO public.service_deal_events (
        deal_id, actor_id, event_type, amount, note
    ) VALUES (
        p_deal_id, v_user_id, 'funded', v_deal.amount, 'Funds secured in escrow: ₦' || v_deal.amount
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'funded',
        'held_amount', v_deal.amount,
        'remaining_wallet_balance', v_wallet.available_balance - v_deal.amount
    );
END;
$$;

-- Mark Completed by Provider
CREATE OR REPLACE FUNCTION public.mark_service_completed(p_deal_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deal public.service_deals%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_deal
    FROM public.service_deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
    END IF;

    IF v_deal.provider_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the service provider can mark completion');
    END IF;

    IF v_deal.status <> 'funded' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal must be funded before completion can be marked');
    END IF;

    UPDATE public.service_deals
    SET status = 'completed_by_provider',
        provider_confirmed_at = now(),
        updated_at = now()
    WHERE id = p_deal_id;

    INSERT INTO public.service_deal_events (
        deal_id, actor_id, event_type, amount, note
    ) VALUES (
        p_deal_id, v_user_id, 'marked_complete', v_deal.held_amount, 'Provider marked service as completed. Client review pending.'
    );

    RETURN jsonb_build_object('success', true, 'status', 'completed_by_provider');
END;
$$;

-- Confirm Release of Escrow Funds
CREATE OR REPLACE FUNCTION public.confirm_service_release(p_deal_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deal public.service_deals%ROWTYPE;
    v_payout_amount NUMERIC(12,2);
    v_platform_fee NUMERIC(12,2);
    v_provider_wallet public.wallets%ROWTYPE;
    v_ref TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_deal
    FROM public.service_deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
    END IF;

    IF v_deal.client_id <> v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the client can confirm escrow release');
    END IF;

    IF v_deal.status NOT IN ('funded', 'completed_by_provider') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot release funds from status ' || v_deal.status);
    END IF;

    IF v_deal.held_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'No held funds found in deal escrow');
    END IF;

    v_platform_fee := round(v_deal.held_amount * 0.05, 2);
    v_payout_amount := v_deal.held_amount - v_platform_fee;

    INSERT INTO public.wallets (user_id, available_balance, total_earned)
    VALUES (v_deal.provider_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_provider_wallet
    FROM public.wallets
    WHERE user_id = v_deal.provider_id
    FOR UPDATE;

    v_ref := 'escrow_rel_' || p_deal_id || '_' || extract(epoch from now())::bigint;

    UPDATE public.wallets
    SET available_balance = available_balance + v_payout_amount,
        total_earned = coalesce(total_earned, 0) + v_payout_amount,
        updated_at = now()
    WHERE id = v_provider_wallet.id;

    INSERT INTO public.wallet_ledger (
        user_id, wallet_id, entry_type, amount, currency, source, source_reference, status, balance_before, balance_after, metadata
    ) VALUES (
        v_deal.provider_id, v_provider_wallet.id, 'credit', v_payout_amount, 'NGN', 'deal_escrow_release', v_ref, 'posted',
        v_provider_wallet.available_balance, v_provider_wallet.available_balance + v_payout_amount,
        jsonb_build_object('deal_id', p_deal_id, 'gross_amount', v_deal.held_amount, 'fee', v_platform_fee)
    );

    UPDATE public.service_deals
    SET status = 'released',
        held_amount = 0.00,
        client_confirmed_at = now(),
        updated_at = now()
    WHERE id = p_deal_id;

    INSERT INTO public.service_deal_events (
        deal_id, actor_id, event_type, amount, note
    ) VALUES (
        p_deal_id, v_user_id, 'confirmed_release', v_payout_amount, 'Client released escrow funds to provider: ₦' || v_payout_amount
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'released',
        'payout_amount', v_payout_amount,
        'fee', v_platform_fee
    );
END;
$$;

-- Dispute Service Deal
CREATE OR REPLACE FUNCTION public.dispute_service_deal(p_deal_id UUID, p_reason TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deal public.service_deals%ROWTYPE;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_deal
    FROM public.service_deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
    END IF;

    IF v_user_id NOT IN (v_deal.client_id, v_deal.provider_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF v_deal.status NOT IN ('funded', 'completed_by_provider') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot dispute a deal in status ' || v_deal.status);
    END IF;

    UPDATE public.service_deals
    SET status = 'disputed',
        dispute_reason = p_reason,
        disputed_by = v_user_id,
        updated_at = now()
    WHERE id = p_deal_id;

    INSERT INTO public.service_deal_events (
        deal_id, actor_id, event_type, amount, note
    ) VALUES (
        p_deal_id, v_user_id, 'disputed', v_deal.held_amount, 'Dispute filed: ' || coalesce(p_reason, 'No reason given')
    );

    RETURN jsonb_build_object('success', true, 'status', 'disputed');
END;
$$;

-- Cancel Service Deal
CREATE OR REPLACE FUNCTION public.cancel_service_deal(p_deal_id UUID, p_reason TEXT DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_deal public.service_deals%ROWTYPE;
    v_client_wallet public.wallets%ROWTYPE;
    v_ref TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    SELECT * INTO v_deal
    FROM public.service_deals
    WHERE id = p_deal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal not found');
    END IF;

    IF v_user_id NOT IN (v_deal.client_id, v_deal.provider_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    IF v_deal.status IN ('released', 'cancelled', 'refunded') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Deal is already finalised as ' || v_deal.status);
    END IF;

    IF v_deal.held_amount <= 0 THEN
        UPDATE public.service_deals
        SET status = 'cancelled', updated_at = now()
        WHERE id = p_deal_id;

        INSERT INTO public.service_deal_events (
            deal_id, actor_id, event_type, note
        ) VALUES (
            p_deal_id, v_user_id, 'cancelled', 'Cancelled prior to funding: ' || coalesce(p_reason, '')
        );

        RETURN jsonb_build_object('success', true, 'status', 'cancelled');
    END IF;

    SELECT * INTO v_client_wallet
    FROM public.wallets
    WHERE user_id = v_deal.client_id
    FOR UPDATE;

    v_ref := 'escrow_ref_' || p_deal_id || '_' || extract(epoch from now())::bigint;

    UPDATE public.wallets
    SET available_balance = available_balance + v_deal.held_amount,
        updated_at = now()
    WHERE id = v_client_wallet.id;

    INSERT INTO public.wallet_ledger (
        user_id, wallet_id, entry_type, amount, currency, source, source_reference, status, balance_before, balance_after, metadata
    ) VALUES (
        v_deal.client_id, v_client_wallet.id, 'credit', v_deal.held_amount, 'NGN', 'deal_escrow_refund', v_ref, 'posted',
        v_client_wallet.available_balance, v_client_wallet.available_balance + v_deal.held_amount,
        jsonb_build_object('deal_id', p_deal_id, 'refund_reason', p_reason)
    );

    UPDATE public.service_deals
    SET status = 'refunded',
        held_amount = 0.00,
        updated_at = now()
    WHERE id = p_deal_id;

    INSERT INTO public.service_deal_events (
        deal_id, actor_id, event_type, amount, note
    ) VALUES (
        p_deal_id, v_user_id, 'refunded', v_deal.held_amount, 'Deal cancelled & funds refunded: ' || coalesce(p_reason, '')
    );

    RETURN jsonb_build_object('success', true, 'status', 'refunded', 'refunded_amount', v_deal.held_amount);
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.open_view_once_media(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_user_report(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_coins_with_wallet(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_coin_gift(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_live_location(UUID, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stop_live_location(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.propose_service_deal(UUID, TEXT, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.counter_offer_service_deal(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_service_deal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fund_service_deal_from_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_service_completed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_service_release(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispute_service_deal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_service_deal(UUID, TEXT) TO authenticated;
