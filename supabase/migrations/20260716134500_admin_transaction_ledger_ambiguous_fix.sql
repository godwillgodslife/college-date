-- Fix PL/pgSQL ambiguity in admin_get_transactions totals.

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
  if not public.is_app_admin() then
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

revoke all on function public.admin_get_transactions(integer, integer, text, text, text, text, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
grant execute on function public.admin_get_transactions(integer, integer, text, text, text, text, text, text, timestamp with time zone, timestamp with time zone) to authenticated;
