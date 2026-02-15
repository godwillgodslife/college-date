-- MASTER FIX: RPC, Status Views, and RLS Policies

-- 1. FIX RPC: get_hidden_content_counts
CREATE OR REPLACE FUNCTION get_hidden_content_counts(v_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_hidden_statuses INTEGER;
    v_hidden_snapshots INTEGER;
    v_24h TIMESTAMP WITH TIME ZONE := now() - INTERVAL '24 hours';
BEGIN
    SELECT COUNT(*) INTO v_hidden_statuses
    FROM public.statuses
    WHERE created_at > v_24h
    AND user_id != v_user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = v_user_id AND swiped_id = statuses.user_id)
            OR (swiped_id = v_user_id AND swiper_id = statuses.user_id)
        )
        AND status = 'accepted'
    );

    SELECT COUNT(*) INTO v_hidden_snapshots
    FROM public.snapshots
    WHERE created_at > v_24h
    AND user_id != v_user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = v_user_id AND swiped_id = snapshots.user_id)
            OR (swiped_id = v_user_id AND swiper_id = snapshots.user_id)
        )
        AND status = 'accepted'
    );

    RETURN jsonb_build_object(
        'hidden_statuses', v_hidden_statuses,
        'hidden_snapshots', v_hidden_snapshots
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FIX TABLE COLUMNS (Schema Mismatch Fix)
-- Ensure 'description' exists in snapshots
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshots' AND column_name = 'description') THEN
        ALTER TABLE public.snapshots ADD COLUMN description TEXT;
    END IF;
END $$;

-- Ensure 'caption' exists in statuses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'statuses' AND column_name = 'caption') THEN
        ALTER TABLE public.statuses ADD COLUMN caption TEXT;
    END IF;
END $$;

-- 3. FIX TABLE: status_views
CREATE TABLE IF NOT EXISTS public.status_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id UUID REFERENCES public.statuses(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(status_id, viewer_id)
);

ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

-- 3. FIX RLS: Forced Reset for Consistency
-- We relax the SELECT policies slightly for authenticated users to ensure basic functionality first, 
-- but keep the visibility logic for the "Hidden Content" checks.

-- --- SNAPSHOTS ---
DROP POLICY IF EXISTS "Public snapshots are viewable by all users" ON public.snapshots;
DROP POLICY IF EXISTS "Visible to connections" ON public.snapshots;
DROP POLICY IF EXISTS "Users can insert their own snapshot" ON public.snapshots;
DROP POLICY IF EXISTS "Users can delete their own snapshot" ON public.snapshots;

CREATE POLICY "Users can insert their own snapshot" ON public.snapshots
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Visible to connections" ON public.snapshots
FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = auth.uid() AND swiped_id = snapshots.user_id)
            OR (swiped_id = auth.uid() AND swiper_id = snapshots.user_id)
        )
        AND status = 'accepted'
    )
);

CREATE POLICY "Users can delete their own snapshot" ON public.snapshots
FOR DELETE USING (auth.uid() = user_id);

-- --- STATUSES ---
DROP POLICY IF EXISTS "Public statuses are viewable by all users" ON public.statuses;
DROP POLICY IF EXISTS "Visible to connections" ON public.statuses;
DROP POLICY IF EXISTS "Users can insert their own status" ON public.statuses;
DROP POLICY IF EXISTS "Users can delete their own status" ON public.statuses;

CREATE POLICY "Users can insert their own status" ON public.statuses
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Visible to connections" ON public.statuses
FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.swipes
        WHERE (
            (swiper_id = auth.uid() AND swiped_id = statuses.user_id)
            OR (swiped_id = auth.uid() AND swiper_id = statuses.user_id)
        )
        AND status = 'accepted'
    )
);

CREATE POLICY "Users can delete their own status" ON public.statuses
FOR DELETE USING (auth.uid() = user_id);

-- --- STATUS VIEWS ---
DROP POLICY IF EXISTS "Users can record their own views" ON public.status_views;
DROP POLICY IF EXISTS "Status owners can see viewers" ON public.status_views;

CREATE POLICY "Users can record their own views" ON public.status_views
FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Status owners can see viewers" ON public.status_views
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.statuses
        WHERE statuses.id = status_views.status_id
        AND statuses.user_id = auth.uid()
    )
);
