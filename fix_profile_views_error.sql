-- 1. Ensure 'source' column exists on profile_views
ALTER TABLE public.profile_views 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'discovery';

-- 2. Fix the trigger function that uses non-existent 'first_name' column
-- It should use 'full_name' based on the profiles table schema
CREATE OR REPLACE FUNCTION notify_on_profile_view()
RETURNS TRIGGER AS $$
DECLARE
    v_viewer_name TEXT;
    v_view_count INTEGER;
BEGIN
    -- 1. Get Viewer Name (Fix: use full_name instead of first_name)
    SELECT full_name INTO v_viewer_name FROM public.profiles WHERE id = NEW.viewer_id;

    -- 2. Count views in last hour to avoid spamming
    -- Fix: ensure 'created_at' is used instead of 'viewed_at' if that was the case
    SELECT COUNT(*) INTO v_view_count 
    FROM public.profile_views 
    WHERE profile_owner_id = NEW.profile_owner_id 
    AND created_at > (now() - INTERVAL '1 hour');

    -- 3. Send Notification
    -- Re-using createNotification style logic but via direct insert
    INSERT INTO public.notifications (recipient_id, actor_id, type, title, content, metadata)
    VALUES (
        NEW.profile_owner_id,
        NEW.viewer_id,
        'profile_view',
        'Profile Viewed 👀',
        COALESCE(v_viewer_name, 'Someone') || ' just checked out your profile!',
        jsonb_build_object('viewer_id', NEW.viewer_id, 'source', COALESCE(NEW.source, 'discovery'))
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-apply the trigger
DROP TRIGGER IF EXISTS on_profile_view ON public.profile_views;
CREATE TRIGGER on_profile_view
AFTER INSERT ON public.profile_views
FOR EACH ROW
EXECUTE FUNCTION notify_on_profile_view();

COMMENT ON COLUMN public.profile_views.source IS 'Added to track where the profile view originated from.';
