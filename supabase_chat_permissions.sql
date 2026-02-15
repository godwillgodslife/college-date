-- FIX CHAT PERMISSIONS (RLS)

-- 1. Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view messages for their matches" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages into their matches" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- 3. Create new Policies

-- SELECT: Users can see messages if they are part of the match
CREATE POLICY "Users can view messages for their matches" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = messages.match_id
            AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
        )
    );

-- INSERT: Users can send messages if they are part of the match AND they are the sender
CREATE POLICY "Users can insert messages into their matches" ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
            AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
        )
    );

-- UPDATE: Users can mark messages as read (if they are the recipient) or update their own
CREATE POLICY "Users can update messages" ON public.messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = match_id
            AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
        )
    );

-- 4. Grant access
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
