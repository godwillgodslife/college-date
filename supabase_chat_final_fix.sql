-- CHAT TRIGGER FINAL FIX
-- The previous error "column first_name does not exist" happened because the profiles table uses "full_name".

-- 1. Drop the incorrect function and trigger
DROP TRIGGER IF EXISTS on_message_sent ON public.messages;
DROP FUNCTION IF EXISTS notify_on_new_message();

-- 2. Re-create the Function with the CORRECT column (full_name)
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id UUID;
    v_sender_name TEXT;
BEGIN
    -- Get Sender Name (Using full_name, and taking the first part)
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

-- 3. Re-create the Trigger
CREATE TRIGGER on_message_sent
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();
