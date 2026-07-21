-- Reason-aware admin app config and promo-code deactivation overloads.
-- Existing two-argument config and one-argument promo RPCs remain compatible.

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
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if length(v_reason) < 5 then
    raise exception 'Admin reason is required';
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
      'new_value', v_value,
      'reason', v_reason
    )
  );

  return jsonb_build_object('key', v_key, 'value', v_value);
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
  if not public.is_app_admin() then
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
    jsonb_build_object(
      'code', v_promo.code,
      'reason', v_reason
    )
  );

  return to_jsonb(v_promo);
end;
$function$;

revoke all on function public.admin_set_app_config(text, jsonb, text) from public, anon;
revoke all on function public.admin_deactivate_promo_code(uuid, text) from public, anon;

grant execute on function public.admin_set_app_config(text, jsonb, text) to authenticated;
grant execute on function public.admin_deactivate_promo_code(uuid, text) to authenticated;
