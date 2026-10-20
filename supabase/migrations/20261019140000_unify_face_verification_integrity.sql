-- Migration: 20261019120000_unify_face_verification_integrity.sql
-- Description:
-- 1. Unify admin_set_user_status('verify') to synchronize both is_verified and photo_verified (fixes RC-4).
-- 2. Reset is_verified and photo_verified in promote_validated_avatar when slot 0 (primary photo) is replaced.
-- 3. Unify get_public_ask_profile and get_matched_profile to project unified verification status (is_verified OR photo_verified).

-- ============================================================================
-- 1. ADMIN SET USER STATUS (Synchronize is_verified + photo_verified)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_action text,
  p_status boolean,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_target public.profiles%rowtype;
  v_audit_action text;
BEGIN
  IF NOT public.admin_has_permission('users:moderate') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF auth.uid() = p_user_id AND v_action IN ('ban', 'shadow') AND p_status IS TRUE THEN
    RAISE EXCEPTION 'Admins cannot ban or shadow-ban themselves';
  END IF;

  IF v_action NOT IN ('ban', 'shadow', 'verify') THEN
    RAISE EXCEPTION 'Invalid user status action';
  END IF;

  IF length(v_reason) < 5 THEN
    RAISE EXCEPTION 'Admin reason is required';
  END IF;

  SELECT *
  INTO v_target
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_action = 'ban' THEN
    UPDATE public.profiles
    SET is_banned = p_status
    WHERE id = p_user_id;
    v_audit_action := CASE WHEN p_status THEN 'admin_ban_user' ELSE 'admin_unban_user' END;
  ELSIF v_action = 'shadow' THEN
    UPDATE public.profiles
    SET is_shadow_banned = p_status
    WHERE id = p_user_id;
    v_audit_action := CASE WHEN p_status THEN 'admin_shadow_user' ELSE 'admin_unshadow_user' END;
  ELSE
    UPDATE public.profiles
    SET is_verified = p_status,
        photo_verified = p_status,
        ai_verification_status = CASE WHEN p_status THEN 'verified' ELSE 'not_started' END,
        ai_reviewed_at = now(),
        ai_review_summary = CASE
          WHEN p_status THEN 'Verified by administrator.'
          ELSE 'Verification removed by administrator.'
        END
    WHERE id = p_user_id;
    v_audit_action := CASE WHEN p_status THEN 'admin_verify_user' ELSE 'admin_unverify_user' END;
  END IF;

  PERFORM public.admin_write_audit_log(
    v_audit_action,
    'profile',
    p_user_id,
    jsonb_build_object(
      'status', p_status,
      'reason', v_reason,
      'target_email', v_target.email,
      'target_name', v_target.full_name
    )
  );

  RETURN jsonb_build_object('ok', true, 'action', v_action, 'status', p_status, 'user_id', p_user_id);
END;
$function$;

-- ============================================================================
-- 2. PROMOTE VALIDATED AVATAR (Reset badge when primary photo Slot 0 changes)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_validated_avatar(
    p_user_id UUID,
    p_photo_url TEXT,
    p_slot_index INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_current_photos TEXT[];
    v_new_photos TEXT[];
    v_slot INT;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized profile modification');
    END IF;

    v_slot := coalesce(p_slot_index, 0);

    SELECT profile_photos INTO v_current_photos
    FROM public.profiles
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    v_new_photos := coalesce(v_current_photos, ARRAY[]::TEXT[]);
    WHILE array_length(v_new_photos, 1) IS NULL OR array_length(v_new_photos, 1) <= v_slot LOOP
        v_new_photos := array_append(v_new_photos, NULL::TEXT);
    END LOOP;

    v_new_photos[v_slot + 1] := p_photo_url;

    IF v_slot = 0 THEN
        UPDATE public.profiles
        SET avatar_url = p_photo_url,
            profile_photos = v_new_photos,
            is_verified = false,
            photo_verified = false,
            ai_verification_status = 'not_started',
            ai_review_summary = 'Primary profile photo updated. Please complete a quick live selfie verification check to reactivate your Verified badge.',
            photo_updated_at = now(),
            updated_at = now()
        WHERE id = p_user_id;
    ELSE
        UPDATE public.profiles
        SET profile_photos = v_new_photos,
            photo_updated_at = now(),
            updated_at = now()
        WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'avatar_url', p_photo_url,
        'slot', v_slot,
        'verification_reset', (v_slot = 0)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_validated_avatar(UUID, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_validated_avatar(UUID, TEXT, INT) TO service_role;

-- ============================================================================
-- 3. PUBLIC ASK PROFILE RPC (Include unified is_verified & photo_verified)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_ask_profile(p_username_or_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean text;
    v_is_uuid boolean;
    v_profile record;
BEGIN
    IF p_username_or_id IS NULL OR length(trim(p_username_or_id)) = 0 THEN
        RETURN NULL;
    END IF;

    v_clean := lower(trim(leading '@' from trim(p_username_or_id)));
    v_is_uuid := p_username_or_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF v_is_uuid THEN
        SELECT
            id,
            full_name,
            username,
            avatar_url,
            university,
            (COALESCE(is_verified, false) OR COALESCE(photo_verified, false)) AS is_verified,
            COALESCE(photo_verified, false) AS photo_verified,
            bio,
            video_url
        INTO v_profile
        FROM public.profiles
        WHERE id = p_username_or_id::uuid
          AND COALESCE(is_banned, false) = false
        LIMIT 1;
    ELSE
        SELECT
            id,
            full_name,
            username,
            avatar_url,
            university,
            (COALESCE(is_verified, false) OR COALESCE(photo_verified, false)) AS is_verified,
            COALESCE(photo_verified, false) AS photo_verified,
            bio,
            video_url
        INTO v_profile
        FROM public.profiles
        WHERE lower(username) = v_clean
          AND COALESCE(is_banned, false) = false
        LIMIT 1;
    END IF;

    IF v_profile.id IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN to_jsonb(v_profile);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_ask_profile(text) TO anon, authenticated, service_role;

-- ============================================================================
-- 4. GET MATCHED PROFILE RPC (Unify is_verified OR photo_verified)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_matched_profile(p_profile_id uuid)
RETURNS TABLE (
    id uuid,
    full_name text,
    username text,
    gender text,
    age integer,
    university text,
    faculty text,
    department text,
    level text,
    bio text,
    avatar_url text,
    photos text[],
    profile_photos text[],
    interests jsonb,
    intro_prompt text,
    voice_intro_url text,
    anthem text,
    attraction_goal text,
    is_verified boolean,
    completion_score integer,
    last_seen_at timestamp with time zone,
    last_active timestamp with time zone,
    is_live boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    IF p_profile_id IS NULL OR p_profile_id = v_user_id THEN
        RAISE EXCEPTION 'invalid_profile';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.username,
        p.gender,
        p.age,
        p.university,
        p.faculty,
        p.department,
        p.level,
        p.bio,
        p.avatar_url,
        p.photos,
        p.profile_photos,
        p.interests,
        p.intro_prompt,
        p.voice_intro_url,
        p.anthem,
        p.attraction_goal,
        (coalesce(p.is_verified, false) OR coalesce(p.photo_verified, false)) AS is_verified,
        coalesce(p.completion_score, 0) AS completion_score,
        p.last_seen_at,
        p.last_active,
        coalesce(p.last_active, p.last_seen_at) > now() - interval '15 minutes' AS is_live
    FROM public.profiles p
    WHERE p.id = p_profile_id
      AND coalesce(p.is_banned, false) = false
      AND coalesce(p.is_shadow_banned, false) = false
      AND coalesce(p.is_blocked, false) = false
      AND coalesce(p.incognito_mode, false) = false
      AND EXISTS (
          SELECT 1
          FROM public.matches m
          WHERE m.user_ids @> array[v_user_id, p_profile_id]::uuid[]
      )
      AND NOT EXISTS (
          SELECT 1
          FROM public.reports r
          WHERE (
              (r.reporter_id = v_user_id AND r.reported_id = p_profile_id)
              OR (r.reporter_id = p_profile_id AND r.reported_id = v_user_id)
          )
          AND coalesce(r.status, 'pending') <> 'dismissed'
      );
END;
$$;

REVOKE ALL ON FUNCTION public.get_matched_profile(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_matched_profile(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
