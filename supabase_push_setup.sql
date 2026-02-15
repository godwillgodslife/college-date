-- PUSH NOTIFICATIONS
-- Add OneSignal Player ID to profiles to target specific users.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onesignal_id TEXT;

-- Index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_id ON public.profiles(onesignal_id);
