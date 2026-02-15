-- GRANDMASTER TRIGGER FIX
-- Fixes "column first_name does not exist" error across ALL features (Chat, Status, Snapshots)

-- ==========================================
-- 1. CHAT TRIGGER FIX
-- ==========================================
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
DROP FUNCTION IF EXISTS notify_on_new_message();

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id UUID;
    v_sender_name TEXT;
BEGIN
    -- Get Sender Name (Using full_name)
    SELECT split_part(full_name, ' ', 1) INTO v_sender_name 
    FROM public.profiles 
    WHERE id = NEW.sender_id;
    
    IF v_sender_name IS NULL OR v_sender_name = '' THEN
        v_sender_name := 'Someone';
    END IF;

    -- Find Recipient
    SELECT 
        CASE 
            WHEN user1_id = NEW.sender_id THEN user2_id
            ELSE user1_id 
        END INTO v_recipient_id
    FROM public.matches
    WHERE id = NEW.match_id;

    -- Insert Notification
    IF v_recipient_id IS NOT NULL THEN
        INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, metadata)
        VALUES (
            v_recipient_id,
            NEW.sender_id,
            'message',
            'New Message 💬',
            v_sender_name || ' sent you a message.',
            jsonb_build_object('match_id', NEW.match_id, 'url', '/chat')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_sent
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();


-- ==========================================
-- 2. STATUS TRIGGER FIX
-- ==========================================
DROP TRIGGER IF EXISTS on_status_created ON public.statuses;
DROP FUNCTION IF EXISTS notify_matches_on_status();

CREATE OR REPLACE FUNCTION notify_matches_on_status()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
    match_record RECORD;
BEGIN
    -- Get Sender Name (Using full_name)
    SELECT split_part(full_name, ' ', 1) INTO v_sender_name 
    FROM public.profiles 
    WHERE id = NEW.user_id;

    IF v_sender_name IS NULL OR v_sender_name = '' THEN
        v_sender_name := 'Someone';
    END IF;

    -- Find all accepted matches
    FOR match_record IN 
        SELECT 
            CASE 
                WHEN swiper_id = NEW.user_id THEN swiped_id
                ELSE swiper_id 
            END as recipient_id
        FROM public.swipes
        WHERE (swiper_id = NEW.user_id OR swiped_id = NEW.user_id)
        AND status = 'accepted'
    LOOP
        -- Insert Notification
        INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, metadata)
        VALUES (
            match_record.recipient_id,
            NEW.user_id,
            'status_update',
            'New Status Update ⭕',
            v_sender_name || ' just updated their status.',
            jsonb_build_object('url', '/status')
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_status_created
AFTER INSERT ON public.statuses
FOR EACH ROW
EXECUTE FUNCTION notify_matches_on_status();


-- ==========================================
-- 3. SNAPSHOT TRIGGER FIX
-- ==========================================
DROP TRIGGER IF EXISTS on_snapshot_created ON public.snapshots;
DROP FUNCTION IF EXISTS notify_matches_on_snapshot();

CREATE OR REPLACE FUNCTION notify_matches_on_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
    match_record RECORD;
BEGIN
    -- Get Sender Name (Using full_name)
    SELECT split_part(full_name, ' ', 1) INTO v_sender_name 
    FROM public.profiles 
    WHERE id = NEW.user_id;

    IF v_sender_name IS NULL OR v_sender_name = '' THEN
        v_sender_name := 'Someone';
    END IF;

    -- Find all accepted matches
    FOR match_record IN 
        SELECT 
            CASE 
                WHEN swiper_id = NEW.user_id THEN swiped_id
                ELSE swiper_id 
            END as recipient_id
        FROM public.swipes
        WHERE (swiper_id = NEW.user_id OR swiped_id = NEW.user_id)
        AND status = 'accepted'
    LOOP
        -- Insert Notification
        INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, metadata)
        VALUES (
            match_record.recipient_id,
            NEW.user_id,
            'snapshot',
            'New Snapshot 📸',
            v_sender_name || ' just added to their story!',
            jsonb_build_object('url', '/snapshots')
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_snapshot_created
AFTER INSERT ON public.snapshots
FOR EACH ROW
EXECUTE FUNCTION notify_matches_on_snapshot();
