-- ====================================================
-- FINAL POLISH SCHEMA (MARCH 6)
-- 1. 500 NGN Premium Swipe Pricing Fix
-- 2. 100% Notification Sync (OneSignal + In-App Bar)
-- 3. Trigger Audits & Global Edge Function Hook
-- ====================================================

-- Ensure the network extension is enabled before anything else
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Fix the Premium Swipe Pricing (5000 NGN -> 500 NGN)
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
    -- Set costs (Fixed to 500 NGN!)
    IF swipe_type = 'premium' THEN
        cost := 500.00;
    ELSE
        cost := 500.00; -- Standard swipe fallback if needed (usually free is handled below)
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
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance. Top up your wallet to continue.');
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


-- 2. Modify "notify_internally" to ALSO hit the OneSignal Edge Function
DROP FUNCTION IF EXISTS public.notify_internally(uuid,uuid,text,text,text,jsonb);
CREATE OR REPLACE FUNCTION public.notify_internally(
    v_user_id UUID,
    v_actor_id UUID,
    v_type TEXT,
    v_title TEXT,
    v_content TEXT,
    v_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
DECLARE
    v_onesignal_app_id TEXT;
    v_onesignal_api_key TEXT;
    v_request_body JSONB;
BEGIN
    -- A) Create the in-app notification row
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, metadata)
    VALUES (v_user_id, v_actor_id, v_type, v_title, v_content, v_metadata);

    -- B) Fire external OneSignal Push Notification (Fire-and-forget logic)
    -- This relies on the pg_net extension to send a POST request without blocking the DB transaction.
    
    -- In a secure production environment, you would use vault or edge functions. 
    -- For this direct integration, we assume a Supabase edge function handles the routing.
    
    -- Attempt to call Edge Function:
    BEGIN
        PERFORM net.http_post(
            url := current_setting('app.settings.edge_function_url', true) || '/push-notification',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
            ),
            body := jsonb_build_object(
                'user_id', v_user_id,
                'title', v_title,
                'body', v_content,
                'type', v_type,
                'metadata', v_metadata
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Safely ignore missing pg_net or edge function configuration during local dev
        RAISE NOTICE 'Failed to trigger external push: %', SQLERRM;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Add Trigger: Ensure Wallet Earnings dispatch Notifications
CREATE OR REPLACE FUNCTION public.on_wallet_earning_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify on receiving funds ('swipe_reward')
    IF NEW.type = 'swipe_reward' AND NEW.status = 'completed' THEN
        PERFORM public.notify_internally(
            NEW.user_id,
            NULL, -- System generated
            'wallet_credit',
            'Funds Received! 💸',
            'You just earned ₦' || NEW.amount || ' from a connection request.',
            jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_wallet_transaction_created ON public.wallet_transactions;
CREATE TRIGGER on_wallet_transaction_created
AFTER INSERT ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.on_wallet_earning_trigger();


-- 4. Instant Chat (Premium Match bypass) Setup
-- This creates a direct match automatically if a swipe is premium, fulfilling the instant messaging req
CREATE OR REPLACE FUNCTION auto_match_premium_swipes()
RETURNS TRIGGER AS $$
DECLARE
    v_match_id UUID;
BEGIN
    IF NEW.type = 'premium' THEN
        -- Auto-accept the swipe or create a match instantly
        INSERT INTO public.matches (user1_id, user2_id, user_ids)
        VALUES (
            LEAST(NEW.swiper_id, NEW.swiped_id),
            GREATEST(NEW.swiper_id, NEW.swiped_id),
            ARRAY[NEW.swiper_id, NEW.swiped_id]
        )
        ON CONFLICT (user1_id, user2_id) DO NOTHING
        RETURNING id INTO v_match_id;

        IF v_match_id IS NULL THEN
            SELECT id INTO v_match_id FROM public.matches 
            WHERE user1_id = LEAST(NEW.swiper_id, NEW.swiped_id) AND user2_id = GREATEST(NEW.swiper_id, NEW.swiped_id);
        END IF;

        -- Notify Recipient
        PERFORM public.notify_internally(
            NEW.swiped_id,
            NEW.swiper_id,
            'premium_match',
            'New Premium Match! 🌟',
            'Someone just paid to vibe with you. Respond now!',
            jsonb_build_object('match_id', v_match_id, 'swiper_id', NEW.swiper_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS premium_swipe_auto_match ON public.swipes;
CREATE TRIGGER premium_swipe_auto_match
AFTER INSERT OR UPDATE OF status ON public.swipes
FOR EACH ROW 
WHEN (NEW.type = 'premium' AND NEW.status = 'pending')
EXECUTE FUNCTION auto_match_premium_swipes();
