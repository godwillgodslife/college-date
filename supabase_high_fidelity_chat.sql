-- High-Fidelity Chat Features Update

-- 1. Profiles: Add last_seen_at and is_verified
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 2. Messages: Add is_read, message_type, and metadata
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='is_read') THEN
        ALTER TABLE public.messages ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='type') THEN
        ALTER TABLE public.messages ADD COLUMN type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice', 'sticker', 'gift'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='metadata') THEN
        ALTER TABLE public.messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Matches: Add vibe_score and phone_shared
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS vibe_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS phone_shared BOOLEAN DEFAULT false;

-- 4. Enable Realtime for the new columns
-- Supabase Realtime automatically includes new columns if the table is already in the publication.
-- However, we ensure the publication exists.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 5. Storage Bucket for Voice Notes
-- This usually needs to be done via the dashboard or API, but we can try to insert into storage.buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for chat-media
DROP POLICY IF EXISTS "Chat media is public" ON storage.objects;
CREATE POLICY "Chat media is public" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "Users can upload chat media" ON storage.objects;
CREATE POLICY "Users can upload chat media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');
