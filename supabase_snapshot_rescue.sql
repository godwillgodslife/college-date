-- SNAPSHOT RESCUE SCRIPT
-- 1. Ensure columns exist (Just to be 100% sure)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshots' AND column_name = 'media_url') THEN
        ALTER TABLE public.snapshots ADD COLUMN media_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshots' AND column_name = 'description') THEN
        ALTER TABLE public.snapshots ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshots' AND column_name = 'likes') THEN
        ALTER TABLE public.snapshots ADD COLUMN likes INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. DISABLE TRIGGER (Temporary Fix)
-- We are dropping the trigger to verify if this allows uploads to pass.
-- If uploads work after this, we know the trigger logic was the blocker.
DROP TRIGGER IF EXISTS on_snapshot_created ON public.snapshots;
DROP TRIGGER IF EXISTS notify_matches_on_snapshot ON public.snapshots;

-- 3. Reset RLS one last time just in case
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can insert their own snapshots" ON public.snapshots;
CREATE POLICY "Users can insert their own snapshots" ON public.snapshots
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
