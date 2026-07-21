-- Permission gates for sensitive admin reads.
-- This keeps restricted admins from reading entire operational areas through RPCs
-- unless their role explicitly includes the relevant read/moderation capability.

create or replace function public.admin_search_users(
  p_limit integer default 50,
  p_offset integer default 0,
  p_query text default null,
  p_status text default null,
  p_gender text default null,
  p_university text default null,
  p_verified boolean default null,
  p_premium boolean default null
)
returns table (
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
  total_count bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_query text := nullif(trim(coalesce(p_query, '')), '');
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_gender text := lower(nullif(trim(coalesce(p_gender, '')), ''));
  v_university text := nullif(trim(coalesce(p_university, '')), '');
begin
  if not (public.admin_has_permission('users:read') or public.admin_has_permission('users:moderate')) then
    raise exception 'Not authorized';
  end if;

  if v_status is not null and v_status not in ('active', 'banned', 'shadow') then
    raise exception 'Invalid status filter';
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
          v_status = 'active'
          and not coalesce(p.is_banned, false)
          and not coalesce(p.is_shadow_banned, false)
        )
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
    f.last_seen_at,
    f.last_active,
    count(*) over()::bigint as total_count
  from filtered f
  order by f.created_at desc nulls last
  limit v_limit
  offset v_offset;
end;
$function$;

create or replace function public.admin_get_user_detail(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_profile jsonb;
  v_wallet jsonb;
  v_transactions jsonb;
begin
  if not (public.admin_has_permission('users:read') or public.admin_has_permission('users:moderate')) then
    raise exception 'Not authorized';
  end if;

  select to_jsonb(p)
  into v_profile
  from (
    select
      id,
      email,
      full_name,
      university,
      gender,
      avatar_url,
      is_banned,
      is_shadow_banned,
      is_verified,
      is_premium,
      premium_expires_at,
      created_at,
      last_seen_at,
      last_active
    from public.profiles
    where id = p_user_id
  ) p;

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

  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb)
  into v_transactions
  from (
    select
      id,
      user_id,
      wallet_id,
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
  ) t;

  perform public.admin_write_audit_log(
    'admin_view_user_detail',
    'profile',
    p_user_id,
    jsonb_build_object('transaction_limit', 20)
  );

  return jsonb_build_object(
    'profile', coalesce(v_profile, '{}'::jsonb),
    'wallet', v_wallet,
    'transactions', v_transactions
  );
end;
$function$;

create or replace function public.admin_get_confessions(
  p_limit integer default 50,
  p_offset integer default 0,
  p_search text default null,
  p_university text default null,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
returns table (
  id uuid,
  content text,
  university text,
  user_id uuid,
  created_at timestamp with time zone,
  total_count bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_university text := nullif(trim(coalesce(p_university, '')), '');
begin
  if not public.admin_has_permission('content:moderate') then
    raise exception 'Not authorized';
  end if;

  return query
  with filtered as (
    select c.*
    from public.confessions c
    where
      (v_search is null or coalesce(c.content, '') ilike '%' || v_search || '%' or c.id::text = v_search)
      and (v_university is null or coalesce(c.university, '') ilike '%' || v_university || '%')
      and (p_from is null or c.created_at >= p_from)
      and (p_to is null or c.created_at <= p_to)
  )
  select
    f.id,
    f.content::text,
    f.university::text,
    f.user_id,
    f.created_at,
    count(*) over()::bigint as total_count
  from filtered f
  order by f.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

create or replace function public.admin_get_confession_reports(
  p_limit integer default 50,
  p_offset integer default 0,
  p_status text default 'pending',
  p_search text default null,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
returns table (
  id uuid,
  confession_id uuid,
  reporter_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamp with time zone,
  confession_content text,
  confession_university text,
  confession_created_at timestamp with time zone,
  total_count bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not public.admin_has_permission('content:moderate') then
    raise exception 'Not authorized';
  end if;

  return query
  with filtered as (
    select
      r.id,
      r.confession_id,
      r.reporter_id,
      r.reason,
      r.details,
      r.status,
      r.created_at,
      c.content as confession_content,
      c.university as confession_university,
      c.created_at as confession_created_at
    from public.confession_reports r
    left join public.confessions c on c.id = r.confession_id
    where
      (v_status is null or lower(coalesce(r.status, '')) = v_status)
      and (
        v_search is null
        or coalesce(r.reason, '') ilike '%' || v_search || '%'
        or coalesce(r.details, '') ilike '%' || v_search || '%'
        or coalesce(c.content, '') ilike '%' || v_search || '%'
        or r.id::text = v_search
        or r.confession_id::text = v_search
      )
      and (p_from is null or r.created_at >= p_from)
      and (p_to is null or r.created_at <= p_to)
  )
  select
    f.id,
    f.confession_id,
    f.reporter_id,
    f.reason::text,
    f.details::text,
    f.status::text,
    f.created_at,
    f.confession_content::text,
    f.confession_university::text,
    f.confession_created_at,
    count(*) over()::bigint as total_count
  from filtered f
  order by f.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

create or replace function public.admin_get_wallets()
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
  if not (public.admin_has_permission('finance:read') or public.admin_has_permission('finance:payouts')) then
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

create or replace function public.admin_get_withdrawals(
  p_limit integer default 100,
  p_offset integer default 0,
  p_status text default null
)
returns table (
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
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_status text := nullif(trim(coalesce(p_status, '')), '');
begin
  if not (public.admin_has_permission('finance:read') or public.admin_has_permission('finance:payouts')) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    w.id,
    w.user_id,
    p.full_name::text,
    p.email::text,
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
  where v_status is null or w.status = v_status
  order by
    case when w.status = 'pending' then 0 else 1 end,
    w.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

create or replace function public.admin_get_transactions(
  p_limit integer default 100,
  p_offset integer default 0,
  p_search text default null,
  p_university text default null,
  p_gender text default null,
  p_type text default null,
  p_status text default null,
  p_source text default null,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
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
  created_at timestamp with time zone,
  total_count bigint,
  total_amount numeric,
  credit_amount numeric,
  debit_amount numeric
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := nullif(trim(coalesce(p_search, '')), '');
  v_university text := nullif(trim(coalesce(p_university, '')), '');
  v_gender text := lower(nullif(trim(coalesce(p_gender, '')), ''));
  v_type text := lower(nullif(trim(coalesce(p_type, '')), ''));
  v_status text := lower(nullif(trim(coalesce(p_status, '')), ''));
  v_source text := lower(nullif(trim(coalesce(p_source, '')), ''));
begin
  if not (public.admin_has_permission('finance:read') or public.admin_has_permission('finance:payouts')) then
    raise exception 'Not authorized';
  end if;

  return query
  with filtered as (
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
    where
      (
        v_search is null
        or coalesce(p.full_name, '') ilike '%' || v_search || '%'
        or coalesce(p.email, '') ilike '%' || v_search || '%'
        or coalesce(p.university, '') ilike '%' || v_search || '%'
        or coalesce(wt.description, '') ilike '%' || v_search || '%'
        or coalesce(wt.reference_id, '') ilike '%' || v_search || '%'
        or wt.id::text = v_search
        or wt.user_id::text = v_search
      )
      and (v_university is null or coalesce(p.university, '') ilike '%' || v_university || '%')
      and (v_gender is null or lower(coalesce(p.gender, '')) = v_gender)
      and (v_type is null or lower(coalesce(wt.type, '')) = v_type)
      and (v_status is null or lower(coalesce(wt.status, '')) = v_status)
      and (v_source is null or lower(coalesce(wt.payment_method, 'wallet')) = v_source)
      and (p_from is null or wt.created_at >= p_from)
      and (p_to is null or wt.created_at <= p_to)
  ),
  totals as (
    select
      count(*)::bigint as total_count,
      coalesce(sum(ft.amount), 0)::numeric as total_amount,
      coalesce(sum(case when lower(coalesce(ft.type, '')) = 'credit' then ft.amount else 0 end), 0)::numeric as credit_amount,
      coalesce(sum(case when lower(coalesce(ft.type, '')) = 'debit' then ft.amount else 0 end), 0)::numeric as debit_amount
    from filtered ft
  )
  select
    f.id,
    f.user_id,
    f.full_name::text,
    f.university::text,
    f.gender::text,
    f.type::text,
    f.amount,
    f.status::text,
    f.description::text,
    f.payment_method::text,
    f.reference_id::text,
    f.created_at,
    t.total_count,
    t.total_amount,
    t.credit_amount,
    t.debit_amount
  from filtered f
  cross join totals t
  order by f.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

create or replace function public.admin_get_promo_codes()
returns table (
  id uuid,
  code text,
  discount_percent integer,
  max_uses integer,
  uses_count integer,
  expires_at timestamp with time zone,
  is_active boolean,
  created_by uuid,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.admin_has_permission('promo:write') then
    raise exception 'Not authorized';
  end if;

  return query
  select
    pc.id,
    pc.code,
    pc.discount_percent,
    pc.max_uses,
    pc.uses_count,
    pc.expires_at,
    pc.is_active,
    pc.created_by,
    pc.created_at
  from public.promo_codes pc
  order by pc.created_at desc;
end;
$function$;

create or replace function public.admin_get_audit_logs(
  p_limit integer default 100,
  p_offset integer default 0,
  p_action text default null,
  p_target_type text default null,
  p_admin_query text default null,
  p_search text default null,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
returns table (
  id uuid,
  admin_user_id uuid,
  admin_email text,
  admin_name text,
  action text,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone,
  total_count bigint
)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 200);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_action text := nullif(trim(coalesce(p_action, '')), '');
  v_target_type text := nullif(trim(coalesce(p_target_type, '')), '');
  v_admin_query text := nullif(trim(coalesce(p_admin_query, '')), '');
  v_search text := nullif(trim(coalesce(p_search, '')), '');
begin
  if not public.admin_has_permission('audit:read') then
    raise exception 'Not authorized';
  end if;

  return query
  with filtered_logs as (
    select
      l.id,
      l.admin_user_id,
      coalesce(p.email, u.email)::text as admin_email,
      p.full_name::text as admin_name,
      l.action,
      l.target_type,
      l.target_id,
      l.metadata,
      l.created_at
    from public.admin_audit_logs l
    left join public.profiles p on p.id = l.admin_user_id
    left join auth.users u on u.id = l.admin_user_id
    where
      (v_action is null or l.action = v_action)
      and (v_target_type is null or l.target_type = v_target_type)
      and (p_from is null or l.created_at >= p_from)
      and (p_to is null or l.created_at <= p_to)
      and (
        v_admin_query is null
        or coalesce(p.email, u.email, '') ilike '%' || v_admin_query || '%'
        or coalesce(p.full_name, '') ilike '%' || v_admin_query || '%'
        or l.admin_user_id::text ilike '%' || v_admin_query || '%'
      )
      and (
        v_search is null
        or l.action ilike '%' || v_search || '%'
        or coalesce(l.target_type, '') ilike '%' || v_search || '%'
        or coalesce(l.target_id::text, '') ilike '%' || v_search || '%'
        or coalesce(l.metadata::text, '') ilike '%' || v_search || '%'
      )
  )
  select
    fl.id,
    fl.admin_user_id,
    fl.admin_email,
    fl.admin_name,
    fl.action,
    fl.target_type,
    fl.target_id,
    fl.metadata,
    fl.created_at,
    count(*) over() as total_count
  from filtered_logs fl
  order by fl.created_at desc
  limit v_limit
  offset v_offset;
end;
$function$;

create or replace function public.admin_get_ops_snapshot()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_pending_reports bigint := 0;
  v_pending_withdrawals bigint := 0;
  v_pending_withdrawal_amount numeric := 0;
  v_pending_payments numeric := 0;
  v_audit_records bigint := 0;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if public.admin_has_permission('content:moderate') then
    select count(*)::bigint
    into v_pending_reports
    from public.confession_reports
    where status = 'pending';
  end if;

  if public.admin_has_permission('finance:read') or public.admin_has_permission('finance:payouts') then
    select
      count(*)::bigint,
      coalesce(sum(amount), 0)::numeric
    into
      v_pending_withdrawals,
      v_pending_withdrawal_amount
    from public.withdrawals
    where status = 'pending';

    select coalesce(sum(amount), 0)::numeric
    into v_pending_payments
    from public.wallet_transactions
    where status = 'pending'
      and type in ('deposit', 'subscription', 'payment');
  end if;

  if public.admin_has_permission('audit:read') then
    select count(*)::bigint
    into v_audit_records
    from public.admin_audit_logs;
  end if;

  return jsonb_build_object(
    'pendingReports', v_pending_reports,
    'pendingWithdrawals', v_pending_withdrawals,
    'pendingWithdrawalAmount', v_pending_withdrawal_amount,
    'pendingPayments', v_pending_payments,
    'auditRecords', v_audit_records,
    'generatedAt', now()
  );
end;
$function$;

revoke all on function public.admin_search_users(integer, integer, text, text, text, text, boolean, boolean) from public, anon;
revoke all on function public.admin_get_user_detail(uuid) from public, anon;
revoke all on function public.admin_get_confessions(integer, integer, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
revoke all on function public.admin_get_confession_reports(integer, integer, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
revoke all on function public.admin_get_wallets() from public, anon;
revoke all on function public.admin_get_withdrawals(integer, integer, text) from public, anon;
revoke all on function public.admin_get_transactions(integer, integer, text, text, text, text, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
revoke all on function public.admin_get_promo_codes() from public, anon;
revoke all on function public.admin_get_audit_logs(integer, integer, text, text, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
revoke all on function public.admin_get_ops_snapshot() from public, anon;

grant execute on function public.admin_search_users(integer, integer, text, text, text, text, boolean, boolean) to authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_get_confessions(integer, integer, text, text, timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.admin_get_confession_reports(integer, integer, text, text, timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.admin_get_wallets() to authenticated;
grant execute on function public.admin_get_withdrawals(integer, integer, text) to authenticated;
grant execute on function public.admin_get_transactions(integer, integer, text, text, text, text, text, text, timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.admin_get_promo_codes() to authenticated;
grant execute on function public.admin_get_audit_logs(integer, integer, text, text, text, text, timestamp with time zone, timestamp with time zone) to authenticated;
grant execute on function public.admin_get_ops_snapshot() to authenticated;
