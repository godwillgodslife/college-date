-- ====================================================
-- FINAL NOTIFICATION & TRIGGER REPAIR
-- Resolves "notifications_type_check" violations and column mismatches
-- ====================================================

-- 1. FIX NOTIFICATION CONSTRAINT (Add all missing types)
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'match', 
        'message', 
        'new_message',           -- Added
        'view', 
        'profile_view',         -- Added
        'payment', 
        'goal_reached', 
        'snapshot_reaction', 
        'status_update', 
        'system',
        'snapshot',
        'like',
        'swipe_received',       -- Added
        'swipe_accepted',       -- Added
        'daily_reset'           -- Added
    ));

-- 2. FIX notify_internally FUNCTION (Use correct column names)
-- The table uses recipient_id/sender_id, but the function used user_id/actor_id
DROP FUNCTION IF EXISTS public.notify_internally(uuid,uuid,text,text,text,jsonb);

CREATE OR REPLACE FUNCTION public.notify_internally(
    v_recipient_id UUID,
    v_sender_id UUID,
    v_type TEXT,
    v_title TEXT,
    v_content TEXT,
    v_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, metadata)
    VALUES (v_recipient_id, v_sender_id, v_type, v_title, v_content, v_metadata);
EXCEPTION WHEN OTHERS THEN
    -- Prevent notification failures from breaking core transactions (like swipes)
    RAISE WARNING 'Notification failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FIX Swipe Trigger (Ensure it uses the corrected notify_internally)
DROP FUNCTION IF EXISTS public.on_swipe_insert_trigger() CASCADE;

CREATE OR REPLACE FUNCTION public.on_swipe_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on LIKES (direction = 'right')
    IF NEW.direction = 'right' AND NEW.status = 'pending' THEN
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

-- 4. FIX accept_swipe_request (Ensure it uses the corrected notify_internally)
DROP FUNCTION IF EXISTS public.accept_swipe_request(uuid);

CREATE OR REPLACE FUNCTION public.accept_swipe_request(p_swipe_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_swiper_id UUID;
    v_swiped_id UUID;
    v_swipe_type TEXT;
    v_reward DECIMAL;
    v_swiped_wallet_id UUID;
    v_match_id UUID;
BEGIN
    -- 1. Get swipe details (Check auth.uid() for security)
    SELECT swiper_id, swiped_id, type INTO v_swiper_id, v_swiped_id, v_swipe_type
    FROM public.swipes
    WHERE id = p_swipe_id AND status = 'pending' AND swiped_id = auth.uid();

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
    UPDATE public.swipes SET status = 'accepted' WHERE id = p_swipe_id;

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

    -- 7. Notify Swiped
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
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
