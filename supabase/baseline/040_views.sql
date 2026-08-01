-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: public view definitions only. No production rows are included.
-- Security decision: all views are created with security_invoker = true in staging.

set search_path = public, extensions;

create or replace view public.discovery_feed_v3
with (security_invoker = true) as
select
    p.id,
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
    coalesce(s.plan_type, 'Free'::text) as plan_type,
    exists (
        select 1
        from public.boosts b
        where b.user_id = p.id
          and b.expires_at > now()
          and b.type = '24h_boost'::text
    ) as is_boosted
from public.profiles p
left join public.subscriptions s on s.user_id = p.id
where coalesce(p.is_banned, false) = false
  and coalesce(p.is_shadow_banned, false) = false;

create or replace view public.leaderboard_big_spenders
with (security_invoker = true) as
select
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    coalesce(w.total_spent, 0::numeric) as total_spent
from public.profiles p
join public.wallets w on w.user_id = p.id
order by w.total_spent desc
limit 100;

create or replace view public.leaderboard_campus_stars
with (security_invoker = true) as
select
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    coalesce(p.completion_score, 0) as completion_score,
    coalesce(es.score, 0) as engagement_score
from public.profiles p
left join public.engagement_scores es on es.user_id = p.id
order by (coalesce(p.completion_score, 0) + coalesce(es.score, 0)) desc
limit 100;

create or replace view public.leaderboard_most_wanted
with (security_invoker = true) as
select
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.role,
    count(s.id) as total_likes_received
from public.profiles p
left join public.swipes s on s.swiped_id = p.id and s.direction = 'right'::text
group by p.id, p.full_name, p.avatar_url, p.university, p.role
order by count(s.id) desc
limit 100;

create or replace view public.leaderboard_unified
with (security_invoker = true) as
select
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.gender,
    (
        coalesce(swipe_stats.likes_received, 0::bigint) * 10
        + coalesce(view_stats.views_received, 0::bigint) * 2
        + coalesce(match_stats.match_count, 0::bigint) * 5
    )::integer as premium_swipes_received,
    coalesce(w.total_spent, 0::numeric)::integer as total_spent,
    p.completion_score
from public.profiles p
left join (
    select swipes.swiped_id, count(swipes.id) as likes_received
    from public.swipes
    where swipes.direction = 'right'::text
    group by swipes.swiped_id
) swipe_stats on p.id = swipe_stats.swiped_id
left join (
    select profile_views.profile_owner_id, count(profile_views.id) as views_received
    from public.profile_views
    group by profile_views.profile_owner_id
) view_stats on p.id = view_stats.profile_owner_id
left join (
    select all_matches.user_id, count(*) as match_count
    from (
        select matches.user1_id as user_id from public.matches
        union all
        select matches.user2_id as user_id from public.matches
    ) all_matches
    group by all_matches.user_id
) match_stats on p.id = match_stats.user_id
left join public.wallets w on p.id = w.user_id
where p.is_banned = false
  and p.is_shadow_banned = false
  and (
      p.last_active > (now() - '14 days'::interval)
      or p.last_seen_at > (now() - '14 days'::interval)
      or p.last_active is null
  );

create or replace view public.optimized_confessions
with (security_invoker = true) as
select
    c.id,
    c.content,
    c.university,
    c.user_id,
    c.created_at,
    coalesce(r.reaction_data, '[]'::jsonb) as reaction_data,
    coalesce(r.total_reactions, 0::bigint) as total_reactions,
    coalesce(comm.comment_count, 0::bigint) as comment_count,
    coalesce(cl.claimer_ids, '[]'::jsonb) as claimer_ids,
    coalesce(r.total_reactions, 0::bigint) >= 20 as is_viral
from public.confessions c
left join (
    select
        confession_reactions.confession_id,
        jsonb_agg(jsonb_build_object('u', confession_reactions.user_id, 'e', confession_reactions.emoji)) as reaction_data,
        count(*) as total_reactions
    from public.confession_reactions
    group by confession_reactions.confession_id
) r on c.id = r.confession_id
left join (
    select confession_comments.confession_id, count(*) as comment_count
    from public.confession_comments
    group by confession_comments.confession_id
) comm on c.id = comm.confession_id
left join (
    select confession_claims.confession_id, jsonb_agg(confession_claims.claimer_id) as claimer_ids
    from public.confession_claims
    group by confession_claims.confession_id
) cl on c.id = cl.confession_id;
