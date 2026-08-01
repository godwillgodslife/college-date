-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: public table structure only. No production rows are included.
-- Apply after 000_extensions_and_types.sql and before constraints, functions, views, RLS, storage, or Realtime.

set search_path = public, extensions;

create table if not exists public.admin_audit_logs (
    id uuid default gen_random_uuid() not null,
    admin_user_id uuid,
    action text not null,
    target_type text,
    target_id uuid,
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default now() not null
);

create table if not exists public.admin_push_broadcasts (
    id uuid default gen_random_uuid() not null,
    admin_user_id uuid,
    segment text not null,
    title text not null,
    body text not null,
    target_user_count integer default 0 not null,
    target_device_count integer default 0 not null,
    status text default 'queued'::text not null,
    test_mode boolean default false not null,
    onesignal_response jsonb default '{}'::jsonb not null,
    error_message text,
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default now() not null,
    completed_at timestamp with time zone
);

create table if not exists public.ai_interactions (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    task text not null,
    input_summary text,
    result jsonb,
    provider text,
    model text,
    created_at timestamp with time zone default now() not null
);

create table if not exists public.ai_profile_reviews (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    status text default 'pending'::text not null,
    score numeric,
    photo_origin text,
    summary text,
    flags text[] default '{}'::text[] not null,
    provider text,
    model text,
    raw_result jsonb,
    error_message text,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.app_config (
    key text not null,
    value jsonb not null,
    description text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.boosts (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    type text,
    expires_at timestamp with time zone not null,
    multiplier numeric(3,1) default 2.0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.confession_claims (
    id uuid default gen_random_uuid() not null,
    confession_id uuid not null,
    claimer_id uuid not null,
    created_at timestamp with time zone default now()
);

create table if not exists public.confession_comments (
    id uuid default gen_random_uuid() not null,
    confession_id uuid not null,
    user_id uuid not null,
    content text not null,
    created_at timestamp with time zone default now()
);

create table if not exists public.confession_reactions (
    id uuid default gen_random_uuid() not null,
    confession_id uuid not null,
    user_id uuid not null,
    emoji text not null,
    created_at timestamp with time zone default now()
);

create table if not exists public.confession_reports (
    id uuid default gen_random_uuid() not null,
    confession_id uuid not null,
    reporter_id uuid not null,
    reason text default 'inappropriate'::text not null,
    details text,
    status text default 'pending'::text not null,
    created_at timestamp with time zone default now()
);

create table if not exists public.confessions (
    id uuid default gen_random_uuid() not null,
    user_id uuid,
    content text not null,
    university text not null,
    likes integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    pulse_notified boolean default false,
    is_pinned boolean default false not null
);

create table if not exists public.conversations (
    id uuid default uuid_generate_v4() not null,
    participant_1 uuid not null,
    participant_2 uuid not null,
    last_message text default ''::text,
    last_message_at timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);

create table if not exists public.direct_snaps (
    id uuid default gen_random_uuid() not null,
    sender_id uuid,
    receiver_id uuid,
    media_url text not null,
    media_type text,
    status text default 'sent'::text,
    viewed_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

create table if not exists public.engagement_scores (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    score integer default 0,
    daily_streak integer default 0,
    last_login timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    last_swipe_at timestamp with time zone,
    streak_updated_at timestamp with time zone
);

create table if not exists public.entitlements (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    entitlement_key text not null,
    product_id text,
    source text not null,
    source_reference text not null,
    status text default 'active'::text not null,
    starts_at timestamp with time zone default now() not null,
    expires_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    revoked_at timestamp with time zone,
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.feed_impressions (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    entity_type text not null,
    entity_id uuid not null,
    first_seen_at timestamp with time zone default now() not null,
    last_seen_at timestamp with time zone default now() not null,
    seen_count integer default 1 not null,
    last_source text,
    last_engaged_at timestamp with time zone,
    metadata jsonb default '{}'::jsonb not null
);

create table if not exists public.gifts (
    id text not null,
    name text not null,
    emoji text,
    animation_type text,
    price numeric(10,2) not null,
    color text
);

create table if not exists public.matches (
    id uuid default gen_random_uuid() not null,
    user1_id uuid,
    user2_id uuid,
    user_ids uuid[] not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    vibe_score integer default 0,
    phone_shared boolean default false,
    disappearing_messages_seconds integer default 0 not null
);

create table if not exists public.messages (
    id uuid default uuid_generate_v4() not null,
    conversation_id uuid,
    sender_id uuid not null,
    content text not null,
    is_read boolean default false,
    created_at timestamp with time zone default now(),
    read_at timestamp with time zone,
    match_id uuid,
    type text default 'text'::text,
    metadata jsonb default '{}'::jsonb,
    expires_at timestamp with time zone
);

create table if not exists public.monetization_config (
    key text not null,
    value jsonb not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.notifications (
    id uuid default gen_random_uuid() not null,
    recipient_id uuid,
    sender_id uuid,
    type text not null,
    title text,
    content text,
    metadata jsonb default '{}'::jsonb,
    is_read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid,
    actor_id uuid,
    category text,
    entity_type text,
    entity_id uuid,
    parent_entity_id uuid,
    conversation_id uuid,
    match_id uuid,
    deep_link text,
    priority text default 'normal'::text,
    group_key text,
    dedupe_key text,
    queued_at timestamp with time zone,
    sent_at timestamp with time zone,
    delivered_at timestamp with time zone,
    opened_at timestamp with time zone,
    read_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    failed_at timestamp with time zone,
    failure_reason text,
    retry_count integer default 0 not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.paid_products (
    product_id text not null,
    display_name text not null,
    product_type text not null,
    provider text default 'paystack'::text not null,
    provider_product_id text,
    amount numeric(12,2) not null,
    currency text default 'NGN'::text not null,
    billing_interval text,
    duration_days integer,
    wallet_credit_amount numeric(12,2),
    entitlements jsonb default '[]'::jsonb not null,
    platforms text[] default ARRAY['web'::text] not null,
    is_active boolean default true not null,
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.payment_attempts (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    product_id text not null,
    provider text not null,
    provider_reference text not null,
    provider_authorization_url text,
    expected_amount numeric(12,2) not null,
    currency text default 'NGN'::text not null,
    status text default 'pending'::text not null,
    provider_status text,
    provider_response jsonb default '{}'::jsonb not null,
    metadata jsonb default '{}'::jsonb not null,
    expires_at timestamp with time zone default (now() + '01:00:00'::interval) not null,
    verified_at timestamp with time zone,
    processed_at timestamp with time zone,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.payment_audit_logs (
    id uuid default gen_random_uuid() not null,
    actor_user_id uuid,
    action text not null,
    provider text,
    provider_reference text,
    product_id text,
    result text not null,
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default now() not null
);

create table if not exists public.payout_details (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    bank_name text,
    account_number text,
    account_name text,
    paypal_email text,
    preferred_method text default 'bank'::text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.profile_views (
    id uuid default gen_random_uuid() not null,
    viewer_id uuid,
    profile_owner_id uuid,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    source text default 'discovery'::text
);

create table if not exists public.profiles (
    id uuid not null,
    email text not null,
    full_name text not null,
    gender text default 'male'::text not null,
    age integer default 19 not null,
    university text default 'Campus'::text not null,
    bio text default ''::text,
    phone text default ''::text,
    avatar_url text default ''::text,
    photos text[] default '{}'::text[],
    role text default 'Male'::text not null,
    is_verified boolean default false,
    is_blocked boolean default false,
    free_swipes_remaining integer default 3,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    status_text text,
    status_updated_at timestamp with time zone,
    referral_code text,
    coins integer default 0,
    is_online boolean default false,
    last_seen timestamp with time zone default now(),
    referred_by uuid,
    free_swipes integer default 0,
    last_seen_at timestamp with time zone,
    match_notifications boolean default true,
    email_notifications boolean default true,
    push_notifications boolean default true,
    show_online_status boolean default true,
    incognito_mode boolean default false,
    voice_intro_url text,
    anthem text,
    location_status text,
    faculty text,
    department text,
    level text,
    genotype text,
    mbti text,
    attraction_goal text,
    onesignal_id text,
    streak_freeze_count integer default 0,
    current_badge text default 'Campus Newbie'::text,
    username text,
    completion_score integer default 0,
    is_optimised boolean default false,
    interests jsonb default '[]'::jsonb,
    intro_prompt text,
    profile_photos text[] default '{}'::text[],
    is_live boolean default false,
    interest_gender text default 'All'::text,
    photo_updated_at timestamp with time zone,
    is_banned boolean default false,
    is_shadow_banned boolean default false,
    call_minutes_today integer default 0,
    last_call_reset_at timestamp with time zone default now(),
    is_premium boolean default false,
    view_notifications boolean default true,
    confession_notifications boolean default true,
    sound_enabled boolean default true,
    is_onboarded boolean default false,
    premium_expires_at timestamp with time zone,
    last_active timestamp with time zone,
    ai_verification_status text default 'not_started'::text not null,
    ai_verification_score numeric,
    ai_photo_origin text,
    ai_reviewed_at timestamp with time zone,
    ai_review_summary text,
    ai_review_flags text[] default '{}'::text[] not null,
    message_notifications boolean default true not null,
    request_notifications boolean default true not null,
    profile_activity_notifications boolean default true not null,
    social_notifications boolean default true not null,
    vibration_enabled boolean default true not null,
    message_previews_enabled boolean default true not null,
    quiet_hours_enabled boolean default false not null,
    quiet_hours_start time without time zone default '22:00:00'::time without time zone not null,
    quiet_hours_end time without time zone default '07:00:00'::time without time zone not null,
    marketing_notifications boolean default true not null,
    push_token text
);

create table if not exists public.promo_codes (
    id uuid default gen_random_uuid() not null,
    code text not null,
    discount_percent integer default 10 not null,
    max_uses integer default 100 not null,
    uses_count integer default 0 not null,
    expires_at timestamp with time zone,
    is_active boolean default true not null,
    created_by uuid,
    created_at timestamp with time zone default now()
);

create table if not exists public.provider_webhook_events (
    id uuid default gen_random_uuid() not null,
    provider text not null,
    provider_event_id text not null,
    event_type text,
    provider_reference text,
    payload_hash text not null,
    payload jsonb default '{}'::jsonb not null,
    processing_status text default 'received'::text not null,
    failure_reason text,
    received_at timestamp with time zone default now() not null,
    processed_at timestamp with time zone
);

create table if not exists public.referrals (
    id uuid default uuid_generate_v4() not null,
    referrer_id uuid,
    referred_id uuid,
    status text default 'pending'::text,
    created_at timestamp with time zone default now(),
    rewarded_at timestamp with time zone
);

create table if not exists public.reports (
    id uuid default uuid_generate_v4() not null,
    reporter_id uuid not null,
    reported_id uuid not null,
    reason text not null,
    description text default ''::text,
    status text default 'pending'::text,
    created_at timestamp with time zone default now()
);

create table if not exists public.snapshots (
    id uuid default uuid_generate_v4() not null,
    user_id uuid,
    media_url text not null,
    media_type text default 'image'::text,
    caption text,
    created_at timestamp with time zone default now(),
    expires_at timestamp with time zone default (now() + '24:00:00'::interval),
    description text,
    likes integer default 0,
    likes_count integer default 0 not null,
    is_hidden boolean default false not null
);

create table if not exists public.status_updates (
    id uuid default gen_random_uuid() not null,
    user_id uuid,
    media_url text not null,
    media_type text,
    caption text,
    expires_at timestamp with time zone default (now() + '24:00:00'::interval),
    created_at timestamp with time zone default now()
);

create table if not exists public.status_views (
    id uuid default gen_random_uuid() not null,
    status_id uuid,
    viewer_id uuid,
    viewed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.statuses (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    media_url text not null,
    caption text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.subscriptions (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    plan_type text default 'Free'::text,
    status text default 'active'::text,
    current_period_start timestamp with time zone default timezone('utc'::text, now()) not null,
    current_period_end timestamp with time zone,
    paystack_subscription_id text,
    paystack_customer_code text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.swipe_limits (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    swipes_used integer default 0,
    last_reset timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.swipe_payment_operations (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    client_operation_id text not null,
    swipe_id uuid,
    swiped_id uuid not null,
    swipe_type text not null,
    result jsonb,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.swipes (
    id uuid default uuid_generate_v4() not null,
    swiper_id uuid not null,
    swiped_id uuid not null,
    direction text not null,
    is_paid boolean default false,
    is_free boolean default false,
    transaction_id uuid,
    created_at timestamp with time zone default now(),
    type text default 'standard'::text,
    status text default 'pending'::text,
    amount numeric(12,2) default 500.00,
    is_priority boolean default false,
    message_teaser text
);

create table if not exists public.transactions (
    id uuid default uuid_generate_v4() not null,
    payer_id uuid not null,
    recipient_id uuid,
    amount numeric(12,2) not null,
    platform_fee numeric(12,2) default 0.00,
    recipient_earning numeric(12,2) default 0.00,
    type text not null,
    status text default 'pending'::text not null,
    flutterwave_ref text,
    flutterwave_tx_id text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now(),
    wallet_id uuid
);

create table if not exists public.user_notification_devices (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    platform text default 'web'::text not null,
    device_id text not null,
    onesignal_subscription_id text,
    push_token text,
    permission_status text default 'unknown'::text not null,
    app_version text,
    device_model text,
    last_seen_at timestamp with time zone default now() not null,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

create table if not exists public.user_settings (
    user_id uuid not null,
    email_notifications boolean default true,
    push_notifications boolean default true,
    match_notifications boolean default true,
    show_online_status boolean default true,
    incognito_mode boolean default false,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.wallet_ledger (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    wallet_id uuid,
    entry_type text not null,
    amount numeric(12,2) not null,
    currency text default 'NGN'::text not null,
    source text not null,
    source_reference text,
    status text default 'posted'::text not null,
    balance_before numeric(12,2),
    balance_after numeric(12,2),
    metadata jsonb default '{}'::jsonb not null,
    created_at timestamp with time zone default now() not null
);

create table if not exists public.wallet_transactions (
    id uuid default gen_random_uuid() not null,
    user_id uuid,
    wallet_id uuid,
    type text,
    amount numeric(12,2) not null,
    status text default 'pending'::text,
    reference_id text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    payment_method text default 'paystack'::text,
    gateway_response jsonb,
    unlocks_at timestamp with time zone
);

create table if not exists public.wallets (
    id uuid default uuid_generate_v4() not null,
    user_id uuid not null,
    available_balance numeric(12,2) default 0.00,
    total_earned numeric(12,2) default 0.00,
    total_withdrawn numeric(12,2) default 0.00,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    total_spent numeric(12,2) default 0.00,
    pending_maturity_date timestamp with time zone,
    pending_balance numeric(12,2) default 0.00
);

create table if not exists public.withdrawal_requests (
    id uuid default uuid_generate_v4() not null,
    user_id uuid not null,
    amount numeric(12,2) not null,
    bank_name text not null,
    account_number text not null,
    account_name text not null,
    status text default 'pending'::text not null,
    admin_note text default ''::text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone default now()
);

create table if not exists public.withdrawals (
    id uuid default gen_random_uuid() not null,
    user_id uuid,
    amount numeric(12,2) not null,
    type text,
    status text default 'pending'::text,
    bank_details jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    processed_at timestamp with time zone,
    processed_by uuid,
    admin_note text,
    rejection_reason text
);
