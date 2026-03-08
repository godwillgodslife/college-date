-- ═══════════════════════════════════════════════════════════
-- MATCH PAGE ENHANCEMENTS - Schema Update
-- Run this once in your Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════

-- 1. Add interest_gender column for gender preference persistence
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interest_gender TEXT DEFAULT 'All' 
CHECK (interest_gender IN ('Male', 'Female', 'All'));

-- 2. Add photo_updated_at for "Recently Updated" spotlight rotation
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS photo_updated_at TIMESTAMPTZ;

-- 3. Auto-update photo_updated_at when avatar_url changes (trigger)
CREATE OR REPLACE FUNCTION public.update_photo_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
        NEW.photo_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_photo_update ON public.profiles;
CREATE TRIGGER track_photo_update
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_photo_timestamp();

-- 4. Back-fill existing profiles with completion_score where missing
UPDATE public.profiles 
SET photo_updated_at = updated_at 
WHERE photo_updated_at IS NULL AND avatar_url IS NOT NULL;

-- Done! Run this, then the Match Page will automatically show
-- the hottest/newest profiles at the top of the swipe stack.
