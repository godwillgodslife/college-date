-- Offline-first payment safety foundation:
-- - Track paid swipe operation ids so reconnect retries are idempotent.
-- - Keep the existing 3-argument process_swipe_payment RPC working.

create table if not exists public.swipe_payment_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_operation_id text not null,
  swipe_id uuid,
  swiped_id uuid not null references public.profiles(id) on delete cascade,
  swipe_type text not null,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_operation_id)
);

alter table public.swipe_payment_operations enable row level security;

drop policy if exists "Users can view own swipe payment operations" on public.swipe_payment_operations;
create policy "Users can view own swipe payment operations"
  on public.swipe_payment_operations
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.swipe_payment_operations from public, anon;
grant select on public.swipe_payment_operations to authenticated;
grant all on public.swipe_payment_operations to service_role;

create index if not exists idx_swipe_payment_operations_user_created
  on public.swipe_payment_operations(user_id, created_at desc);

drop function if exists public.process_swipe_payment(uuid, uuid, text, text);

create function public.process_swipe_payment(
  p_swiper_id uuid,
  p_swiped_id uuid,
  p_swipe_type text,
  p_client_operation_id text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_cost numeric;
  v_swiper_wallet_id uuid;
  v_swiper_balance numeric;
  v_has_free_swipe boolean := false;
  v_is_premium boolean := false;
  v_swipe_id uuid;
  v_existing_result jsonb;
  v_result jsonb;
  v_operation_id text := nullif(trim(p_client_operation_id), '');
begin
  if auth.uid() is null or auth.uid() <> p_swiper_id then
    return jsonb_build_object('success', false, 'error', 'Not authorized');
  end if;

  if p_swipe_type not in ('standard', 'premium') then
    return jsonb_build_object('success', false, 'error', 'Invalid swipe type');
  end if;

  if v_operation_id is not null then
    insert into public.swipe_payment_operations (
      user_id,
      client_operation_id,
      swiped_id,
      swipe_type
    )
    values (
      p_swiper_id,
      v_operation_id,
      p_swiped_id,
      p_swipe_type
    )
    on conflict (user_id, client_operation_id) do nothing;

    select result
    into v_existing_result
    from public.swipe_payment_operations
    where user_id = p_swiper_id
      and client_operation_id = v_operation_id
    for update;

    if v_existing_result is not null then
      return v_existing_result || jsonb_build_object('idempotent', true);
    end if;
  end if;

  select id
  into v_swipe_id
  from public.swipes
  where swiper_id = p_swiper_id
    and swiped_id = p_swiped_id
  limit 1;

  select
    coalesce(p.is_premium, false)
    or exists (
      select 1
      from public.subscriptions s
      where s.user_id = p_swiper_id
        and s.plan_type = 'Premium'
        and s.status = 'active'
        and (s.current_period_end is null or s.current_period_end > now())
    )
  into v_is_premium
  from public.profiles p
  where p.id = p_swiper_id;

  if p_swipe_type = 'premium' then
    v_cost := 5000.00;
  else
    v_cost := 500.00;
  end if;

  if p_swipe_type = 'standard' and coalesce(v_is_premium, false) then
    update public.swipes
    set is_free = true
    where swiper_id = p_swiper_id
      and swiped_id = p_swiped_id
      and status = 'pending';

    v_result := jsonb_build_object('success', true, 'type', 'premium_free');
  elsif p_swipe_type = 'standard' then
    perform public.check_and_reset_swipe_limit(p_swiper_id);

    update public.profiles
    set free_swipes = greatest(coalesce(free_swipes, 0) - 1, 0)
    where id = p_swiper_id
      and coalesce(free_swipes, 0) > 0
    returning true into v_has_free_swipe;

    if v_has_free_swipe then
      update public.swipes
      set is_free = true
      where swiper_id = p_swiper_id
        and swiped_id = p_swiped_id
        and status = 'pending';

      v_result := jsonb_build_object('success', true, 'type', 'free');
    end if;
  end if;

  if v_result is null then
    select id, available_balance
    into v_swiper_wallet_id, v_swiper_balance
    from public.wallets
    where user_id = p_swiper_id
    for update;

    if v_swiper_wallet_id is null or coalesce(v_swiper_balance, 0) < v_cost then
      v_result := jsonb_build_object('success', false, 'error', 'Insufficient balance');
    else
      update public.wallets
      set available_balance = available_balance - v_cost,
          total_spent = coalesce(total_spent, 0) + v_cost,
          updated_at = now()
      where id = v_swiper_wallet_id;

      insert into public.wallet_transactions (
        user_id,
        wallet_id,
        type,
        amount,
        status,
        description,
        reference_id,
        metadata
      )
      values (
        p_swiper_id,
        v_swiper_wallet_id,
        'swipe_purchase',
        v_cost,
        'completed',
        upper(p_swipe_type) || ' Swipe Request',
        case when v_operation_id is null then null else 'swipe:' || v_operation_id end,
        jsonb_build_object(
          'target_id', p_swiped_id,
          'swipe_id', v_swipe_id,
          'swipe_type', p_swipe_type,
          'client_operation_id', v_operation_id
        )
      );

      v_result := jsonb_build_object('success', true, 'type', 'paid', 'amount', v_cost);
    end if;
  end if;

  if v_operation_id is not null and coalesce((v_result->>'success')::boolean, false) then
    update public.swipe_payment_operations
    set swipe_id = v_swipe_id,
        result = v_result,
        updated_at = now()
    where user_id = p_swiper_id
      and client_operation_id = v_operation_id;
  elsif v_operation_id is not null then
    delete from public.swipe_payment_operations
    where user_id = p_swiper_id
      and client_operation_id = v_operation_id;
  end if;

  return v_result;
exception when others then
  v_result := jsonb_build_object('success', false, 'error', sqlerrm);

  if v_operation_id is not null then
    delete from public.swipe_payment_operations
    where user_id = p_swiper_id
      and client_operation_id = v_operation_id;
  end if;

  return v_result;
end;
$$;

create or replace function public.process_swipe_payment(
  p_swiper_id uuid,
  p_swiped_id uuid,
  p_swipe_type text
)
returns jsonb
language sql
security definer
set search_path to ''
as $$
  select public.process_swipe_payment(p_swiper_id, p_swiped_id, p_swipe_type, null::text);
$$;

revoke all on function public.process_swipe_payment(uuid, uuid, text, text) from public, anon;
revoke all on function public.process_swipe_payment(uuid, uuid, text) from public, anon;
grant execute on function public.process_swipe_payment(uuid, uuid, text, text) to authenticated;
grant execute on function public.process_swipe_payment(uuid, uuid, text) to authenticated;
