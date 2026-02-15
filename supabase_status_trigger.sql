-- TRIGGER: Notify Matches on Status Update

CREATE OR REPLACE FUNCTION notify_matches_on_status()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
    match_record RECORD;
BEGIN
    -- 1. Get Sender Name
    SELECT first_name INTO v_sender_name FROM public.profiles WHERE id = NEW.user_id;
    IF v_sender_name IS NULL THEN
        v_sender_name := 'Someone';
    END IF;

    -- 2. Find all accepted matches
    -- We need to find users where (swiper = NEW.user_id OR swiped = NEW.user_id) AND status = 'accepted'
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
        -- 3. Insert Notification for each match
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

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_status_created ON public.statuses;

-- Create Trigger
CREATE TRIGGER on_status_created
AFTER INSERT ON public.statuses
FOR EACH ROW
EXECUTE FUNCTION notify_matches_on_status();
