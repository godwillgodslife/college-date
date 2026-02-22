-- SUPER UPGRADE: MULTI-PHOTO & LIVE MODE
-- This script adds supports for multiple photos, presence tracking, and Live Mode.

-- 1. Add New Columns to Profiles
DO $$ 
BEGIN 
    -- Column for multiple photos (Array of strings)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='profile_photos') THEN
        ALTER TABLE public.profiles ADD COLUMN profile_photos TEXT[] DEFAULT '{}';
    END IF;

    -- Column for real-time presence
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_seen_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;

    -- Flag for Live Mode
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_live') THEN
        ALTER TABLE public.profiles ADD COLUMN is_live BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Enable Realtime for Profiles
-- This allows the frontend to listen for "is_live" and "profile_photos" changes instantly.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
END $$;

-- 3. Heartbeat Function for Presence
-- Clients can call this via RPC to stay "Live"
CREATE OR REPLACE FUNCTION public.update_user_presence()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET 
        last_seen_at = now(),
        is_live = true
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Initial Backfill (Wrap existing avatar into the array)
UPDATE public.profiles
SET profile_photos = ARRAY[avatar_url]
WHERE (profile_photos IS NULL OR array_length(profile_photos, 1) IS NULL)
AND avatar_url IS NOT NULL;

-- 5. Ensure storage bucket for extra photos exists
-- (Handled by STORAGE_FIX_MASTER.sql but adding here as backup)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Specific policies for profile-photos bucket
DROP POLICY IF EXISTS "Allow authenticated upload to profile-photos" ON storage.objects;
CREATE POLICY "Allow authenticated upload to profile-photos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public select from profile-photos" ON storage.objects;
CREATE POLICY "Allow public select from profile-photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-photos');

SELECT 'SUCCESS: LIVE MODE SCHEMA UPGRADED' as status;
