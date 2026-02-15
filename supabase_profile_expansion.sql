-- PHASE 4: PROFILE EXPANSION
-- Adding detailed fields for better matching and "Student Verification" feel.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS faculty TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS level TEXT,        -- e.g. "100 Lvl", "200 Lvl"
ADD COLUMN IF NOT EXISTS genotype TEXT,     -- e.g. "AA", "AS"
ADD COLUMN IF NOT EXISTS mbti TEXT,         -- e.g. "INFJ"
ADD COLUMN IF NOT EXISTS attraction_goal TEXT; -- e.g. "Serious Relationship", "Just Vibes"

-- Optional: Create an index on University + Faculty for potential filtering later
CREATE INDEX IF NOT EXISTS idx_profiles_uni_faculty ON public.profiles(university, faculty);
