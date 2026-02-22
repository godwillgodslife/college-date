-- Add has_seen_tour to profiles
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='has_seen_tour') THEN
        ALTER TABLE public.profiles ADD COLUMN has_seen_tour BOOLEAN DEFAULT false;
    END IF;
END $$;
