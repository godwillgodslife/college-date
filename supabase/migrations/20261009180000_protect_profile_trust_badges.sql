-- Migration: 20261009180000_protect_profile_trust_badges.sql
-- Description: Authoritative engine-level defense against unauthorized badge & trust status tampering.
-- Target: public.profiles (is_verified, photo_verified, ai_verification_status, etc.)

-- 1. Ensure photo_verified column exists with default false
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS photo_verified boolean DEFAULT false;

-- 2. Create authoritative trigger function
CREATE OR REPLACE FUNCTION public.enforce_profile_trust_field_integrity()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
    v_is_authorized boolean := false;
    v_is_admin boolean := false;
    v_jwt_role text := '';
BEGIN
    -- Resolve JWT role safely
    BEGIN
        v_jwt_role := COALESCE(
            auth.role(),
            auth.jwt() ->> 'role',
            current_setting('request.jwt.claim.role', true),
            ''
        );
    EXCEPTION WHEN OTHERS THEN
        v_jwt_role := '';
    END;

    -- Resolve admin status safely
    BEGIN
        v_is_admin := public.is_app_admin();
    EXCEPTION WHEN OTHERS THEN
        v_is_admin := false;
    END;

    -- Evaluate caller authorization:
    -- 1. PostgreSQL superuser / maintenance / database migrations (postgres, supabase_admin)
    -- 2. SECURITY DEFINER functions owned by postgres (e.g. admin_set_user_status)
    -- 3. Supabase Edge Functions / Backend Workers operating under service_role
    -- 4. Authorized Application Administrators
    IF current_user IN ('postgres', 'service_role', 'supabase_admin')
       OR v_jwt_role = 'service_role'
       OR v_is_admin THEN
        v_is_authorized := true;
    END IF;

    -- -------------------------------------------------------------------------
    -- INSERT PROTECTION: Force safe initial trust defaults for non-authorized callers
    -- -------------------------------------------------------------------------
    IF TG_OP = 'INSERT' THEN
        IF NOT v_is_authorized THEN
            NEW.is_verified := false;
            NEW.photo_verified := false;
            NEW.ai_verification_status := 'not_started';
            NEW.ai_verification_score := NULL;
            NEW.ai_photo_origin := NULL;
            NEW.ai_reviewed_at := NULL;
            NEW.ai_review_summary := NULL;
            NEW.ai_review_flags := ARRAY[]::text[];
            NEW.is_banned := false;
            NEW.is_shadow_banned := false;
            NEW.is_premium := false;
        END IF;
        RETURN NEW;
    END IF;

    -- -------------------------------------------------------------------------
    -- UPDATE PROTECTION: Revert unauthorized changes to trust & privilege fields
    -- -------------------------------------------------------------------------
    IF TG_OP = 'UPDATE' THEN
        IF NOT v_is_authorized THEN
            -- Check if any protected field was tampered with
            IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
               OR NEW.photo_verified IS DISTINCT FROM OLD.photo_verified
               OR NEW.ai_verification_status IS DISTINCT FROM OLD.ai_verification_status
               OR NEW.ai_verification_score IS DISTINCT FROM OLD.ai_verification_score
               OR NEW.ai_photo_origin IS DISTINCT FROM OLD.ai_photo_origin
               OR NEW.ai_reviewed_at IS DISTINCT FROM OLD.ai_reviewed_at
               OR NEW.ai_review_summary IS DISTINCT FROM OLD.ai_review_summary
               OR NEW.ai_review_flags IS DISTINCT FROM OLD.ai_review_flags
               OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
               OR NEW.is_shadow_banned IS DISTINCT FROM OLD.is_shadow_banned
               OR NEW.is_premium IS DISTINCT FROM OLD.is_premium THEN

                -- Forcibly revert all protected fields to their pre-existing values
                NEW.is_verified := OLD.is_verified;
                NEW.photo_verified := OLD.photo_verified;
                NEW.ai_verification_status := OLD.ai_verification_status;
                NEW.ai_verification_score := OLD.ai_verification_score;
                NEW.ai_photo_origin := OLD.ai_photo_origin;
                NEW.ai_reviewed_at := OLD.ai_reviewed_at;
                NEW.ai_review_summary := OLD.ai_review_summary;
                NEW.ai_review_flags := OLD.ai_review_flags;
                NEW.is_banned := OLD.is_banned;
                NEW.is_shadow_banned := OLD.is_shadow_banned;
                NEW.is_premium := OLD.is_premium;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Bind trigger to public.profiles
DROP TRIGGER IF EXISTS trg_enforce_profile_trust_integrity ON public.profiles;

CREATE TRIGGER trg_enforce_profile_trust_integrity
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_profile_trust_field_integrity();

-- 4. Execution grants: Restrict execution to authenticated and service_role
REVOKE ALL ON FUNCTION public.enforce_profile_trust_field_integrity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_profile_trust_field_integrity() TO authenticated, service_role;
