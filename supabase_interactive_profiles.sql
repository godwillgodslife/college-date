-- INTERACTIVE PROFILES (GAMIFICATION PHASE 3)
-- Adds "Vibe Check" features: Voice Intro, Anthem, and Location Status.

-- 1. Add Columns to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS voice_intro_url TEXT,
ADD COLUMN IF NOT EXISTS anthem TEXT, -- e.g. "Burna Boy - Last Last"
ADD COLUMN IF NOT EXISTS location_status TEXT; -- e.g. "At the library"

-- 2. Create Storage Bucket for Voice Intros
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-intros', 'voice-intros', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies
-- Allow public access to listen
CREATE POLICY "Voice Intros are public"
ON storage.objects FOR SELECT
USING ( bucket_id = 'voice-intros' );

-- Allow users to upload their own voice intro
CREATE POLICY "Users can upload their own voice intro"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'voice-intros' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own
CREATE POLICY "Users can update their own voice intro"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'voice-intros' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own voice intro"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'voice-intros' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);
