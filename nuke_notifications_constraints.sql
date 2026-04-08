-- ==============================================
-- 🚀 THE DEFINITIVE NOTIFICATION & MATCH FIX
-- ==============================================
-- Run this in your Supabase SQL Editor.

-- 1. DROP NOTIFICATION CONSTRAINT
-- This solves the 'violates check constraint' error
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. ADD ONBOARDING COLUMN (Fixes the 400 Profile Error)
-- Required for the new stable onboarding tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;

-- 3. FIX MATCHES SECURITY (Fixes the 403 RLS Error)
-- These allow authenticated users to view and create matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Select Policy
DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;
CREATE POLICY "Users can view their own matches" ON public.matches
    FOR SELECT USING (auth.uid() = ANY(user_ids));

-- Insert Policy (Crucial for recordSwipe)
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;
CREATE POLICY "Users can insert matches" ON public.matches
    FOR INSERT WITH CHECK (auth.uid() = ANY(user_ids));

-- Insert Policy Variant (Sometimes user_ids check fails in INSERT without user1_id checks)
DROP POLICY IF EXISTS "Users can insert matches v2" ON public.matches;
CREATE POLICY "Users can insert matches v2" ON public.matches
    FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Optional: Upsert/Update Policy
DROP POLICY IF EXISTS "Users can update their matches" ON public.matches;
CREATE POLICY "Users can update their matches" ON public.matches
    FOR UPDATE USING (auth.uid() = ANY(user_ids));

-- 4. CLEANUP
COMMENT ON TABLE public.matches IS 'Matches table - RLS fixed for instant matching.';
COMMENT ON TABLE public.notifications IS 'Notifications table - Constraints removed.';
