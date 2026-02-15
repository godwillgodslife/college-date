-- SNAPSHOT SCHEMA MASTER FIX
-- Fixes "column likes does not exist" and associated RPC errors

-- 1. Ensure 'likes' column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshots' AND column_name = 'likes') THEN
        ALTER TABLE public.snapshots ADD COLUMN likes INTEGER DEFAULT 0;
    END IF;
    
    -- Also ensure description exists while we are here
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshots' AND column_name = 'description') THEN
        ALTER TABLE public.snapshots ADD COLUMN description TEXT;
    END IF;
    
     -- And media_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'snapshots' AND column_name = 'media_url') THEN
        ALTER TABLE public.snapshots ADD COLUMN media_url TEXT;
    END IF;
END $$;

-- 2. BEGIN RPC REPAIR
-- Drop the old function to ensure clean slate
DROP FUNCTION IF EXISTS increment_snapshot_likes(UUID);
DROP FUNCTION IF EXISTS increment_snapshot_likes(UUID, INTEGER);

-- Re-create the function
CREATE OR REPLACE FUNCTION increment_snapshot_likes(row_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.snapshots
    SET likes = likes + 1
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION increment_snapshot_likes(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_snapshot_likes(UUID) TO service_role;
GRANT ALL ON public.snapshots TO authenticated;
GRANT ALL ON public.snapshots TO service_role;
