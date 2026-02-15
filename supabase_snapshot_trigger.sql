-- TRIGGER: Notify Matches on New Snapshot

CREATE OR REPLACE FUNCTION notify_matches_on_snapshot()
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
        -- 3. Insert Notification
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

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_snapshot_created ON public.snapshots;

-- Create Trigger
CREATE TRIGGER on_snapshot_created
AFTER INSERT ON public.snapshots
FOR EACH ROW
EXECUTE FUNCTION notify_matches_on_snapshot();
