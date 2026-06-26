-- Ensure user-facing money RPCs can only act for the authenticated user.

create or replace function public.process_gift_purchase(
    p_sender_id uuid,
    p_receiver_id uuid,
    p_gift_id text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_sender_wallet_id uuid;
    v_receiver_wallet_id uuid;
    v_gift_price numeric;
    v_gift_name text;
    v_sender_balance numeric;
begin
    if auth.uid() is null or auth.uid() <> p_sender_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    select price, name into v_gift_price, v_gift_name
    from public.gifts
    where id = p_gift_id;

    if not found or v_gift_price is null or v_gift_price <= 0 then
        return jsonb_build_object('success', false, 'error', 'Invalid gift');
    end if;

    select id, available_balance into v_sender_wallet_id, v_sender_balance
    from public.wallets
    where user_id = p_sender_id
    for update;

    if v_sender_balance is null or v_sender_balance < v_gift_price then
        return jsonb_build_object('success', false, 'error', 'Insufficient balance');
    end if;

    select id into v_receiver_wallet_id
    from public.wallets
    where user_id = p_receiver_id;

    update public.wallets
    set available_balance = available_balance - v_gift_price,
        total_spent = total_spent + v_gift_price,
        updated_at = now()
    where id = v_sender_wallet_id;

    insert into public.wallet_transactions
        (user_id, wallet_id, type, amount, status, description, metadata)
    values
        (p_sender_id, v_sender_wallet_id, 'gift_purchase', v_gift_price, 'completed', 'Sent Gift: ' || v_gift_name, jsonb_build_object('receiver_id', p_receiver_id, 'gift_id', p_gift_id));

    if v_receiver_wallet_id is not null then
        update public.wallets
        set available_balance = available_balance + (v_gift_price * 0.5),
            total_earned = total_earned + (v_gift_price * 0.5),
            updated_at = now()
        where id = v_receiver_wallet_id;

        insert into public.wallet_transactions
            (user_id, wallet_id, type, amount, status, description, metadata)
        values
            (p_receiver_id, v_receiver_wallet_id, 'gift_received', (v_gift_price * 0.5), 'completed', 'Received Gift: ' || v_gift_name, jsonb_build_object('sender_id', p_sender_id, 'gift_id', p_gift_id));
    end if;

    return jsonb_build_object('success', true, 'new_balance', v_sender_balance - v_gift_price);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.process_gift_purchase(
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
    v_balance numeric;
begin
    if auth.uid() is null or auth.uid() <> p_sender_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    if p_amount is null or p_amount <= 0 then
        return jsonb_build_object('success', false, 'error', 'Invalid amount');
    end if;

    select available_balance into v_balance
    from public.wallets
    where user_id = p_sender_id
    for update;

    if v_balance is null or v_balance < p_amount then
        return jsonb_build_object('success', false, 'error', 'Insufficient balance');
    end if;

    update public.wallets
    set available_balance = available_balance - p_amount,
        total_spent = total_spent + p_amount,
        updated_at = now()
    where user_id = p_sender_id;

    update public.wallets
    set available_balance = available_balance + (p_amount * 0.8),
        total_earned = total_earned + (p_amount * 0.8),
        updated_at = now()
    where user_id = p_receiver_id;

    insert into public.transactions (user_id, amount, type, description, status, metadata)
    values (
        p_sender_id,
        p_amount,
        'gift',
        'Gift purchase',
        'completed',
        jsonb_build_object('gift_id', p_gift_id, 'receiver_id', p_receiver_id)
    )
    on conflict do nothing;

    return jsonb_build_object('success', true);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.process_pending_referral_funds(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    rec record;
    unlocked_amount numeric := 0;
begin
    if auth.uid() is null or auth.uid() <> p_user_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    for rec in
        select id, amount, wallet_id
        from public.wallet_transactions
        where user_id = p_user_id
          and status = 'pending'
          and type = 'referral_bonus'
          and unlocks_at <= now()
    loop
        update public.wallet_transactions
        set status = 'completed',
            unlocks_at = null,
            description = 'Referral Reward (Unlocked)'
        where id = rec.id;

        update public.wallets
        set pending_balance = greatest(pending_balance - rec.amount, 0),
            available_balance = available_balance + rec.amount,
            total_earned = total_earned + rec.amount,
            updated_at = now()
        where id = rec.wallet_id;

        unlocked_amount := unlocked_amount + rec.amount;
    end loop;

    return jsonb_build_object('success', true, 'unlocked_total', unlocked_amount);
end;
$$;

create or replace function public.unlock_matured_rewards(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    rec record;
    unlocked_total numeric := 0;
begin
    if auth.uid() is null or auth.uid() <> p_user_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    for rec in
        select id, amount, wallet_id
        from public.wallet_transactions
        where user_id = p_user_id
          and status = 'pending'
          and type = 'referral_bonus'
          and unlocks_at <= now()
    loop
        update public.wallet_transactions
        set status = 'completed',
            unlocks_at = null,
            description = replace(description, '(Locked 30 days)', '(Unlocked)')
        where id = rec.id;

        update public.wallets
        set pending_balance = greatest(coalesce(pending_balance, 0) - rec.amount, 0),
            available_balance = coalesce(available_balance, 0) + rec.amount,
            total_earned = coalesce(total_earned, 0) + rec.amount,
            updated_at = now()
        where id = rec.wallet_id;

        unlocked_total := unlocked_total + rec.amount;
    end loop;

    return jsonb_build_object('success', true, 'unlocked_amount', unlocked_total);
end;
$$;

create or replace function public.process_referral_milestones(p_referrer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_count bigint;
    v_reward numeric := 0;
begin
    if auth.uid() is null or auth.uid() <> p_referrer_id then
        return jsonb_build_object('success', false, 'error', 'Not authorized');
    end if;

    select count(*) into v_count
    from public.referrals
    where referrer_id = p_referrer_id and status in ('pending', 'rewarded');

    if v_count > 0 and (v_count % 10) = 0 then
        v_reward := 3000;
        update public.wallets
        set available_balance = available_balance + v_reward,
            total_earned = total_earned + v_reward,
            updated_at = now()
        where user_id = p_referrer_id;
    end if;

    update public.referrals
    set status = 'rewarded', rewarded_at = now()
    where referrer_id = p_referrer_id and status = 'pending';

    return jsonb_build_object('referral_count', v_count, 'bonus_awarded', v_reward);
end;
$$;
