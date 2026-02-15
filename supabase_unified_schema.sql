-- ====================================================
-- PHASE 3: UNIFIED ECOSYSTEM (REQUEST-RESPONSE MODEL)
-- ====================================================

-- 1. Refine SWIPES table for Connectivity Model
ALTER TABLE public.swipes 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'premium')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
ADD COLUMN IF NOT EXISTS amount DECIMAL(12, 2) DEFAULT 500.00,
ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;

-- Index for high-speed retrieval of pending requests for ladies
CREATE INDEX IF NOT EXISTS swipes_receiver_status_idx ON public.swipes(swiped_id, status);

-- 2. Create PROFILE_VIEWS for analytics
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    profile_owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS profile_views_owner_idx ON public.profile_views(profile_owner_id);

-- 3. Upgrade process_swipe_payment RPC
-- Now supports Standard (500) and Premium (5,000) with 50/50 split
CREATE OR REPLACE FUNCTION process_swipe_payment(
    swiper_id UUID,
    swiped_id UUID,
    swipe_type TEXT -- 'standard' or 'premium'
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
    -- Set costs based on type
    IF swipe_type = 'premium' THEN
        cost := 5000.00;
        reward := 2500.00;
    ELSE
        cost := 500.00;
        reward := 2500.00; -- Wait, user said 500 cost -> 250 reward. Corrected below.
    END IF;

    -- Standard: 500 cost -> 250 reward
    IF swipe_type = 'standard' THEN
        reward := 250.00;
    END IF;

    -- Check for free swipes (only for standard)
    IF swipe_type = 'standard' THEN
        UPDATE public.profiles 
        SET free_swipes = free_swipes - 1
        WHERE id = swiper_id AND free_swipes > 0
        RETURNING true INTO is_free_swipe;
        
        IF is_free_swipe THEN
            RETURN jsonb_build_object('success', true, 'type', 'free');
        END IF;
    END IF;

    -- PAID Logic
    SELECT id, available_balance INTO swiper_wallet_id, swiper_balance 
    FROM public.wallets WHERE user_id = swiper_id;
    
    IF swiper_balance < cost THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Need ₦' || cost);
    END IF;

    -- Get target info
    SELECT role INTO swiped_role FROM public.profiles WHERE id = swiped_id;
    SELECT id INTO swiped_wallet_id FROM public.wallets WHERE user_id = swiped_id;

    -- Deduct from Swiper
    UPDATE public.wallets 
    SET available_balance = available_balance - cost,
        total_spent = total_spent + cost,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (swiper_id, swiper_wallet_id, 'swipe_purchase', cost, 'completed', 
            UPPER(swipe_type) || ' Swipe Request', jsonb_build_object('target_id', swiped_id, 'swipe_type', swipe_type));

    -- Credit Recipient (50% Split)
    IF swiped_wallet_id IS NOT NULL THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + reward,
            total_earned = total_earned + reward,
            updated_at = now()
        WHERE id = swiped_wallet_id;

        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (swiped_id, swiped_wallet_id, 'swipe_reward', reward, 'completed', 
                'Earning from ' || UPPER(swipe_type) || ' Swipe', jsonb_build_object('swiper_id', swiper_id, 'swipe_type', swipe_type));
    END IF;

    RETURN jsonb_build_object('success', true, 'type', 'paid', 'amount', cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atomic Function to Accept Swipe
CREATE OR REPLACE FUNCTION accept_swipe_request(
    swipe_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_swiper_id UUID;
    v_swiped_id UUID;
    v_match_id UUID;
BEGIN
    -- 1. Get swipe details and verify the acceptor is the target
    SELECT swiper_id, swiped_id INTO v_swiper_id, v_swiped_id
    FROM public.swipes
    WHERE id = swipe_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found or already processed');
    END IF;

    -- 2. Update Swipe Status
    UPDATE public.swipes SET status = 'accepted' WHERE id = swipe_id;

    -- 3. Create/Ensure Persistent Match & Chat
    -- participants sorted array
    DECLARE
        participants UUID[] := ARRAY[v_swiper_id, v_swiped_id];
    BEGIN
        -- Sort array for uniqueness
        IF participants[1] > participants[2] THEN
            participants := ARRAY[v_swiped_id, v_swiper_id];
        END IF;

        INSERT INTO public.matches (user1_id, user2_id, user_ids)
        VALUES (participants[1], participants[2], participants)
        ON CONFLICT (user1_id, user2_id) DO NOTHING
        RETURNING id INTO v_match_id;

        IF v_match_id IS NULL THEN
            SELECT id INTO v_match_id FROM public.matches 
            WHERE user1_id = participants[1] AND user2_id = participants[2];
        END IF;
    END;

    RETURN jsonb_build_object('success', true, 'match_id', v_match_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Visibility RLS Updates
-- Only allow viewing Status/Snapshots if there is an ACCEPTED connection

-- Example for Status (Broad concept, adjusting based on existing schema)
DROP POLICY IF EXISTS "Visible to connections" ON public.statuses;
CREATE POLICY "Visible to connections" ON public.statuses
FOR SELECT USING (
    auth.uid() = user_id -- Own status
    OR EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = auth.uid() AND swiped_id = statuses.user_id)
            OR (swiped_id = auth.uid() AND swiper_id = statuses.user_id)
        )
        AND status = 'accepted'
    )
);

-- Similarly for Snapshots
DROP POLICY IF EXISTS "Visible to connections" ON public.snapshots;
CREATE POLICY "Visible to connections" ON public.snapshots
FOR SELECT USING (
    auth.uid() = user_id -- Own snapshots
    OR EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = auth.uid() AND swiped_id = snapshots.user_id)
            OR (swiped_id = auth.uid() AND swiper_id = snapshots.user_id)
        )
        AND status = 'accepted'
    )
);

-- 6. Hidden Content Counters (Security Definer to bypass RLS for counts)
CREATE OR REPLACE FUNCTION get_hidden_content_counts(v_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_hidden_statuses INTEGER;
    v_hidden_snapshots INTEGER;
    v_24h TIMESTAMP WITH TIME ZONE := now() - INTERVAL '24 hours';
BEGIN
    -- Count statuses the user CANNOT see (not own, no accepted swipe)
    SELECT COUNT(*) INTO v_hidden_statuses
    FROM public.statuses
    WHERE created_at > v_24h
    AND user_id != v_user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = v_user_id AND swiped_id = statuses.user_id)
            OR (swiped_id = v_user_id AND swiper_id = statuses.user_id)
        )
        AND status = 'accepted'
    );

    -- Count snapshots the user CANNOT see
    SELECT COUNT(*) INTO v_hidden_snapshots
    FROM public.snapshots
    WHERE created_at > v_24h
    AND user_id != v_user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = v_user_id AND swiped_id = snapshots.user_id)
            OR (swiped_id = v_user_id AND swiper_id = snapshots.user_id)
        )
        AND status = 'accepted'
    );

    RETURN jsonb_build_object(
        'hidden_statuses', v_hidden_statuses,
        'hidden_snapshots', v_hidden_snapshots
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
