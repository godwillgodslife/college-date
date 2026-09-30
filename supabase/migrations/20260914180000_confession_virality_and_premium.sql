-- ==============================================================================
-- Migration: 20260914180000_confession_virality_and_premium.sql
-- Description: Adds user_anonymous_messages for NGL-style links, confession post
--              types (anonymous meme vs campus post), reposts, comment likes & replies,
--              and profile video support.
-- ==============================================================================

-- 1. NGL-STYLE USER ANONYMOUS MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.user_anonymous_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_username text NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    is_read boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_anonymous_messages_recipient ON public.user_anonymous_messages (recipient_id, created_at DESC);

ALTER TABLE public.user_anonymous_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated web visitors) can submit an anonymous message via ask link
DROP POLICY IF EXISTS "Public anonymous insert" ON public.user_anonymous_messages;
CREATE POLICY "Public anonymous insert"
ON public.user_anonymous_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only the recipient can view their received messages
DROP POLICY IF EXISTS "Recipient view own messages" ON public.user_anonymous_messages;
CREATE POLICY "Recipient view own messages"
ON public.user_anonymous_messages FOR SELECT
TO authenticated
USING (auth.uid() = recipient_id);

-- Only the recipient can update (mark as read) their messages
DROP POLICY IF EXISTS "Recipient update own messages" ON public.user_anonymous_messages;
CREATE POLICY "Recipient update own messages"
ON public.user_anonymous_messages FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id);

-- Only the recipient can delete their messages
DROP POLICY IF EXISTS "Recipient delete own messages" ON public.user_anonymous_messages;
CREATE POLICY "Recipient delete own messages"
ON public.user_anonymous_messages FOR DELETE
TO authenticated
USING (auth.uid() = recipient_id);

GRANT ALL ON TABLE public.user_anonymous_messages TO service_role;
GRANT SELECT, UPDATE, DELETE ON TABLE public.user_anonymous_messages TO authenticated;
GRANT INSERT ON TABLE public.user_anonymous_messages TO anon, authenticated;


-- 2. CONFESSIONS TABLE ENHANCEMENTS FOR POST TYPES & MEDIA
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'anonymous_confession';
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT true;
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS author_avatar text;
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS author_username text;
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.confessions ADD COLUMN IF NOT EXISTS repost_count integer DEFAULT 0;


-- 3. CONFESSION REPOSTS TABLE
CREATE TABLE IF NOT EXISTS public.confession_reposts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    confession_id uuid NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT confession_reposts_unique UNIQUE (confession_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_confession_reposts_user ON public.confession_reposts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confession_reposts_confession ON public.confession_reposts (confession_id);

ALTER TABLE public.confession_reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reposts" ON public.confession_reposts;
CREATE POLICY "Anyone can view reposts"
ON public.confession_reposts FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated users can repost" ON public.confession_reposts;
CREATE POLICY "Authenticated users can repost"
ON public.confession_reposts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can undo repost" ON public.confession_reposts;
CREATE POLICY "Users can undo repost"
ON public.confession_reposts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.confession_reposts TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.confession_reposts TO authenticated;
GRANT SELECT ON TABLE public.confession_reposts TO anon;

-- Repost counter trigger on confessions
CREATE OR REPLACE FUNCTION public.sync_confession_repost_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.confessions
        SET repost_count = COALESCE(repost_count, 0) + 1
        WHERE id = NEW.confession_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.confessions
        SET repost_count = GREATEST(0, COALESCE(repost_count, 0) - 1)
        WHERE id = OLD.confession_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_confession_repost_counter ON public.confession_reposts;
CREATE TRIGGER trg_confession_repost_counter
AFTER INSERT OR DELETE ON public.confession_reposts
FOR EACH ROW
EXECUTE FUNCTION public.sync_confession_repost_count();


-- 4. CONFESSION COMMENTS LIKES & NESTED REPLIES
ALTER TABLE public.confession_comments ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0;
ALTER TABLE public.confession_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.confession_comments(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS public.confession_comment_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id uuid NOT NULL REFERENCES public.confession_comments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT confession_comment_likes_unique UNIQUE (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_confession_comment_likes_comment ON public.confession_comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS idx_confession_comment_likes_user ON public.confession_comment_likes (user_id);

ALTER TABLE public.confession_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.confession_comment_likes;
CREATE POLICY "Anyone can view comment likes"
ON public.confession_comment_likes FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Users can like comments" ON public.confession_comment_likes;
CREATE POLICY "Users can like comments"
ON public.confession_comment_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike comments" ON public.confession_comment_likes;
CREATE POLICY "Users can unlike comments"
ON public.confession_comment_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.confession_comment_likes TO service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.confession_comment_likes TO authenticated;
GRANT SELECT ON TABLE public.confession_comment_likes TO anon;

-- Comment like counter trigger
CREATE OR REPLACE FUNCTION public.sync_confession_comment_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.confession_comments
        SET like_count = COALESCE(like_count, 0) + 1
        WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.confession_comments
        SET like_count = GREATEST(0, COALESCE(like_count, 0) - 1)
        WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_confession_comment_like_counter ON public.confession_comment_likes;
CREATE TRIGGER trg_confession_comment_like_counter
AFTER INSERT OR DELETE ON public.confession_comment_likes
FOR EACH ROW
EXECUTE FUNCTION public.sync_confession_comment_like_count();


-- 5. PROFILE VIDEO SUPPORT
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS video_url text;


-- 6. RECREATE OPTIMIZED_CONFESSIONS VIEW WITH NEW COLUMNS APPENDED
CREATE OR REPLACE VIEW public.optimized_confessions AS
SELECT 
    c.id,
    c.content,
    c.university,
    c.user_id,
    c.created_at,
    COALESCE(r.reaction_data, '[]'::jsonb) as reaction_data,
    COALESCE(r.total_reactions, 0) as total_reactions,
    COALESCE(c.comment_count, comm.comment_count, 0) as comment_count,
    COALESCE(cl.claimer_ids, '[]'::jsonb) as claimer_ids,
    (COALESCE(r.total_reactions, 0) >= 20) as is_viral,
    COALESCE(c.post_type, 'anonymous_confession') as post_type,
    COALESCE(c.is_anonymous, true) as is_anonymous,
    c.author_name,
    c.author_avatar,
    c.author_username,
    c.image_url,
    COALESCE(c.repost_count, 0) as repost_count
FROM public.confessions c
LEFT JOIN (
    SELECT 
        confession_id,
        jsonb_agg(jsonb_build_object('u', user_id, 'e', emoji)) as reaction_data,
        COUNT(*) as total_reactions
    FROM public.confession_reactions
    GROUP BY confession_id
) r ON c.id = r.confession_id
LEFT JOIN (
    SELECT confession_id, COUNT(*) as comment_count
    FROM public.confession_comments
    GROUP BY confession_id
) comm ON c.id = comm.confession_id
LEFT JOIN (
    SELECT confession_id, jsonb_agg(claimer_id) as claimer_ids
    FROM public.confession_claims
    GROUP BY confession_id
) cl ON c.id = cl.confession_id;

GRANT SELECT ON public.optimized_confessions TO anon, authenticated;


-- 7. STORAGE BUCKETS FOR MEDIA
INSERT INTO storage.buckets (id, name, public)
VALUES ('confessions-media', 'confessions-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-videos', 'profile-videos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read confessions media" ON storage.objects;
CREATE POLICY "Public read confessions media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'confessions-media');

DROP POLICY IF EXISTS "Authenticated upload confessions media" ON storage.objects;
CREATE POLICY "Authenticated upload confessions media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'confessions-media');

DROP POLICY IF EXISTS "Public read profile videos" ON storage.objects;
CREATE POLICY "Public read profile videos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'profile-videos');

DROP POLICY IF EXISTS "Authenticated upload profile videos" ON storage.objects;
CREATE POLICY "Authenticated upload profile videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-videos');


-- 8. REALTIME REPLICATION ENABLEMENT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'user_anonymous_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_anonymous_messages;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'confession_reposts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.confession_reposts;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'confession_comment_likes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.confession_comment_likes;
    END IF;
END $$;
