-- Permission gates for high-risk admin writes.
-- Legacy/full admins still pass through admin_has_permission('*' compatibility),
-- restricted admins now need explicit capabilities.

create or replace function public.admin_set_user_status(
  p_user_id uuid,
  p_action text,
  p_status boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_action text := lower(trim(coalesce(p_action, '')));
  v_reason text := trim(coalesce(p_reason, ''));
  v_target public.profiles%rowtype;
  v_audit_action text;
begin
  if not public.admin_has_permission('users:moderate') then
    raise exception 'Not authorized';
  end if;

  if auth.uid() = p_user_id and v_action in ('ban', 'shadow') and p_status is true then
    raise exception 'Admins cannot ban or shadow-ban themselves';
  end if;

  if v_action not in ('ban', 'shadow', 'verify') then
    raise exception 'Invalid user status action';
  end if;

  if length(v_reason) < 5 then
    raise exception 'Admin reason is required';
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_user_id;

  if v_target.id is null then
    raise exception 'User profile not found';
  end if;

  if v_action = 'ban' then
    update public.profiles
    set is_banned = p_status
    where id = p_user_id;
    v_audit_action := case when p_status then 'admin_ban_user' else 'admin_unban_user' end;
  elsif v_action = 'shadow' then
    update public.profiles
    set is_shadow_banned = p_status
    where id = p_user_id;
    v_audit_action := case when p_status then 'admin_shadow_user' else 'admin_unshadow_user' end;
  else
    update public.profiles
    set is_verified = p_status
    where id = p_user_id;
    v_audit_action := case when p_status then 'admin_verify_user' else 'admin_unverify_user' end;
  end if;

  perform public.admin_write_audit_log(
    v_audit_action,
    'profile',
    p_user_id,
    jsonb_build_object(
      'status', p_status,
      'reason', v_reason,
      'target_email', v_target.email,
      'target_name', v_target.full_name
    )
  );

  return jsonb_build_object('ok', true, 'action', v_action, 'status', p_status, 'user_id', p_user_id);
end;
$function$;

create or replace function public.admin_review_confession_report(
  p_report_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_report record;
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  if not public.admin_has_permission('content:moderate') then
    raise exception 'Not authorized';
  end if;

  if v_action not in ('dismiss', 'delete_post') then
    raise exception 'Invalid report action';
  end if;

  select cr.id, cr.confession_id, cr.reporter_id, cr.reason, cr.details, cr.status
  into v_report
  from public.confession_reports cr
  where cr.id = p_report_id;

  if v_report.id is null then
    raise exception 'Report not found';
  end if;

  if v_action = 'dismiss' then
    update public.confession_reports
    set status = 'dismissed'
    where id = p_report_id;

    perform public.admin_write_audit_log(
      'admin_dismiss_confession_report',
      'confession_report',
      p_report_id,
      jsonb_build_object('confession_id', v_report.confession_id, 'reason', v_report.reason, 'note', p_note)
    );

    return jsonb_build_object('ok', true, 'action', v_action, 'report_id', p_report_id, 'confession_id', v_report.confession_id);
  end if;

  update public.confession_reports
  set status = 'reviewed'
  where id = p_report_id;

  perform public.admin_write_audit_log(
    'admin_delete_reported_confession',
    'confession',
    v_report.confession_id,
    jsonb_build_object('report_id', p_report_id, 'reason', v_report.reason, 'details', v_report.details, 'note', p_note)
  );

  delete from public.confessions
  where id = v_report.confession_id;

  return jsonb_build_object('ok', true, 'action', v_action, 'report_id', p_report_id, 'confession_id', v_report.confession_id);
end;
$function$;

create or replace function public.admin_moderate_confession(
  p_confession_id uuid,
  p_action text,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_action text := lower(trim(coalesce(p_action, '')));
begin
  if not public.admin_has_permission('content:moderate') then
    raise exception 'Not authorized';
  end if;

  if v_action = 'delete' then
    perform public.admin_write_audit_log('admin_delete_confession', 'confession', p_confession_id, jsonb_build_object('note', p_note));
    delete from public.confessions where id = p_confession_id;
  elsif v_action = 'pin' then
    update public.confessions set is_pinned = true where id = p_confession_id;
    perform public.admin_write_audit_log('admin_pin_confession', 'confession', p_confession_id, jsonb_build_object('note', p_note));
  elsif v_action = 'unpin' then
    update public.confessions set is_pinned = false where id = p_confession_id;
    perform public.admin_write_audit_log('admin_unpin_confession', 'confession', p_confession_id, jsonb_build_object('note', p_note));
  else
    raise exception 'Invalid moderation action';
  end if;

  return true;
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
  if not public.admin_has_permission('finance:payouts') then
    raise exception 'Not authorized';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'Invalid withdrawal decision';
  end if;

  if v_reason is null or length(v_reason) < 5 then
    raise exception 'A review reason is required';
  end if;

  select * into v_withdrawal
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
    set pending_balance = greatest(coalesce(pending_balance, 0) - coalesce(v_withdrawal.amount, 0), 0),
        total_withdrawn = coalesce(total_withdrawn, 0) + coalesce(v_withdrawal.amount, 0),
        updated_at = now()
    where user_id = v_withdrawal.user_id;

    update public.withdrawals
    set status = 'approved', processed_by = v_admin, processed_at = now(), admin_note = v_reason, rejection_reason = null
    where id = p_withdrawal_id;
  else
    update public.wallets
    set pending_balance = greatest(coalesce(pending_balance, 0) - coalesce(v_withdrawal.amount, 0), 0),
        available_balance = coalesce(available_balance, 0) + coalesce(v_withdrawal.amount, 0),
        updated_at = now()
    where user_id = v_withdrawal.user_id;

    update public.withdrawals
    set status = 'rejected', processed_by = v_admin, processed_at = now(), admin_note = v_reason, rejection_reason = v_reason
    where id = p_withdrawal_id;
  end if;

  perform public.admin_write_audit_log(
    case when v_decision = 'approve' then 'approve_withdrawal' else 'reject_withdrawal' end,
    'withdrawal',
    p_withdrawal_id,
    jsonb_build_object('reason', v_reason, 'user_id', v_withdrawal.user_id, 'amount', v_withdrawal.amount, 'decision', v_decision)
  );

  return jsonb_build_object('ok', true, 'withdrawal_id', p_withdrawal_id, 'decision', v_decision);
end;
$function$;

create or replace function public.admin_set_app_config(
  p_key text,
  p_value jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_key text := trim(coalesce(p_key, ''));
  v_value jsonb := p_value;
  v_reason text := trim(coalesce(p_reason, ''));
  v_old_value jsonb;
begin
  if not public.admin_has_permission('config:write') then
    raise exception 'Not authorized';
  end if;

  if length(v_reason) < 5 then
    raise exception 'Admin reason is required';
  end if;

  if v_key not in ('leaderboard_enabled', 'confessions_enabled', 'premium_swipes_enabled', 'maintenance_mode', 'banner_message', 'banner_active', 'free_daily_swipes', 'banned_keywords', 'premium_swipe_price') then
    raise exception 'Unsupported config key';
  end if;

  if v_key in ('leaderboard_enabled', 'confessions_enabled', 'premium_swipes_enabled', 'maintenance_mode', 'banner_active') and jsonb_typeof(v_value) <> 'boolean' then
    raise exception 'Config value must be boolean';
  end if;

  if v_key in ('free_daily_swipes', 'premium_swipe_price') then
    if jsonb_typeof(v_value) <> 'number' then
      raise exception 'Config value must be numeric';
    end if;
    if (v_value #>> '{}')::numeric < 0 or (v_value #>> '{}')::numeric > 100000 then
      raise exception 'Config number is out of range';
    end if;
  end if;

  if v_key = 'banner_message' and length(v_value #>> '{}') > 280 then
    raise exception 'Banner message is too long';
  end if;

  if v_key = 'banned_keywords' and jsonb_typeof(v_value) <> 'array' then
    raise exception 'Banned keywords must be an array';
  end if;

  select value into v_old_value
  from public.app_config
  where key = v_key;

  insert into public.app_config (key, value, updated_at)
  values (v_key, v_value, now())
  on conflict (key)
  do update set value = excluded.value, updated_at = now();

  perform public.admin_write_audit_log(
    'admin_set_app_config',
    'app_config',
    null,
    jsonb_build_object('key', v_key, 'old_value', v_old_value, 'new_value', v_value, 'reason', v_reason)
  );

  return jsonb_build_object('key', v_key, 'value', v_value);
end;
$function$;

create or replace function public.admin_create_promo_code(
  p_code text,
  p_discount_percent integer,
  p_max_uses integer,
  p_expires_at timestamp with time zone default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_code text := upper(trim(coalesce(p_code, '')));
  v_promo public.promo_codes;
begin
  if not public.admin_has_permission('promo:write') then
    raise exception 'Not authorized';
  end if;

  if v_code = '' or length(v_code) > 40 or v_code !~ '^[A-Z0-9_-]+$' then
    raise exception 'Promo code must use A-Z, 0-9, underscore, or dash';
  end if;

  if p_discount_percent < 1 or p_discount_percent > 100 then
    raise exception 'Discount percent must be between 1 and 100';
  end if;

  if p_max_uses < 1 or p_max_uses > 100000 then
    raise exception 'Max uses is out of range';
  end if;

  insert into public.promo_codes (code, discount_percent, max_uses, expires_at, is_active, created_by)
  values (v_code, p_discount_percent, p_max_uses, p_expires_at, true, auth.uid())
  returning * into v_promo;

  perform public.admin_write_audit_log(
    'admin_create_promo_code',
    'promo_code',
    v_promo.id,
    jsonb_build_object('code', v_promo.code, 'discount_percent', v_promo.discount_percent, 'max_uses', v_promo.max_uses, 'expires_at', v_promo.expires_at)
  );

  return to_jsonb(v_promo);
end;
$function$;

create or replace function public.admin_deactivate_promo_code(
  p_promo_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_promo public.promo_codes;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.admin_has_permission('promo:write') then
    raise exception 'Not authorized';
  end if;

  if length(v_reason) < 5 then
    raise exception 'Admin reason is required';
  end if;

  update public.promo_codes
  set is_active = false
  where id = p_promo_id
  returning * into v_promo;

  if v_promo.id is null then
    raise exception 'Promo code not found';
  end if;

  perform public.admin_write_audit_log(
    'admin_deactivate_promo_code',
    'promo_code',
    v_promo.id,
    jsonb_build_object('code', v_promo.code, 'reason', v_reason)
  );

  return to_jsonb(v_promo);
end;
$function$;

revoke all on function public.admin_set_user_status(uuid, text, boolean, text) from public, anon;
revoke all on function public.admin_review_confession_report(uuid, text, text) from public, anon;
revoke all on function public.admin_moderate_confession(uuid, text, text) from public, anon;
revoke all on function public.admin_review_withdrawal(uuid, text, text) from public, anon;
revoke all on function public.admin_set_app_config(text, jsonb, text) from public, anon;
revoke all on function public.admin_create_promo_code(text, integer, integer, timestamp with time zone) from public, anon;
revoke all on function public.admin_deactivate_promo_code(uuid, text) from public, anon;

grant execute on function public.admin_set_user_status(uuid, text, boolean, text) to authenticated;
grant execute on function public.admin_review_confession_report(uuid, text, text) to authenticated;
grant execute on function public.admin_moderate_confession(uuid, text, text) to authenticated;
grant execute on function public.admin_review_withdrawal(uuid, text, text) to authenticated;
grant execute on function public.admin_set_app_config(text, jsonb, text) to authenticated;
grant execute on function public.admin_create_promo_code(text, integer, integer, timestamp with time zone) to authenticated;
grant execute on function public.admin_deactivate_promo_code(uuid, text) to authenticated;
