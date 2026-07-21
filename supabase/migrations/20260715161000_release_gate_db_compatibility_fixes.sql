-- Release-gate compatibility fixes found by linked Supabase lint.
-- These are narrow, additive fixes for app-facing/admin-facing functions that
-- referenced columns no longer present in the live schema.

alter table if exists public.snapshots
  add column if not exists likes_count integer not null default 0,
  add column if not exists is_hidden boolean not null default false;

create index if not exists idx_snapshots_user_hidden_created
  on public.snapshots(user_id, is_hidden, created_at desc);

alter table if exists public.confessions
  add column if not exists is_pinned boolean not null default false;

create index if not exists idx_confessions_pinned_created
  on public.confessions(is_pinned desc, created_at desc);

drop function if exists public.increment_snapshot_likes(uuid);
create function public.increment_snapshot_likes(row_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  update public.snapshots
  set likes_count = coalesce(likes_count, 0) + 1
  where id = row_id;
end;
$$;

drop function if exists public.get_hidden_content_counts(uuid);
create function public.get_hidden_content_counts(v_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_hidden_statuses integer := 0;
  v_hidden_snapshots integer := 0;
begin
  if auth.uid() is null or auth.uid() <> v_user_id then
    return jsonb_build_object('hidden_statuses', 0, 'hidden_snapshots', 0);
  end if;

  if to_regclass('public.status_updates') is not null then
    select count(*)::integer
    into v_hidden_statuses
    from public.status_updates
    where user_id = v_user_id
      and coalesce(is_hidden, false) = true;
  end if;

  select count(*)::integer
  into v_hidden_snapshots
  from public.snapshots
  where user_id = v_user_id
    and coalesce(is_hidden, false) = true;

  return jsonb_build_object(
    'hidden_statuses', coalesce(v_hidden_statuses, 0),
    'hidden_snapshots', coalesce(v_hidden_snapshots, 0)
  );
end;
$$;

drop function if exists public.process_gift_purchase(uuid, uuid, uuid, numeric);
create function public.process_gift_purchase(
    p_sender_id uuid,
    p_receiver_id uuid,
    p_gift_id uuid,
    p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_sender_wallet_id uuid;
    v_receiver_wallet_id uuid;
    v_balance numeric;
begin
    if auth.uid() is null or auth.uid() <> p_sender_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    if p_amount is null or p_amount <= 0 then
        return jsonb_build_object('success', false, 'error', 'Invalid amount');
    end if;

    select id, available_balance
    into v_sender_wallet_id, v_balance
    from public.wallets
    where user_id = p_sender_id
    for update;

    if v_sender_wallet_id is null or coalesce(v_balance, 0) < p_amount then
        return jsonb_build_object('success', false, 'error', 'Insufficient balance');
    end if;

    select id
    into v_receiver_wallet_id
    from public.wallets
    where user_id = p_receiver_id;

    update public.wallets
    set available_balance = available_balance - p_amount,
        total_spent = coalesce(total_spent, 0) + p_amount,
        updated_at = now()
    where id = v_sender_wallet_id;

    insert into public.wallet_transactions
        (user_id, wallet_id, type, amount, status, description, metadata)
    values
        (
          p_sender_id,
          v_sender_wallet_id,
          'gift_purchase',
          p_amount,
          'completed',
          'Gift purchase',
          jsonb_build_object('gift_id', p_gift_id, 'receiver_id', p_receiver_id)
        );

    if v_receiver_wallet_id is not null then
        update public.wallets
        set available_balance = available_balance + (p_amount * 0.8),
            total_earned = coalesce(total_earned, 0) + (p_amount * 0.8),
            updated_at = now()
        where id = v_receiver_wallet_id;

        insert into public.wallet_transactions
            (user_id, wallet_id, type, amount, status, description, metadata)
        values
            (
              p_receiver_id,
              v_receiver_wallet_id,
              'gift_received',
              (p_amount * 0.8),
              'completed',
              'Gift received',
              jsonb_build_object('gift_id', p_gift_id, 'sender_id', p_sender_id)
            );
    end if;

    return jsonb_build_object('success', true, 'new_balance', v_balance - p_amount);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

drop function if exists public.notify_internally(uuid, text, text, text, jsonb);
drop function if exists public.notify_internally(uuid, uuid, text, text, text, jsonb);

create function public.notify_internally(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_body text,
    p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
begin
    return public.create_notification(
      p_user_id,
      null,
      p_type,
      p_title,
      p_body,
      coalesce(p_data, '{}'::jsonb)
    );
end;
$$;

create function public.notify_internally(
    p_user_id uuid,
    p_actor_id uuid,
    p_type text,
    p_title text,
    p_body text,
    p_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
begin
    return public.create_notification(
      p_user_id,
      p_actor_id,
      p_type,
      p_title,
      p_body,
      coalesce(p_data, '{}'::jsonb)
    );
end;
$$;

revoke all on function public.increment_snapshot_likes(uuid) from public, anon;
revoke all on function public.get_hidden_content_counts(uuid) from public, anon;
revoke all on function public.process_gift_purchase(uuid, uuid, uuid, numeric) from public, anon;
revoke all on function public.notify_internally(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.notify_internally(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.increment_snapshot_likes(uuid) to authenticated;
grant execute on function public.get_hidden_content_counts(uuid) to authenticated;
grant execute on function public.process_gift_purchase(uuid, uuid, uuid, numeric) to authenticated;
