-- Phase A notification reliability foundation.
-- Additive and backward-compatible with the existing notifications table and
-- profiles.onesignal_id fallback used by the current production app.

alter table public.notifications
    add column if not exists user_id uuid,
    add column if not exists actor_id uuid,
    add column if not exists category text,
    add column if not exists entity_type text,
    add column if not exists entity_id uuid,
    add column if not exists parent_entity_id uuid,
    add column if not exists conversation_id uuid,
    add column if not exists match_id uuid,
    add column if not exists deep_link text,
    add column if not exists priority text default 'normal',
    add column if not exists group_key text,
    add column if not exists dedupe_key text,
    add column if not exists queued_at timestamptz,
    add column if not exists sent_at timestamptz,
    add column if not exists delivered_at timestamptz,
    add column if not exists opened_at timestamptz,
    add column if not exists read_at timestamptz,
    add column if not exists dismissed_at timestamptz,
    add column if not exists failed_at timestamptz,
    add column if not exists failure_reason text,
    add column if not exists retry_count integer not null default 0,
    add column if not exists updated_at timestamptz not null default now();

update public.notifications
set user_id = coalesce(user_id, recipient_id),
    actor_id = coalesce(actor_id, sender_id),
    read_at = case when is_read = true and read_at is null then now() else read_at end
where user_id is null
   or actor_id is null
   or (is_read = true and read_at is null);

create index if not exists notifications_user_unread_created_idx
    on public.notifications (user_id, is_read, created_at desc);

create index if not exists notifications_user_category_unread_idx
    on public.notifications (user_id, category, is_read);

create unique index if not exists notifications_user_dedupe_key_idx
    on public.notifications (user_id, dedupe_key);

create table if not exists public.user_notification_devices (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    platform text not null default 'web',
    device_id text not null,
    onesignal_subscription_id text,
    push_token text,
    permission_status text not null default 'unknown',
    app_version text,
    device_model text,
    last_seen_at timestamptz not null default now(),
    revoked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists user_notification_devices_user_device_idx
    on public.user_notification_devices (user_id, device_id);

create index if not exists user_notification_devices_user_active_idx
    on public.user_notification_devices (user_id, revoked_at, last_seen_at desc);

create index if not exists user_notification_devices_subscription_idx
    on public.user_notification_devices (onesignal_subscription_id)
    where onesignal_subscription_id is not null and revoked_at is null;

alter table public.user_notification_devices enable row level security;

drop policy if exists "Users can view own notification devices" on public.user_notification_devices;
create policy "Users can view own notification devices"
on public.user_notification_devices for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notification devices" on public.user_notification_devices;
create policy "Users can insert own notification devices"
on public.user_notification_devices for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notification devices" on public.user_notification_devices;
create policy "Users can update own notification devices"
on public.user_notification_devices for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.register_notification_device(
    p_platform text,
    p_device_id text,
    p_onesignal_subscription_id text default null,
    p_push_token text default null,
    p_permission_status text default 'unknown',
    p_app_version text default null,
    p_device_model text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_device public.user_notification_devices;
begin
    if v_user_id is null then
        raise exception 'Not authorized';
    end if;

    if nullif(trim(p_device_id), '') is null then
        raise exception 'Device ID is required';
    end if;

    insert into public.user_notification_devices (
        user_id,
        platform,
        device_id,
        onesignal_subscription_id,
        push_token,
        permission_status,
        app_version,
        device_model,
        last_seen_at,
        revoked_at,
        updated_at
    )
    values (
        v_user_id,
        coalesce(nullif(trim(p_platform), ''), 'web'),
        trim(p_device_id),
        nullif(trim(coalesce(p_onesignal_subscription_id, '')), ''),
        nullif(trim(coalesce(p_push_token, '')), ''),
        coalesce(nullif(trim(p_permission_status), ''), 'unknown'),
        nullif(trim(coalesce(p_app_version, '')), ''),
        nullif(trim(coalesce(p_device_model, '')), ''),
        now(),
        null,
        now()
    )
    on conflict (user_id, device_id)
    do update set
        platform = excluded.platform,
        onesignal_subscription_id = excluded.onesignal_subscription_id,
        push_token = excluded.push_token,
        permission_status = excluded.permission_status,
        app_version = excluded.app_version,
        device_model = excluded.device_model,
        last_seen_at = now(),
        revoked_at = null,
        updated_at = now()
    returning * into v_device;

    update public.profiles
    set onesignal_id = coalesce(v_device.onesignal_subscription_id, onesignal_id),
        push_token = coalesce(v_device.push_token, push_token)
    where id = v_user_id;

    return to_jsonb(v_device);
end;
$$;

create or replace function public.revoke_notification_device(
    p_device_id text default null,
    p_onesignal_subscription_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_count integer;
begin
    if v_user_id is null then
        raise exception 'Not authorized';
    end if;

    update public.user_notification_devices
    set revoked_at = now(),
        updated_at = now()
    where user_id = v_user_id
      and revoked_at is null
      and (
        (p_device_id is not null and device_id = p_device_id)
        or (p_onesignal_subscription_id is not null and onesignal_subscription_id = p_onesignal_subscription_id)
      );

    get diagnostics v_count = row_count;

    return jsonb_build_object('revoked', v_count);
end;
$$;

create or replace function public.insert_notification(
    p_user_id uuid,
    p_actor_id uuid,
    p_type text,
    p_title text,
    p_content text,
    p_metadata jsonb default '{}'::jsonb,
    p_category text default null,
    p_entity_type text default null,
    p_entity_id uuid default null,
    p_parent_entity_id uuid default null,
    p_conversation_id uuid default null,
    p_match_id uuid default null,
    p_deep_link text default null,
    p_priority text default 'normal',
    p_group_key text default null,
    p_dedupe_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    result jsonb;
    v_metadata jsonb := coalesce(p_metadata, '{}'::jsonb);
    v_deep_link text := coalesce(nullif(p_deep_link, ''), v_metadata->>'url');
begin
    if auth.uid() is null then
        raise exception 'Not authorized';
    end if;

    if p_actor_id is not null and p_actor_id <> auth.uid() then
        raise exception 'Notification actor must be the current user';
    end if;

    if p_actor_id is null and p_user_id <> auth.uid() then
        raise exception 'System-style notifications can only target the current user';
    end if;

    insert into public.notifications (
        user_id,
        recipient_id,
        actor_id,
        sender_id,
        type,
        category,
        entity_type,
        entity_id,
        parent_entity_id,
        conversation_id,
        match_id,
        title,
        content,
        deep_link,
        priority,
        group_key,
        dedupe_key,
        metadata
    )
    values (
        p_user_id,
        p_user_id,
        p_actor_id,
        p_actor_id,
        p_type,
        p_category,
        p_entity_type,
        p_entity_id,
        p_parent_entity_id,
        p_conversation_id,
        p_match_id,
        p_title,
        p_content,
        v_deep_link,
        coalesce(nullif(p_priority, ''), 'normal'),
        p_group_key,
        p_dedupe_key,
        v_metadata
    )
    on conflict (user_id, dedupe_key)
    do update set
        updated_at = now()
    returning to_jsonb(notifications.*) into result;

    return result;
end;
$$;

grant execute on function public.register_notification_device(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.revoke_notification_device(text, text) to authenticated;
grant execute on function public.insert_notification(uuid, uuid, text, text, text, jsonb, text, text, uuid, uuid, uuid, uuid, text, text, text, text) to authenticated;
