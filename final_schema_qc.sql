-- ====================================================
-- FINAL QUALITY CONTROL: SCHEMA UNIFICATION (v2)
-- ====================================================

-- 1. Standardize Notifications Table Columns
-- We have conflicts between 'user_id/actor_id' and 'recipient_id/sender_id'
DO $$ 
BEGIN 
    -- 1.1 Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='recipient_id') THEN
        ALTER TABLE public.notifications ADD COLUMN recipient_id UUID REFERENCES public.profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='sender_id') THEN
        ALTER TABLE public.notifications ADD COLUMN sender_id UUID REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='actor_id') THEN
        ALTER TABLE public.notifications ADD COLUMN actor_id UUID REFERENCES public.profiles(id);
    END IF;

    -- 1.2 Sync columns to ensure legacy and new scripts both work
    UPDATE public.notifications SET recipient_id = user_id WHERE recipient_id IS NULL AND user_id IS NOT NULL;
    UPDATE public.notifications SET user_id = recipient_id WHERE user_id IS NULL AND recipient_id IS NOT NULL;
    UPDATE public.notifications SET sender_id = actor_id WHERE sender_id IS NULL AND actor_id IS NOT NULL;
    UPDATE public.notifications SET actor_id = sender_id WHERE actor_id IS NULL AND sender_id IS NOT NULL;

    -- 1.3 Drop and enlarge the Whitelist constraint
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
        CHECK (type IN (
            'match', 'message', 'view', 'payment', 'goal_reached', 
            'snapshot_reaction', 'status_update', 'system', 
            'snapshot', 'like', 'profile_view', 'super_swipe'
        ));
END $$;

-- 2. Consolidate Profile Views Schema
ALTER TABLE public.profile_views 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'discovery';

-- 3. Clean up ALL legacy triggers that might be using wrong column names
DROP TRIGGER IF EXISTS on_profile_view ON public.profile_views;
DROP TRIGGER IF EXISTS on_view_created ON public.profile_views;
DROP TRIGGER IF EXISTS on_profile_view_notification ON public.profile_views;

-- 4. Unified Trigger Function for Profile Views
CREATE OR REPLACE FUNCTION notify_on_profile_view()
RETURNS TRIGGER AS $$
DECLARE
    v_viewer_name TEXT;
    v_view_count INTEGER;
BEGIN
    -- 1. Get Viewer Name
    SELECT full_name INTO v_viewer_name FROM public.profiles WHERE id = NEW.viewer_id;

    -- 2. Anti-Spam: Only notify if not viewed in the last hour
    SELECT COUNT(*) INTO v_view_count 
    FROM public.profile_views 
    WHERE profile_owner_id = NEW.profile_owner_id 
    AND viewer_id = NEW.viewer_id
    AND created_at > (now() - INTERVAL '1 hour');

    IF v_view_count <= 1 THEN
        -- Standardize on ALL column names to avoid crashes if any script/frontend expects them
        INSERT INTO public.notifications (recipient_id, user_id, sender_id, actor_id, type, title, content, metadata)
        VALUES (
            NEW.profile_owner_id,
            NEW.profile_owner_id,
            NEW.viewer_id,
            NEW.viewer_id,
            'profile_view',
            'Profile Viewed 👀',
            COALESCE(v_viewer_name, 'Someone') || ' just checked out your profile!',
            jsonb_build_object('viewer_id', NEW.viewer_id, 'source', COALESCE(NEW.source, 'discovery'))
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-apply Unified Trigger
CREATE TRIGGER on_profile_view
AFTER INSERT ON public.profile_views
FOR EACH ROW
EXECUTE FUNCTION notify_on_profile_view();
