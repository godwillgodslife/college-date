-- ====================================================
-- ENGAGEMENT & MONETIZATION OVERHAUL
-- ====================================================

-- 0. SCHEMA UNIFICATION (Ensures wallets columns match monetization specs)
DO $$
BEGIN
    -- If old 'balance' column exists, migrate it to 'available_balance'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='wallets' AND column_name='balance') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='wallets' AND column_name='available_balance') THEN
        ALTER TABLE public.wallets RENAME COLUMN balance TO available_balance;
    END IF;

    -- Ensure 'available_balance' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='wallets' AND column_name='available_balance') THEN
        ALTER TABLE public.wallets ADD COLUMN available_balance DECIMAL(12, 2) DEFAULT 0.00;
    END IF;
    
    -- Ensure audit columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='wallets' AND column_name='total_earned') THEN
        ALTER TABLE public.wallets ADD COLUMN total_earned DECIMAL(12, 2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='wallets' AND column_name='total_spent') THEN
        ALTER TABLE public.wallets ADD COLUMN total_spent DECIMAL(12, 2) DEFAULT 0.00;
    END IF;
END $$;

-- 0b. MESSAGES Table Schema Unification (Resolves 'conversation_id' conflict)
DO $$
BEGIN
    -- 1. Ensure match_id exists (as the primary FK)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='messages' AND column_name='match_id') THEN
        ALTER TABLE public.messages ADD COLUMN match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE;
    END IF;

    -- 2. If legacy 'conversation_id' exists:
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='messages' AND column_name='conversation_id') THEN
        -- CRITICAL: Drop NOT NULL constraint FIRST to unblock new inserts immediately
        ALTER TABLE public.messages ALTER COLUMN conversation_id DROP NOT NULL;

        -- Safely attempt to migrate valid data (wrapped in a block to ignore errors)
        BEGIN
            UPDATE public.messages m
            SET match_id = conversation_id 
            WHERE match_id IS NULL 
            AND EXISTS (SELECT 1 FROM public.matches q WHERE q.id = m.conversation_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping legacy message migration due to data inconsistency';
        END;
    END IF;

    -- 3. Ensure sender_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='messages' AND column_name='sender_id') THEN
        ALTER TABLE public.messages ADD COLUMN sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 1. Enable Realtime for Core Tables
DO $$
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add tables if not already members
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'swipes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.swipes;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profile_views') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_views;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wallets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
    END IF;
END $$;

-- 2. Profile Views Analytics & RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can see their views" ON public.profile_views;
CREATE POLICY "Owners can see their views" ON public.profile_views
FOR SELECT USING (auth.uid() = profile_owner_id);

DROP POLICY IF EXISTS "Users can log views" ON public.profile_views;
CREATE POLICY "Users can log views" ON public.profile_views
FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- 3. Swipes RLS Hardening
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own swipes" ON public.swipes;
CREATE POLICY "Users can see their own swipes" ON public.swipes
FOR SELECT USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

DROP POLICY IF EXISTS "Users can insert swipes" ON public.swipes;
CREATE POLICY "Users can insert swipes" ON public.swipes
FOR INSERT WITH CHECK (auth.uid() = swiper_id);

DROP POLICY IF EXISTS "Recipients can update their swipes" ON public.swipes;
CREATE POLICY "Recipients can update their swipes" ON public.swipes
FOR UPDATE USING (auth.uid() = swiped_id);

-- 3b. Wallet Publicity (For Top Seeker Badge)
DROP POLICY IF EXISTS "Anyone can view wallet spend" ON public.wallets;
CREATE POLICY "Anyone can view wallet spend" ON public.wallets
FOR SELECT USING (true);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- 4. Notification Triggers (SERVER-SIDE RELIABILITY)

-- Helper: Create Notification
CREATE OR REPLACE FUNCTION public.notify_internally(
    v_user_id UUID,
    v_actor_id UUID,
    v_type TEXT,
    v_title TEXT,
    v_content TEXT,
    v_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, metadata)
    VALUES (v_user_id, v_actor_id, v_type, v_title, v_content, v_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: On Profile View
CREATE OR REPLACE FUNCTION public.on_profile_view_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.notify_internally(
        NEW.profile_owner_id,
        NEW.viewer_id,
        'profile_view',
        'Profile Viewed',
        'Someone just viewed your profile! Click to see who.',
        jsonb_build_object('viewer_id', NEW.viewer_id, 'source', NEW.source)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_view_created ON public.profile_views;
CREATE TRIGGER on_view_created
AFTER INSERT ON public.profile_views
FOR EACH ROW EXECUTE FUNCTION public.on_profile_view_trigger();

-- Trigger: On Swipe Insert
CREATE OR REPLACE FUNCTION public.on_swipe_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'pending' THEN
        PERFORM public.notify_internally(
            NEW.swiped_id,
            NEW.swiper_id,
            'swipe_received',
            'New Connection Request',
            'Someone swiped right on you! Accept to start chatting.',
            jsonb_build_object('swipe_id', NEW.id, 'swipe_type', NEW.type)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_swipe_created ON public.swipes;
CREATE TRIGGER on_swipe_created
AFTER INSERT ON public.swipes
FOR EACH ROW EXECUTE FUNCTION public.on_swipe_insert_trigger();

-- Trigger: On New Message
CREATE OR REPLACE FUNCTION public.on_message_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id UUID;
    v_sender_name TEXT;
BEGIN
    -- Get the other user in the match
    SELECT 
        CASE 
            WHEN user1_id = NEW.sender_id THEN user2_id 
            ELSE user1_id 
        END INTO v_recipient_id
    FROM public.matches
    WHERE id = NEW.match_id;

    -- Get sender name
    SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

    IF v_recipient_id IS NOT NULL THEN
        PERFORM public.notify_internally(
            v_recipient_id,
            NEW.sender_id,
            'new_message',
            'New Message',
            v_sender_name || ': ' || LEFT(NEW.content, 50) || (CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END),
            jsonb_build_object('match_id', NEW.match_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_message_insert_trigger();

-- 5. REFINE Payment & Reward Logic 
-- Female earns ONLY when swipe is ACCEPTED

CREATE OR REPLACE FUNCTION public.accept_swipe_request(swipe_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_swiper_id UUID;
    v_swiped_id UUID;
    v_swipe_type TEXT;
    v_reward DECIMAL;
    v_swiped_wallet_id UUID;
    v_match_id UUID;
BEGIN
    -- 1. Get swipe details
    SELECT swiper_id, swiped_id, type INTO v_swiper_id, v_swiped_id, v_swipe_type
    FROM public.swipes
    WHERE id = swipe_id AND status = 'pending' AND swiped_id = auth.uid();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found or unauthorized');
    END IF;

    -- 2. Calculate Reward
    IF v_swipe_type = 'premium' THEN
        v_reward := 2500.00;
    ELSE
        v_reward := 250.00;
    END IF;

    -- 3. Update Swipe Status
    UPDATE public.swipes SET status = 'accepted' WHERE id = swipe_id;

    -- 4. Credit Recipient (Wallet Reward)
    SELECT id INTO v_swiped_wallet_id FROM public.wallets WHERE user_id = v_swiped_id;
    
    IF v_swiped_wallet_id IS NOT NULL THEN
        UPDATE public.wallets 
        SET available_balance = available_balance + v_reward,
            total_earned = total_earned + v_reward,
            updated_at = now()
        WHERE id = v_swiped_wallet_id;

        INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
        VALUES (v_swiped_id, v_swiped_wallet_id, 'swipe_reward', v_reward, 'completed', 
                'Earning from ' || UPPER(v_swipe_type) || ' Swipe', jsonb_build_object('swiper_id', v_swiper_id, 'swipe_type', v_swipe_type));
    END IF;

    -- 5. Create Match
    INSERT INTO public.matches (user1_id, user2_id, user_ids)
    VALUES (
        LEAST(v_swiper_id, v_swiped_id),
        GREATEST(v_swiper_id, v_swiped_id),
        ARRAY[v_swiper_id, v_swiped_id]
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
        SELECT id INTO v_match_id FROM public.matches 
        WHERE user1_id = LEAST(v_swiper_id, v_swiped_id) AND user2_id = GREATEST(v_swiper_id, v_swiped_id);
    END IF;

    -- 6. Notify Swiper
    PERFORM public.notify_internally(
        v_swiper_id,
        v_swiped_id,
        'swipe_accepted',
        'It''s a Match!',
        'Your connection request was accepted! You can now start chatting.',
        jsonb_build_object('match_id', v_match_id)
    );

    -- 7. Notify Swiped (The one who accepted)
    PERFORM public.notify_internally(
        v_swiped_id,
        v_swiper_id,
        'swipe_accepted',
        'It''s a Match!',
        'You accepted the request! You can now start chatting.',
        jsonb_build_object('match_id', v_match_id)
    );

    RETURN jsonb_build_object('success', true, 'match_id', v_match_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Refine process_swipe_payment (SWIPER PAYS ONLY)
CREATE OR REPLACE FUNCTION process_swipe_payment(
    swiper_id UUID,
    swiped_id UUID,
    swipe_type TEXT
)
RETURNS JSONB AS $$
DECLARE
    cost DECIMAL;
    swiper_wallet_id UUID;
    swiper_balance DECIMAL;
    is_free_swipe BOOLEAN := false;
BEGIN
    -- Set costs
    IF swipe_type = 'premium' THEN
        cost := 5000.00;
    ELSE
        cost := 500.00;
    END IF;

    -- Check for free swipes
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
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Deduct from Swiper
    UPDATE public.wallets 
    SET available_balance = available_balance - cost,
        total_spent = total_spent + cost,
        updated_at = now()
    WHERE id = swiper_wallet_id;

    INSERT INTO public.wallet_transactions (user_id, wallet_id, type, amount, status, description, metadata)
    VALUES (swiper_id, swiper_wallet_id, 'swipe_purchase', cost, 'completed', 
            UPPER(swipe_type) || ' Swipe Request', jsonb_build_object('target_id', swiped_id, 'swipe_type', swipe_type));

    RETURN jsonb_build_object('success', true, 'type', 'paid', 'amount', cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
