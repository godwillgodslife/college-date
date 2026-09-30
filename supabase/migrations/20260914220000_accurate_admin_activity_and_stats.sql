-- ============================================================================
-- Migration: 20260914220000_accurate_admin_activity_and_stats.sql
-- Description:
--   Remediates all inaccurate and misleading metrics on the Admin Panel:
--   1. Updates admin_get_ops_snapshot() to bound pending payments to the
--      last 24 hours so stale abandoned checkouts do not falsely inflate
--      to NGN 94,613.
--   2. Updates admin_get_dashboard_stats() to calculate true user activity
--      (online_now, dau, wau, mau, total_users) from public.profiles instead
--      of the abandoned engagement_scores table. Bounds pending payments to
--      last 24 hours. Returns both snake_case and camelCase keys to eliminate
--      property mismatches with the admin dashboard frontend.
--   3. Introduces admin_get_user_summary() RPC for database-wide accurate
--      counts (total, onlineNow, active24h, active7d, active30d, inactive,
--      goodStanding, shadow, banned, verified, premium, needsReview).
--   4. Upgrades admin_search_users() with p_activity filter ('online', 'active_24h',
--      'active_7d', 'active_30d', 'inactive'), unified last_seen_at, and is_online.
--   5. Cleans up sticky is_online / is_live flags for dormant accounts.
-- ============================================================================

-- 1. Upgrade admin_get_ops_snapshot()
CREATE OR REPLACE FUNCTION public.admin_get_ops_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_pending_reports bigint := 0;
  v_pending_withdrawals bigint := 0;
  v_pending_withdrawal_amount numeric := 0;
  v_pending_payments numeric := 0;
  v_abandoned_payments numeric := 0;
  v_audit_records bigint := 0;
begin
  if not (
    public.is_app_admin()
    or public.admin_is_owner()
    or public.admin_has_permission('analytics:view')
    or public.admin_has_permission('finance:read')
    or public.admin_has_permission('users:read')
  ) then
    raise exception 'Not authorized';
  end if;

  select count(*)::bigint
  into v_pending_reports
  from public.confession_reports
  where status = 'pending';

  select
    count(*)::bigint,
    coalesce(sum(amount), 0)::numeric
  into
    v_pending_withdrawals,
    v_pending_withdrawal_amount
  from public.withdrawals
  where status = 'pending';

  -- Active unverified payments within the last 24 hours only
  select
    coalesce(sum(amount) filter (where created_at >= now() - interval '24 hours'), 0)::numeric,
    coalesce(sum(amount) filter (where created_at < now() - interval '24 hours'), 0)::numeric
  into
    v_pending_payments,
    v_abandoned_payments
  from public.wallet_transactions
  where status = 'pending'
    and type in ('deposit', 'subscription', 'payment');

  select count(*)::bigint
  into v_audit_records
  from public.admin_audit_logs;

  return jsonb_build_object(
    'pendingReports', v_pending_reports,
    'pending_reports', v_pending_reports,
    'pendingWithdrawals', v_pending_withdrawals,
    'pending_withdrawals', v_pending_withdrawals,
    'pendingWithdrawalAmount', v_pending_withdrawal_amount,
    'pending_withdrawal_amount', v_pending_withdrawal_amount,
    'pendingPayments', v_pending_payments,
    'pending_payments', v_pending_payments,
    'abandonedPayments', v_abandoned_payments,
    'abandoned_payments', v_abandoned_payments,
    'auditRecords', v_audit_records,
    'audit_records', v_audit_records,
    'generatedAt', now()
  );
end;
$function$;

-- 2. Upgrade admin_get_dashboard_stats()
CREATE OR REPLACE FUNCTION public.admin_get_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_prod_cash_revenue numeric := 0;
  v_test_sandbox_revenue numeric := 0;
  v_today_prod_cash_revenue numeric := 0;
  v_app_spend_revenue numeric := 0;
  v_pending_payments numeric := 0;
  v_abandoned_payments numeric := 0;
  v_google_play_prod_gross numeric := 0;
  v_google_play_sandbox_gross numeric := 0;
  v_paystack_prod_gross numeric := 0;
  v_paystack_test_gross numeric := 0;
  v_payout_liability numeric := 0;
  v_online_now integer := 0;
  v_dau integer := 0;
  v_wau integer := 0;
  v_mau integer := 0;
  v_total_users integer := 0;
  v_new_signups integer := 0;
  v_university_stats jsonb := '[]'::jsonb;
begin
  if not (
    public.admin_has_permission('finance:read')
    or public.admin_has_permission('finance.read')
    or public.admin_has_permission('finance:payouts')
    or public.admin_is_owner()
  ) then
    raise exception 'Not authorized';
  end if;

  -- 1. Real Production Revenue (strictly excludes test/sandbox data)
  select
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('deposit', 'subscription', 'payment')
        and coalesce(wt.is_test, false) = false
        and coalesce(wt.environment, 'production') = 'production'
        and coalesce(wt.metadata->>'environment', 'PRODUCTION') = 'PRODUCTION'
        and coalesce((wt.metadata->>'is_sandbox')::boolean, false) = false
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and (
          coalesce(wt.is_test, false) = true
          or coalesce(wt.environment, 'production') != 'production'
          or coalesce(wt.metadata->>'environment', 'PRODUCTION') != 'PRODUCTION'
          or coalesce((wt.metadata->>'is_sandbox')::boolean, false) = true
        )
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('deposit', 'subscription', 'payment')
        and coalesce(wt.is_test, false) = false
        and coalesce(wt.environment, 'production') = 'production'
        and wt.created_at >= current_date
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.type in ('swipe_purchase', 'boost_purchase', 'gift_purchase')
    ), 0),
    -- Pending checkouts in the last 24h only
    coalesce(sum(wt.amount) filter (
      where wt.status = 'pending'
        and wt.type in ('deposit', 'subscription', 'payment')
        and wt.created_at >= now() - interval '24 hours'
    ), 0),
    -- Stale checkouts > 24h
    coalesce(sum(wt.amount) filter (
      where wt.status = 'pending'
        and wt.type in ('deposit', 'subscription', 'payment')
        and wt.created_at < now() - interval '24 hours'
    ), 0),
    -- Google Play Prod vs Sandbox
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and (wt.payment_method = 'google_play' or wt.metadata->>'source' = 'revenuecat')
        and coalesce(wt.is_test, false) = false
        and coalesce(wt.environment, 'production') = 'production'
        and coalesce(wt.metadata->>'environment', 'PRODUCTION') = 'PRODUCTION'
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and (wt.payment_method = 'google_play' or wt.metadata->>'source' = 'revenuecat')
        and (
          coalesce(wt.is_test, false) = true
          or coalesce(wt.environment, 'production') != 'production'
          or coalesce(wt.metadata->>'environment', 'PRODUCTION') != 'PRODUCTION'
          or coalesce((wt.metadata->>'is_sandbox')::boolean, false) = true
        )
    ), 0),
    -- Paystack Prod vs Test
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.payment_method = 'paystack'
        and coalesce(wt.is_test, false) = false
        and coalesce(wt.environment, 'production') = 'production'
    ), 0),
    coalesce(sum(wt.amount) filter (
      where wt.status in ('completed', 'success')
        and wt.payment_method = 'paystack'
        and (coalesce(wt.is_test, false) = true or coalesce(wt.environment, 'production') != 'production')
    ), 0)
  into
    v_prod_cash_revenue,
    v_test_sandbox_revenue,
    v_today_prod_cash_revenue,
    v_app_spend_revenue,
    v_pending_payments,
    v_abandoned_payments,
    v_google_play_prod_gross,
    v_google_play_sandbox_gross,
    v_paystack_prod_gross,
    v_paystack_test_gross
  from public.wallet_transactions wt;

  select coalesce(sum(coalesce(w.available_balance, 0) + coalesce(w.pending_balance, 0)), 0)
  into v_payout_liability
  from public.wallets w
  join public.profiles p on p.id = w.user_id
  where lower(coalesce(p.gender, '')) = 'female'
    and coalesce(p.is_banned, false) = false
    and coalesce(p.is_shadow_banned, false) = false;

  -- 2. User Activity & Growth Metrics (derived truthfully from profiles)
  select count(*)
  into v_total_users
  from public.profiles;

  select count(*)
  into v_online_now
  from public.profiles
  where coalesce(last_seen_at, last_active, last_seen) >= now() - interval '5 minutes'
    and coalesce(is_banned, false) = false
    and coalesce(is_shadow_banned, false) = false;

  select count(*)
  into v_dau
  from public.profiles
  where coalesce(last_seen_at, last_active, last_seen) >= now() - interval '24 hours'
    and coalesce(is_banned, false) = false
    and coalesce(is_shadow_banned, false) = false;

  select count(*)
  into v_wau
  from public.profiles
  where coalesce(last_seen_at, last_active, last_seen) >= now() - interval '7 days'
    and coalesce(is_banned, false) = false
    and coalesce(is_shadow_banned, false) = false;

  select count(*)
  into v_mau
  from public.profiles
  where coalesce(last_seen_at, last_active, last_seen) >= now() - interval '30 days'
    and coalesce(is_banned, false) = false
    and coalesce(is_shadow_banned, false) = false;

  select count(*)
  into v_new_signups
  from public.profiles
  where created_at >= current_date;

  select coalesce(jsonb_agg(sub), '[]'::jsonb)
  into v_university_stats
  from (
    select
      coalesce(nullif(trim(university), ''), 'Unspecified') as university,
      count(*) as count,
      count(*) as student_count,
      count(*) as user_count
    from public.profiles
    group by coalesce(nullif(trim(university), ''), 'Unspecified')
    order by count desc
    limit 6
  ) sub;

  return jsonb_build_object(
    'verified_cash_revenue', v_prod_cash_revenue,
    'verifiedCashRevenue', v_prod_cash_revenue,
    'today_verified_cash_revenue', v_today_prod_cash_revenue,
    'todayVerifiedCashRevenue', v_today_prod_cash_revenue,
    'test_sandbox_revenue', v_test_sandbox_revenue,
    'testSandboxRevenue', v_test_sandbox_revenue,
    'app_spend_revenue', v_app_spend_revenue,
    'appSpendRevenue', v_app_spend_revenue,
    'pending_payments', v_pending_payments,
    'pendingPayments', v_pending_payments,
    'abandoned_payments', v_abandoned_payments,
    'abandonedPayments', v_abandoned_payments,
    'google_play_gross', v_google_play_prod_gross,
    'googlePlayGross', v_google_play_prod_gross,
    'google_play_sandbox_gross', v_google_play_sandbox_gross,
    'googlePlaySandboxGross', v_google_play_sandbox_gross,
    'paystack_prod_gross', v_paystack_prod_gross,
    'paystackProdGross', v_paystack_prod_gross,
    'paystack_test_gross', v_paystack_test_gross,
    'paystackTestGross', v_paystack_test_gross,
    'payout_liability', v_payout_liability,
    'payoutLiability', v_payout_liability,
    'online_now', v_online_now,
    'onlineNow', v_online_now,
    'dau', v_dau,
    'wau', v_wau,
    'mau', v_mau,
    'total_users', v_total_users,
    'totalUsers', v_total_users,
    'new_signups_today', v_new_signups,
    'newSignupsToday', v_new_signups,
    'university_stats', v_university_stats,
    'universityStats', v_university_stats
  );
end;
$function$;

-- 3. Create admin_get_user_summary() RPC
CREATE OR REPLACE FUNCTION public.admin_get_user_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
  v_summary jsonb;
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

  select jsonb_build_object(
    'total', count(*),
    'onlineNow', count(*) filter (where coalesce(last_seen_at, last_active, last_seen) >= now() - interval '5 minutes'),
    'active24h', count(*) filter (where coalesce(last_seen_at, last_active, last_seen) >= now() - interval '24 hours'),
    'active7d', count(*) filter (where coalesce(last_seen_at, last_active, last_seen) >= now() - interval '7 days'),
    'active30d', count(*) filter (where coalesce(last_seen_at, last_active, last_seen) >= now() - interval '30 days'),
    'inactive', count(*) filter (where coalesce(last_seen_at, last_active, last_seen) < now() - interval '30 days' or coalesce(last_seen_at, last_active, last_seen) is null),
    'goodStanding', count(*) filter (where coalesce(is_banned, false) = false and coalesce(is_shadow_banned, false) = false),
    'shadow', count(*) filter (where coalesce(is_shadow_banned, false) = true),
    'banned', count(*) filter (where coalesce(is_banned, false) = true),
    'verified', count(*) filter (where coalesce(is_verified, false) = true),
    'premium', count(*) filter (where coalesce(is_premium, false) = true),
    'needsReview', count(*) filter (where coalesce(is_banned, false) = true or coalesce(is_shadow_banned, false) = true or coalesce(is_verified, false) = false)
  )
  into v_summary
  from public.profiles;

  return v_summary;
end;
$function$;

-- 4. Upgrade admin_search_users() with p_activity filter & unified last_seen_at / is_online
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
    select p.*
    from public.profiles p
    where
      (
        v_query is null
        or coalesce(p.full_name, '') ilike '%' || v_query || '%'
        or coalesce(p.email, '') ilike '%' || v_query || '%'
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

-- 5. Clean up stale sticky is_online / is_live flags in profiles
UPDATE public.profiles
SET is_online = false,
    is_live = false
WHERE coalesce(last_seen_at, last_active, last_seen) < now() - interval '10 minutes'
   OR coalesce(last_seen_at, last_active, last_seen) IS NULL;

-- 6. Revoke and grant execution permissions
REVOKE ALL ON FUNCTION public.admin_get_ops_snapshot() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_get_dashboard_stats() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_get_user_summary() FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_search_users(integer, integer, text, text, text, text, boolean, boolean, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION public.admin_get_ops_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_users(integer, integer, text, text, text, text, boolean, boolean, text) TO authenticated;
