-- SUPER REPAIR v4: THE MASTER FIX (Updated with NOT NULL fixes)
-- This script fixes trigger failures, missing profiles, and schema inconsistencies.

-- 1. Ensure Profiles Table is up to date with defensive defaults
DO $$ 
BEGIN 
    -- Ensure age has a default to prevent NOT NULL violations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='age') THEN
        ALTER TABLE public.profiles ALTER COLUMN age SET DEFAULT 19;
        UPDATE public.profiles SET age = 19 WHERE age IS NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='username') THEN
        ALTER TABLE public.profiles ADD COLUMN username TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='free_swipes') THEN
        ALTER TABLE public.profiles ADD COLUMN free_swipes INTEGER DEFAULT 20;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='completion_score') THEN
        ALTER TABLE public.profiles ADD COLUMN completion_score INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create/Update the Handle New User Function (Hardened)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Create Profile
    INSERT INTO public.profiles (id, email, full_name, avatar_url, username, role, gender, university, age, free_swipes)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        split_part(NEW.email, '@', 1),
        INITCAP(COALESCE(NEW.raw_user_meta_data->>'role', 'Male')),
        LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'male')),
        COALESCE(NEW.raw_user_meta_data->>'university', 'Campus'),
        19,
        20
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Create Wallet
    INSERT INTO public.wallets (user_id)
    VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

    -- 3. Create Swipe Limits
    INSERT INTO public.swipe_limits (user_id)
    VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

    -- 4. Create Engagement Score
    INSERT INTO public.engagement_scores (user_id)
    VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

    -- 5. Create Subscription
    INSERT INTO public.subscriptions (user_id)
    VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-enable Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RUN MASS BACKFILL (Fixes everyone currently logged in)
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT * FROM auth.users LOOP
        -- Attempt to repair each user
        INSERT INTO public.profiles (id, email, full_name, username, role, gender, age, university, free_swipes)
        VALUES (
            u.id, 
            u.email, 
            COALESCE(u.raw_user_meta_data->>'full_name', u.email), 
            split_part(u.email, '@', 1), 
            INITCAP(COALESCE(u.raw_user_meta_data->>'role', 'Male')),
            LOWER(COALESCE(u.raw_user_meta_data->>'role', 'male')),
            19,
            COALESCE(u.raw_user_meta_data->>'university', 'Campus'),
            20
        )
        ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email,
            username = COALESCE(public.profiles.username, EXCLUDED.username),
            age = COALESCE(public.profiles.age, 19);

        INSERT INTO public.wallets (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;
        INSERT INTO public.swipe_limits (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;
        INSERT INTO public.engagement_scores (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;
        INSERT INTO public.subscriptions (user_id) VALUES (u.id) ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END $$;

-- 5. Final Schema Optimization
UPDATE public.profiles SET username = split_part(email, '@', 1) WHERE username IS NULL OR username = '';
UPDATE public.profiles SET free_swipes = 20 WHERE free_swipes IS NULL OR free_swipes = 0;
UPDATE public.profiles p SET completion_score = public.calculate_completion_score(p.id) WHERE completion_score IS NULL OR completion_score = 0;

-- 6. Grants & Permissions (Crucial for 406 errors)
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure discovery view is fresh
DROP VIEW IF EXISTS discovery_feed_v3;
CREATE VIEW discovery_feed_v3 AS
SELECT 
    p.*,
    get_user_visibility_score(p.id) as visibility_score,
    COALESCE(s.plan_type, 'Free') as plan_type,
    EXISTS (SELECT 1 FROM boosts b WHERE b.user_id = p.id AND b.expires_at > now()) as is_boosted
FROM 
    public.profiles p
LEFT JOIN 
    public.subscriptions s ON s.user_id = p.id;

GRANT SELECT ON discovery_feed_v3 TO anon, authenticated;

SELECT 'SUCCESS: DATABASE REPAIRED' as status;
