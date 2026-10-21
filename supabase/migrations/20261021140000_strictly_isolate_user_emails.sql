-- ============================================================================
-- Migration: 20261021140000_strictly_isolate_user_emails.sql
-- Description: Complete User Email Privacy & Cross-Exposure Isolation Guard.
--              Guarantees User A cannot see User B's email and vice versa:
--              1. Removes email and phone from public.discovery_feed_v3.
--              2. Rewrites get_admirers_secure to return safe public swiper
--                 objects instead of to_jsonb(p) which exposed emails.
--              3. Erases plain-text emails from public.profiles and introduces
--                 an automated write trigger ensuring public.profiles.email
--                 remains NULL on all inserts and updates.
--              4. Updates admin RPCs (admin_search_users, admin_get_withdrawals,
--                 admin_get_user_detail) to join auth.users so authorized admins
--                 retain operational visibility without leaking emails on public tables.
-- ============================================================================

-- 1. Sanitize discovery_feed_v3: Strictly exclude email, phone, and onesignal_id
DROP VIEW IF EXISTS public.discovery_feed_v3 CASCADE;
CREATE OR REPLACE VIEW public.discovery_feed_v3
WITH (security_invoker = true)
AS
 SELECT p.id,
    p.full_name,
    p.username,
    p.gender,
    p.age,
    p.university,
    p.bio,
    p.avatar_url,
    p.photos,
    p.profile_photos,
    p.role,
    p.is_verified,
    p.photo_verified,
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
    p.streak_freeze_count,
    p.current_badge,
    p.completion_score,
    p.is_optimised,
    p.interests,
    p.intro_prompt,
    p.is_live,
    COALESCE(s.plan_type, 'Free'::text) AS plan_type,
    (EXISTS ( SELECT 1
           FROM public.boosts b
          WHERE b.user_id = p.id AND b.expires_at > now() AND b.type = '24h_boost'::text)) AS is_boosted,
    p.photo_updated_at
   FROM public.profiles p
     LEFT JOIN public.subscriptions s ON s.user_id = p.id
  WHERE COALESCE(p.is_banned, false) = false AND COALESCE(p.is_shadow_banned, false) = false;

GRANT SELECT ON public.discovery_feed_v3 TO authenticated;
GRANT SELECT ON public.discovery_feed_v3 TO anon;

-- 2. Rewrite get_admirers_secure: Do NOT return to_jsonb(p); project only safe fields
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
                            'swiper', jsonb_build_object(
                                'id', p.id,
                                'full_name', p.full_name,
                                'username', p.username,
                                'gender', p.gender,
                                'age', p.age,
                                'university', p.university,
                                'faculty', p.faculty,
                                'department', p.department,
                                'level', p.level,
                                'avatar_url', p.avatar_url,
                                'profile_photos', p.profile_photos,
                                'photo_updated_at', p.photo_updated_at,
                                'is_verified', coalesce(p.is_verified, false),
                                'photo_verified', coalesce(p.photo_verified, false),
                                'bio', p.bio,
                                'interests', p.interests,
                                'intro_prompt', p.intro_prompt,
                                'voice_intro_url', p.voice_intro_url,
                                'anthem', p.anthem,
                                'attraction_goal', p.attraction_goal,
                                'last_seen_at', p.last_seen_at,
                                'last_active', p.last_active,
                                'is_live', p.is_live,
                                'completion_score', p.completion_score,
                                'current_badge', p.current_badge
                            )
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
                                'university', p.university,
                                'avatar_url', null,
                                'is_verified', false
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
        -- Premium: fully visible with safe fields (NO EMAIL, NO PHONE)
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
                    'swiper', jsonb_build_object(
                        'id', p.id,
                        'full_name', p.full_name,
                        'username', p.username,
                        'gender', p.gender,
                        'age', p.age,
                        'university', p.university,
                        'faculty', p.faculty,
                        'department', p.department,
                        'level', p.level,
                        'avatar_url', p.avatar_url,
                        'profile_photos', p.profile_photos,
                        'photo_updated_at', p.photo_updated_at,
                        'is_verified', coalesce(p.is_verified, false),
                        'photo_verified', coalesce(p.photo_verified, false),
                        'bio', p.bio,
                        'interests', p.interests,
                        'intro_prompt', p.intro_prompt,
                        'voice_intro_url', p.voice_intro_url,
                        'anthem', p.anthem,
                        'attraction_goal', p.attraction_goal,
                        'last_seen_at', p.last_seen_at,
                        'last_active', p.last_active,
                        'is_live', p.is_live,
                        'completion_score', p.completion_score,
                        'current_badge', p.current_badge
                    )
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
        'is_premium', v_is_premium,
        'total_count', v_total,
        'free_accepts_remaining', v_free_accepts_remaining,
        'today_accepts_count', v_today_accepts_count,
        'requests', v_items
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admirers_secure(integer) TO authenticated;

-- 3. Mask email on public.profiles: Erase stored plain text emails and enforce NULL on write
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
UPDATE public.profiles SET email = NULL WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.mask_profile_email_on_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.email := NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_email_storage ON public.profiles;
CREATE TRIGGER trg_prevent_profile_email_storage
BEFORE INSERT OR UPDATE OF email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.mask_profile_email_on_write();

-- 4. Update Admin RPCs to join auth.users so authorized operators still see verified emails
CREATE OR REPLACE FUNCTION public.admin_search_users(
  p_limit integer default 50,
  p_offset integer default 0,
  p_query text default null,
  p_status text default null,
  p_gender text default null,
  p_university text default null,
  p_verified boolean default null,
  p_premium boolean default null,
  p_activity text default null
)
RETURNS table (
  id uuid,
  full_name text,
  email text,
  gender text,
  university text,
  avatar_url text,
  is_banned boolean,
  is_shadow_banned boolean,
  is_verified boolean,
  is_premium boolean,
  created_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  last_active timestamp with time zone,
  is_online boolean,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_query text := nullif(trim(coalesce(p_query, '')), '');
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_gender text := lower(nullif(trim(coalesce(p_gender, '')), ''));
  v_university text := nullif(trim(coalesce(p_university, '')), '');
  v_activity text := lower(nullif(trim(coalesce(p_activity, '')), ''));
begin
  if not (
    public.admin_has_permission('users:read')
    or public.admin_has_permission('users.view')
    or public.admin_has_permission('users:moderate')
    or public.admin_is_owner()
    or public.is_app_admin()
  ) then
    raise exception 'Not authorized';
  end if;

  if v_status is not null and v_status not in ('active', 'good_standing', 'banned', 'shadow') then
    raise exception 'Invalid status filter';
  end if;

  if v_activity is not null and v_activity not in ('online', 'active_24h', 'active_7d', 'active_30d', 'inactive') then
    raise exception 'Invalid activity filter';
  end if;

  return query
  with filtered as (
    select
      p.id,
      p.full_name,
      coalesce(u.email, p.email)::text as email,
      p.gender,
      p.university,
      p.avatar_url,
      p.is_banned,
      p.is_shadow_banned,
      p.is_verified,
      p.is_premium,
      p.created_at,
      p.last_seen_at,
      p.last_active,
      p.last_seen
    from public.profiles p
    left join auth.users u on u.id = p.id
    where
      (
        v_query is null
        or coalesce(p.full_name, '') ilike '%' || v_query || '%'
        or coalesce(u.email, p.email, '') ilike '%' || v_query || '%'
        or p.id::text = v_query
      )
      and (
        v_status is null
        or (v_status = 'banned' and coalesce(p.is_banned, false))
        or (v_status = 'shadow' and coalesce(p.is_shadow_banned, false))
        or (
          v_status in ('active', 'good_standing')
          and not coalesce(p.is_banned, false)
          and not coalesce(p.is_shadow_banned, false)
        )
      )
      and (
        v_activity is null
        or (v_activity = 'online' and coalesce(p.last_seen_at, p.last_active, p.last_seen) >= now() - interval '5 minutes')
        or (v_activity = 'active_24h' and coalesce(p.last_seen_at, p.last_active, p.last_seen) >= now() - interval '24 hours')
        or (v_activity = 'active_7d' and coalesce(p.last_seen_at, p.last_active, p.last_seen) >= now() - interval '7 days')
        or (v_activity = 'active_30d' and coalesce(p.last_seen_at, p.last_active, p.last_seen) >= now() - interval '30 days')
        or (v_activity = 'inactive' and (coalesce(p.last_seen_at, p.last_active, p.last_seen) < now() - interval '30 days' or coalesce(p.last_seen_at, p.last_active, p.last_seen) is null))
      )
      and (v_gender is null or lower(coalesce(p.gender, '')) = v_gender)
      and (v_university is null or coalesce(p.university, '') ilike '%' || v_university || '%')
      and (p_verified is null or coalesce(p.is_verified, false) = p_verified)
      and (p_premium is null or coalesce(p.is_premium, false) = p_premium)
  )
  select
    f.id,
    f.full_name::text,
    f.email::text,
    f.gender::text,
    f.university::text,
    f.avatar_url::text,
    coalesce(f.is_banned, false),
    coalesce(f.is_shadow_banned, false),
    coalesce(f.is_verified, false),
    coalesce(f.is_premium, false),
    f.created_at,
    coalesce(f.last_seen_at, f.last_active, f.last_seen) as last_seen_at,
    f.last_active,
    (coalesce(f.last_seen_at, f.last_active, f.last_seen) >= now() - interval '5 minutes') as is_online,
    count(*) over()::bigint as total_count
  from filtered f
  order by
    case when v_activity in ('online', 'active_24h', 'active_7d', 'active_30d') then coalesce(f.last_seen_at, f.last_active, f.last_seen) end desc nulls last,
    f.created_at desc nulls last
  limit v_limit
  offset v_offset;
end;
$function$;

-- Update admin_get_withdrawals to join auth.users
CREATE OR REPLACE FUNCTION public.admin_get_withdrawals(
  p_limit integer default 100,
  p_offset integer default 0,
  p_status text default null
)
RETURNS table (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  university text,
  gender text,
  amount numeric,
  type text,
  status text,
  bank_details jsonb,
  created_at timestamp with time zone,
  processed_at timestamp with time zone,
  processed_by uuid,
  admin_note text,
  rejection_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_status text := nullif(trim(coalesce(p_status, '')), '');
begin
  if not (
    public.admin_has_permission('wallet:read')
    or public.admin_has_permission('finance.view')
    or public.admin_is_owner()
    or public.is_app_admin()
  ) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    w.id,
    w.user_id,
    p.full_name::text,
    coalesce(u.email, p.email)::text as email,
    p.university::text,
    p.gender::text,
    w.amount,
    w.type::text,
    w.status::text,
    w.bank_details,
    w.created_at,
    w.processed_at,
    w.processed_by,
    w.admin_note::text,
    w.rejection_reason::text
  from public.withdrawals w
  left join public.profiles p on p.id = w.user_id
  left join auth.users u on u.id = w.user_id
  where (v_status is null or lower(w.status) = v_status)
  order by w.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

-- Update admin_get_user_detail to join auth.users
CREATE OR REPLACE FUNCTION public.admin_get_user_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_profile jsonb;
  v_wallet jsonb;
  v_transactions jsonb;
begin
  if not (
    public.admin_has_permission('users:read')
    or public.admin_has_permission('users.view')
    or public.admin_has_permission('users:moderate')
    or public.admin_is_owner()
    or public.is_app_admin()
  ) then
    raise exception 'Not authorized';
  end if;

  select to_jsonb(prof)
  into v_profile
  from (
    select
      p.id,
      coalesce(u.email, p.email)::text as email,
      p.full_name,
      p.university,
      p.gender,
      p.avatar_url,
      p.is_banned,
      p.is_shadow_banned,
      p.is_verified,
      p.is_premium,
      p.premium_expires_at,
      p.created_at,
      p.last_seen_at,
      p.last_active
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = p_user_id
  ) prof;

  select to_jsonb(w)
  into v_wallet
  from (
    select
      id,
      user_id,
      available_balance,
      pending_balance,
      total_earned,
      total_spent,
      total_withdrawn,
      updated_at
    from public.wallets
    where user_id = p_user_id
  ) w;

  select coalesce(jsonb_agg(tx), '[]'::jsonb)
  into v_transactions
  from (
    select
      id,
      user_id,
      type,
      amount,
      status,
      description,
      payment_method,
      reference_id,
      created_at
    from public.wallet_transactions
    where user_id = p_user_id
    order by created_at desc
    limit 20
  ) tx;

  return jsonb_build_object(
    'profile', v_profile,
    'wallet', v_wallet,
    'transactions', v_transactions
  );
end;
$function$;

NOTIFY pgrst, 'reload schema';
