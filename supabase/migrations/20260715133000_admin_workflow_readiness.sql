-- Admin workflow readiness:
-- - audit log foundation
-- - report review RPCs
-- - admin user detail drawer RPC
-- - audited config and promo-code RPCs

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.admin_audit_logs enable row level security;

drop policy if exists "Admins can view audit logs" on public.admin_audit_logs;
create policy "Admins can view audit logs"
on public.admin_audit_logs for select
to authenticated
using (public.is_app_admin());

create index if not exists admin_audit_logs_created_idx
  on public.admin_audit_logs (created_at desc);

create index if not exists admin_audit_logs_target_idx
  on public.admin_audit_logs (target_type, target_id, created_at desc);

create or replace function public.admin_write_audit_log(
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id uuid;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  insert into public.admin_audit_logs (
    admin_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    auth.uid(),
    nullif(trim(p_action), ''),
    nullif(trim(coalesce(p_target_type, '')), ''),
    p_target_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
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
  if not public.is_app_admin() then
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
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if v_action not in ('dismiss', 'delete_post') then
    raise exception 'Invalid report action';
  end if;

  select
    cr.id,
    cr.confession_id,
    cr.reporter_id,
    cr.reason,
    cr.details,
    cr.status
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
      jsonb_build_object(
        'confession_id', v_report.confession_id,
        'reason', v_report.reason,
        'note', p_note
      )
    );

    return jsonb_build_object(
      'ok', true,
      'action', v_action,
      'report_id', p_report_id,
      'confession_id', v_report.confession_id
    );
  end if;

  update public.confession_reports
  set status = 'reviewed'
  where id = p_report_id;

  perform public.admin_write_audit_log(
    'admin_delete_reported_confession',
    'confession',
    v_report.confession_id,
    jsonb_build_object(
      'report_id', p_report_id,
      'reason', v_report.reason,
      'details', v_report.details,
      'note', p_note
    )
  );

  delete from public.confessions
  where id = v_report.confession_id;

  return jsonb_build_object(
    'ok', true,
    'action', v_action,
    'report_id', p_report_id,
    'confession_id', v_report.confession_id
  );
end;
$function$;

drop function if exists public.admin_moderate_confession(uuid, text);

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
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if v_action = 'delete' then
    perform public.admin_write_audit_log(
      'admin_delete_confession',
      'confession',
      p_confession_id,
      jsonb_build_object('note', p_note)
    );
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

drop policy if exists "Admins can manage promo codes" on public.promo_codes;
create policy "Admins can manage promo codes"
on public.promo_codes for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create or replace function public.admin_set_app_config(
  p_key text,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_key text := trim(coalesce(p_key, ''));
  v_value jsonb := p_value;
  v_old_value jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if v_key not in (
    'leaderboard_enabled',
    'confessions_enabled',
    'premium_swipes_enabled',
    'maintenance_mode',
    'banner_message',
    'banner_active',
    'free_daily_swipes',
    'banned_keywords',
    'premium_swipe_price'
  ) then
    raise exception 'Unsupported config key';
  end if;

  if v_key in ('leaderboard_enabled', 'confessions_enabled', 'premium_swipes_enabled', 'maintenance_mode', 'banner_active')
     and jsonb_typeof(v_value) <> 'boolean' then
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
  do update set
    value = excluded.value,
    updated_at = now();

  perform public.admin_write_audit_log(
    'admin_set_app_config',
    'app_config',
    null,
    jsonb_build_object(
      'key', v_key,
      'old_value', v_old_value,
      'new_value', v_value
    )
  );

  return jsonb_build_object('key', v_key, 'value', v_value);
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
  if not public.is_app_admin() then
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
  if not public.is_app_admin() then
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

  insert into public.promo_codes (
    code,
    discount_percent,
    max_uses,
    expires_at,
    is_active,
    created_by
  )
  values (
    v_code,
    p_discount_percent,
    p_max_uses,
    p_expires_at,
    true,
    auth.uid()
  )
  returning * into v_promo;

  perform public.admin_write_audit_log(
    'admin_create_promo_code',
    'promo_code',
    v_promo.id,
    jsonb_build_object(
      'code', v_promo.code,
      'discount_percent', v_promo.discount_percent,
      'max_uses', v_promo.max_uses,
      'expires_at', v_promo.expires_at
    )
  );

  return to_jsonb(v_promo);
end;
$function$;

create or replace function public.admin_deactivate_promo_code(p_promo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_promo public.promo_codes;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
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
    jsonb_build_object('code', v_promo.code)
  );

  return to_jsonb(v_promo);
end;
$function$;

revoke all on table public.admin_audit_logs from public, anon, authenticated;
grant select on table public.admin_audit_logs to authenticated;

revoke all on function public.admin_write_audit_log(text, text, uuid, jsonb) from public, anon;
revoke all on function public.admin_get_user_detail(uuid) from public, anon;
revoke all on function public.admin_review_confession_report(uuid, text, text) from public, anon;
revoke all on function public.admin_moderate_confession(uuid, text, text) from public, anon;
revoke all on function public.admin_set_app_config(text, jsonb) from public, anon;
revoke all on function public.admin_get_promo_codes() from public, anon;
revoke all on function public.admin_create_promo_code(text, integer, integer, timestamp with time zone) from public, anon;
revoke all on function public.admin_deactivate_promo_code(uuid) from public, anon;

grant execute on function public.admin_write_audit_log(text, text, uuid, jsonb) to authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated;
grant execute on function public.admin_review_confession_report(uuid, text, text) to authenticated;
grant execute on function public.admin_moderate_confession(uuid, text, text) to authenticated;
grant execute on function public.admin_set_app_config(text, jsonb) to authenticated;
grant execute on function public.admin_get_promo_codes() to authenticated;
grant execute on function public.admin_create_promo_code(text, integer, integer, timestamp with time zone) to authenticated;
grant execute on function public.admin_deactivate_promo_code(uuid) to authenticated;
