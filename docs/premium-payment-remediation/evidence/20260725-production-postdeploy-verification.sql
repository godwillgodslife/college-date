select jsonb_pretty(jsonb_build_object(
  'tables', (
    select coalesce(jsonb_object_agg(table_name, true order by table_name), '{}'::jsonb)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'paid_products',
        'payment_attempts',
        'provider_webhook_events',
        'entitlements',
        'wallet_ledger',
        'payment_audit_logs',
        'monetization_config',
        'profiles',
        'subscriptions',
        'transactions',
        'wallets',
        'wallet_transactions'
      )
  ),
  'row_counts', jsonb_build_object(
    'profiles', (select count(*) from public.profiles),
    'subscriptions', (select count(*) from public.subscriptions),
    'transactions', (select count(*) from public.transactions),
    'wallets', (select count(*) from public.wallets),
    'wallet_transactions', (select count(*) from public.wallet_transactions),
    'paid_products', (select count(*) from public.paid_products),
    'payment_attempts', (select count(*) from public.payment_attempts),
    'provider_webhook_events', (select count(*) from public.provider_webhook_events),
    'entitlements', (select count(*) from public.entitlements),
    'wallet_ledger', (select count(*) from public.wallet_ledger),
    'payment_audit_logs', (select count(*) from public.payment_audit_logs)
  ),
  'premium_counts', jsonb_build_object(
    'profiles_is_premium', (
      select count(*)
      from public.profiles
      where is_premium is true
    ),
    'profiles_active_premium', (
      select count(*)
      from public.profiles
      where is_premium is true
        and (premium_expires_at is null or premium_expires_at > now())
    ),
    'profiles_with_premium_expiration', (
      select count(*)
      from public.profiles
      where premium_expires_at is not null
    ),
    'premium_subscriptions', (
      select count(*)
      from public.subscriptions
      where plan_type = 'Premium'
    ),
    'active_premium_subscriptions', (
      select count(*)
      from public.subscriptions
      where plan_type = 'Premium'
        and status = 'active'
        and (current_period_end is null or current_period_end > now())
    ),
    'entitlement_users_active', (
      select count(distinct user_id)
      from public.entitlements
      where status = 'active'
        and (expires_at is null or expires_at > now())
    )
  ),
  'wallet_counts', jsonb_build_object(
    'wallets_with_balance_or_activity', (
      select count(*)
      from public.wallets
      where coalesce(available_balance, 0) <> 0
         or coalesce(pending_balance, 0) <> 0
         or coalesce(total_earned, 0) <> 0
         or coalesce(total_spent, 0) <> 0
    ),
    'total_available_balance', (
      select coalesce(sum(available_balance), 0)
      from public.wallets
    ),
    'total_pending_balance', (
      select coalesce(sum(pending_balance), 0)
      from public.wallets
    ),
    'completed_wallet_transactions', (
      select count(*)
      from public.wallet_transactions
      where status = 'completed'
    ),
    'completed_paystack_wallet_transactions', (
      select count(*)
      from public.wallet_transactions
      where status = 'completed'
        and lower(coalesce(payment_method, '')) like '%paystack%'
    ),
    'duplicate_wallet_reference_groups', (
      select count(*)
      from (
        select reference_id
        from public.wallet_transactions
        where reference_id is not null
        group by reference_id
        having count(*) > 1
      ) duplicate_references
    )
  ),
  'new_table_counts', jsonb_build_object(
    'paid_products_active', (
      select count(*)
      from public.paid_products
      where is_active is true
    ),
    'payment_attempts_completed', (
      select count(*)
      from public.payment_attempts
      where status = 'completed'
    ),
    'payment_attempts_paystack_completed', (
      select count(*)
      from public.payment_attempts
      where provider = 'paystack'
        and status = 'completed'
    ),
    'provider_webhook_events_processed', (
      select count(*)
      from public.provider_webhook_events
      where processed_at is not null
    ),
    'wallet_ledger_completed', (
      select count(*)
      from public.wallet_ledger
      where status = 'completed'
    ),
    'audit_logs_success', (
      select count(*)
      from public.payment_audit_logs
      where result = 'success'
    )
  )
)) as production_rollout_counts;
