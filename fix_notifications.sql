-- ==========================================
-- NOTIFICATION SYSTEM RESCUE PATCH v3
-- This creates a SECURITY DEFINER function 
-- that bypasses RLS entirely for inserts.
-- Run this ENTIRE script in the Supabase SQL Editor
-- ==========================================

-- 1. Enable Realtime on the notifications table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END
$$;

-- 2. Ensure RLS is on
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Clean up ALL existing policies (nuclear cleanup)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname);
  END LOOP;
END
$$;

-- 4. Recreate clean policies
-- SELECT: Users see only their own
CREATE POLICY "notif_select_own" ON public.notifications
FOR SELECT USING (auth.uid() = user_id);

-- UPDATE: Users mark their own as read
CREATE POLICY "notif_update_own" ON public.notifications
FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: Users delete their own
CREATE POLICY "notif_delete_own" ON public.notifications
FOR DELETE USING (auth.uid() = user_id);

-- 5. CREATE the SECURITY DEFINER function for inserts
-- This bypasses RLS so User A can notify User B
CREATE OR REPLACE FUNCTION public.insert_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_content TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  INSERT INTO public.notifications (user_id, actor_id, type, title, content, metadata)
  VALUES (p_user_id, p_actor_id, p_type, p_title, p_content, p_metadata)
  RETURNING to_jsonb(notifications.*) INTO result;
  
  RETURN result;
END;
$$;

-- 6. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_notification TO authenticated;

-- DONE! Notifications will now bypass RLS via the RPC function.
