-- ==============================================
-- FIX: matches table RLS INSERT policy
-- ==============================================
-- Error: "new row violates row-level security policy for table matches"
-- Cause: There is a SELECT policy on matches but NO INSERT policy,
--        so the client-side upsert in swipeService.js gets rejected.
-- Fix:   Allow authenticated users to insert a match where they are a participant.

-- Ensure RLS is on
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Drop any stale insert policies
DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
DROP POLICY IF EXISTS "Users can insert matches" ON public.matches;

-- Allow a user to insert a match only if they are one of the two participants
CREATE POLICY "Users can insert matches"
ON public.matches
FOR INSERT
WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Also ensure users can read their own matches (in case missing)
DROP POLICY IF EXISTS "Users can see their own matches" ON public.matches;
CREATE POLICY "Users can see their own matches"
ON public.matches
FOR SELECT
USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
);
