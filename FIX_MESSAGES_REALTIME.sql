-- ==========================================
-- FIX CHAT REALTIME & OPTIMISTIC RELIABILITY
-- ==========================================

-- 1. Ensure messages table has full replica identity for better realtime tracking
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- 2. Ensure messages are in the publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
END $$;

-- 3. Verify wallets are also in the publication (for revenue sync)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
    END IF;
END $$;
