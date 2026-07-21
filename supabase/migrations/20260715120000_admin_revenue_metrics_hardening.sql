-- Admin revenue metrics and finance RPC hardening.
-- The old dashboard treated wallets.total_spent as revenue. That value is a
-- spend/leaderboard counter, so this separates verified cash from app spend.

create or replace function public.admin_get_dashboard_stats()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_verified_cash_revenue numeric := 0;
  v_today_verified_cash_revenue numeric := 0;
  v_app_spend_revenue numeric := 0;
  v_wallet_spend_counter numeric := 0;
  v_pending_payments numeric := 0;
  v_google_play_gross numeric := 0;
  v_google_play_unclassified_gross numeric := 0;
  v_payout_liability numeric := 0;
  v_dau integer := 0;
  v_new_signups integer := 0;
  v_university_stats jsonb := '[]'::jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  select
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('deposit', 'subscription', 'payment')
        and (
          wt.payment_method in ('paystack', 'google_play')
          or wt.metadata->>'source' = 'revenuecat'
        )
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('deposit', 'subscription', 'payment')
        and (
          wt.payment_method in ('paystack', 'google_play')
          or wt.metadata->>'source' = 'revenuecat'
        )
        and wt.created_at >= current_date
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('swipe_purchase', 'boost_purchase', 'gift_purchase')
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status = 'pending'
        and wt.type in ('deposit', 'subscription', 'payment')
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and (
          wt.payment_method = 'google_play'
          or wt.metadata->>'source' = 'revenuecat'
        )
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and (
          wt.payment_method = 'google_play'
          or wt.metadata->>'source' = 'revenuecat'
        )
        and coalesce(wt.metadata->>'environment', '') = ''
    ), 0)
  into
    v_verified_cash_revenue,
    v_today_verified_cash_revenue,
    v_app_spend_revenue,
    v_pending_payments,
    v_google_play_gross,
    v_google_play_unclassified_gross
  from public.wallet_transactions wt;

  select coalesce(sum(w.total_spent), 0)
  into v_wallet_spend_counter
  from public.wallets w;

  select coalesce(sum(coalesce(w.available_balance, 0) + coalesce(w.pending_balance, 0)), 0)
  into v_payout_liability
  from public.wallets w
  join public.profiles p on p.id = w.user_id
  where lower(coalesce(p.gender, '')) = 'female'
    and coalesce(p.is_banned, false) = false
    and coalesce(p.is_shadow_banned, false) = false;

  select count(*)
  into v_dau
  from public.engagement_scores
  where last_login >= now() - interval '24 hours';

  select count(*)
  into v_new_signups
  from public.profiles
  where created_at >= now() - interval '24 hours'
    and coalesce(is_banned, false) = false
    and coalesce(is_shadow_banned, false) = false;

  select coalesce(jsonb_agg(jsonb_build_object('university', university, 'count', count)), '[]'::jsonb)
  into v_university_stats
  from (
    select p.university, count(*) as count
    from public.profiles p
    where p.university is not null
      and p.university <> ''
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
    group by p.university
    order by count desc
    limit 10
  ) sub;

  return jsonb_build_object(
    'totalRevenue', v_verified_cash_revenue,
    'todayRevenue', v_today_verified_cash_revenue,
    'verifiedCashRevenue', v_verified_cash_revenue,
    'todayVerifiedCashRevenue', v_today_verified_cash_revenue,
    'appSpendRevenue', v_app_spend_revenue,
    'walletSpendCounter', v_wallet_spend_counter,
    'pendingPayments', v_pending_payments,
    'googlePlayGross', v_google_play_gross,
    'googlePlayUnclassifiedGross', v_google_play_unclassified_gross,
    'pendingPayouts', v_payout_liability,
    'payoutLiability', v_payout_liability,
    'dau', v_dau,
    'newSignups', v_new_signups,
    'universityStats', v_university_stats
  );
end;
$function$;

create or replace function public.admin_get_analytics()
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  result json;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  select json_build_object(
    'dailySignups', (
      select json_agg(row_to_json(d)) from (
        select date(p.created_at) as date, count(*) as count
        from public.profiles p
        where p.created_at > now() - interval '7 days'
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
        group by date(p.created_at)
        order by date
      ) d
    ),
    'dailyRevenue', (
      select json_agg(row_to_json(r)) from (
        select date(wt.created_at) as date, sum(wt.amount) as total
        from public.wallet_transactions wt
        where wt.type in ('deposit', 'subscription', 'payment')
          and wt.status in ('completed', 'success')
          and (
            wt.payment_method in ('paystack', 'google_play')
            or wt.metadata->>'source' = 'revenuecat'
          )
          and wt.created_at > now() - interval '7 days'
        group by date(wt.created_at)
        order by date
      ) r
    ),
    'dailyAppSpend', (
      select json_agg(row_to_json(r)) from (
        select date(wt.created_at) as date, sum(wt.amount) as total
        from public.wallet_transactions wt
        where wt.type in ('swipe_purchase', 'boost_purchase', 'gift_purchase')
          and wt.status in ('completed', 'success')
          and wt.created_at > now() - interval '7 days'
        group by date(wt.created_at)
        order by date
      ) r
    ),
    'revenueBreakdown', (
      select json_agg(row_to_json(b)) from (
        select
          coalesce(wt.payment_method, 'unknown') as payment_method,
          wt.type,
          wt.status,
          count(*) as count,
          sum(wt.amount) as total
        from public.wallet_transactions wt
        where wt.type in ('deposit', 'subscription', 'payment', 'swipe_purchase', 'boost_purchase', 'gift_purchase')
        group by coalesce(wt.payment_method, 'unknown'), wt.type, wt.status
        order by total desc
      ) b
    ),
    'universityStats', (
      select json_agg(row_to_json(u)) from (
        select p.university, count(*) as user_count,
               count(case when lower(p.gender) = 'male' then 1 end) as males,
               count(case when lower(p.gender) = 'female' then 1 end) as females
        from public.profiles p
        where p.university is not null
          and p.university <> ''
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
        group by p.university
        order by user_count desc
        limit 10
      ) u
    ),
    'topSpenders', (
      select json_agg(row_to_json(s)) from (
        select p.full_name, p.university, coalesce(w.total_spent, 0) as total_spent
        from public.profiles p
        left join public.wallets w on p.id = w.user_id
        where coalesce(w.total_spent, 0) > 0
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
        order by total_spent desc
        limit 5
      ) s
    ),
    'genderSplit', (
      select json_build_object(
        'male', count(case when lower(p.gender) = 'male' then 1 end),
        'female', count(case when lower(p.gender) = 'female' then 1 end),
        'other', count(case when lower(p.gender) not in ('male','female') then 1 end)
      )
      from public.profiles p
      where coalesce(p.is_banned, false) = false
        and coalesce(p.is_shadow_banned, false) = false
    )
  ) into result;

  return result;
end;
$function$;

drop function if exists public.admin_get_wallets();

create function public.admin_get_wallets()
returns table (
  user_id uuid,
  full_name text,
  university text,
  gender text,
  balance numeric,
  available_balance numeric,
  pending_balance numeric,
  total_earned numeric,
  total_spent numeric
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    p.id as user_id,
    p.full_name,
    p.university,
    p.gender,
    coalesce(w.available_balance, 0) + coalesce(w.pending_balance, 0) as balance,
    coalesce(w.available_balance, 0) as available_balance,
    coalesce(w.pending_balance, 0) as pending_balance,
    coalesce(w.total_earned, 0) as total_earned,
    coalesce(w.total_spent, 0) as total_spent
  from public.profiles p
  left join public.wallets w on p.id = w.user_id
  where (
      coalesce(w.available_balance, 0) > 0
      or coalesce(w.pending_balance, 0) > 0
      or coalesce(w.total_earned, 0) > 0
      or coalesce(w.total_spent, 0) > 0
    )
    and coalesce(p.is_banned, false) = false
    and coalesce(p.is_shadow_banned, false) = false
  order by balance desc, total_earned desc, total_spent desc;
end;
$function$;

drop function if exists public.admin_get_transactions(integer, integer);

create function public.admin_get_transactions(p_limit integer default 100, p_offset integer default 0)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  university text,
  gender text,
  type text,
  amount numeric,
  status text,
  description text,
  payment_method text,
  reference_id text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  select
    wt.id,
    wt.user_id,
    p.full_name,
    p.university,
    p.gender,
    wt.type,
    wt.amount,
    wt.status,
    wt.description,
    wt.payment_method,
    wt.reference_id,
    wt.created_at
  from public.wallet_transactions wt
  left join public.profiles p on wt.user_id = p.id
  order by wt.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$function$;

revoke all on function public.admin_get_dashboard_stats() from public, anon;
revoke all on function public.admin_get_analytics() from public, anon;
revoke all on function public.admin_get_wallets() from public, anon;
revoke all on function public.admin_get_transactions(integer, integer) from public, anon;

grant execute on function public.admin_get_dashboard_stats() to authenticated;
grant execute on function public.admin_get_analytics() to authenticated;
grant execute on function public.admin_get_wallets() to authenticated;
grant execute on function public.admin_get_transactions(integer, integer) to authenticated;
