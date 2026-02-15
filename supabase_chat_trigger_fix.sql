-- FIX CHAT NOTIFICATIONS

-- 1. Drop potential old triggers that might be causing the "user_id" error
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS notify_on_message ON public.messages;

-- 2. Create the Correct Function
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id UUID;
    v_sender_name TEXT;
    match_record RECORD;
BEGIN
    -- 1. Get Sender Name
    SELECT first_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
    IF v_sender_name IS NULL THEN
        v_sender_name := 'Someone';
    END IF;

    -- 2. Find the Recipient from the Matches table
    -- The match has user1_id and user2_id. One of them is the sender.
    SELECT 
        CASE 
            WHEN user1_id = NEW.sender_id THEN user2_id
            ELSE user1_id 
        END INTO v_recipient_id
    FROM public.matches
    WHERE id = NEW.match_id;

    -- 3. Insert Notification if Recipient Found
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

-- 3. Create the Trigger
CREATE TRIGGER on_message_sent
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();
