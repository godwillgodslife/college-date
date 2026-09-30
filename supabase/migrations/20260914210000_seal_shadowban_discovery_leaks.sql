-- Migration: 20260914210000_seal_shadowban_discovery_leaks.sql
-- Description: Completely seals all discovery leaks for shadow-banned and banned users.
-- Ensures shadow-banned users never appear in:
-- 1. discovery_feed_v3 (exposes is_shadow_banned and is_banned in projection for client-side validation)
-- 2. leaderboard_most_wanted (filters out is_shadow_banned and is_banned)
-- 3. leaderboard_unified and leaderboard_big_spenders (NULL-safe filtering)
-- 4. get_admirers_secure RPC (filters out is_shadow_banned and is_banned so requests are not leaked)

-- 1. Update discovery_feed_v3 to expose is_shadow_banned and is_banned in SELECT
DROP VIEW IF EXISTS public.discovery_feed_v3 CASCADE;
CREATE OR REPLACE VIEW public.discovery_feed_v3
WITH (security_invoker = true)
AS
 SELECT p.id,
    p.email,
    p.full_name,
    p.gender,
    p.age,
    p.university,
    p.bio,
    p.phone,
    p.avatar_url,
    p.photos,
    p.role,
    p.is_verified,
    p.is_blocked,
    p.is_banned,
    p.is_shadow_banned,
    p.free_swipes_remaining,
    p.created_at,
    p.updated_at,
    p.status_text,
    p.status_updated_at,
    p.referral_code,
    p.coins,
    p.is_online,
    p.last_seen,
    p.referred_by,
    p.free_swipes,
    p.last_seen_at,
    p.match_notifications,
    p.email_notifications,
    p.push_notifications,
    p.show_online_status,
    p.incognito_mode,
    p.voice_intro_url,
    p.anthem,
    p.location_status,
    p.faculty,
    p.department,
    p.level,
    p.genotype,
    p.mbti,
    p.attraction_goal,
    p.onesignal_id,
    p.streak_freeze_count,
    p.current_badge,
    p.username,
    p.completion_score,
    p.is_optimised,
    p.interests,
    p.intro_prompt,
    p.profile_photos,
    p.is_live,
    COALESCE(s.plan_type, 'Free'::text) AS plan_type,
    (EXISTS ( SELECT 1
           FROM boosts b
          WHERE b.user_id = p.id AND b.expires_at > now() AND b.type = '24h_boost'::text)) AS is_boosted,
    p.photo_updated_at
   FROM profiles p
     LEFT JOIN subscriptions s ON s.user_id = p.id
  WHERE COALESCE(p.is_banned, false) = false AND COALESCE(p.is_shadow_banned, false) = false;

GRANT SELECT ON public.discovery_feed_v3 TO authenticated;
GRANT SELECT ON public.discovery_feed_v3 TO anon;

-- 2. Update leaderboard_most_wanted
DROP VIEW IF EXISTS public.leaderboard_most_wanted CASCADE;
CREATE OR REPLACE VIEW public.leaderboard_most_wanted
WITH (security_invoker = true) AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.role,
    count(s.id) AS total_likes_received
FROM public.profiles p
LEFT JOIN public.swipes s ON s.swiped_id = p.id AND s.direction = 'right'::text
WHERE COALESCE(p.is_banned, false) = false AND COALESCE(p.is_shadow_banned, false) = false
GROUP BY p.id, p.full_name, p.avatar_url, p.university, p.role
ORDER BY count(s.id) DESC
LIMIT 100;

GRANT SELECT ON public.leaderboard_most_wanted TO authenticated;
GRANT SELECT ON public.leaderboard_most_wanted TO anon;

-- 3. Update leaderboard_unified
DROP VIEW IF EXISTS public.leaderboard_unified CASCADE;
CREATE OR REPLACE VIEW public.leaderboard_unified
WITH (security_invoker = true) AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.gender,
    (
        COALESCE(swipe_stats.likes_received, 0::bigint) * 10
        + COALESCE(view_stats.views_received, 0::bigint) * 2
        + COALESCE(match_stats.match_count, 0::bigint) * 5
    )::integer AS premium_swipes_received,
    COALESCE(w.total_spent, 0::numeric)::integer AS total_spent,
    p.completion_score
FROM public.profiles p
LEFT JOIN (
    SELECT swipes.swiped_id, count(*) AS likes_received
    FROM public.swipes
    WHERE swipes.direction = 'right'::text
    GROUP BY swipes.swiped_id
) swipe_stats ON p.id = swipe_stats.swiped_id
LEFT JOIN (
    SELECT profile_views.profile_owner_id, count(*) AS views_received
    FROM public.profile_views
    GROUP BY profile_views.profile_owner_id
) view_stats ON p.id = view_stats.profile_owner_id
LEFT JOIN (
    SELECT all_matches.user_id, count(*) AS match_count
    FROM (
        SELECT matches.user1_id AS user_id FROM public.matches
        UNION ALL
        SELECT matches.user2_id AS user_id FROM public.matches
    ) all_matches
    GROUP BY all_matches.user_id
) match_stats ON p.id = match_stats.user_id
LEFT JOIN public.wallets w ON p.id = w.user_id
WHERE COALESCE(p.is_banned, false) = false
  AND COALESCE(p.is_shadow_banned, false) = false
  AND (
      p.last_active > (now() - '14 days'::interval)
      OR p.last_seen_at > (now() - '14 days'::interval)
      OR p.last_active IS NULL
  );

GRANT SELECT ON public.leaderboard_unified TO authenticated;
GRANT SELECT ON public.leaderboard_unified TO anon;

-- 4. Update leaderboard_big_spenders
DROP VIEW IF EXISTS public.leaderboard_big_spenders CASCADE;
CREATE OR REPLACE VIEW public.leaderboard_big_spenders
WITH (security_invoker = true) AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    COALESCE(w.total_spent, 0::numeric) AS total_spent
FROM public.profiles p
LEFT JOIN public.wallets w ON p.id = w.user_id
WHERE COALESCE(p.is_banned, false) = false
  AND COALESCE(p.is_shadow_banned, false) = false
ORDER BY COALESCE(w.total_spent, 0::numeric) DESC
LIMIT 100;

GRANT SELECT ON public.leaderboard_big_spenders TO authenticated;
GRANT SELECT ON public.leaderboard_big_spenders TO anon;

-- 5. Update get_admirers_secure RPC
CREATE OR REPLACE FUNCTION public.get_admirers_secure(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_is_premium boolean;
    v_total integer := 0;
    v_today_accepts_count integer := 0;
    v_free_accepts_remaining integer := 3;
    v_items jsonb := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'Authentication required'
        );
    END IF;

    -- Check if user is premium
    v_is_premium := public.has_entitlement(v_user_id, 'premium');

    -- Count total pending swipes targeting the user (excluding shadow-banned or banned swipers)
    SELECT count(*)::integer
    INTO v_total
    FROM public.swipes sw
    JOIN public.profiles p ON p.id = sw.swiper_id
    WHERE sw.swiped_id = v_user_id
      AND sw.status = 'pending'
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(p.is_shadow_banned, false) = false;

    -- Count how many requests the user has accepted today (UTC)
    SELECT count(*)::integer
    INTO v_today_accepts_count
    FROM public.swipes sw
    WHERE sw.swiped_id = v_user_id
      AND sw.status = 'accepted'
      AND COALESCE(sw.updated_at, sw.created_at) >= (current_date at time zone 'UTC');

    IF v_is_premium THEN
        v_free_accepts_remaining := 999;
    ELSE
        v_free_accepts_remaining := GREATEST(0, 3 - v_today_accepts_count);
    END IF;

    IF NOT v_is_premium THEN
        -- For freemium users, unlock up to 3 admirers so they can accept/decline them, lock the rest
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT
                CASE
                    WHEN row_number() over (ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC) <= 3 THEN
                        jsonb_build_object(
                            'id', sw.id,
                            'swiper_id', sw.swiper_id,
                            'swiped_id', sw.swiped_id,
                            'type', sw.type,
                            'status', sw.status,
                            'is_priority', coalesce(sw.is_priority, false),
                            'message_teaser', sw.message_teaser,
                            'created_at', sw.created_at,
                            'locked', false,
                            'swiper', to_jsonb(p)
                        )
                    ELSE
                        jsonb_build_object(
                            'id', sw.id,
                            'swiper_id', sw.swiper_id,
                            'swiped_id', sw.swiped_id,
                            'type', sw.type,
                            'status', sw.status,
                            'is_priority', coalesce(sw.is_priority, false),
                            'created_at', sw.created_at,
                            'locked', true,
                            'swiper', jsonb_build_object(
                                'full_name', 'Secret Admirer 🔒',
                                'university', p.university
                            )
                        )
                END as item
            FROM public.swipes sw
            JOIN public.profiles p ON p.id = sw.swiper_id
            WHERE sw.swiped_id = v_user_id
              AND sw.status = 'pending'
              AND COALESCE(p.is_banned, false) = false
              AND COALESCE(p.is_shadow_banned, false) = false
            ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC
            LIMIT p_limit
        ) q;
    ELSE
        -- Premium: fully visible with subquery aggregation
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT
                jsonb_build_object(
                    'id', sw.id,
                    'swiper_id', sw.swiper_id,
                    'swiped_id', sw.swiped_id,
                    'type', sw.type,
                    'status', sw.status,
                    'is_priority', coalesce(sw.is_priority, false),
                    'message_teaser', sw.message_teaser,
                    'created_at', sw.created_at,
                    'locked', false,
                    'swiper', to_jsonb(p)
                ) as item
            FROM public.swipes sw
            JOIN public.profiles p ON p.id = sw.swiper_id
            WHERE sw.swiped_id = v_user_id
              AND sw.status = 'pending'
              AND COALESCE(p.is_banned, false) = false
              AND COALESCE(p.is_shadow_banned, false) = false
            ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC
            LIMIT p_limit
        ) q;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'premium', v_is_premium,
        'total_count', v_total,
        'today_accepts_count', v_today_accepts_count,
        'free_accepts_remaining', v_free_accepts_remaining,
        'daily_limit', CASE WHEN v_is_premium THEN 999 ELSE 3 END,
        'upgrade_required', (NOT v_is_premium AND v_total > 3),
        'items', v_items
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admirers_secure(integer) TO authenticated;
