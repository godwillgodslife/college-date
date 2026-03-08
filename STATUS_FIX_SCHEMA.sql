-- ==============================================================================
-- STATUS UPLOADS FIX: Storage Bucket & RLS Policies
-- Execute this in the Supabase SQL Editor to fix status media uploads
-- ==============================================================================

-- 1. Create the Storage Bucket for 'status-media' if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('status-media', 'status-media', true, false)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing restrictive policies on the bucket to prevent conflicts
DROP POLICY IF EXISTS "Public View Status Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated User Upload Status Media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own status media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own status media" ON storage.objects;

-- 3. Create permissive but secure Storage Policies for 'status-media'
-- Allow public viewing of status media
CREATE POLICY "Public View Status Media"
ON storage.objects FOR SELECT
USING ( bucket_id = 'status-media' );

-- Allow authenticated users to upload new media
CREATE POLICY "Authenticated User Upload Status Media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'status-media' );

-- Allow users to update their own media (if they re-upload)
CREATE POLICY "Users can update own status media"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'status-media' AND auth.uid()::text = (storage.foldername(name))[1] );

-- Allow users to delete their own media
CREATE POLICY "Users can delete own status media"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'status-media' AND auth.uid()::text = (storage.foldername(name))[1] );


-- ==============================================================================
-- 4. Ensure `status_updates` table has the correct RLS policies
-- ==============================================================================

-- Ensure table exists just in case
CREATE TABLE IF NOT EXISTS public.status_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Enable RLS
ALTER TABLE public.status_updates ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.status_updates;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.status_updates;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.status_updates;

-- Recreate clean policies
CREATE POLICY "Enable read access for all users"
ON public.status_updates FOR SELECT
USING ( true );

CREATE POLICY "Enable insert for authenticated users only"
ON public.status_updates FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Enable delete for users based on user_id"
ON public.status_updates FOR DELETE
TO authenticated
USING ( auth.uid() = user_id );

GRANT ALL ON public.status_updates TO authenticated;
GRANT ALL ON public.status_updates TO service_role;

-- Done!
