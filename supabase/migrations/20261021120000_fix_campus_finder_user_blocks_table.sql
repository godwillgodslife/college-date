-- ============================================================================
-- The College Date: Campus Finder (Fix user_blocks relation in discovery RPC)
-- Migration: 20261021120000_fix_campus_finder_user_blocks_table.sql
-- Description: Fix get_eligible_campus_finder_profiles to reference public.user_blocks
--              instead of non-existent public.blocks, and provide a compatibility view.
-- ============================================================================

-- 1. Create a compatibility view for public.blocks pointing to public.user_blocks
-- to ensure any legacy queries or functions will never throw "relation blocks does not exist"
CREATE OR REPLACE VIEW public.blocks AS
SELECT * FROM public.user_blocks;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocks TO authenticated, service_role;

-- 2. Secure candidate discovery RPC: returns ONLY opted-in, non-blocked candidates
-- referencing the authoritative public.user_blocks table
CREATE OR REPLACE FUNCTION public.get_eligible_campus_finder_profiles(
    p_university text,
    p_exclude_user_id uuid default null
)
RETURNS TABLE (
    id uuid,
    full_name text,
    avatar_url text,
    primary_photo text,
    university text,
    department text,
    level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_searcher_id uuid;
BEGIN
    v_searcher_id := coalesce(p_exclude_user_id, auth.uid());

    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.avatar_url,
        coalesce(p.avatar_url, p.profile_photos[1]) as primary_photo,
        p.university,
        p.department,
        p.level
    FROM public.profiles p
    WHERE p.allow_camera_discovery = true
      AND (p_exclude_user_id IS NULL OR p.id != p_exclude_user_id)
      AND (p.university = p_university or p_university is null or p_university = 'All')
      AND (p.is_verified = true or p.photo_verified = true)
      AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks b
          WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p.id)
             OR (b.blocker_id = p.id AND b.blocked_id = auth.uid())
      )
      AND coalesce(p.is_shadow_banned, false) = false
      AND (p.avatar_url is not null or array_length(p.profile_photos, 1) > 0)
    ORDER BY p.last_seen_at desc nulls last
    LIMIT 25;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_eligible_campus_finder_profiles TO authenticated;

-- 3. Search credit refund helper to restore credits if candidate search or AI service encounters an error
CREATE OR REPLACE FUNCTION public.refund_finder_search(p_searcher_id uuid default null)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_searcher_id uuid;
    v_profile record;
    v_free_left integer;
    v_hourly integer;
BEGIN
    v_searcher_id := coalesce(p_searcher_id, auth.uid());
    if v_searcher_id is null or auth.uid() != v_searcher_id then
        return jsonb_build_object('success', false, 'error', 'Unauthorized');
    end if;

    select * into v_profile
    from public.profiles
    where id = v_searcher_id
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Profile not found');
    end if;

    v_free_left := least(2, coalesce(v_profile.finder_free_searches_left, 0) + 1);
    v_hourly := greatest(0, coalesce(v_profile.finder_hourly_searches, 1) - 1);

    update public.profiles
    set finder_free_searches_left = v_free_left,
        finder_hourly_searches = v_hourly
    where id = v_searcher_id;

    return jsonb_build_object('success', true, 'free_searches_left', v_free_left);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_finder_search TO authenticated;
