-- Add missing profile columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS faculty TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS level TEXT,
ADD COLUMN IF NOT EXISTS genotype TEXT,
ADD COLUMN IF NOT EXISTS mbti TEXT,
ADD COLUMN IF NOT EXISTS attraction_goal TEXT,
ADD COLUMN IF NOT EXISTS onesignal_id TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_uni_faculty ON public.profiles(university, faculty);
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_id ON public.profiles(onesignal_id);
