-- FIX: Status Views & Snapshot Creation Force Reset

-- 1. Create STATUS_VIEWS Table
CREATE TABLE IF NOT EXISTS public.status_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id UUID REFERENCES public.statuses(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(status_id, viewer_id) -- Prevent duplicate view counts
);

-- 2. Status Views RLS
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

-- Viewers can insert their own view record
DROP POLICY IF EXISTS "Users can record their own views" ON public.status_views;
CREATE POLICY "Users can record their own views" ON public.status_views
FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Status owners can see who viewed their status
DROP POLICY IF EXISTS "Status owners can see viewers" ON public.status_views;
CREATE POLICY "Status owners can see viewers" ON public.status_views
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.statuses
        WHERE statuses.id = status_views.status_id
        AND statuses.user_id = auth.uid()
    )
);

-- 3. FORCE-RESET SNAPSHOT POLICIES (Fix "Failed to create snapshot")
-- We drop ALL policies to ensure no hidden conflicts exist.

DROP POLICY IF EXISTS "Public snapshots are viewable by all users" ON public.snapshots;
DROP POLICY IF EXISTS "Visible to connections" ON public.snapshots;
DROP POLICY IF EXISTS "Users can insert their own snapshot" ON public.snapshots;
DROP POLICY IF EXISTS "Users can delete their own snapshot" ON public.snapshots;

-- Re-create Policies

-- A. INSERT (The critical fix)
CREATE POLICY "Users can insert their own snapshot" ON public.snapshots
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- B. SELECT (Own + Matched)
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

-- C. DELETE (Own)
CREATE POLICY "Users can delete their own snapshot" ON public.snapshots
FOR DELETE USING (auth.uid() = user_id);


-- 4. FORCE-RESET STATUS POLICIES (Consistency)
DROP POLICY IF EXISTS "Public statuses are viewable by all users" ON public.statuses;
DROP POLICY IF EXISTS "Visible to connections" ON public.statuses;
DROP POLICY IF EXISTS "Users can insert their own status" ON public.statuses;
DROP POLICY IF EXISTS "Users can delete their own status" ON public.statuses;

-- A. INSERT
CREATE POLICY "Users can insert their own status" ON public.statuses
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- B. SELECT (Own + Matched)
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

-- C. DELETE (Own)
CREATE POLICY "Users can delete their own status" ON public.statuses
FOR DELETE USING (auth.uid() = user_id);
