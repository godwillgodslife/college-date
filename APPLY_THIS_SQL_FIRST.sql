-- ============================================
-- CRITICAL: RUN THIS IN SUPABASE SQL EDITOR
-- ============================================
-- This adds the missing profile columns that are causing errors

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS faculty TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS level TEXT,
ADD COLUMN IF NOT EXISTS genotype TEXT,
ADD COLUMN IF NOT EXISTS mbti TEXT,
ADD COLUMN IF NOT EXISTS attraction_goal TEXT,
ADD COLUMN IF NOT EXISTS onesignal_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_uni_faculty ON public.profiles(university, faculty);
CREATE INDEX IF NOT EXISTS idx_profiles_onesignal_id ON public.profiles(onesignal_id);

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('faculty', 'department', 'level', 'genotype', 'mbti', 'attraction_goal', 'onesignal_id')
ORDER BY column_name;
