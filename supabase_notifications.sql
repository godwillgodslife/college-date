-- NOTIFICATION SYSTEM MIGRATION

-- 1. Create Notifications Table (DROP first to ensure schema matches)
DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable (system messages)
    type TEXT NOT NULL CHECK (type IN ('match', 'message', 'view', 'payment', 'goal_reached', 'snapshot_reaction', 'status_update', 'system')),
    title TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g., { "link": "/chat/123", "amount": 500 }
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Recipients can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = recipient_id);

-- System/Users can insert notifications (Strictly controlled via backend or trusted functions usually, 
-- but for this architecture we allow authenticated users to trigger alerts like "I viewed you")
CREATE POLICY "Users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Recipients can update (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- 4. Enable Realtime
-- This allows the frontend to listen for INSERTs
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 5. Indexes for Performance
CREATE INDEX IF NOT EXISTS notifications_recipient_id_idx ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications(is_read);
