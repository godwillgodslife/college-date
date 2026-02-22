-- STORAGE FIX MASTER: INITIALIZE ALL BUCKETS
-- Run this in the Supabase SQL Editor to fix "Bucket not found" errors.

-- 1. Create Buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('snap_media', 'snap_media', true),
    ('status-media', 'status-media', true),
    ('snapshot-media', 'snapshot-media', true),
    ('avatars', 'avatars', true),
    ('voice-intros', 'voice-intros', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage RLS Policies (Allow authenticated users to upload)
-- We use a generic policy for all buckets to keep it simple, or specific ones.

-- SNAP MEDIA Policies
DROP POLICY IF EXISTS "Allow user to upload snaps" ON storage.objects;
CREATE POLICY "Allow user to upload snaps" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'snap_media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public view snaps" ON storage.objects;
CREATE POLICY "Allow public view snaps" ON storage.objects
    FOR SELECT USING (bucket_id = 'snap_media');

-- STATUS MEDIA Policies
DROP POLICY IF EXISTS "Allow user to upload status" ON storage.objects;
CREATE POLICY "Allow user to upload status" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'status-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public view status" ON storage.objects;
CREATE POLICY "Allow public view status" ON storage.objects
    FOR SELECT USING (bucket_id = 'status-media');

-- SNAPSHOT MEDIA Policies
DROP POLICY IF EXISTS "Allow user to upload snapshot" ON storage.objects;
CREATE POLICY "Allow user to upload snapshot" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'snapshot-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public view snapshot" ON storage.objects;
CREATE POLICY "Allow public view snapshot" ON storage.objects
    FOR SELECT USING (bucket_id = 'snapshot-media');

-- AVATARS Policies
DROP POLICY IF EXISTS "Allow user to upload avatar" ON storage.objects;
CREATE POLICY "Allow user to upload avatar" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public view avatars" ON storage.objects;
CREATE POLICY "Allow public view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- VOICE INTROS Policies
DROP POLICY IF EXISTS "Allow user to upload voice intro" ON storage.objects;
CREATE POLICY "Allow user to upload voice intro" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'voice-intros' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public view voice intros" ON storage.objects;
CREATE POLICY "Allow public view voice intros" ON storage.objects
    FOR SELECT USING (bucket_id = 'voice-intros');

-- 3. ENSURE DIRECT SNAPS TABLE EXISTS (Backup)
CREATE TABLE IF NOT EXISTS public.direct_snaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened')),
    viewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for direct_snaps
ALTER TABLE public.direct_snaps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see received snaps" ON public.direct_snaps;
DROP POLICY IF EXISTS "Users can see sent snaps" ON public.direct_snaps;
DROP POLICY IF EXISTS "Users can send snaps" ON public.direct_snaps;
DROP POLICY IF EXISTS "Users can update received snaps" ON public.direct_snaps;

CREATE POLICY "Users can see received snaps" ON public.direct_snaps FOR SELECT USING (auth.uid() = receiver_id);
CREATE POLICY "Users can see sent snaps" ON public.direct_snaps FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Users can send snaps" ON public.direct_snaps FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update received snaps" ON public.direct_snaps FOR UPDATE USING (auth.uid() = receiver_id);

SELECT 'SUCCESS: STORAGE BUCKETS INITIALIZED' as status;
