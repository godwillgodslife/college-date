-- ==========================================
-- ENABLE REALTIME FOR WALLETS
-- ==========================================

-- 1. Enable Realtime for the wallets table
ALTER TABLE public.wallets REPLICA IDENTITY FULL;

BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.wallets;
COMMIT;

-- 2. Ensure Row Level Security allows users to see their own wallet updates
-- (Adding this just in case, though it should already be handled by existing RLS)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
