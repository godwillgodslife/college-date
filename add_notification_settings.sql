-- ==========================================
-- ADD NOTIFICATION PREFERENCES TO PROFILES
-- Run this in the Supabase SQL Editor
-- ==========================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS match_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS view_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS confession_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;

-- Ensure these are indexed if we ever need to build a "mute all" list
CREATE INDEX IF NOT EXISTS profiles_notifications_idx ON public.profiles(match_notifications, view_notifications, confession_notifications);

COMMENT ON COLUMN public.profiles.match_notifications IS 'Toggle for match and message alerts';
COMMENT ON COLUMN public.profiles.view_notifications IS 'Toggle for profile view alerts';
COMMENT ON COLUMN public.profiles.confession_notifications IS 'Toggle for confession reaction/claim alerts';
COMMENT ON COLUMN public.profiles.sound_enabled IS 'Global master toggle for in-app synthesized sounds';
