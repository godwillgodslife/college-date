-- SNAPSHOT FINAL FIX
-- Addresses:
-- 1. Potential RLS blocking inserts (403)
-- 2. "Ghost" triggers or "first_name" errors (400/500)

-- ==========================================
-- 1. RESET RLS POLICIES
-- ==========================================
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public snapshots are viewable by everyone" ON public.snapshots;
DROP POLICY IF EXISTS "Users can insert their own snapshots" ON public.snapshots;
DROP POLICY IF EXISTS "Users can update own snapshots" ON public.snapshots;
DROP POLICY IF EXISTS "Users can delete own snapshots" ON public.snapshots;

-- Allow Viewing (Authenticated users can see all snapshots for now to be safe, filter in query)
CREATE POLICY "Snapshots are viewable by authenticated users" ON public.snapshots
    FOR SELECT TO authenticated
    USING (true);

-- Allow Insert (Users can insert their own)
CREATE POLICY "Users can insert their own snapshots" ON public.snapshots
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Allow Update/Delete (Users can manage their own)
CREATE POLICY "Users can manage their own snapshots" ON public.snapshots
    FOR ALL TO authenticated
    USING (auth.uid() = user_id);


-- ==========================================
-- 2. NUKE & RE-CREATE NOTIFICATION TRIGGER
-- ==========================================
-- Drop ALL potential triggers to be safe
DROP TRIGGER IF EXISTS on_snapshot_created ON public.snapshots;
DROP TRIGGER IF EXISTS notify_matches_on_snapshot ON public.snapshots;
DROP FUNCTION IF EXISTS notify_matches_on_snapshot();

-- Create Correct Function (Using full_name)
CREATE OR REPLACE FUNCTION notify_matches_on_snapshot()
RETURNS TRIGGER AS $$
DECLARE
    v_sender_name TEXT;
    match_record RECORD;
BEGIN
    -- Get Sender Name (Safely)
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

-- Create Trigger
CREATE TRIGGER on_snapshot_created
AFTER INSERT ON public.snapshots
FOR EACH ROW
EXECUTE FUNCTION notify_matches_on_snapshot();
