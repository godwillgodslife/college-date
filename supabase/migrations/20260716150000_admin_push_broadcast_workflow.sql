-- Admin push broadcast foundation:
-- - preview/test/broadcast target calculation
-- - broadcast attempt ledger
-- - audit-friendly operations for the admin portal

create table if not exists public.admin_push_broadcasts (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  segment text not null,
  title text not null,
  body text not null,
  target_user_count integer not null default 0,
  target_device_count integer not null default 0,
  status text not null default 'queued',
  test_mode boolean not null default false,
  onesignal_response jsonb not null default '{}'::jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.admin_push_broadcasts enable row level security;

drop policy if exists "Admins can view push broadcasts" on public.admin_push_broadcasts;
create policy "Admins can view push broadcasts"
on public.admin_push_broadcasts for select
to authenticated
using (public.is_app_admin());

create index if not exists admin_push_broadcasts_created_idx
  on public.admin_push_broadcasts (created_at desc);

create or replace function public.admin_get_push_broadcast_targets(
  p_segment text default 'all',
  p_test_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_segment text := lower(coalesce(nullif(trim(p_segment), ''), 'all'));
  v_now timestamptz := now();
  v_result jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'Not authorized';
  end if;

  if v_segment in ('total subscriptions', 'all users', 'all_users') then
    v_segment := 'all';
  elsif v_segment in ('active users', 'active', 'active_users') then
    v_segment := 'active_7d';
  elsif v_segment in ('inactive users', 'inactive', 'inactive_users') then
    v_segment := 'inactive_7d';
  end if;

  if v_segment not in ('all', 'active_7d', 'inactive_7d') then
    raise exception 'Unsupported push segment: %', p_segment;
  end if;

  with eligible as (
    select distinct
      d.user_id,
      d.onesignal_subscription_id
    from public.user_notification_devices d
    join public.profiles p on p.id = d.user_id
    where d.revoked_at is null
      and nullif(trim(coalesce(d.onesignal_subscription_id, '')), '') is not null
      and coalesce(d.permission_status, 'unknown') <> 'denied'
      and coalesce(p.push_notifications, true) = true
      and coalesce(p.marketing_notifications, true) = true
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
      and (
        p_test_user_id is null
        or d.user_id = p_test_user_id
      )
      and (
        p_test_user_id is not null
        or v_segment = 'all'
        or (
          v_segment = 'active_7d'
          and coalesce(p.last_seen_at, p.last_active, p.created_at) >= v_now - interval '7 days'
        )
        or (
          v_segment = 'inactive_7d'
          and coalesce(p.last_seen_at, p.last_active, p.created_at) < v_now - interval '7 days'
        )
      )
  ),
  summary as (
    select
      count(distinct user_id)::integer as user_count,
      count(distinct onesignal_subscription_id)::integer as device_count,
      coalesce(jsonb_agg(distinct user_id) filter (where user_id is not null), '[]'::jsonb) as user_ids,
      coalesce(jsonb_agg(distinct onesignal_subscription_id) filter (where onesignal_subscription_id is not null), '[]'::jsonb) as subscription_ids
    from eligible
  )
  select jsonb_build_object(
    'segment', v_segment,
    'userCount', user_count,
    'deviceCount', device_count,
    'userIds', user_ids,
    'subscriptionIds', subscription_ids,
    'generatedAt', v_now
  )
  into v_result
  from summary;

  return coalesce(v_result, jsonb_build_object(
    'segment', v_segment,
    'userCount', 0,
    'deviceCount', 0,
    'userIds', '[]'::jsonb,
    'subscriptionIds', '[]'::jsonb,
    'generatedAt', v_now
  ));
end;
$function$;

revoke all on table public.admin_push_broadcasts from public, anon, authenticated;
grant select on table public.admin_push_broadcasts to authenticated;

revoke all on function public.admin_get_push_broadcast_targets(text, uuid) from public, anon;
grant execute on function public.admin_get_push_broadcast_targets(text, uuid) to authenticated;
