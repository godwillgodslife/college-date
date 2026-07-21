alter table if exists public.withdrawals
  add column if not exists processed_by uuid,
  add column if not exists processed_at timestamp with time zone,
  add column if not exists admin_note text,
  add column if not exists rejection_reason text;

create index if not exists idx_withdrawals_status_created_at
  on public.withdrawals(status, created_at desc);

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
  if not public.is_app_admin() then
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

create or replace function public.admin_review_withdrawal(
  p_withdrawal_id uuid,
  p_decision text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin uuid := auth.uid();
  v_withdrawal public.withdrawals%rowtype;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'Invalid withdrawal decision';
  end if;

  if v_reason is null or length(v_reason) < 5 then
    raise exception 'A review reason is required';
  end if;

  select *
  into v_withdrawal
  from public.withdrawals
  where id = p_withdrawal_id
  for update;

  if v_withdrawal.id is null then
    raise exception 'Withdrawal not found';
  end if;

  if coalesce(v_withdrawal.status, '') <> 'pending' then
    raise exception 'Only pending withdrawals can be reviewed';
  end if;

  if v_decision = 'approve' then
    update public.wallets
    set
      pending_balance = greatest(coalesce(pending_balance, 0) - coalesce(v_withdrawal.amount, 0), 0),
      total_withdrawn = coalesce(total_withdrawn, 0) + coalesce(v_withdrawal.amount, 0),
      updated_at = now()
    where user_id = v_withdrawal.user_id;

    update public.withdrawals
    set
      status = 'approved',
      processed_by = v_admin,
      processed_at = now(),
      admin_note = v_reason,
      rejection_reason = null
    where id = p_withdrawal_id;
  else
    update public.wallets
    set
      pending_balance = greatest(coalesce(pending_balance, 0) - coalesce(v_withdrawal.amount, 0), 0),
      available_balance = coalesce(available_balance, 0) + coalesce(v_withdrawal.amount, 0),
      updated_at = now()
    where user_id = v_withdrawal.user_id;

    update public.withdrawals
    set
      status = 'rejected',
      processed_by = v_admin,
      processed_at = now(),
      admin_note = v_reason,
      rejection_reason = v_reason
    where id = p_withdrawal_id;
  end if;

  perform public.admin_write_audit_log(
    case when v_decision = 'approve' then 'approve_withdrawal' else 'reject_withdrawal' end,
    'withdrawal',
    p_withdrawal_id,
    jsonb_build_object(
      'reason', v_reason,
      'user_id', v_withdrawal.user_id,
      'amount', v_withdrawal.amount,
      'decision', v_decision
    )
  );

  return jsonb_build_object(
    'ok', true,
    'withdrawal_id', p_withdrawal_id,
    'decision', v_decision
  );
end;
$function$;

revoke all on function public.admin_get_withdrawals(integer, integer, text) from public, anon;
revoke all on function public.admin_review_withdrawal(uuid, text, text) from public, anon;

grant execute on function public.admin_get_withdrawals(integer, integer, text) to authenticated;
grant execute on function public.admin_review_withdrawal(uuid, text, text) to authenticated;
