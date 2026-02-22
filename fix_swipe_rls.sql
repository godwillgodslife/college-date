-- FIX SWIPES RLS PERMISSIONS
-- This allows users to UPDATE their own swipes (required for Profile Recycling/UPSERT)

-- 1. Allow Swiper to Update their own swipe
DROP POLICY IF EXISTS "Users can update own swipes" ON public.swipes;
CREATE POLICY "Users can update own swipes" 
ON public.swipes 
FOR UPDATE 
TO public
USING (auth.uid() = swiper_id)
WITH CHECK (auth.uid() = swiper_id);

-- 2. Ensure existing policies aren't conflicting
-- (Optional: Cleanup redundant policies seen in the logs)
-- DROP POLICY IF EXISTS "Users can insert own swipes" ON public.swipes;
-- DROP POLICY IF EXISTS "Users can insert swipes" ON public.swipes;

-- Ensure swiper can always insert
DROP POLICY IF EXISTS "Swipers can insert swipes" ON public.swipes;
CREATE POLICY "Swipers can insert swipes" 
ON public.swipes 
FOR INSERT 
TO public
WITH CHECK (auth.uid() = swiper_id);

-- Ensure swiper and recipient can view
DROP POLICY IF EXISTS "Participants can view swipes" ON public.swipes;
CREATE POLICY "Participants can view swipes" 
ON public.swipes 
FOR SELECT 
TO public
USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);
