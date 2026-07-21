-- Premium/payment remediation foundation.
-- This migration moves paid-product truth and entitlement activation to the
-- database so browser clients cannot choose amounts, durations, or identities.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.paid_products (
    product_id text primary key,
    display_name text not null,
    product_type text not null check (product_type in ('subscription', 'wallet_funding', 'boost', 'consumable')),
    provider text not null default 'paystack',
    provider_product_id text,
    amount numeric(12, 2) not null check (amount > 0),
    currency text not null default 'NGN',
    billing_interval text,
    duration_days integer,
    wallet_credit_amount numeric(12, 2),
    entitlements jsonb not null default '[]'::jsonb,
    platforms text[] not null default array['web'],
    is_active boolean not null default true,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into public.paid_products (
    product_id,
    display_name,
    product_type,
    provider,
    provider_product_id,
    amount,
    currency,
    billing_interval,
    duration_days,
    wallet_credit_amount,
    entitlements,
    platforms,
    metadata
)
values
    (
        'premium_monthly',
        'The College Date Premium Monthly',
        'subscription',
        'paystack',
        'premium_monthly',
        2900,
        'NGN',
        'monthly',
        30,
        null,
        '["premium", "unlimited_swipes", "see_admirers", "see_profile_viewers", "advanced_filters", "premium_badge"]'::jsonb,
        array['web'],
        '{"restore_policy": "active_entitlement_only"}'::jsonb
    ),
    (
        'wallet_2000',
        'Wallet Top-up NGN 2,000',
        'wallet_funding',
        'paystack',
        'wallet_2000',
        2000,
        'NGN',
        null,
        null,
        2000,
        '[]'::jsonb,
        array['web'],
        '{"android_policy": "disabled_for_digital_goods"}'::jsonb
    ),
    (
        'wallet_5000',
        'Wallet Top-up NGN 5,000',
        'wallet_funding',
        'paystack',
        'wallet_5000',
        5000,
        'NGN',
        null,
        null,
        5000,
        '[]'::jsonb,
        array['web'],
        '{"android_policy": "disabled_for_digital_goods"}'::jsonb
    ),
    (
        'wallet_10000',
        'Wallet Top-up NGN 10,000',
        'wallet_funding',
        'paystack',
        'wallet_10000',
        10000,
        'NGN',
        null,
        null,
        10000,
        '[]'::jsonb,
        array['web'],
        '{"android_policy": "disabled_for_digital_goods"}'::jsonb
    ),
    (
        'wallet_20000',
        'Wallet Top-up NGN 20,000',
        'wallet_funding',
        'paystack',
        'wallet_20000',
        20000,
        'NGN',
        null,
        null,
        20000,
        '[]'::jsonb,
        array['web'],
        '{"android_policy": "disabled_for_digital_goods"}'::jsonb
    )
on conflict (product_id) do update
set display_name = excluded.display_name,
    product_type = excluded.product_type,
    provider = excluded.provider,
    provider_product_id = excluded.provider_product_id,
    amount = excluded.amount,
    currency = excluded.currency,
    billing_interval = excluded.billing_interval,
    duration_days = excluded.duration_days,
    wallet_credit_amount = excluded.wallet_credit_amount,
    entitlements = excluded.entitlements,
    platforms = excluded.platforms,
    is_active = true,
    metadata = excluded.metadata,
    updated_at = now();

create table if not exists public.payment_attempts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    product_id text not null references public.paid_products(product_id),
    provider text not null,
    provider_reference text not null unique,
    provider_authorization_url text,
    expected_amount numeric(12, 2) not null check (expected_amount > 0),
    currency text not null default 'NGN',
    status text not null default 'pending' check (
        status in ('pending', 'initialized', 'verified', 'processed', 'failed', 'abandoned', 'mismatch')
    ),
    provider_status text,
    provider_response jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    expires_at timestamptz not null default (now() + interval '1 hour'),
    verified_at timestamptz,
    processed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_payment_attempts_user_created
    on public.payment_attempts(user_id, created_at desc);

create index if not exists idx_payment_attempts_status_expires
    on public.payment_attempts(status, expires_at);

create table if not exists public.provider_webhook_events (
    id uuid primary key default gen_random_uuid(),
    provider text not null,
    provider_event_id text not null,
    event_type text,
    provider_reference text,
    payload_hash text not null,
    payload jsonb not null default '{}'::jsonb,
    processing_status text not null default 'received' check (
        processing_status in ('received', 'ignored', 'processed', 'failed', 'duplicate')
    ),
    failure_reason text,
    received_at timestamptz not null default now(),
    processed_at timestamptz,
    unique (provider, provider_event_id)
);

create index if not exists idx_provider_webhook_events_reference
    on public.provider_webhook_events(provider, provider_reference);

create table if not exists public.entitlements (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    entitlement_key text not null,
    product_id text references public.paid_products(product_id),
    source text not null,
    source_reference text not null,
    status text not null default 'active' check (status in ('active', 'expired', 'cancelled', 'revoked')),
    starts_at timestamptz not null default now(),
    expires_at timestamptz,
    cancelled_at timestamptz,
    revoked_at timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, entitlement_key, source, source_reference)
);

create index if not exists idx_entitlements_user_active
    on public.entitlements(user_id, entitlement_key, status, expires_at);

create index if not exists idx_entitlements_source_reference
    on public.entitlements(source, source_reference);

create table if not exists public.wallet_ledger (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    wallet_id uuid references public.wallets(id) on delete set null,
    entry_type text not null check (entry_type in ('credit', 'debit', 'hold', 'release', 'adjustment')),
    amount numeric(12, 2) not null check (amount > 0),
    currency text not null default 'NGN',
    source text not null,
    source_reference text,
    status text not null default 'posted' check (status in ('pending', 'posted', 'reversed')),
    balance_before numeric(12, 2),
    balance_after numeric(12, 2),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create unique index if not exists idx_wallet_ledger_unique_source
    on public.wallet_ledger(source, source_reference, entry_type)
    where source_reference is not null;

create index if not exists idx_wallet_ledger_user_created
    on public.wallet_ledger(user_id, created_at desc);

create table if not exists public.payment_audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_user_id uuid,
    action text not null,
    provider text,
    provider_reference text,
    product_id text,
    result text not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.monetization_config (
    key text primary key,
    value jsonb not null,
    updated_at timestamptz not null default now()
);

insert into public.monetization_config(key, value)
values ('free_swipes_per_day', '{"value": 20}'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

alter table public.paid_products enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.entitlements enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.payment_audit_logs enable row level security;
alter table public.monetization_config enable row level security;

drop policy if exists "Paid products are readable" on public.paid_products;
create policy "Paid products are readable"
    on public.paid_products for select
    using (is_active = true);

drop policy if exists "Users can read own payment attempts" on public.payment_attempts;
create policy "Users can read own payment attempts"
    on public.payment_attempts for select
    using (auth.uid() = user_id);

drop policy if exists "Users can read own entitlements" on public.entitlements;
create policy "Users can read own entitlements"
    on public.entitlements for select
    using (auth.uid() = user_id);

drop policy if exists "Users can read own wallet ledger" on public.wallet_ledger;
create policy "Users can read own wallet ledger"
    on public.wallet_ledger for select
    using (auth.uid() = user_id);

drop policy if exists "Monetization config is readable" on public.monetization_config;
create policy "Monetization config is readable"
    on public.monetization_config for select
    using (true);

revoke insert, update, delete on public.payment_attempts from anon, authenticated;
revoke insert, update, delete on public.provider_webhook_events from anon, authenticated;
revoke insert, update, delete on public.entitlements from anon, authenticated;
revoke insert, update, delete on public.wallet_ledger from anon, authenticated;
revoke all on public.payment_audit_logs from anon, authenticated;
revoke insert, update, delete on public.wallet_transactions from anon, authenticated;

create or replace function public.has_entitlement(p_user_id uuid, p_entitlement_key text)
returns boolean
language sql
security definer
set search_path to ''
stable
as $$
    select (
        auth.uid() = p_user_id
        or current_user = 'service_role'
        or public.is_app_admin()
    )
    and (
        exists (
            select 1
            from public.entitlements e
            where e.user_id = p_user_id
              and e.entitlement_key = p_entitlement_key
              and e.status = 'active'
              and e.revoked_at is null
              and e.starts_at <= now()
              and (e.expires_at is null or e.expires_at > now())
        )
        or exists (
            select 1
            from public.profiles p
            where p.id = p_user_id
              and p.is_premium = true
              and (
                  p.premium_expires_at is null
                  or p.premium_expires_at > now()
              )
        )
        or exists (
            select 1
            from public.subscriptions s
            where s.user_id = p_user_id
              and s.plan_type = 'Premium'
              and s.status = 'active'
              and (
                  s.current_period_end is null
                  or s.current_period_end > now()
              )
        )
    );
$$;

create or replace function public.get_my_entitlements()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_active jsonb;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    select coalesce(
        jsonb_object_agg(
            e.entitlement_key,
            jsonb_build_object(
                'status', e.status,
                'product_id', e.product_id,
                'source', e.source,
                'starts_at', e.starts_at,
                'expires_at', e.expires_at
            )
        ),
        '{}'::jsonb
    )
    into v_active
    from public.entitlements e
    where e.user_id = v_user_id
      and e.status = 'active'
      and e.revoked_at is null
      and e.starts_at <= now()
      and (e.expires_at is null or e.expires_at > now());

    return jsonb_build_object(
        'success', true,
        'premium', public.has_entitlement(v_user_id, 'premium'),
        'entitlements', coalesce(v_active, '{}'::jsonb)
    );
end;
$$;

create or replace function public.grant_paid_product_entitlements(
    p_user_id uuid,
    p_product_id text,
    p_source text,
    p_source_reference text,
    p_starts_at timestamptz default now(),
    p_expires_at timestamptz default null,
    p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_product public.paid_products%rowtype;
    v_entitlement text;
    v_expires_at timestamptz;
begin
    select * into v_product
    from public.paid_products
    where product_id = p_product_id
      and is_active = true;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Product not found');
    end if;

    v_expires_at := coalesce(
        p_expires_at,
        case
            when v_product.duration_days is not null then p_starts_at + make_interval(days => v_product.duration_days)
            else null
        end
    );

    for v_entitlement in
        select jsonb_array_elements_text(v_product.entitlements)
    loop
        insert into public.entitlements (
            user_id,
            entitlement_key,
            product_id,
            source,
            source_reference,
            status,
            starts_at,
            expires_at,
            metadata
        )
        values (
            p_user_id,
            v_entitlement,
            p_product_id,
            p_source,
            p_source_reference,
            'active',
            p_starts_at,
            v_expires_at,
            coalesce(p_metadata, '{}'::jsonb)
        )
        on conflict (user_id, entitlement_key, source, source_reference) do update
        set status = 'active',
            starts_at = least(public.entitlements.starts_at, excluded.starts_at),
            expires_at = greatest(public.entitlements.expires_at, excluded.expires_at),
            revoked_at = null,
            metadata = public.entitlements.metadata || excluded.metadata,
            updated_at = now();
    end loop;

    if v_product.entitlements ? 'premium' then
        insert into public.subscriptions (
            user_id,
            plan_type,
            status,
            current_period_end,
            updated_at
        )
        values (
            p_user_id,
            'Premium',
            'active',
            v_expires_at,
            now()
        )
        on conflict (user_id) do update
        set plan_type = 'Premium',
            status = 'active',
            current_period_end = excluded.current_period_end,
            updated_at = now();

        update public.profiles
        set is_premium = true,
            premium_expires_at = v_expires_at
        where id = p_user_id;
    end if;

    return jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'expires_at', v_expires_at
    );
end;
$$;

create or replace function public.process_verified_payment(
    p_provider text,
    p_provider_reference text,
    p_provider_status text default 'success',
    p_provider_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_attempt public.payment_attempts%rowtype;
    v_product public.paid_products%rowtype;
    v_wallet_id uuid;
    v_before numeric(12, 2);
    v_after numeric(12, 2);
    v_amount numeric(12, 2);
    v_tx_id uuid;
    v_entitlement_result jsonb;
begin
    select *
    into v_attempt
    from public.payment_attempts
    where provider = p_provider
      and provider_reference = p_provider_reference
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Payment attempt not found');
    end if;

    if v_attempt.status = 'processed' then
        return jsonb_build_object(
            'success', true,
            'idempotent', true,
            'payment_attempt_id', v_attempt.id,
            'product_id', v_attempt.product_id,
            'message', 'Payment already processed'
        );
    end if;

    if v_attempt.status in ('failed', 'mismatch', 'abandoned') then
        return jsonb_build_object('success', false, 'error', 'Payment attempt cannot be processed from status ' || v_attempt.status);
    end if;

    select *
    into v_product
    from public.paid_products
    where product_id = v_attempt.product_id
      and is_active = true;

    if not found then
        update public.payment_attempts
        set status = 'failed',
            provider_status = p_provider_status,
            provider_response = coalesce(p_provider_payload, '{}'::jsonb),
            updated_at = now()
        where id = v_attempt.id;

        return jsonb_build_object('success', false, 'error', 'Paid product is not active');
    end if;

    update public.payment_attempts
    set status = 'verified',
        provider_status = p_provider_status,
        provider_response = coalesce(p_provider_payload, '{}'::jsonb),
        verified_at = coalesce(verified_at, now()),
        updated_at = now()
    where id = v_attempt.id;

    insert into public.wallets (user_id, available_balance, total_earned)
    values (v_attempt.user_id, 0, 0)
    on conflict (user_id) do nothing;

    select id, coalesce(available_balance, 0)
    into v_wallet_id, v_before
    from public.wallets
    where user_id = v_attempt.user_id
    for update;

    if v_product.product_type = 'wallet_funding' then
        v_amount := coalesce(v_product.wallet_credit_amount, v_attempt.expected_amount);
        v_after := coalesce(v_before, 0) + v_amount;

        update public.wallets
        set available_balance = v_after,
            total_earned = coalesce(total_earned, 0) + v_amount,
            updated_at = now()
        where id = v_wallet_id;

        insert into public.wallet_ledger (
            user_id,
            wallet_id,
            entry_type,
            amount,
            currency,
            source,
            source_reference,
            status,
            balance_before,
            balance_after,
            metadata
        )
        values (
            v_attempt.user_id,
            v_wallet_id,
            'credit',
            v_amount,
            v_attempt.currency,
            p_provider,
            p_provider_reference,
            'posted',
            v_before,
            v_after,
            jsonb_build_object('product_id', v_product.product_id, 'payment_attempt_id', v_attempt.id)
        );

        insert into public.wallet_transactions (
            user_id,
            wallet_id,
            type,
            amount,
            status,
            description,
            payment_method,
            reference_id,
            metadata
        )
        values (
            v_attempt.user_id,
            v_wallet_id,
            'deposit',
            v_amount,
            'completed',
            v_product.display_name,
            p_provider,
            p_provider_reference,
            jsonb_build_object('product_id', v_product.product_id, 'payment_attempt_id', v_attempt.id)
        )
        returning id into v_tx_id;
    elsif v_product.product_type = 'subscription' then
        v_entitlement_result := public.grant_paid_product_entitlements(
            v_attempt.user_id,
            v_product.product_id,
            p_provider,
            p_provider_reference,
            now(),
            null,
            jsonb_build_object('payment_attempt_id', v_attempt.id, 'provider_status', p_provider_status)
        );

        if not coalesce((v_entitlement_result->>'success')::boolean, false) then
            raise exception '%', coalesce(v_entitlement_result->>'error', 'Unable to grant entitlement');
        end if;

        update public.wallets
        set total_spent = coalesce(total_spent, 0) + v_attempt.expected_amount,
            updated_at = now()
        where id = v_wallet_id;

        insert into public.wallet_transactions (
            user_id,
            wallet_id,
            type,
            amount,
            status,
            description,
            payment_method,
            reference_id,
            metadata
        )
        values (
            v_attempt.user_id,
            v_wallet_id,
            'subscription',
            v_attempt.expected_amount,
            'completed',
            v_product.display_name,
            p_provider,
            p_provider_reference,
            jsonb_build_object(
                'product_id', v_product.product_id,
                'payment_attempt_id', v_attempt.id,
                'entitlement_result', v_entitlement_result
            )
        )
        returning id into v_tx_id;
    else
        return jsonb_build_object('success', false, 'error', 'Unsupported product type for payment processing');
    end if;

    update public.payment_attempts
    set status = 'processed',
        processed_at = now(),
        updated_at = now()
    where id = v_attempt.id;

    insert into public.payment_audit_logs (
        actor_user_id,
        action,
        provider,
        provider_reference,
        product_id,
        result,
        metadata
    )
    values (
        v_attempt.user_id,
        'process_verified_payment',
        p_provider,
        p_provider_reference,
        v_product.product_id,
        'success',
        jsonb_build_object('payment_attempt_id', v_attempt.id, 'wallet_transaction_id', v_tx_id)
    );

    return jsonb_build_object(
        'success', true,
        'payment_attempt_id', v_attempt.id,
        'wallet_transaction_id', v_tx_id,
        'product_id', v_product.product_id,
        'product_type', v_product.product_type,
        'amount', v_attempt.expected_amount,
        'currency', v_attempt.currency,
        'entitlement_result', coalesce(v_entitlement_result, '{}'::jsonb)
    );
exception when unique_violation then
    update public.payment_attempts
    set status = 'processed',
        processed_at = coalesce(processed_at, now()),
        updated_at = now()
    where provider = p_provider
      and provider_reference = p_provider_reference;

    return jsonb_build_object(
        'success', true,
        'idempotent', true,
        'provider_reference', p_provider_reference,
        'message', 'Duplicate payment processing ignored'
    );
end;
$$;

create or replace function public.purchase_premium_with_wallet(p_product_id text default 'premium_monthly')
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_product public.paid_products%rowtype;
    v_wallet_id uuid;
    v_before numeric(12, 2);
    v_after numeric(12, 2);
    v_reference text := 'wallet-premium-' || gen_random_uuid()::text;
    v_tx_id uuid;
    v_entitlement_result jsonb;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    select *
    into v_product
    from public.paid_products
    where product_id = p_product_id
      and product_type = 'subscription'
      and is_active = true;

    if not found then
        return jsonb_build_object('success', false, 'error', 'Premium product is not available');
    end if;

    select id, coalesce(available_balance, 0)
    into v_wallet_id, v_before
    from public.wallets
    where user_id = v_user_id
    for update;

    if v_wallet_id is null then
        return jsonb_build_object('success', false, 'error', 'Wallet not found');
    end if;

    if v_before < v_product.amount then
        return jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
    end if;

    v_after := v_before - v_product.amount;

    update public.wallets
    set available_balance = v_after,
        total_spent = coalesce(total_spent, 0) + v_product.amount,
        updated_at = now()
    where id = v_wallet_id;

    insert into public.wallet_ledger (
        user_id,
        wallet_id,
        entry_type,
        amount,
        currency,
        source,
        source_reference,
        status,
        balance_before,
        balance_after,
        metadata
    )
    values (
        v_user_id,
        v_wallet_id,
        'debit',
        v_product.amount,
        v_product.currency,
        'wallet',
        v_reference,
        'posted',
        v_before,
        v_after,
        jsonb_build_object('product_id', v_product.product_id)
    );

    v_entitlement_result := public.grant_paid_product_entitlements(
        v_user_id,
        v_product.product_id,
        'wallet',
        v_reference,
        now(),
        null,
        jsonb_build_object('wallet_id', v_wallet_id)
    );

    if not coalesce((v_entitlement_result->>'success')::boolean, false) then
        raise exception '%', coalesce(v_entitlement_result->>'error', 'Unable to activate Premium');
    end if;

    insert into public.wallet_transactions (
        user_id,
        wallet_id,
        type,
        amount,
        status,
        description,
        payment_method,
        reference_id,
        metadata
    )
    values (
        v_user_id,
        v_wallet_id,
        'subscription',
        v_product.amount,
        'completed',
        v_product.display_name,
        'wallet',
        v_reference,
        jsonb_build_object('product_id', v_product.product_id, 'entitlement_result', v_entitlement_result)
    )
    returning id into v_tx_id;

    return jsonb_build_object(
        'success', true,
        'wallet_transaction_id', v_tx_id,
        'reference', v_reference,
        'new_balance', v_after,
        'entitlement_result', v_entitlement_result
    );
end;
$$;

create or replace function public.request_wallet_withdrawal(p_amount numeric, p_bank_details jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_wallet_id uuid;
    v_before numeric(12, 2);
    v_pending_before numeric(12, 2);
    v_withdrawal_id uuid;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    if p_amount is null or p_amount < 15000 then
        return jsonb_build_object('success', false, 'error', 'Minimum withdrawal is NGN 15,000');
    end if;

    select id, coalesce(available_balance, 0), coalesce(pending_balance, 0)
    into v_wallet_id, v_before, v_pending_before
    from public.wallets
    where user_id = v_user_id
    for update;

    if v_wallet_id is null or v_before < p_amount then
        return jsonb_build_object('success', false, 'error', 'Insufficient balance');
    end if;

    insert into public.withdrawals (
        user_id,
        amount,
        type,
        status,
        bank_details
    )
    values (
        v_user_id,
        p_amount,
        'swipe_earnings',
        'pending',
        coalesce(p_bank_details, '{}'::jsonb)
    )
    returning id into v_withdrawal_id;

    update public.wallets
    set available_balance = v_before - p_amount,
        pending_balance = v_pending_before + p_amount,
        updated_at = now()
    where id = v_wallet_id;

    insert into public.wallet_ledger (
        user_id,
        wallet_id,
        entry_type,
        amount,
        currency,
        source,
        source_reference,
        status,
        balance_before,
        balance_after,
        metadata
    )
    values (
        v_user_id,
        v_wallet_id,
        'hold',
        p_amount,
        'NGN',
        'withdrawal',
        v_withdrawal_id::text,
        'posted',
        v_before,
        v_before - p_amount,
        jsonb_build_object('withdrawal_id', v_withdrawal_id)
    );

    return jsonb_build_object(
        'success', true,
        'withdrawal_id', v_withdrawal_id,
        'available_balance', v_before - p_amount,
        'pending_balance', v_pending_before + p_amount
    );
end;
$$;

create or replace function public.get_profile_viewers_secure(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_is_premium boolean;
    v_total integer;
    v_items jsonb;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    v_is_premium := public.has_entitlement(v_user_id, 'see_profile_viewers')
        or public.has_entitlement(v_user_id, 'premium');

    select count(*)::integer
    into v_total
    from public.profile_views pv
    where pv.profile_owner_id = v_user_id;

    if not v_is_premium then
        select coalesce(jsonb_agg(item), '[]'::jsonb)
        into v_items
        from (
            select jsonb_build_object(
                'created_at', pv.created_at,
                'locked', true
            ) as item
            from public.profile_views pv
            where pv.profile_owner_id = v_user_id
            order by pv.created_at desc
            limit greatest(1, least(coalesce(p_limit, 20), 50))
        ) locked_items;

        return jsonb_build_object(
            'success', true,
            'premium', false,
            'upgrade_required', v_total > 0,
            'total_count', v_total,
            'items', coalesce(v_items, '[]'::jsonb)
        );
    end if;

    select coalesce(jsonb_agg(item), '[]'::jsonb)
    into v_items
    from (
        select jsonb_build_object(
            'id', pv.id,
            'created_at', pv.created_at,
            'viewer', jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'avatar_url', p.avatar_url,
                'university', p.university,
                'last_active', p.last_active
            ),
            'locked', false
        ) as item
        from public.profile_views pv
        join public.profiles p on p.id = pv.viewer_id
        where pv.profile_owner_id = v_user_id
        order by pv.created_at desc
        limit greatest(1, least(coalesce(p_limit, 20), 50))
    ) unlocked_items;

    return jsonb_build_object(
        'success', true,
        'premium', true,
        'upgrade_required', false,
        'total_count', v_total,
        'items', coalesce(v_items, '[]'::jsonb)
    );
end;
$$;

create or replace function public.get_admirers_secure(p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_is_premium boolean;
    v_total integer;
    v_items jsonb;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'Not authenticated');
    end if;

    v_is_premium := public.has_entitlement(v_user_id, 'see_admirers')
        or public.has_entitlement(v_user_id, 'premium');

    select count(*)::integer
    into v_total
    from public.swipes sw
    where sw.swiped_id = v_user_id
      and sw.status = 'pending';

    if not v_is_premium then
        select coalesce(jsonb_agg(item), '[]'::jsonb)
        into v_items
        from (
            select jsonb_build_object(
                'created_at', sw.created_at,
                'is_priority', coalesce(sw.is_priority, false),
                'locked', true
            ) as item
            from public.swipes sw
            where sw.swiped_id = v_user_id
              and sw.status = 'pending'
            order by coalesce(sw.is_priority, false) desc, sw.created_at desc
            limit greatest(1, least(coalesce(p_limit, 50), 100))
        ) locked_items;

        return jsonb_build_object(
            'success', true,
            'premium', false,
            'upgrade_required', v_total > 0,
            'total_count', v_total,
            'items', coalesce(v_items, '[]'::jsonb)
        );
    end if;

    select coalesce(jsonb_agg(item), '[]'::jsonb)
    into v_items
    from (
        select jsonb_build_object(
            'id', sw.id,
            'swiper_id', sw.swiper_id,
            'swiped_id', sw.swiped_id,
            'type', sw.type,
            'status', sw.status,
            'is_priority', coalesce(sw.is_priority, false),
            'message_teaser', sw.message_teaser,
            'created_at', sw.created_at,
            'locked', false,
            'swiper', to_jsonb(p)
        ) as item
        from public.swipes sw
        join public.profiles p on p.id = sw.swiper_id
        where sw.swiped_id = v_user_id
          and sw.status = 'pending'
        order by coalesce(sw.is_priority, false) desc, sw.created_at desc
        limit greatest(1, least(coalesce(p_limit, 50), 100))
    ) unlocked_items;

    return jsonb_build_object(
        'success', true,
        'premium', true,
        'upgrade_required', false,
        'total_count', v_total,
        'items', coalesce(v_items, '[]'::jsonb)
    );
end;
$$;

create or replace function public.get_monetization_config()
returns jsonb
language plpgsql
security definer
set search_path to ''
stable
as $$
declare
    v_free_swipes integer := 20;
begin
    select coalesce((value->>'value')::integer, 20)
    into v_free_swipes
    from public.monetization_config
    where key = 'free_swipes_per_day';

    return jsonb_build_object(
        'success', true,
        'free_swipes_per_day', coalesce(v_free_swipes, 20),
        'premium_product_id', 'premium_monthly'
    );
end;
$$;

revoke all on function public.grant_paid_product_entitlements(uuid, text, text, text, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.process_verified_payment(text, text, text, jsonb) from public, anon, authenticated;

grant execute on function public.grant_paid_product_entitlements(uuid, text, text, text, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.process_verified_payment(text, text, text, jsonb) to service_role;
grant execute on function public.purchase_premium_with_wallet(text) to authenticated;
grant execute on function public.request_wallet_withdrawal(numeric, jsonb) to authenticated;
grant execute on function public.get_profile_viewers_secure(integer) to authenticated;
grant execute on function public.get_admirers_secure(integer) to authenticated;
grant execute on function public.get_my_entitlements() to authenticated;
grant execute on function public.get_monetization_config() to anon, authenticated;
grant execute on function public.has_entitlement(uuid, text) to authenticated, service_role;
