-- NUCLEAR TRIGGER CLEANUP
-- This script dynamically finds ALL triggers on the 'messages' table and drops them.
-- Use this when you have "ghost" triggers causing errors.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Loop through all triggers on 'public.messages'
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'messages' 
        AND event_object_schema = 'public'
    LOOP
        -- 2. Drop the trigger dynamically
        EXECUTE 'DROP TRIGGER IF EXISTS "' || r.trigger_name || '" ON public.messages';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- 3. Now that the table is clean, re-create the ONE correct trigger
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id UUID;
    v_sender_name TEXT;
BEGIN
    -- Get Sender Name
    SELECT first_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
    IF v_sender_name IS NULL THEN
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

    -- Insert Notification (Using CORRECT column: recipient_id)
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
