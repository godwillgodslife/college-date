-- 1. Create MATCHES table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_ids UUID[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user1_id, user2_id)
);

-- 2. Create MESSAGES table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add missing columns to messages if it already existed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='match_id') THEN
        ALTER TABLE public.messages ADD COLUMN match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='sender_id') THEN
        ALTER TABLE public.messages ADD COLUMN sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS matches_user_ids_idx ON public.matches USING GIN (user_ids);
CREATE INDEX IF NOT EXISTS messages_match_id_idx ON public.messages (match_id);

-- 4. Realtime
-- Use a safer way to add to publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'matches') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 5. RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing if re-running
DROP POLICY IF EXISTS "Users can see their own matches" ON public.matches;
CREATE POLICY "Users can see their own matches" ON public.matches
FOR SELECT USING (auth.uid() = ANY(user_ids));

DROP POLICY IF EXISTS "Users can see messages for their matches" ON public.messages;
CREATE POLICY "Users can see messages for their matches" ON public.messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.matches 
        WHERE id = messages.match_id 
        AND auth.uid() = ANY(user_ids)
    )
);

DROP POLICY IF EXISTS "Users can send messages to their matches" ON public.messages;
CREATE POLICY "Users can send messages to their matches" ON public.messages
FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.matches 
        WHERE id = messages.match_id 
        AND auth.uid() = ANY(user_ids)
    )
);

