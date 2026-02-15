-- FIXES: Emoji Support, Snapshot Uploads, and Visibility Permissions

-- 1. Fix Message Type Constraint (Allow 'emoji')
-- We need to drop the constraint first. If the name is auto-generated, we might need to find it.
-- Assuming standard naming convention or the one we set previously.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_type_check') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_type_check;
    END IF;
END $$;

ALTER TABLE public.messages ADD CONSTRAINT messages_type_check 
CHECK (type IN ('text', 'voice', 'sticker', 'gift', 'emoji'));

-- 2. Enhance Snapshot/Status Visibility (Restrict to Matches)

-- Drop permissive policies
DROP POLICY IF EXISTS "Public statuses are viewable by all users" ON public.statuses;
DROP POLICY IF EXISTS "Public snapshots are viewable by all users" ON public.snapshots;

-- Ensure "Visible to connections" policies are in place for Statuses
DROP POLICY IF EXISTS "Visible to connections" ON public.statuses;
CREATE POLICY "Visible to connections" ON public.statuses
FOR SELECT USING (
    auth.uid() = user_id -- Own status
    OR EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = auth.uid() AND swiped_id = statuses.user_id)
            OR (swiped_id = auth.uid() AND swiper_id = statuses.user_id)
        )
        AND status = 'accepted'
    )
);

-- Ensure "Visible to connections" policies are in place for Snapshots
DROP POLICY IF EXISTS "Visible to connections" ON public.snapshots;
CREATE POLICY "Visible to connections" ON public.snapshots
FOR SELECT USING (
    auth.uid() = user_id -- Own snapshots
    OR EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = auth.uid() AND swiped_id = snapshots.user_id)
            OR (swiped_id = auth.uid() AND swiper_id = snapshots.user_id)
        )
        AND status = 'accepted'
    )
);

-- 3. Fix Snapshot Uploads (Storage)
-- Ensure buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('snapshot-media', 'snapshot-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('status-media', 'status-media', true)
ON CONFLICT (id) DO NOTHING;

-- Fix Storage Policies (Ensure Authenticated users can upload)

-- SNAPSHOTS
DROP POLICY IF EXISTS "Snapshot media is public" ON storage.objects;
CREATE POLICY "Snapshot media is public" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'snapshot-media');

DROP POLICY IF EXISTS "Users can upload snapshot media" ON storage.objects;
CREATE POLICY "Users can upload snapshot media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'snapshot-media');

-- STATUSES
DROP POLICY IF EXISTS "Status media is public" ON storage.objects;
CREATE POLICY "Status media is public" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'status-media');

DROP POLICY IF EXISTS "Users can upload status media" ON storage.objects;
CREATE POLICY "Users can upload status media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'status-media');
