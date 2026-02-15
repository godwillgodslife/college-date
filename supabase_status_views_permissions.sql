-- FIX RLS FOR STATUS VIEWS
-- The 403 error suggests RLS is blocking inserts/selects

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.status_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id UUID REFERENCES public.statuses(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(status_id, viewer_id)
);

-- 2. Reset RLS
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

-- Drop old policies to be safe
DROP POLICY IF EXISTS "Users can insert their own views" ON public.status_views;
DROP POLICY IF EXISTS "Status owners can see viewers" ON public.status_views;
DROP POLICY IF EXISTS "Users can see their own views" ON public.status_views;

-- 3. Re-create Policies

-- Allow users to record that THEY viewed a status
CREATE POLICY "Users can insert their own views" ON public.status_views
    FOR INSERT 
    WITH CHECK (auth.uid() = viewer_id);

-- Allow users to see who viewed THEIR status
-- This requires a join, which RLS can do but sometimes is tricky.
-- Simpler approach: Allow authenticated users to SELECT? 
-- No, privacy.
-- Let's use a standard policy:
CREATE POLICY "Status owners can see viewers" ON public.status_views
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.statuses
            WHERE statuses.id = status_views.status_id
            AND statuses.user_id = auth.uid()
        )
    );

-- Allow users to see what they have viewed (for logic checks)
CREATE POLICY "Users can see their own views" ON public.status_views
    FOR SELECT
    USING (auth.uid() = viewer_id);

-- Grant permissions just in case
GRANT ALL ON public.status_views TO authenticated;
GRANT ALL ON public.status_views TO service_role;
