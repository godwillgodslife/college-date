-- Reliable first-screen operational counts for the admin dashboard.

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

  select coalesce(sum(amount), 0)::numeric
  into v_pending_payments
  from public.wallet_transactions
  where status = 'pending'
    and type in ('deposit', 'subscription', 'payment');

  select count(*)::bigint
  into v_audit_records
  from public.admin_audit_logs;

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

revoke all on function public.admin_get_ops_snapshot() from public, anon;
grant execute on function public.admin_get_ops_snapshot() to authenticated;
