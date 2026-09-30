-- Migration: Fix Onboarding Profile Permissions and RPC
-- 1. Ensure update_photo_timestamp is SECURITY DEFINER with safe search_path
CREATE OR REPLACE FUNCTION public.update_photo_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
BEGIN
    -- 1. If profile_photos[1] is set and distinct from old profile_photos[1], sync avatar_url
    IF NEW.profile_photos IS NOT NULL AND array_length(NEW.profile_photos, 1) > 0 THEN
        IF OLD.profile_photos IS NULL 
           OR array_length(OLD.profile_photos, 1) = 0 
           OR NEW.profile_photos[1] IS DISTINCT FROM OLD.profile_photos[1] THEN
            IF NEW.profile_photos[1] IS NOT NULL AND btrim(NEW.profile_photos[1]) <> '' THEN
                NEW.avatar_url := NEW.profile_photos[1];
            END IF;
        END IF;
    END IF;

    -- 2. If avatar_url was empty or null, fallback to profile_photos[1]
    IF COALESCE(NEW.avatar_url, '') = '' AND NEW.profile_photos IS NOT NULL AND array_length(NEW.profile_photos, 1) > 0 THEN
        NEW.avatar_url := NEW.profile_photos[1];
    END IF;

    -- 3. Update photo_updated_at if any photo field changed
    IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
       OR NEW.photos IS DISTINCT FROM OLD.photos
       OR NEW.profile_photos IS DISTINCT FROM OLD.profile_photos THEN
        NEW.photo_updated_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

-- 2. Ensure table-level permissions for authenticated users on public.profiles
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- 3. Dedicated SECURITY DEFINER onboarding completion RPC function
CREATE OR REPLACE FUNCTION public.complete_user_onboarding(
    p_full_name TEXT DEFAULT NULL,
    p_age INTEGER DEFAULT NULL,
    p_university TEXT DEFAULT NULL,
    p_level TEXT DEFAULT NULL,
    p_interests JSONB DEFAULT NULL,
    p_attraction_goal TEXT DEFAULT NULL,
    p_profile_photos TEXT[] DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.profiles;
    v_avatar TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
    END IF;

    IF p_age IS NOT NULL AND p_age < 18 THEN
        RAISE EXCEPTION 'You must be at least 18 years old to use College Date.' USING ERRCODE = '22023';
    END IF;

    -- Determine avatar URL
    v_avatar := COALESCE(NULLIF(p_avatar_url, ''), (p_profile_photos)[1]);

    -- Ensure profile exists (if trigger hadn't fired or profile missing)
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        gender,
        age,
        university,
        role,
        free_swipes,
        is_onboarded
    )
    SELECT
        u.id,
        COALESCE(u.email, ''),
        COALESCE(p_full_name, u.raw_user_meta_data->>'full_name', 'Student'),
        LOWER(COALESCE(u.raw_user_meta_data->>'role', 'male')),
        COALESCE(p_age, 19),
        COALESCE(p_university, 'Campus'),
        INITCAP(COALESCE(u.raw_user_meta_data->>'role', 'Male')),
        20,
        false
    FROM auth.users u
    WHERE u.id = v_user_id
    ON CONFLICT (id) DO NOTHING;

    -- Update profile
    UPDATE public.profiles
    SET
        full_name = COALESCE(NULLIF(p_full_name, ''), full_name),
        age = COALESCE(p_age, age),
        university = COALESCE(NULLIF(p_university, ''), university),
        level = COALESCE(NULLIF(p_level, ''), level),
        interests = COALESCE(p_interests, interests),
        attraction_goal = COALESCE(NULLIF(p_attraction_goal, ''), attraction_goal),
        profile_photos = COALESCE(p_profile_photos, profile_photos),
        avatar_url = COALESCE(v_avatar, avatar_url),
        is_onboarded = true,
        updated_at = NOW()
    WHERE id = v_user_id
    RETURNING * INTO v_profile;

    RETURN v_profile;
END;
$$;

-- 4. Grant execute permission on the RPC to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_user_onboarding(
    TEXT, INTEGER, TEXT, TEXT, JSONB, TEXT, TEXT[], TEXT
) TO authenticated;
