-- FIX: Allow Snapshot Creation (INSERT Policy)

-- 1. Ensure INSERT policy exists for Snapshots
-- We drop it first to avoid conflicts if a partial one exists
DROP POLICY IF EXISTS "Users can insert their own snapshot" ON public.snapshots;

CREATE POLICY "Users can insert their own snapshot" ON public.snapshots
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Ensure INSERT policy exists for Statuses (Safety check)
DROP POLICY IF EXISTS "Users can insert their own status" ON public.statuses;

CREATE POLICY "Users can insert their own status" ON public.statuses
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Verify SELECT policies don't conflict (Refining Visibility)
-- We re-apply the visibility policy just to be 100% sure it's correct alongside the INSERT
-- (This allows seeing OWN snapshots + MATCHED snapshots)

DROP POLICY IF EXISTS "Visible to connections" ON public.snapshots;
CREATE POLICY "Visible to connections" ON public.snapshots
FOR SELECT USING (
    auth.uid() = user_id -- Own snapshots
    OR EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = auth.uid() AND swiped_id = snapshots.user_id)
            OR (swiped_id = auth.uid() AND swiper_id = snapshots.user_id)
        )
        AND status = 'accepted'
    )
);

DROP POLICY IF EXISTS "Visible to connections" ON public.statuses;
CREATE POLICY "Visible to connections" ON public.statuses
FOR SELECT USING (
    auth.uid() = user_id -- Own status
    OR EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = auth.uid() AND swiped_id = statuses.user_id)
            OR (swiped_id = auth.uid() AND swiper_id = statuses.user_id)
        )
        AND status = 'accepted'
    )
);
