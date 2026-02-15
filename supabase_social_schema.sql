-- 1. Create STATUSES table (Ephemeral 24h updates)
CREATE TABLE IF NOT EXISTS public.statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create SNAPSHOTS table (Campus grid photos)
CREATE TABLE IF NOT EXISTS public.snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    description TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Storage Buckets (Run manually in Supabase Dashboard if this fails)
-- Insert into storage.buckets (id, name, public) values ('status-media', 'status-media', true);
-- Insert into storage.buckets (id, name, public) values ('snapshot-media', 'snapshot-media', true);

-- 4. Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'statuses') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.statuses;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'snapshots') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.snapshots;
    END IF;
END $$;

-- 5. RLS Policies
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view statuses and snapshots
DROP POLICY IF EXISTS "Public statuses are viewable by all users" ON public.statuses;
CREATE POLICY "Public statuses are viewable by all users" ON public.statuses
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public snapshots are viewable by all users" ON public.snapshots;
CREATE POLICY "Public snapshots are viewable by all users" ON public.snapshots
FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to manage their own content
DROP POLICY IF EXISTS "Users can insert their own status" ON public.statuses;
CREATE POLICY "Users can insert their own status" ON public.statuses
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own snapshot" ON public.snapshots;
CREATE POLICY "Users can insert their own snapshot" ON public.snapshots
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own status" ON public.statuses;
CREATE POLICY "Users can delete their own status" ON public.statuses
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own snapshot" ON public.snapshots;
CREATE POLICY "Users can delete their own snapshot" ON public.snapshots
FOR DELETE USING (auth.uid() = user_id);

-- 6. Storage Setup
-- Note: If these insert statements fail in your SQL editor, 
-- please create the buckets 'status-media' and 'snapshot-media' 
-- manually in the Supabase Dashboard and set them to PUBLIC.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('status-media', 'status-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('snapshot-media', 'snapshot-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for status-media
DROP POLICY IF EXISTS "Status media is public" ON storage.objects;
CREATE POLICY "Status media is public" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'status-media');

DROP POLICY IF EXISTS "Users can upload status media" ON storage.objects;
CREATE POLICY "Users can upload status media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'status-media');

-- Storage Policies for snapshot-media
DROP POLICY IF EXISTS "Snapshot media is public" ON storage.objects;
CREATE POLICY "Snapshot media is public" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'snapshot-media');

DROP POLICY IF EXISTS "Users can upload snapshot media" ON storage.objects;
CREATE POLICY "Users can upload snapshot media" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'snapshot-media');

-- 7. Atomic Increment Function for Likes
CREATE OR REPLACE FUNCTION increment_snapshot_likes(row_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.snapshots
    SET likes_count = likes_count + 1
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
