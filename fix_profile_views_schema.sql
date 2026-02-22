-- Add the 'source' column to profile_views if it doesn't exist
ALTER TABLE public.profile_views 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'discovery';

-- Update RLS policies to ensure it's logged correctly
-- (Policies already exist based on previous grep, so we just ensure column is there)

COMMENT ON COLUMN public.profile_views.source IS 'The context where the profile was viewed (e.g., discovery, leaderboard, chat)';
