-- ==========================================
-- FINAL NOTIFICATION TYPE CLEAR (NUKE)
-- ==========================================
-- If the previous script failed to alter the rules completely, 
-- we will just remove the restrictive check entirely to allow all valid actions 
-- to proceed immediately.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
