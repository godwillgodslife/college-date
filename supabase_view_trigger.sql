-- TRIGGER: Notify on Profile View

CREATE OR REPLACE FUNCTION notify_on_profile_view()
RETURNS TRIGGER AS $$
DECLARE
    v_viewer_name TEXT;
    v_view_count INTEGER;
BEGIN
    -- 1. Get Viewer Name
    SELECT first_name INTO v_viewer_name FROM public.profiles WHERE id = NEW.viewer_id;

    -- 2. Count views in last hour to avoid spamming
    SELECT COUNT(*) INTO v_view_count 
    FROM public.profile_views 
    WHERE profile_owner_id = NEW.profile_owner_id 
    AND viewed_at > (now() - INTERVAL '1 hour');

    -- 3. Send Notification (Throttle: Only if it's the 1st, 5th, 10th... view or purely every time? 
    -- Let's do it for every view but the Client app usually throttles the INSERT)
    
    INSERT INTO public.notifications (recipient_id, sender_id, type, title, content, metadata)
    VALUES (
        NEW.profile_owner_id,
        NEW.viewer_id,
        'view',
        'New Profile View 👀',
        'Someone just checked out your profile!',
        jsonb_build_object('viewer_id', NEW.viewer_id, 'url', '/profile')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_profile_view ON public.profile_views;

-- Create Trigger
CREATE TRIGGER on_profile_view
AFTER INSERT ON public.profile_views
FOR EACH ROW
EXECUTE FUNCTION notify_on_profile_view();
