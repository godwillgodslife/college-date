-- 1. Drop duplicate trigger on profile_views table
DROP TRIGGER IF EXISTS profile_view_notification_trigger ON public.profile_views;

-- 2. Create high-performance composite discovery index on profiles
-- Optimizes getDiscoverProfiles by indexing active users by gender and sorting by completion_score
CREATE INDEX IF NOT EXISTS idx_profiles_discovery 
ON public.profiles(gender, completion_score DESC) 
WHERE (is_banned = false OR is_banned IS NULL) AND (is_shadow_banned = false OR is_shadow_banned IS NULL);

-- 3. Create high-performance composite messages loading index
-- Optimizes chat view by indexing match_id and sorting by created_at DESC
CREATE INDEX IF NOT EXISTS idx_messages_match_created_at 
ON public.messages(match_id, created_at DESC);
