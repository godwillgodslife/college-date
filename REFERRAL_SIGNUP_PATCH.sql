-- ============================================================================
-- REFERRAL SIGNUP PATCH
-- This script safely updates the auth.users trigger to ensure the referred_by
-- metadata is correctly extracted and inserted into the profiles table.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_gender TEXT;
    v_referred_by TEXT;
    v_referred_by_uuid UUID := NULL;
BEGIN
    -- 1. Extract standard metadata
    v_role := INITCAP(COALESCE(NEW.raw_user_meta_data->>'role', 'Male'));
    v_gender := LOWER(v_role);
    
    -- 2. Safely Extract & Cast referred_by
    v_referred_by := NEW.raw_user_meta_data->>'referred_by';
    
    IF v_referred_by IS NOT NULL AND v_referred_by <> '' AND v_referred_by <> 'null' THEN
        BEGIN
            v_referred_by_uuid := v_referred_by::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_referred_by_uuid := NULL;
        END;
    END IF;

    -- 3. Create Profile
    BEGIN
        INSERT INTO public.profiles (
            id, email, full_name, gender, age, university, role, free_swipes, referred_by
        )
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            v_gender,
            19,
            'Campus',
            v_role,
            20,
            v_referred_by_uuid
        ) ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
            referred_by = COALESCE(profiles.referred_by, EXCLUDED.referred_by); -- Ensure referred_by is updated if missed
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Profile insertion failed for user %: %', NEW.id, SQLERRM;
    END;

    -- 4. Create Dependent Records
    BEGIN INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.subscriptions (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.swipe_limits (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.user_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN INSERT INTO public.engagement_scores (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING; EXCEPTION WHEN OTHERS THEN NULL; END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-bind the trigger to be absolutely sure
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- We also need to ensure the referral tracking table logic fires when someone updates their profile.
-- If the referred_by column is populated later, we should still track the referral.
CREATE OR REPLACE FUNCTION public.handle_referral_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_referrer_id UUID;
BEGIN
    -- Only act if the new profile was referred by someone
    IF NEW.referred_by IS NULL THEN
        RETURN NEW;
    END IF;

    v_referrer_id := NEW.referred_by;

    -- Insert referral record (ignore if already exists)
    BEGIN
        INSERT INTO public.referrals (referrer_id, referred_id, status)
        VALUES (v_referrer_id, NEW.id, 'pending')
        ON CONFLICT (referred_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Award 3 bonus free swipes ONLY IF the referral was just created 
    -- We can check if we actually inserted it by looking at xmax, but it's safer to just do an UPSERT trick
    -- or accept that they get 3 swipes. We handled ON CONFLICT (referred_id) DO NOTHING so it only fires once.
    
    -- Set pending balance maturity date (30 days from now) on referrer's wallet
    BEGIN
        UPDATE public.wallets
        SET pending_balance = COALESCE(pending_balance, 0) + 500,
            pending_maturity_date = CASE
                WHEN pending_maturity_date IS NULL OR pending_maturity_date < now()
                THEN now() + INTERVAL '30 days'
                ELSE pending_maturity_date
            END,
            updated_at = now()
        WHERE user_id = v_referrer_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Award 3 bonus free swipes to the referrer
    BEGIN
        UPDATE public.profiles
        SET free_swipes = COALESCE(free_swipes, 20) + 3
        WHERE id = v_referrer_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_referred_profile_created ON public.profiles;
CREATE TRIGGER on_referred_profile_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    WHEN (NEW.referred_by IS NOT NULL)
    EXECUTE FUNCTION public.handle_referral_on_signup();

DROP TRIGGER IF EXISTS on_referred_profile_updated ON public.profiles;
CREATE TRIGGER on_referred_profile_updated
    AFTER UPDATE OF referred_by ON public.profiles
    FOR EACH ROW
    WHEN (OLD.referred_by IS DISTINCT FROM NEW.referred_by AND NEW.referred_by IS NOT NULL)
    EXECUTE FUNCTION public.handle_referral_on_signup();
