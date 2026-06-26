-- Production security hardening pass:
-- - stop trusting user-editable admin metadata
-- - prevent arbitrary wallet deductions through RPC arguments
-- - prevent forged notification actors
-- - remove broad client wallet updates, loose message inserts, and storage object listing policies

create or replace function public.make_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
    if not public.is_app_admin() then
        raise exception 'Not authorized';
    end if;

    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
    where id = target_user_id;
end;
$$;

create or replace function public.decrement_wallet_balance(p_user_id uuid, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_balance numeric;
begin
    if auth.uid() is null or auth.uid() <> p_user_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    if p_amount is null or p_amount <= 0 then
        return jsonb_build_object('success', false, 'error', 'Invalid amount');
    end if;

    select available_balance into v_balance
    from public.wallets
    where user_id = p_user_id
    for update;

    if v_balance is null or v_balance < p_amount then
        return jsonb_build_object('success', false, 'error', 'Insufficient balance');
    end if;

    update public.wallets
    set available_balance = available_balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = now()
    where user_id = p_user_id;

    return jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.insert_notification(
    p_user_id uuid,
    p_actor_id uuid,
    p_type text,
    p_title text,
    p_content text,
    p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    result jsonb;
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
        title,
        content,
        metadata
    )
    values (
        p_user_id,
        p_user_id,
        p_actor_id,
        p_actor_id,
        p_type,
        p_title,
        p_content,
        coalesce(p_metadata, '{}'::jsonb)
    )
    returning to_jsonb(notifications.*) into result;

    return result;
end;
$$;

revoke execute on function public.make_admin(uuid) from public, anon, authenticated;
revoke execute on function public.reset_swipe_limits() from public, anon, authenticated;
revoke execute on function public.notify_internally(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notify_internally(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;

drop policy if exists "Users can send messages" on public.messages;

drop policy if exists "System can update wallets" on public.wallets;
drop policy if exists "Users can update their own wallet" on public.wallets;

drop policy if exists "Allow All Avatars Access" on storage.objects;
drop policy if exists "Allow public view avatars" on storage.objects;
drop policy if exists "Chat media is public" on storage.objects;
drop policy if exists "Allow public select for profile-photos" on storage.objects;
drop policy if exists "Allow public select from profile-photos" on storage.objects;
drop policy if exists "Anyone can view photos" on storage.objects;
drop policy if exists "Allow public select for snap_media" on storage.objects;
drop policy if exists "Allow public view snaps" on storage.objects;
drop policy if exists "Allow public view snapshot" on storage.objects;
drop policy if exists "Snapshot media is public" on storage.objects;
drop policy if exists "Allow public select for status-media" on storage.objects;
drop policy if exists "Allow public view status" on storage.objects;
drop policy if exists "Public View Status Media" on storage.objects;
drop policy if exists "Status media is public" on storage.objects;
drop policy if exists "Status media is publicly accessible" on storage.objects;
drop policy if exists "Allow public view voice intros" on storage.objects;
drop policy if exists "Voice Intros are public" on storage.objects;
