-- SNAPSHOT RESTORE SCRIPT
-- Now that we know uploads work (because we removed the bad trigger),
-- we will re-add the CORRECT trigger so notifications work again.

-- 1. Clean up (Just in case)
DROP TRIGGER IF EXISTS on_snapshot_created ON public.snapshots;
DROP TRIGGER IF EXISTS notify_matches_on_snapshot ON public.snapshots;
DROP FUNCTION IF EXISTS notify_matches_on_snapshot();

-- 2. Create Correct Function (Using full_name)
CREATE OR REPLACE FUNCTION notify_matches_on_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
    match_record RECORD;
BEGIN
    -- Get Sender Name (Safely handles missing profile or name)
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

-- 3. Create Trigger
CREATE TRIGGER on_snapshot_created
AFTER INSERT ON public.snapshots
FOR EACH ROW
EXECUTE FUNCTION notify_matches_on_snapshot();
