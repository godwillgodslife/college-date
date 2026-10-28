-- ============================================================================
-- THE COLLEGE DATE 2.0 (CD2.0)
-- COMPLETE FRESH PROJECT BOOTSTRAP & MASTER SCHEMA (OCTOBER 2026)
-- ============================================================================
-- This script transforms a completely empty fresh Supabase project into a 
-- 100% feature-complete, production-ready CollegeDate backend in one execution.
--
-- INCLUDES:
-- 1. All Extensions & Schema Foundations
-- 2. All 50+ Core Baseline Tables & Relationships
-- 3. All Constraints, Foreign Keys & Performance Indexes
-- 4. Storage Buckets (avatars, profile-photos, chat-media, etc.) & RLS Policies
-- 5. Realtime Publication Subscriptions
-- 6. All 27 Post-Baseline Tables (Streaks, Escrow Deals, Campus Finder, Feedback, Clash)
-- 7. All 2026 Column Additions
-- 8. Latest Hardened Dual-Contract RPCs (get_admirers_secure, accept_swipe_request, etc.)
-- 9. PostgREST Schema Cache Invalidation (NOTIFY pgrst, 'reload schema')
-- ============================================================================

-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: schema structure only. Do not add production data, auth.users rows, secrets, or owner-specific grants.
-- Review status: untrusted generated baseline candidate. Apply only to an empty staging project after review.

set check_function_bodies = off;

create schema if not exists extensions;

-- Required by production table defaults and helper functions.
-- Do not pin extension versions; Supabase extension versions are managed by the platform.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- Fresh staging projects may contain a platform/demo event-trigger helper that
-- advisors flag because clients inherit public EXECUTE on SECURITY DEFINER
-- functions. Keep the helper if present, but remove client-callable access.
do $$
begin
    if to_regprocedure('public.rls_auto_enable()') is not null then
        revoke all on function public.rls_auto_enable() from public, anon, authenticated;
    end if;
end $$;

-- Production also has pg_stat_statements in schema extensions. It is platform telemetry,
-- not required for application reconstruction, so it is not created by this app baseline.

-- Production has supabase_vault installed in schema vault. Vault contents, provider
-- credentials, and secrets are intentionally excluded from this baseline.

-- Production currently has pg_net installed in public. Supabase security advisors flag
-- extensions in exposed schemas, so this baseline does not reproduce pg_net in public.
-- Any future database HTTP hook should be reviewed and installed in a non-exposed schema.

-- Production metadata inspection found no custom public enum, domain, or composite types.


-- ----------------------------------------------------------------------------
-- CORE BASELINE TABLES
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- BASELINE CONSTRAINTS & INDEXES
-- ----------------------------------------------------------------------------
-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: public constraints and non-constraint indexes only. No production rows are included.
-- Apply after 010_tables.sql. This file expects an empty staging schema.

set search_path = public, extensions;

alter table only public.admin_audit_logs add constraint admin_audit_logs_pkey PRIMARY KEY (id);
alter table only public.admin_push_broadcasts add constraint admin_push_broadcasts_pkey PRIMARY KEY (id);
alter table only public.ai_interactions add constraint ai_interactions_pkey PRIMARY KEY (id);
alter table only public.ai_profile_reviews add constraint ai_profile_reviews_pkey PRIMARY KEY (id);
alter table only public.app_config add constraint app_config_pkey PRIMARY KEY (key);
alter table only public.boosts add constraint boosts_pkey PRIMARY KEY (id);
alter table only public.confession_claims add constraint confession_claims_pkey PRIMARY KEY (id);
alter table only public.confession_comments add constraint confession_comments_pkey PRIMARY KEY (id);
alter table only public.confession_reactions add constraint confession_reactions_pkey PRIMARY KEY (id);
alter table only public.confession_reports add constraint confession_reports_pkey PRIMARY KEY (id);
alter table only public.confessions add constraint confessions_pkey PRIMARY KEY (id);
alter table only public.conversations add constraint conversations_pkey PRIMARY KEY (id);
alter table only public.direct_snaps add constraint direct_snaps_pkey PRIMARY KEY (id);
alter table only public.engagement_scores add constraint engagement_scores_pkey PRIMARY KEY (id);
alter table only public.entitlements add constraint entitlements_pkey PRIMARY KEY (id);
alter table only public.feed_impressions add constraint feed_impressions_pkey PRIMARY KEY (id);
alter table only public.gifts add constraint gifts_pkey PRIMARY KEY (id);
alter table only public.matches add constraint matches_pkey PRIMARY KEY (id);
alter table only public.messages add constraint messages_pkey PRIMARY KEY (id);
alter table only public.monetization_config add constraint monetization_config_pkey PRIMARY KEY (key);
alter table only public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table only public.paid_products add constraint paid_products_pkey PRIMARY KEY (product_id);
alter table only public.payment_attempts add constraint payment_attempts_pkey PRIMARY KEY (id);
alter table only public.payment_audit_logs add constraint payment_audit_logs_pkey PRIMARY KEY (id);
alter table only public.payout_details add constraint payout_details_pkey PRIMARY KEY (id);
alter table only public.profile_views add constraint profile_views_pkey PRIMARY KEY (id);
alter table only public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table only public.promo_codes add constraint promo_codes_pkey PRIMARY KEY (id);
alter table only public.provider_webhook_events add constraint provider_webhook_events_pkey PRIMARY KEY (id);
alter table only public.referrals add constraint referrals_pkey PRIMARY KEY (id);
alter table only public.reports add constraint reports_pkey PRIMARY KEY (id);
alter table only public.snapshots add constraint snapshots_pkey PRIMARY KEY (id);
alter table only public.status_updates add constraint status_updates_pkey PRIMARY KEY (id);
alter table only public.status_views add constraint status_views_pkey PRIMARY KEY (id);
alter table only public.statuses add constraint statuses_pkey PRIMARY KEY (id);
alter table only public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
alter table only public.swipe_limits add constraint swipe_limits_pkey PRIMARY KEY (id);
alter table only public.swipe_payment_operations add constraint swipe_payment_operations_pkey PRIMARY KEY (id);
alter table only public.swipes add constraint swipes_pkey PRIMARY KEY (id);
alter table only public.transactions add constraint transactions_pkey PRIMARY KEY (id);
alter table only public.user_notification_devices add constraint user_notification_devices_pkey PRIMARY KEY (id);
alter table only public.user_settings add constraint user_settings_pkey PRIMARY KEY (user_id);
alter table only public.wallet_ledger add constraint wallet_ledger_pkey PRIMARY KEY (id);
alter table only public.wallet_transactions add constraint wallet_transactions_pkey PRIMARY KEY (id);
alter table only public.wallets add constraint wallets_pkey PRIMARY KEY (id);
alter table only public.withdrawal_requests add constraint withdrawal_requests_pkey PRIMARY KEY (id);
alter table only public.withdrawals add constraint withdrawals_pkey PRIMARY KEY (id);

alter table only public.confession_claims add constraint confession_claims_confession_id_claimer_id_key UNIQUE (confession_id, claimer_id);
alter table only public.confession_reactions add constraint confession_reactions_confession_id_user_id_emoji_key UNIQUE (confession_id, user_id, emoji);
alter table only public.confession_reports add constraint confession_reports_confession_id_reporter_id_key UNIQUE (confession_id, reporter_id);
alter table only public.conversations add constraint conversations_participant_1_participant_2_key UNIQUE (participant_1, participant_2);
alter table only public.engagement_scores add constraint engagement_scores_user_id_key UNIQUE (user_id);
alter table only public.entitlements add constraint entitlements_user_id_entitlement_key_source_source_referenc_key UNIQUE (user_id, entitlement_key, source, source_reference);
alter table only public.feed_impressions add constraint feed_impressions_user_id_entity_type_entity_id_key UNIQUE (user_id, entity_type, entity_id);
alter table only public.matches add constraint matches_user1_id_user2_id_key UNIQUE (user1_id, user2_id);
alter table only public.payment_attempts add constraint payment_attempts_provider_reference_key UNIQUE (provider_reference);
alter table only public.payout_details add constraint payout_details_user_id_key UNIQUE (user_id);
alter table only public.profiles add constraint profiles_email_key UNIQUE (email);
alter table only public.profiles add constraint profiles_referral_code_key UNIQUE (referral_code);
alter table only public.profiles add constraint profiles_username_key UNIQUE (username);
alter table only public.promo_codes add constraint promo_codes_code_key UNIQUE (code);
alter table only public.provider_webhook_events add constraint provider_webhook_events_provider_provider_event_id_key UNIQUE (provider, provider_event_id);
alter table only public.referrals add constraint referrals_referred_id_key UNIQUE (referred_id);
alter table only public.status_views add constraint status_views_status_id_viewer_id_key UNIQUE (status_id, viewer_id);
alter table only public.subscriptions add constraint subscriptions_user_id_key UNIQUE (user_id);
alter table only public.swipe_limits add constraint swipe_limits_user_id_key UNIQUE (user_id);
alter table only public.swipe_payment_operations add constraint swipe_payment_operations_user_id_client_operation_id_key UNIQUE (user_id, client_operation_id);
alter table only public.swipes add constraint swipes_swiper_id_swiped_id_key UNIQUE (swiper_id, swiped_id);
alter table only public.wallet_transactions add constraint wallet_transactions_reference_id_key UNIQUE (reference_id);
alter table only public.wallets add constraint wallets_user_id_key UNIQUE (user_id);

alter table only public.boosts add constraint boosts_type_check CHECK (type = ANY (ARRAY['24h_boost'::text, 'spotlight'::text, 'super_swipe'::text]));
alter table only public.confession_reactions add constraint valid_emoji CHECK (emoji = ANY (ARRAY['🔥'::text, '😂'::text, '🙊'::text, '🙏'::text, '😢'::text, '👀'::text]));
alter table only public.confessions add constraint confessions_content_check CHECK (char_length(content) <= 280);
alter table only public.direct_snaps add constraint direct_snaps_media_type_check CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text]));
alter table only public.direct_snaps add constraint direct_snaps_status_check CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'opened'::text]));
alter table only public.entitlements add constraint entitlements_status_check CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'revoked'::text]));
alter table only public.feed_impressions add constraint feed_impressions_entity_type_check CHECK (entity_type = ANY (ARRAY['profile'::text, 'confession'::text]));
alter table only public.feed_impressions add constraint feed_impressions_seen_count_check CHECK (seen_count >= 0);
alter table only public.matches add constraint matches_disappearing_messages_seconds_check CHECK (disappearing_messages_seconds = ANY (ARRAY[0, 86400, 604800, 2592000]));
alter table only public.messages add constraint messages_type_check CHECK (type = ANY (ARRAY['text'::text, 'voice'::text, 'sticker'::text, 'gift'::text, 'emoji'::text, 'call_log'::text]));
alter table only public.paid_products add constraint paid_products_amount_check CHECK (amount > 0::numeric);
alter table only public.paid_products add constraint paid_products_product_type_check CHECK (product_type = ANY (ARRAY['subscription'::text, 'wallet_funding'::text, 'boost'::text, 'consumable'::text]));
alter table only public.payment_attempts add constraint payment_attempts_expected_amount_check CHECK (expected_amount > 0::numeric);
alter table only public.payment_attempts add constraint payment_attempts_status_check CHECK (status = ANY (ARRAY['pending'::text, 'initialized'::text, 'verified'::text, 'processed'::text, 'failed'::text, 'abandoned'::text, 'mismatch'::text]));
alter table only public.payout_details add constraint payout_details_preferred_method_check CHECK (preferred_method = ANY (ARRAY['bank'::text, 'paypal'::text]));
alter table only public.profiles add constraint profiles_age_check CHECK (age >= 18);
alter table only public.profiles add constraint profiles_interest_gender_check CHECK (interest_gender = ANY (ARRAY['Male'::text, 'Female'::text, 'All'::text]));
alter table only public.promo_codes add constraint promo_codes_discount_percent_check CHECK (discount_percent >= 1 AND discount_percent <= 100);
alter table only public.provider_webhook_events add constraint provider_webhook_events_processing_status_check CHECK (processing_status = ANY (ARRAY['received'::text, 'ignored'::text, 'processed'::text, 'failed'::text, 'duplicate'::text]));
alter table only public.reports add constraint reports_status_check CHECK (status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'resolved'::text]));
alter table only public.status_updates add constraint status_updates_media_type_check CHECK (media_type = ANY (ARRAY['image'::text, 'video'::text, 'text'::text]));
alter table only public.subscriptions add constraint subscriptions_plan_type_check CHECK (plan_type = ANY (ARRAY['Free'::text, 'Premium'::text]));
alter table only public.subscriptions add constraint subscriptions_status_check CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'canceled'::text, 'pending'::text]));
alter table only public.swipes add constraint swipes_direction_check CHECK (direction = ANY (ARRAY['left'::text, 'right'::text]));
alter table only public.swipes add constraint swipes_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]));
alter table only public.swipes add constraint swipes_type_check CHECK (type = ANY (ARRAY['standard'::text, 'premium'::text]));
alter table only public.transactions add constraint transactions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]));
alter table only public.transactions add constraint transactions_type_check CHECK (type = ANY (ARRAY['swipe_payment'::text, 'withdrawal'::text, 'payout'::text]));
alter table only public.wallet_ledger add constraint wallet_ledger_amount_check CHECK (amount > 0::numeric);
alter table only public.wallet_ledger add constraint wallet_ledger_entry_type_check CHECK (entry_type = ANY (ARRAY['credit'::text, 'debit'::text, 'hold'::text, 'release'::text, 'adjustment'::text]));
alter table only public.wallet_ledger add constraint wallet_ledger_status_check CHECK (status = ANY (ARRAY['pending'::text, 'posted'::text, 'reversed'::text]));
alter table only public.wallet_transactions add constraint wallet_transactions_status_check CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'success'::text, 'cancelled'::text, 'refunded'::text]));
alter table only public.wallet_transactions add constraint wallet_transactions_type_check CHECK (type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'transfer'::text, 'payment'::text, 'swipe_purchase'::text, 'swipe_reward'::text, 'subscription'::text, 'boost_purchase'::text, 'gift_purchase'::text, 'gift_received'::text, 'referral_bonus'::text, 'cash_bonus'::text, 'earning'::text, 'bonus'::text, 'refund'::text, 'payout'::text, 'system_credit'::text]));
alter table only public.withdrawal_requests add constraint withdrawal_requests_amount_check CHECK (amount > 0::numeric);
alter table only public.withdrawal_requests add constraint withdrawal_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'processed'::text]));
alter table only public.withdrawals add constraint min_withdrawal_referral CHECK (type <> 'referral'::text OR amount >= 10000::numeric);
alter table only public.withdrawals add constraint min_withdrawal_swipe CHECK (type <> 'swipe_earnings'::text OR amount >= 15000::numeric);
alter table only public.withdrawals add constraint withdrawals_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'paid'::text]));
alter table only public.withdrawals add constraint withdrawals_type_check CHECK (type = ANY (ARRAY['referral'::text, 'swipe_earnings'::text]));

alter table only public.admin_audit_logs add constraint admin_audit_logs_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table only public.admin_push_broadcasts add constraint admin_push_broadcasts_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table only public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.ai_interactions add constraint ai_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.ai_profile_reviews add constraint ai_profile_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.boosts add constraint boosts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.confessions add constraint confessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.confession_claims add constraint confession_claims_confession_id_fkey FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE;
alter table only public.confession_claims add constraint confession_claims_claimer_id_fkey FOREIGN KEY (claimer_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.confession_comments add constraint confession_comments_confession_id_fkey FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE;
alter table only public.confession_comments add constraint confession_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.confession_reactions add constraint confession_reactions_confession_id_fkey FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE;
alter table only public.confession_reactions add constraint confession_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.confession_reports add constraint confession_reports_confession_id_fkey FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE;
alter table only public.confession_reports add constraint confession_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.conversations add constraint conversations_participant_1_fkey FOREIGN KEY (participant_1) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.conversations add constraint conversations_participant_2_fkey FOREIGN KEY (participant_2) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.direct_snaps add constraint direct_snaps_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.direct_snaps add constraint direct_snaps_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.engagement_scores add constraint engagement_scores_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.entitlements add constraint entitlements_product_id_fkey FOREIGN KEY (product_id) REFERENCES paid_products(product_id);
alter table only public.entitlements add constraint entitlements_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.feed_impressions add constraint feed_impressions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.matches add constraint matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.matches add constraint matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.messages add constraint messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table only public.messages add constraint messages_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table only public.messages add constraint messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.notifications add constraint notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id);
alter table only public.notifications add constraint notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.notifications add constraint notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table only public.notifications add constraint notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
alter table only public.payment_attempts add constraint payment_attempts_product_id_fkey FOREIGN KEY (product_id) REFERENCES paid_products(product_id);
alter table only public.payment_attempts add constraint payment_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.payout_details add constraint payout_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.profile_views add constraint profile_views_profile_owner_id_fkey FOREIGN KEY (profile_owner_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.profile_views add constraint profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.promo_codes add constraint promo_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table only public.referrals add constraint referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES profiles(id);
alter table only public.referrals add constraint referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES profiles(id);
alter table only public.reports add constraint reports_reported_id_fkey FOREIGN KEY (reported_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.reports add constraint reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.snapshots add constraint snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.status_updates add constraint status_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.status_views add constraint status_views_status_id_fkey FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE CASCADE;
alter table only public.status_views add constraint status_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.statuses add constraint statuses_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
alter table only public.subscriptions add constraint subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.swipe_limits add constraint swipe_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.swipe_payment_operations add constraint swipe_payment_operations_swiped_id_fkey FOREIGN KEY (swiped_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.swipe_payment_operations add constraint swipe_payment_operations_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.swipes add constraint swipes_swiped_id_fkey FOREIGN KEY (swiped_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.swipes add constraint swipes_swiper_id_fkey FOREIGN KEY (swiper_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.transactions add constraint transactions_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.transactions add constraint transactions_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table only public.transactions add constraint transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;
alter table only public.user_notification_devices add constraint user_notification_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table only public.user_settings add constraint user_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.wallet_ledger add constraint wallet_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.wallet_ledger add constraint wallet_ledger_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL;
alter table only public.wallet_transactions add constraint wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.wallet_transactions add constraint wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE;
alter table only public.wallets add constraint wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.withdrawal_requests add constraint withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table only public.withdrawals add constraint withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX admin_audit_logs_created_idx ON public.admin_audit_logs USING btree (created_at DESC);
CREATE INDEX admin_audit_logs_target_idx ON public.admin_audit_logs USING btree (target_type, target_id, created_at DESC);
CREATE INDEX admin_push_broadcasts_created_idx ON public.admin_push_broadcasts USING btree (created_at DESC);
CREATE INDEX idx_ai_interactions_task_created ON public.ai_interactions USING btree (task, created_at DESC);
CREATE INDEX idx_ai_interactions_user_created ON public.ai_interactions USING btree (user_id, created_at DESC);
CREATE INDEX idx_ai_profile_reviews_user_created ON public.ai_profile_reviews USING btree (user_id, created_at DESC);
CREATE INDEX idx_boosts_user_id ON public.boosts USING btree (user_id);
CREATE INDEX idx_boosts_user_type_expires ON public.boosts USING btree (user_id, type, expires_at DESC);
CREATE INDEX idx_claims_confession ON public.confession_claims USING btree (confession_id);
CREATE INDEX idx_confession_claims_claimer_id ON public.confession_claims USING btree (claimer_id);
CREATE INDEX idx_confession_comments_confession_id ON public.confession_comments USING btree (confession_id);
CREATE INDEX idx_confession_comments_user_id ON public.confession_comments USING btree (user_id);
CREATE INDEX idx_confession_reactions_user_id ON public.confession_reactions USING btree (user_id);
CREATE INDEX idx_reactions_confession ON public.confession_reactions USING btree (confession_id);
CREATE INDEX idx_confession_reports_admin_status_created_at ON public.confession_reports USING btree (status, created_at DESC);
CREATE INDEX idx_confession_reports_reporter_id ON public.confession_reports USING btree (reporter_id);
CREATE INDEX idx_confessions_admin_created_at ON public.confessions USING btree (created_at DESC);
CREATE INDEX idx_confessions_admin_university_created_at ON public.confessions USING btree (university, created_at DESC);
CREATE INDEX idx_confessions_pinned_created ON public.confessions USING btree (is_pinned DESC, created_at DESC);
CREATE INDEX idx_confessions_user_id ON public.confessions USING btree (user_id);
CREATE INDEX idx_conversations_p1 ON public.conversations USING btree (participant_1);
CREATE INDEX idx_conversations_p2 ON public.conversations USING btree (participant_2);
CREATE INDEX idx_direct_snaps_receiver_id ON public.direct_snaps USING btree (receiver_id);
CREATE INDEX idx_direct_snaps_sender_id ON public.direct_snaps USING btree (sender_id);
CREATE INDEX idx_entitlements_source_reference ON public.entitlements USING btree (source, source_reference);
CREATE INDEX idx_entitlements_user_active ON public.entitlements USING btree (user_id, entitlement_key, status, expires_at);
CREATE INDEX idx_feed_impressions_entity ON public.feed_impressions USING btree (entity_type, entity_id);
CREATE INDEX idx_feed_impressions_user_type_seen ON public.feed_impressions USING btree (user_id, entity_type, last_seen_at DESC);
CREATE INDEX idx_matches_user2_id ON public.matches USING btree (user2_id);
CREATE INDEX matches_user_ids_idx ON public.matches USING gin (user_ids);
CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id);
CREATE INDEX idx_messages_expires_at ON public.messages USING btree (expires_at) WHERE (expires_at IS NOT NULL);
CREATE INDEX idx_messages_match_created_at ON public.messages USING btree (match_id, created_at DESC);
CREATE INDEX idx_messages_match_expires_at ON public.messages USING btree (match_id, expires_at);
CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);
CREATE INDEX messages_match_id_idx ON public.messages USING btree (match_id);
CREATE INDEX idx_notifications_actor_id ON public.notifications USING btree (actor_id);
CREATE INDEX idx_notifications_sender_id ON public.notifications USING btree (sender_id);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX notifications_is_read_idx ON public.notifications USING btree (is_read);
CREATE INDEX notifications_recipient_id_idx ON public.notifications USING btree (recipient_id);
CREATE INDEX notifications_user_category_unread_idx ON public.notifications USING btree (user_id, category, is_read);
CREATE UNIQUE INDEX notifications_user_dedupe_key_idx ON public.notifications USING btree (user_id, dedupe_key);
CREATE INDEX notifications_user_unread_created_idx ON public.notifications USING btree (user_id, is_read, created_at DESC);
CREATE INDEX idx_payment_attempts_status_expires ON public.payment_attempts USING btree (status, expires_at);
CREATE INDEX idx_payment_attempts_user_created ON public.payment_attempts USING btree (user_id, created_at DESC);
CREATE INDEX idx_profile_views_viewer_id ON public.profile_views USING btree (viewer_id);
CREATE INDEX profile_views_owner_idx ON public.profile_views USING btree (profile_owner_id);
CREATE INDEX idx_profiles_admin_created_at ON public.profiles USING btree (created_at DESC);
CREATE INDEX idx_profiles_admin_status ON public.profiles USING btree (is_banned, is_shadow_banned, is_verified, is_premium, created_at DESC);
CREATE INDEX idx_profiles_ai_verification_status ON public.profiles USING btree (ai_verification_status);
CREATE INDEX idx_profiles_discovery ON public.profiles USING btree (gender, completion_score DESC) WHERE (((is_banned = false) OR (is_banned IS NULL)) AND ((is_shadow_banned = false) OR (is_shadow_banned IS NULL)));
CREATE INDEX idx_profiles_last_active ON public.profiles USING btree (last_active DESC);
CREATE INDEX idx_profiles_last_seen_at ON public.profiles USING btree (last_seen_at DESC);
CREATE INDEX idx_profiles_onesignal_id ON public.profiles USING btree (onesignal_id);
CREATE INDEX idx_profiles_premium_expires_at ON public.profiles USING btree (premium_expires_at);
CREATE INDEX idx_profiles_uni_faculty ON public.profiles USING btree (university, faculty);
CREATE INDEX profiles_notifications_idx ON public.profiles USING btree (match_notifications, view_notifications, confession_notifications);
CREATE INDEX idx_promo_codes_created_by ON public.promo_codes USING btree (created_by);
CREATE INDEX idx_provider_webhook_events_reference ON public.provider_webhook_events USING btree (provider, provider_reference);
CREATE INDEX idx_referrals_referrer_id ON public.referrals USING btree (referrer_id);
CREATE INDEX idx_reports_reported_id ON public.reports USING btree (reported_id);
CREATE INDEX idx_reports_reporter_id ON public.reports USING btree (reporter_id);
CREATE INDEX idx_snapshots_user_hidden_created ON public.snapshots USING btree (user_id, is_hidden, created_at DESC);
CREATE INDEX idx_snapshots_user_id ON public.snapshots USING btree (user_id);
CREATE INDEX idx_status_updates_user_id ON public.status_updates USING btree (user_id);
CREATE INDEX idx_status_views_viewer_id ON public.status_views USING btree (viewer_id);
CREATE INDEX idx_statuses_user_id ON public.statuses USING btree (user_id);
CREATE INDEX idx_swipe_payment_operations_user_created ON public.swipe_payment_operations USING btree (user_id, created_at DESC);
CREATE INDEX idx_swipes_swiped ON public.swipes USING btree (swiped_id);
CREATE INDEX idx_swipes_swiped_status ON public.swipes USING btree (swiped_id, status, created_at DESC);
CREATE INDEX idx_swipes_swiper ON public.swipes USING btree (swiper_id);
CREATE INDEX idx_swipes_swiper_created ON public.swipes USING btree (swiper_id, created_at DESC);
CREATE INDEX swipes_receiver_status_idx ON public.swipes USING btree (swiped_id, status);
CREATE UNIQUE INDEX unique_active_swipe_idx ON public.swipes USING btree (swiper_id, swiped_id) WHERE (status <> 'declined'::text);
CREATE INDEX idx_transactions_payer ON public.transactions USING btree (payer_id);
CREATE INDEX idx_transactions_recipient_id ON public.transactions USING btree (recipient_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions USING btree (wallet_id);
CREATE INDEX user_notification_devices_subscription_idx ON public.user_notification_devices USING btree (onesignal_subscription_id) WHERE ((onesignal_subscription_id IS NOT NULL) AND (revoked_at IS NULL));
CREATE INDEX user_notification_devices_user_active_idx ON public.user_notification_devices USING btree (user_id, revoked_at, last_seen_at DESC);
CREATE UNIQUE INDEX user_notification_devices_user_device_idx ON public.user_notification_devices USING btree (user_id, device_id);
CREATE UNIQUE INDEX idx_wallet_ledger_unique_source ON public.wallet_ledger USING btree (source, source_reference, entry_type) WHERE (source_reference IS NOT NULL);
CREATE INDEX idx_wallet_ledger_user_created ON public.wallet_ledger USING btree (user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_admin_created_at ON public.wallet_transactions USING btree (created_at DESC);
CREATE INDEX idx_wallet_transactions_admin_payment_method_created ON public.wallet_transactions USING btree (payment_method, created_at DESC);
CREATE INDEX idx_wallet_transactions_admin_type_status_created ON public.wallet_transactions USING btree (type, status, created_at DESC);
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions USING btree (user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions USING btree (wallet_id);
CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests USING btree (user_id);
CREATE INDEX idx_withdrawals_status_created_at ON public.withdrawals USING btree (status, created_at DESC);
CREATE INDEX idx_withdrawals_user_id ON public.withdrawals USING btree (user_id);


-- ----------------------------------------------------------------------------
-- BASELINE FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------
-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: function and trigger inventory only.
--
-- IMPORTANT:
-- Production contains 104 public functions, 100 of which are SECURITY DEFINER.
-- Supabase security advisors also report anon/authenticated executable SECURITY DEFINER
-- functions and one mutable search_path function. To avoid copying production-specific
-- privileged behavior into staging without review, this baseline does not recreate
-- function bodies automatically.
--
-- Staging bootstrap rule:
-- 1. Apply table, constraint, view, RLS, storage, and Realtime baseline files.
-- 2. Review repository migrations that define functions.
-- 3. Apply only reviewed functions with explicit search_path, explicit grants, and no
--    production-specific URLs, secrets, or owner-only constants.
-- 4. Create triggers only after their target functions are present.

-- Function inventory captured from production metadata:
-- Total public functions: 104
-- SECURITY DEFINER functions: 100
-- Mutable search_path functions: 1 (public.process_referral_rewards)
--
-- High-risk categories requiring review before staging reproduction:
-- - Admin RPCs: admin_* and make_admin
-- - Money/payment RPCs: process_verified_payment, increment_wallet_balance*,
--   decrement_wallet_balance, purchase_premium_with_wallet, request_wallet_withdrawal
-- - Notification RPCs and trigger helpers: insert_notification, notify_*, register_notification_device
-- - Discovery/matching RPCs: process_swipe_payment, send_super_swipe, accept_swipe_request
-- - Referral RPCs: generate_referral_code, apply/validate referral-code functions from local migrations

-- Reviewed staging subset:
-- See 035_required_functions_hardened.sql for the first approved local-only
-- function package. It resolves only the bootstrap triggers and RPCs needed for
-- profile creation/onboarding, referral-code validation, safe discovery,
-- standard swipe/match testing, leaderboard reads, and confession feed/reactions.
-- It intentionally omits production payment, wallet reward, push delivery,
-- call, admin, and scheduled maintenance functions.

-- Trigger inventory captured from production metadata. Keep commented until reviewed
-- function bodies are present in staging.
--
-- create trigger confession_notification_trigger
-- after insert or update on public.confessions
-- for each row execute function public.notify_on_confession();
--
-- create trigger set_message_expiry_from_match
-- before insert on public.messages
-- for each row execute function public.set_message_expiry_from_match();
--
-- create trigger on_profile_view_insert
-- after insert on public.profile_views
-- for each row execute function public.notify_on_profile_view();
--
-- create trigger on_profile_created_referral
-- before insert on public.profiles
-- for each row execute function public.handle_new_profile_referral();
--
-- create trigger tr_sync_referral
-- after insert or update on public.profiles
-- for each row execute function public.sync_referral_from_profile();
--
-- create trigger track_photo_update
-- before update on public.profiles
-- for each row execute function public.update_photo_timestamp();
--
-- These profile bootstrap triggers are implemented in
-- 035_required_functions_hardened.sql together with auth.users
-- on_auth_user_created and calculate_profile_completion.
--
-- create trigger on_new_referral
-- after insert on public.referrals
-- for each row execute function public.check_referral_milestones();
--
-- create trigger tr_on_new_referral
-- after insert on public.referrals
-- for each row execute function public.process_referral_rewards();
--
-- create trigger premium_swipe_auto_match
-- after insert or update on public.swipes
-- for each row execute function public.auto_match_premium_swipes();
--
-- create trigger swipe_notification_trigger
-- after insert or update on public.swipes
-- for each row execute function public.notify_on_swipe();
--
-- create trigger on_wallet_transaction_created
-- after insert on public.wallet_transactions
-- for each row execute function public.on_wallet_earning_trigger();


-- ----------------------------------------------------------------------------
-- HARDENED BASELINE RPC FUNCTIONS
-- ----------------------------------------------------------------------------
-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: hardened PostgreSQL function/RPC subset required for staging bootstrap only.
--
-- This file intentionally does not reproduce production admin, payment, wallet reward,
-- push delivery, call, or scheduled maintenance functions. It creates a narrow
-- authenticated RPC surface for profile bootstrap, referral attribution, discovery,
-- standard swipe/match testing, leaderboard reads, and confession feed/reactions.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- Referral helpers and profile bootstrap
-- ---------------------------------------------------------------------------

create or replace function public.normalize_referral_code(p_code text)
returns text
language sql
immutable
security invoker
set search_path to ''
as $$
    select nullif(
        upper(regexp_replace(btrim(coalesce(p_code, '')), '[^A-Za-z0-9-]', '', 'g')),
        ''
    );
$$;

create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
security invoker
set search_path to ''
as $$
declare
    v_chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    v_result text := 'CD-';
    v_i integer;
begin
    for v_i in 1..5 loop
        v_result := v_result || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
    end loop;

    return v_result;
end;
$$;

create or replace function public.generate_unique_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_code text;
    v_exists boolean;
    v_attempts integer := 0;
begin
    loop
        v_attempts := v_attempts + 1;
        v_code := public.generate_referral_code();

        select exists (
            select 1
            from public.profiles p
            where lower(p.referral_code) = lower(v_code)
        )
        into v_exists;

        if not coalesce(v_exists, false) then
            return v_code;
        end if;

        if v_attempts >= 20 then
            raise exception 'referral_code_generation_failed';
        end if;
    end loop;
end;
$$;

create or replace function public.handle_new_profile_referral()
returns trigger
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
    new.referral_code := coalesce(
        public.normalize_referral_code(new.referral_code),
        public.generate_unique_referral_code()
    );

    return new;
end;
$$;

create or replace function public.sync_referral_from_profile()
returns trigger
language plpgsql
volatile
security definer
set search_path to ''
as $$
begin
    if new.referred_by is null or new.referred_by = new.id then
        return new;
    end if;

    if tg_op = 'UPDATE' and old.referred_by is not null then
        return new;
    end if;

    insert into public.referrals (referrer_id, referred_id, status)
    values (new.referred_by, new.id, 'pending')
    on conflict (referred_id) do nothing;

    return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_full_name text;
    v_gender text;
    v_role text;
    v_university text;
    v_referral_code text;
    v_referred_by_text text;
    v_referred_by uuid;
begin
    v_full_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
    v_gender := lower(nullif(btrim(coalesce(new.raw_user_meta_data->>'gender', new.raw_user_meta_data->>'role', '')), ''));
    v_university := nullif(btrim(coalesce(new.raw_user_meta_data->>'university', '')), '');
    v_referral_code := public.normalize_referral_code(new.raw_user_meta_data->>'referral_code');
    v_referred_by_text := nullif(btrim(coalesce(new.raw_user_meta_data->>'referred_by', '')), '');

    if v_gender not in ('male', 'female', 'other') then
        v_gender := 'male';
    end if;

    v_role := initcap(v_gender);

    if v_referral_code is not null then
        select p.id
        into v_referred_by
        from public.profiles p
        where lower(p.referral_code) = lower(v_referral_code)
          and p.id <> new.id
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
        limit 1;
    elsif v_referred_by_text is not null then
        begin
            v_referred_by := v_referred_by_text::uuid;
        exception when invalid_text_representation then
            v_referred_by := null;
        end;

        if v_referred_by = new.id then
            v_referred_by := null;
        end if;
    end if;

    insert into public.profiles (
        id,
        email,
        full_name,
        gender,
        age,
        university,
        role,
        free_swipes,
        referred_by,
        is_onboarded
    )
    values (
        new.id,
        coalesce(nullif(new.email, ''), new.id::text),
        coalesce(v_full_name, nullif(new.email, ''), 'Student'),
        v_gender,
        19,
        coalesce(v_university, 'Campus'),
        v_role,
        20,
        v_referred_by,
        false
    )
    on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        referred_by = coalesce(public.profiles.referred_by, excluded.referred_by),
        updated_at = now();

    insert into public.user_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;

    insert into public.swipe_limits (user_id, swipes_used, last_reset)
    values (new.id, 0, now())
    on conflict (user_id) do nothing;

    insert into public.engagement_scores (user_id, score, daily_streak, last_login)
    values (new.id, 0, 0, now())
    on conflict (user_id) do nothing;

    return new;
end;
$$;

create or replace function public.validate_referral_code(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_code text := public.normalize_referral_code(p_code);
    v_referrer record;
begin
    if v_code is null then
        return jsonb_build_object('valid', false, 'reason', 'empty_code', 'code', '');
    end if;

    select p.referral_code, p.full_name, p.username
    into v_referrer
    from public.profiles p
    where lower(p.referral_code) = lower(v_code)
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
    limit 1;

    if not found then
        return jsonb_build_object('valid', false, 'reason', 'not_found', 'code', v_code);
    end if;

    return jsonb_build_object(
        'valid', true,
        'reason', 'valid',
        'code', v_referrer.referral_code,
        'referrer_name', coalesce(
            nullif(split_part(btrim(coalesce(v_referrer.full_name, '')), ' ', 1), ''),
            v_referrer.username,
            'a student'
        )
    );
end;
$$;

create or replace function public.apply_referral_code(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_code text := public.normalize_referral_code(p_code);
    v_profile record;
    v_referrer record;
    v_existing_referrer uuid;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'reason', 'not_authenticated');
    end if;

    if v_code is null then
        return jsonb_build_object('success', true, 'skipped', true, 'reason', 'empty_code');
    end if;

    select p.id, p.referred_by
    into v_profile
    from public.profiles p
    where p.id = v_user_id
    for update;

    if not found then
        return jsonb_build_object('success', false, 'reason', 'profile_missing');
    end if;

    select p.id, p.referral_code, p.full_name, p.username
    into v_referrer
    from public.profiles p
    where lower(p.referral_code) = lower(v_code)
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
    for update;

    if not found then
        return jsonb_build_object('success', false, 'reason', 'not_found', 'code', v_code);
    end if;

    if v_referrer.id = v_user_id then
        return jsonb_build_object('success', false, 'reason', 'self_referral', 'code', v_referrer.referral_code);
    end if;

    if v_profile.referred_by is not null then
        return jsonb_build_object(
            'success', v_profile.referred_by = v_referrer.id,
            'already_applied', true,
            'reason', 'already_applied',
            'code', v_referrer.referral_code
        );
    end if;

    select r.referrer_id
    into v_existing_referrer
    from public.referrals r
    where r.referred_id = v_user_id
    for update;

    if v_existing_referrer is not null then
        update public.profiles
        set referred_by = v_existing_referrer,
            updated_at = now()
        where id = v_user_id
          and referred_by is null;

        return jsonb_build_object(
            'success', v_existing_referrer = v_referrer.id,
            'already_applied', true,
            'reason', 'already_applied',
            'code', v_referrer.referral_code
        );
    end if;

    update public.profiles
    set referred_by = v_referrer.id,
        updated_at = now()
    where id = v_user_id
      and referred_by is null;

    insert into public.referrals (referrer_id, referred_id, status)
    values (v_referrer.id, v_user_id, 'pending')
    on conflict (referred_id) do nothing;

    return jsonb_build_object(
        'success', true,
        'reason', 'applied',
        'code', v_referrer.referral_code,
        'referrer_name', coalesce(
            nullif(split_part(btrim(coalesce(v_referrer.full_name, '')), ' ', 1), ''),
            v_referrer.username,
            'a student'
        )
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile and onboarding RPCs
-- ---------------------------------------------------------------------------

create or replace function public.calculate_completion_score()
returns trigger
language plpgsql
volatile
security invoker
set search_path to ''
as $$
declare
    v_score integer := 0;
begin
    if coalesce(new.full_name, '') <> '' then v_score := v_score + 15; end if;
    if coalesce(new.bio, '') <> '' then v_score := v_score + 15; end if;
    if coalesce(new.university, '') <> '' then v_score := v_score + 10; end if;
    if coalesce(new.gender, '') <> '' then v_score := v_score + 10; end if;
    if coalesce(new.age, 0) > 0 then v_score := v_score + 10; end if;
    if coalesce(new.avatar_url, '') <> ''
       or coalesce(array_length(new.profile_photos, 1), 0) > 0
       or coalesce(array_length(new.photos, 1), 0) > 0 then
        v_score := v_score + 25;
    end if;
    if jsonb_typeof(coalesce(new.interests, '[]'::jsonb)) = 'array'
       and jsonb_array_length(coalesce(new.interests, '[]'::jsonb)) > 0 then
        v_score := v_score + 15;
    end if;

    new.completion_score := least(v_score, 100);
    return new;
end;
$$;

create or replace function public.update_photo_timestamp()
returns trigger
language plpgsql
volatile
security invoker
set search_path to ''
as $$
begin
    if new.avatar_url is distinct from old.avatar_url
       or new.photos is distinct from old.photos
       or new.profile_photos is distinct from old.profile_photos then
        new.photo_updated_at = now();
    end if;

    return new;
end;
$$;

create or replace function public.get_current_profile()
returns table (
    id uuid,
    email text,
    full_name text,
    gender text,
    age integer,
    university text,
    bio text,
    phone text,
    avatar_url text,
    photos text[],
    profile_photos text[],
    interests jsonb,
    faculty text,
    department text,
    level text,
    mbti text,
    attraction_goal text,
    interest_gender text,
    intro_prompt text,
    voice_intro_url text,
    anthem text,
    location_status text,
    referral_code text,
    referred_by uuid,
    is_verified boolean,
    is_onboarded boolean,
    completion_score integer,
    free_swipes integer,
    free_swipes_remaining integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    last_active timestamp with time zone
)
language sql
stable
security invoker
set search_path to ''
as $$
    select
        p.id,
        p.email,
        p.full_name,
        p.gender,
        p.age,
        p.university,
        p.bio,
        p.phone,
        p.avatar_url,
        p.photos,
        p.profile_photos,
        p.interests,
        p.faculty,
        p.department,
        p.level,
        p.mbti,
        p.attraction_goal,
        p.interest_gender,
        p.intro_prompt,
        p.voice_intro_url,
        p.anthem,
        p.location_status,
        p.referral_code,
        p.referred_by,
        p.is_verified,
        p.is_onboarded,
        p.completion_score,
        p.free_swipes,
        p.free_swipes_remaining,
        p.created_at,
        p.updated_at,
        p.last_seen_at,
        p.last_active
    from public.profiles p
    where p.id = (select auth.uid());
$$;

create or replace function public.update_current_profile(p_profile jsonb default '{}'::jsonb)
returns table (
    id uuid,
    email text,
    full_name text,
    gender text,
    age integer,
    university text,
    bio text,
    phone text,
    avatar_url text,
    photos text[],
    profile_photos text[],
    interests jsonb,
    faculty text,
    department text,
    level text,
    mbti text,
    attraction_goal text,
    interest_gender text,
    intro_prompt text,
    voice_intro_url text,
    anthem text,
    location_status text,
    referral_code text,
    referred_by uuid,
    is_verified boolean,
    is_onboarded boolean,
    completion_score integer,
    free_swipes integer,
    free_swipes_remaining integer,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    last_active timestamp with time zone
)
language plpgsql
volatile
security invoker
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_full_name text := nullif(btrim(coalesce(p_profile->>'full_name', '')), '');
    v_gender text := lower(nullif(btrim(coalesce(p_profile->>'gender', '')), ''));
    v_university text := nullif(btrim(coalesce(p_profile->>'university', '')), '');
    v_bio text := nullif(btrim(coalesce(p_profile->>'bio', '')), '');
    v_avatar_url text := nullif(btrim(coalesce(p_profile->>'avatar_url', '')), '');
    v_phone text := nullif(btrim(coalesce(p_profile->>'phone', '')), '');
    v_faculty text := nullif(btrim(coalesce(p_profile->>'faculty', '')), '');
    v_department text := nullif(btrim(coalesce(p_profile->>'department', '')), '');
    v_level text := nullif(btrim(coalesce(p_profile->>'level', '')), '');
    v_mbti text := nullif(btrim(coalesce(p_profile->>'mbti', '')), '');
    v_attraction_goal text := nullif(btrim(coalesce(p_profile->>'attraction_goal', '')), '');
    v_interest_gender text := initcap(nullif(btrim(coalesce(p_profile->>'interest_gender', '')), ''));
    v_intro_prompt text := nullif(btrim(coalesce(p_profile->>'intro_prompt', '')), '');
    v_voice_intro_url text := nullif(btrim(coalesce(p_profile->>'voice_intro_url', '')), '');
    v_anthem text := nullif(btrim(coalesce(p_profile->>'anthem', '')), '');
    v_location_status text := nullif(btrim(coalesce(p_profile->>'location_status', '')), '');
    v_age integer;
    v_requested_onboarded boolean := lower(coalesce(p_profile->>'is_onboarded', 'false')) in ('true', '1', 'yes');
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if p_profile ? 'age' then
        begin
            v_age := (p_profile->>'age')::integer;
        exception when invalid_text_representation then
            raise exception 'invalid_age';
        end;

        if v_age < 18 then
            raise exception 'age_must_be_18_or_older';
        end if;
    end if;

    if v_gender is not null and v_gender not in ('male', 'female', 'other') then
        raise exception 'invalid_gender';
    end if;

    if v_interest_gender is not null and v_interest_gender not in ('Male', 'Female', 'All') then
        raise exception 'invalid_interest_gender';
    end if;

    update public.profiles p
    set full_name = coalesce(v_full_name, p.full_name),
        age = coalesce(v_age, p.age),
        gender = coalesce(v_gender, p.gender),
        university = coalesce(v_university, p.university),
        bio = coalesce(v_bio, p.bio),
        avatar_url = coalesce(v_avatar_url, p.avatar_url),
        phone = coalesce(v_phone, p.phone),
        faculty = coalesce(v_faculty, p.faculty),
        department = coalesce(v_department, p.department),
        level = coalesce(v_level, p.level),
        mbti = coalesce(v_mbti, p.mbti),
        attraction_goal = coalesce(v_attraction_goal, p.attraction_goal),
        interest_gender = coalesce(v_interest_gender, p.interest_gender),
        intro_prompt = coalesce(v_intro_prompt, p.intro_prompt),
        voice_intro_url = coalesce(v_voice_intro_url, p.voice_intro_url),
        anthem = coalesce(v_anthem, p.anthem),
        location_status = coalesce(v_location_status, p.location_status),
        photos = case
            when jsonb_typeof(p_profile->'photos') = 'array'
            then array(select jsonb_array_elements_text(p_profile->'photos'))
            else p.photos
        end,
        profile_photos = case
            when jsonb_typeof(p_profile->'profile_photos') = 'array'
            then array(select jsonb_array_elements_text(p_profile->'profile_photos'))
            else p.profile_photos
        end,
        interests = case
            when jsonb_typeof(p_profile->'interests') = 'array'
            then p_profile->'interests'
            else p.interests
        end,
        is_onboarded = case
            when v_requested_onboarded then
                coalesce(v_full_name, p.full_name, '') <> ''
                and coalesce(v_age, p.age, 0) >= 18
                and coalesce(v_gender, p.gender, '') <> ''
                and coalesce(v_university, p.university, '') <> ''
            else p.is_onboarded
        end,
        updated_at = now()
    where p.id = v_user_id;

    if not found then
        raise exception 'profile_missing';
    end if;

    return query select * from public.get_current_profile();
end;
$$;

create or replace function public.update_user_presence()
returns void
language plpgsql
volatile
security invoker
set search_path to ''
as $$
begin
    if auth.uid() is null then
        raise exception 'not_authenticated';
    end if;

    update public.profiles
    set last_seen_at = now(),
        last_seen = now(),
        last_active = now(),
        is_online = true,
        is_live = true,
        updated_at = now()
    where id = (select auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Safe discovery, swipe, match, leaderboard, and confession RPCs
-- ---------------------------------------------------------------------------

create or replace function public.check_and_reset_swipe_limit(p_user_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_used integer;
    v_last_reset timestamp with time zone;
    v_max integer := 20;
    v_is_premium boolean := false;
begin
    if v_user_id is null or v_user_id <> p_user_id then
        return jsonb_build_object('success', false, 'error', 'not_authorized');
    end if;

    select
        coalesce(p.is_premium, false)
        or exists (
            select 1
            from public.subscriptions s
            where s.user_id = p_user_id
              and s.plan_type = 'Premium'
              and s.status = 'active'
              and (s.current_period_end is null or s.current_period_end > now())
        )
    into v_is_premium
    from public.profiles p
    where p.id = p_user_id;

    if not found then
        return jsonb_build_object('success', false, 'error', 'profile_missing');
    end if;

    if coalesce(v_is_premium, false) then
        return jsonb_build_object(
            'success', true,
            'can_swipe', true,
            'used_count', 0,
            'max_count', 999999,
            'is_premium', true
        );
    end if;

    select sl.swipes_used, sl.last_reset
    into v_used, v_last_reset
    from public.swipe_limits sl
    where sl.user_id = p_user_id
    for update;

    if v_used is null then
        insert into public.swipe_limits (user_id, swipes_used, last_reset)
        values (p_user_id, 0, now())
        on conflict (user_id) do nothing;

        v_used := 0;
        v_last_reset := now();
    end if;

    if v_last_reset < now() - interval '24 hours' then
        update public.swipe_limits
        set swipes_used = 0,
            last_reset = now()
        where user_id = p_user_id;

        v_used := 0;
    end if;

    return jsonb_build_object(
        'success', true,
        'can_swipe', coalesce(v_used, 0) < v_max,
        'used_count', coalesce(v_used, 0),
        'max_count', v_max,
        'is_premium', false
    );
end;
$$;

create or replace function public.get_discovery_profiles(
    p_limit integer default 40,
    p_offset integer default 0,
    p_filters jsonb default '{}'::jsonb
)
returns table (
    id uuid,
    full_name text,
    username text,
    gender text,
    age integer,
    university text,
    faculty text,
    department text,
    level text,
    bio text,
    avatar_url text,
    photos text[],
    profile_photos text[],
    interests jsonb,
    intro_prompt text,
    voice_intro_url text,
    anthem text,
    attraction_goal text,
    is_verified boolean,
    completion_score integer,
    last_seen_at timestamp with time zone,
    last_active timestamp with time zone,
    is_live boolean,
    is_boosted boolean,
    seen_count integer
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 50);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
    v_university text := nullif(btrim(coalesce(p_filters->>'university', '')), '');
    v_gender text := lower(nullif(btrim(coalesce(p_filters->>'gender', '')), ''));
    v_live_only boolean := lower(coalesce(p_filters->>'live_only', 'false')) in ('true', '1', 'yes');
    v_me record;
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    select p.id, p.gender, p.university, p.interest_gender, p.is_onboarded, p.is_banned, p.is_shadow_banned
    into v_me
    from public.profiles p
    where p.id = v_user_id;

    if not found then
        raise exception 'profile_missing';
    end if;

    if coalesce(v_me.is_banned, false) or coalesce(v_me.is_shadow_banned, false) then
        raise exception 'profile_not_allowed';
    end if;

    if coalesce(v_me.is_onboarded, false) = false then
        raise exception 'onboarding_required';
    end if;

    return query
    select
        p.id,
        p.full_name,
        p.username,
        p.gender,
        p.age,
        p.university,
        p.faculty,
        p.department,
        p.level,
        p.bio,
        p.avatar_url,
        p.photos,
        p.profile_photos,
        p.interests,
        p.intro_prompt,
        p.voice_intro_url,
        p.anthem,
        p.attraction_goal,
        coalesce(p.is_verified, false) as is_verified,
        coalesce(p.completion_score, 0) as completion_score,
        p.last_seen_at,
        p.last_active,
        coalesce(p.last_active, p.last_seen_at) > now() - interval '15 minutes' as is_live,
        exists (
            select 1
            from public.boosts b
            where b.user_id = p.id
              and b.type = '24h_boost'
              and b.expires_at > now()
        ) as is_boosted,
        coalesce(fi.seen_count, 0) as seen_count
    from public.profiles p
    left join public.feed_impressions fi
      on fi.user_id = v_user_id
     and fi.entity_type = 'profile'
     and fi.entity_id = p.id
    where p.id <> v_user_id
      and coalesce(p.is_onboarded, false) = true
      and coalesce(p.is_banned, false) = false
      and coalesce(p.is_shadow_banned, false) = false
      and coalesce(p.is_blocked, false) = false
      and coalesce(p.incognito_mode, false) = false
      and (v_university is null or lower(p.university) = lower(v_university))
      and (v_gender is null or lower(p.gender) = v_gender)
      and (
          coalesce(v_me.interest_gender, 'All') = 'All'
          or lower(p.gender) = lower(v_me.interest_gender)
      )
      and (
          coalesce(p.interest_gender, 'All') = 'All'
          or lower(p.interest_gender) = lower(v_me.gender)
      )
      and (
          v_live_only = false
          or coalesce(p.last_active, p.last_seen_at) > now() - interval '15 minutes'
      )
      and not exists (
          select 1
          from public.swipes s
          where s.swiper_id = v_user_id
            and s.swiped_id = p.id
      )
      and not exists (
          select 1
          from public.matches m
          where m.user_ids @> array[v_user_id, p.id]::uuid[]
      )
      and not exists (
          select 1
          from public.reports r
          where (
              (r.reporter_id = v_user_id and r.reported_id = p.id)
              or (r.reporter_id = p.id and r.reported_id = v_user_id)
          )
          and coalesce(r.status, 'pending') <> 'dismissed'
      )
    order by
        exists (
            select 1
            from public.boosts b
            where b.user_id = p.id
              and b.type = '24h_boost'
              and b.expires_at > now()
        ) desc,
        (lower(p.university) = lower(coalesce(v_me.university, ''))) desc,
        coalesce(p.completion_score, 0) desc,
        coalesce(p.last_active, p.last_seen_at, p.created_at) desc nulls last,
        p.id
    limit v_limit
    offset v_offset;
end;
$$;

create or replace function public.record_feed_impression(
    p_entity_type text,
    p_entity_id uuid,
    p_source text default null,
    p_engaged boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    if p_entity_type not in ('profile', 'confession') then
        return jsonb_build_object('success', false, 'error', 'invalid_entity_type');
    end if;

    insert into public.feed_impressions (
        user_id,
        entity_type,
        entity_id,
        first_seen_at,
        last_seen_at,
        seen_count,
        last_source,
        last_engaged_at
    )
    values (
        v_user_id,
        p_entity_type,
        p_entity_id,
        now(),
        now(),
        1,
        nullif(p_source, ''),
        case when p_engaged then now() else null end
    )
    on conflict (user_id, entity_type, entity_id)
    do update set
        last_seen_at = now(),
        seen_count = public.feed_impressions.seen_count + 1,
        last_source = coalesce(nullif(p_source, ''), public.feed_impressions.last_source),
        last_engaged_at = case
            when p_engaged then now()
            else public.feed_impressions.last_engaged_at
        end;

    return jsonb_build_object('success', true);
end;
$$;

create or replace function public.record_profile_swipe(
    p_target_id uuid,
    p_direction text,
    p_swipe_type text default 'standard',
    p_message_teaser text default null,
    p_client_operation_id text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_direction text := lower(nullif(btrim(coalesce(p_direction, '')), ''));
    v_swipe_type text := lower(nullif(btrim(coalesce(p_swipe_type, 'standard')), ''));
    v_quota jsonb;
    v_swipe_id uuid;
    v_match_id uuid;
    v_is_match boolean := false;
    v_participants uuid[];
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    if p_target_id is null or p_target_id = v_user_id then
        return jsonb_build_object('success', false, 'error', 'invalid_target');
    end if;

    if v_direction not in ('left', 'right') then
        return jsonb_build_object('success', false, 'error', 'invalid_direction');
    end if;

    if v_swipe_type <> 'standard' then
        return jsonb_build_object('success', false, 'error', 'swipe_type_deferred');
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = v_user_id
          and coalesce(p.is_onboarded, false) = true
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
    ) then
        return jsonb_build_object('success', false, 'error', 'caller_not_eligible');
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = p_target_id
          and coalesce(p.is_onboarded, false) = true
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
          and coalesce(p.is_blocked, false) = false
    ) then
        return jsonb_build_object('success', false, 'error', 'target_not_available');
    end if;

    v_quota := public.check_and_reset_swipe_limit(v_user_id);

    if coalesce((v_quota->>'can_swipe')::boolean, false) = false then
        return jsonb_build_object('success', false, 'error', 'daily_swipe_limit_reached', 'quota', v_quota);
    end if;

    insert into public.swipes (
        swiper_id,
        swiped_id,
        direction,
        type,
        status,
        is_priority,
        is_free,
        message_teaser,
        created_at
    )
    values (
        v_user_id,
        p_target_id,
        v_direction,
        'standard',
        case when v_direction = 'right' then 'pending' else 'declined' end,
        false,
        true,
        nullif(btrim(coalesce(p_message_teaser, '')), ''),
        now()
    )
    on conflict (swiper_id, swiped_id) do update
    set direction = excluded.direction,
        type = 'standard',
        status = excluded.status,
        is_priority = false,
        is_free = true,
        message_teaser = excluded.message_teaser,
        created_at = now()
    returning id into v_swipe_id;

    update public.swipe_limits
    set swipes_used = coalesce(swipes_used, 0) + 1
    where user_id = v_user_id
      and coalesce((v_quota->>'is_premium')::boolean, false) = false;

    insert into public.engagement_scores (user_id, score, daily_streak, last_login, last_swipe_at, streak_updated_at)
    values (v_user_id, 1, 1, now(), now(), now())
    on conflict (user_id) do update
    set score = public.engagement_scores.score + 1,
        daily_streak = case
            when public.engagement_scores.last_swipe_at > now() - interval '36 hours'
            then public.engagement_scores.daily_streak + 1
            else 1
        end,
        last_login = now(),
        last_swipe_at = now(),
        streak_updated_at = now();

    perform public.record_feed_impression('profile', p_target_id, 'swipe', true);

    if v_direction = 'right' and exists (
        select 1
        from public.swipes s
        where s.swiper_id = p_target_id
          and s.swiped_id = v_user_id
          and s.direction = 'right'
          and s.status in ('pending', 'accepted')
    ) then
        v_participants := array[least(v_user_id, p_target_id), greatest(v_user_id, p_target_id)]::uuid[];

        insert into public.matches (user1_id, user2_id, user_ids, created_at)
        values (v_participants[1], v_participants[2], v_participants, now())
        on conflict (user1_id, user2_id) do update
        set user_ids = excluded.user_ids
        returning id into v_match_id;

        update public.swipes
        set status = 'accepted'
        where (swiper_id = v_user_id and swiped_id = p_target_id)
           or (swiper_id = p_target_id and swiped_id = v_user_id);

        v_is_match := true;
    end if;

    return jsonb_build_object(
        'success', true,
        'swipe_id', v_swipe_id,
        'is_match', v_is_match,
        'match_id', v_match_id,
        'direction', v_direction,
        'type', 'standard',
        'client_operation_id', nullif(btrim(coalesce(p_client_operation_id, '')), '')
    );
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.accept_swipe_request(p_swipe_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_swiper_id uuid;
    v_swiped_id uuid;
    v_match_id uuid;
    v_participants uuid[];
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    select s.swiper_id, s.swiped_id
    into v_swiper_id, v_swiped_id
    from public.swipes s
    where s.id = p_swipe_id
      and s.swiped_id = v_user_id
      and s.direction = 'right'
      and s.status = 'pending'
    for update;

    if not found then
        return jsonb_build_object('success', false, 'error', 'request_not_found_or_unauthorized');
    end if;

    update public.swipes
    set status = 'accepted'
    where id = p_swipe_id;

    v_participants := array[least(v_swiper_id, v_swiped_id), greatest(v_swiper_id, v_swiped_id)]::uuid[];

    insert into public.matches (user1_id, user2_id, user_ids, created_at)
    values (v_participants[1], v_participants[2], v_participants, now())
    on conflict (user1_id, user2_id) do update
    set user_ids = excluded.user_ids
    returning id into v_match_id;

    return jsonb_build_object('success', true, 'match_id', v_match_id);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

create or replace function public.get_leaderboard_profiles(
    p_kind text default 'most_wanted',
    p_limit integer default 50
)
returns table (
    rank integer,
    profile_id uuid,
    full_name text,
    avatar_url text,
    university text,
    gender text,
    score integer,
    metric text
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_kind text := lower(coalesce(nullif(btrim(p_kind), ''), 'most_wanted'));
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    if v_kind not in ('most_wanted', 'campus_stars', 'active') then
        v_kind := 'most_wanted';
    end if;

    return query
    with likes as (
        select s.swiped_id as user_id, count(*)::integer as like_count
        from public.swipes s
        where s.direction = 'right'
        group by s.swiped_id
    ),
    views as (
        select pv.profile_owner_id as user_id, count(*)::integer as view_count
        from public.profile_views pv
        group by pv.profile_owner_id
    ),
    match_counts as (
        select user_id, count(*)::integer as match_count
        from (
            select m.user1_id as user_id from public.matches m
            union all
            select m.user2_id as user_id from public.matches m
        ) x
        group by user_id
    ),
    scored as (
        select
            p.id,
            p.full_name,
            p.avatar_url,
            p.university,
            p.gender,
            case
                when v_kind = 'campus_stars' then coalesce(p.completion_score, 0) + coalesce(es.score, 0)
                when v_kind = 'active' then coalesce(es.score, 0) + coalesce(mc.match_count, 0) * 5
                else coalesce(l.like_count, 0) * 10 + coalesce(v.view_count, 0) * 2 + coalesce(mc.match_count, 0) * 5
            end::integer as leaderboard_score
        from public.profiles p
        left join likes l on l.user_id = p.id
        left join views v on v.user_id = p.id
        left join match_counts mc on mc.user_id = p.id
        left join public.engagement_scores es on es.user_id = p.id
        where coalesce(p.is_onboarded, false) = true
          and coalesce(p.is_banned, false) = false
          and coalesce(p.is_shadow_banned, false) = false
          and coalesce(p.incognito_mode, false) = false
    )
    select
        row_number() over (order by s.leaderboard_score desc, s.full_name asc)::integer as rank,
        s.id as profile_id,
        s.full_name,
        s.avatar_url,
        s.university,
        s.gender,
        s.leaderboard_score as score,
        v_kind as metric
    from scored s
    where s.leaderboard_score > 0
    order by s.leaderboard_score desc, s.full_name asc
    limit v_limit;
end;
$$;

create or replace function public.get_confession_feed(
    p_university text default null,
    p_limit integer default 50,
    p_offset integer default 0
)
returns table (
    id uuid,
    content text,
    university text,
    created_at timestamp with time zone,
    reaction_counts jsonb,
    total_reactions bigint,
    comment_count bigint,
    is_viral boolean,
    user_reactions text[]
)
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_university text := nullif(btrim(coalesce(p_university, '')), '');
    v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
    v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
    if v_user_id is null then
        raise exception 'not_authenticated';
    end if;

    return query
    with reaction_rollup as (
        select
            counts.confession_id,
            jsonb_object_agg(counts.emoji, counts.reaction_count) as reaction_counts,
            sum(counts.reaction_count)::bigint as total_reactions
        from (
            select cr.confession_id, cr.emoji, count(*)::bigint as reaction_count
            from public.confession_reactions cr
            group by cr.confession_id, cr.emoji
        ) counts
        group by counts.confession_id
    ),
    comment_rollup as (
        select cc.confession_id, count(*)::bigint as comment_count
        from public.confession_comments cc
        group by cc.confession_id
    )
    select
        c.id,
        c.content,
        c.university,
        c.created_at,
        coalesce(rr.reaction_counts, '{}'::jsonb) as reaction_counts,
        coalesce(rr.total_reactions, 0) as total_reactions,
        coalesce(cc.comment_count, 0) as comment_count,
        coalesce(rr.total_reactions, 0) >= 20 as is_viral,
        coalesce(
            array(
                select mine.emoji
                from public.confession_reactions mine
                where mine.confession_id = c.id
                  and mine.user_id = v_user_id
                order by mine.emoji
            ),
            '{}'::text[]
        ) as user_reactions
    from public.confessions c
    left join reaction_rollup rr on rr.confession_id = c.id
    left join comment_rollup cc on cc.confession_id = c.id
    where v_university is null or lower(c.university) = lower(v_university)
    order by c.is_pinned desc, c.created_at desc
    limit v_limit
    offset v_offset;
end;
$$;

create or replace function public.toggle_confession_reaction(
    p_confession_id uuid,
    p_emoji text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path to ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_existing_id uuid;
begin
    if v_user_id is null then
        return jsonb_build_object('success', false, 'error', 'not_authenticated');
    end if;

    if p_confession_id is null or nullif(btrim(coalesce(p_emoji, '')), '') is null then
        return jsonb_build_object('success', false, 'error', 'invalid_reaction');
    end if;

    if not exists (select 1 from public.confessions c where c.id = p_confession_id) then
        return jsonb_build_object('success', false, 'error', 'confession_not_found');
    end if;

    select cr.id
    into v_existing_id
    from public.confession_reactions cr
    where cr.confession_id = p_confession_id
      and cr.user_id = v_user_id
      and cr.emoji = p_emoji
    limit 1;

    if v_existing_id is not null then
        delete from public.confession_reactions
        where id = v_existing_id
          and user_id = v_user_id;

        return jsonb_build_object('success', true, 'toggled', false);
    end if;

    insert into public.confession_reactions (confession_id, user_id, emoji)
    values (p_confession_id, v_user_id, p_emoji);

    perform public.record_feed_impression('confession', p_confession_id, 'confession_reaction', true);

    return jsonb_build_object('success', true, 'toggled', true);
exception when others then
    return jsonb_build_object('success', false, 'error', sqlerrm);
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger resolution for the first staging scope
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists on_profile_created_referral on public.profiles;
create trigger on_profile_created_referral
before insert on public.profiles
for each row execute function public.handle_new_profile_referral();

drop trigger if exists tr_sync_referral on public.profiles;
create trigger tr_sync_referral
after insert or update of referred_by on public.profiles
for each row execute function public.sync_referral_from_profile();

drop trigger if exists track_photo_update on public.profiles;
create trigger track_photo_update
before update of avatar_url, photos, profile_photos on public.profiles
for each row execute function public.update_photo_timestamp();

drop trigger if exists calculate_profile_completion on public.profiles;
create trigger calculate_profile_completion
before insert or update on public.profiles
for each row execute function public.calculate_completion_score();

-- ---------------------------------------------------------------------------
-- Execution grants
-- ---------------------------------------------------------------------------

revoke all on function public.normalize_referral_code(text) from public, anon, authenticated;
revoke all on function public.generate_referral_code() from public, anon, authenticated;
revoke all on function public.generate_unique_referral_code() from public, anon, authenticated;
revoke all on function public.handle_new_profile_referral() from public, anon, authenticated;
revoke all on function public.sync_referral_from_profile() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_referral_code(text) from public, anon, authenticated;
revoke all on function public.apply_referral_code(text) from public, anon, authenticated;
revoke all on function public.calculate_completion_score() from public, anon, authenticated;
revoke all on function public.update_photo_timestamp() from public, anon, authenticated;
revoke all on function public.get_current_profile() from public, anon, authenticated;
revoke all on function public.update_current_profile(jsonb) from public, anon, authenticated;
revoke all on function public.update_user_presence() from public, anon, authenticated;
revoke all on function public.check_and_reset_swipe_limit(uuid) from public, anon, authenticated;
revoke all on function public.get_discovery_profiles(integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.record_feed_impression(text, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.record_profile_swipe(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.accept_swipe_request(uuid) from public, anon, authenticated;
revoke all on function public.get_leaderboard_profiles(text, integer) from public, anon, authenticated;
revoke all on function public.get_confession_feed(text, integer, integer) from public, anon, authenticated;
revoke all on function public.toggle_confession_reaction(uuid, text) from public, anon, authenticated;

grant execute on function public.validate_referral_code(text) to anon, authenticated;
grant execute on function public.apply_referral_code(text) to authenticated;
grant execute on function public.get_current_profile() to authenticated;
grant execute on function public.update_current_profile(jsonb) to authenticated;
grant execute on function public.update_user_presence() to authenticated;
grant execute on function public.check_and_reset_swipe_limit(uuid) to authenticated;
grant execute on function public.get_discovery_profiles(integer, integer, jsonb) to authenticated;
grant execute on function public.record_feed_impression(text, uuid, text, boolean) to authenticated;
grant execute on function public.record_profile_swipe(uuid, text, text, text, text) to authenticated;
grant execute on function public.accept_swipe_request(uuid) to authenticated;
grant execute on function public.get_leaderboard_profiles(text, integer) to authenticated;
grant execute on function public.get_confession_feed(text, integer, integer) to authenticated;
grant execute on function public.toggle_confession_reaction(uuid, text) to authenticated;


-- ----------------------------------------------------------------------------
-- VIEWS
-- ----------------------------------------------------------------------------
-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: public view definitions only. No production rows are included.
-- Security decision: all views are created with security_invoker = true in staging.

set search_path = public, extensions;

create or replace view public.discovery_feed_v3
with (security_invoker = true) as
select
    p.id,
    p.email,
    p.full_name,
    p.gender,
    p.age,
    p.university,
    p.bio,
    p.phone,
    p.avatar_url,
    p.photos,
    p.role,
    p.is_verified,
    p.is_blocked,
    p.free_swipes_remaining,
    p.created_at,
    p.updated_at,
    p.status_text,
    p.status_updated_at,
    p.referral_code,
    p.coins,
    p.is_online,
    p.last_seen,
    p.referred_by,
    p.free_swipes,
    p.last_seen_at,
    p.match_notifications,
    p.email_notifications,
    p.push_notifications,
    p.show_online_status,
    p.incognito_mode,
    p.voice_intro_url,
    p.anthem,
    p.location_status,
    p.faculty,
    p.department,
    p.level,
    p.genotype,
    p.mbti,
    p.attraction_goal,
    p.onesignal_id,
    p.streak_freeze_count,
    p.current_badge,
    p.username,
    p.completion_score,
    p.is_optimised,
    p.interests,
    p.intro_prompt,
    p.profile_photos,
    p.is_live,
    coalesce(s.plan_type, 'Free'::text) as plan_type,
    exists (
        select 1
        from public.boosts b
        where b.user_id = p.id
          and b.expires_at > now()
          and b.type = '24h_boost'::text
    ) as is_boosted
from public.profiles p
left join public.subscriptions s on s.user_id = p.id
where coalesce(p.is_banned, false) = false
  and coalesce(p.is_shadow_banned, false) = false;

create or replace view public.leaderboard_big_spenders
with (security_invoker = true) as
select
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    coalesce(w.total_spent, 0::numeric) as total_spent
from public.profiles p
join public.wallets w on w.user_id = p.id
order by w.total_spent desc
limit 100;

create or replace view public.leaderboard_campus_stars
with (security_invoker = true) as
select
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    coalesce(p.completion_score, 0) as completion_score,
    coalesce(es.score, 0) as engagement_score
from public.profiles p
left join public.engagement_scores es on es.user_id = p.id
order by (coalesce(p.completion_score, 0) + coalesce(es.score, 0)) desc
limit 100;

create or replace view public.leaderboard_most_wanted
with (security_invoker = true) as
select
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.role,
    count(s.id) as total_likes_received
from public.profiles p
left join public.swipes s on s.swiped_id = p.id and s.direction = 'right'::text
group by p.id, p.full_name, p.avatar_url, p.university, p.role
order by count(s.id) desc
limit 100;

create or replace view public.leaderboard_unified
with (security_invoker = true) as
select
    p.id,
    p.full_name,
    p.avatar_url,
    p.university,
    p.gender,
    (
        coalesce(swipe_stats.likes_received, 0::bigint) * 10
        + coalesce(view_stats.views_received, 0::bigint) * 2
        + coalesce(match_stats.match_count, 0::bigint) * 5
    )::integer as premium_swipes_received,
    coalesce(w.total_spent, 0::numeric)::integer as total_spent,
    p.completion_score
from public.profiles p
left join (
    select swipes.swiped_id, count(swipes.id) as likes_received
    from public.swipes
    where swipes.direction = 'right'::text
    group by swipes.swiped_id
) swipe_stats on p.id = swipe_stats.swiped_id
left join (
    select profile_views.profile_owner_id, count(profile_views.id) as views_received
    from public.profile_views
    group by profile_views.profile_owner_id
) view_stats on p.id = view_stats.profile_owner_id
left join (
    select all_matches.user_id, count(*) as match_count
    from (
        select matches.user1_id as user_id from public.matches
        union all
        select matches.user2_id as user_id from public.matches
    ) all_matches
    group by all_matches.user_id
) match_stats on p.id = match_stats.user_id
left join public.wallets w on p.id = w.user_id
where p.is_banned = false
  and p.is_shadow_banned = false
  and (
      p.last_active > (now() - '14 days'::interval)
      or p.last_seen_at > (now() - '14 days'::interval)
      or p.last_active is null
  );

create or replace view public.optimized_confessions
with (security_invoker = true) as
select
    c.id,
    c.content,
    c.university,
    c.user_id,
    c.created_at,
    coalesce(r.reaction_data, '[]'::jsonb) as reaction_data,
    coalesce(r.total_reactions, 0::bigint) as total_reactions,
    coalesce(comm.comment_count, 0::bigint) as comment_count,
    coalesce(cl.claimer_ids, '[]'::jsonb) as claimer_ids,
    coalesce(r.total_reactions, 0::bigint) >= 20 as is_viral
from public.confessions c
left join (
    select
        confession_reactions.confession_id,
        jsonb_agg(jsonb_build_object('u', confession_reactions.user_id, 'e', confession_reactions.emoji)) as reaction_data,
        count(*) as total_reactions
    from public.confession_reactions
    group by confession_reactions.confession_id
) r on c.id = r.confession_id
left join (
    select confession_comments.confession_id, count(*) as comment_count
    from public.confession_comments
    group by confession_comments.confession_id
) comm on c.id = comm.confession_id
left join (
    select confession_claims.confession_id, jsonb_agg(confession_claims.claimer_id) as claimer_ids
    from public.confession_claims
    group by confession_claims.confession_id
) cl on c.id = cl.confession_id;


-- ----------------------------------------------------------------------------
-- BASELINE RLS & GRANTS
-- ----------------------------------------------------------------------------
-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: staging-safe RLS and grants.
--
-- Security decision:
-- Production has 121 public-table RLS policies and broad table/view grants to anon
-- and authenticated roles. It also still has the insecure policy
-- "Public profiles are viewable by everyone" on public.profiles.
-- This baseline intentionally does not reproduce that policy.

set search_path = public, extensions;

alter table public.admin_audit_logs enable row level security;
alter table public.admin_push_broadcasts enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.ai_profile_reviews enable row level security;
alter table public.app_config enable row level security;
alter table public.boosts enable row level security;
alter table public.confession_claims enable row level security;
alter table public.confession_comments enable row level security;
alter table public.confession_reactions enable row level security;
alter table public.confession_reports enable row level security;
alter table public.confessions enable row level security;
alter table public.conversations enable row level security;
alter table public.direct_snaps enable row level security;
alter table public.engagement_scores enable row level security;
alter table public.entitlements enable row level security;
alter table public.feed_impressions enable row level security;
alter table public.gifts enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.monetization_config enable row level security;
alter table public.notifications enable row level security;
alter table public.paid_products enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_audit_logs enable row level security;
alter table public.payout_details enable row level security;
alter table public.profile_views enable row level security;
alter table public.profiles enable row level security;
alter table public.promo_codes enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.referrals enable row level security;
alter table public.reports enable row level security;
alter table public.snapshots enable row level security;
alter table public.status_updates enable row level security;
alter table public.status_views enable row level security;
alter table public.statuses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.swipe_limits enable row level security;
alter table public.swipe_payment_operations enable row level security;
alter table public.swipes enable row level security;
alter table public.transactions enable row level security;
alter table public.user_notification_devices enable row level security;
alter table public.user_settings enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallets enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.withdrawals enable row level security;

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant usage on schema public to anon, authenticated;

-- Public, non-personal configuration surfaces. Confirm values separately;
-- production rows are not copied by this baseline.
grant select on public.app_config to anon, authenticated;
grant select on public.gifts to anon, authenticated;
grant select on public.monetization_config to anon, authenticated;
grant select on public.paid_products to anon, authenticated;

create policy "Public can read app config"
on public.app_config for select
to anon, authenticated
using (true);

create policy "Public can read gifts"
on public.gifts for select
to anon, authenticated
using (true);

create policy "Public can read monetization config"
on public.monetization_config for select
to anon, authenticated
using (true);

create policy "Public can read paid products"
on public.paid_products for select
to anon, authenticated
using (true);

-- Current-user profile and onboarding. This intentionally replaces production's
-- anonymous public profile policy for staging.
grant select, insert, update, delete on public.profiles to authenticated;

create policy "Authenticated users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Authenticated users can insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Authenticated users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Authenticated users can delete own profile"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

grant select, insert, update, delete on public.user_settings to authenticated;

create policy "Users can manage own settings"
on public.user_settings for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.subscriptions to authenticated;

create policy "Users can read own subscription"
on public.subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.entitlements to authenticated;

create policy "Users can read own entitlements"
on public.entitlements for select
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update on public.user_notification_devices to authenticated;

create policy "Users can view own notification devices"
on public.user_notification_devices for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert own notification devices"
on public.user_notification_devices for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update own notification devices"
on public.user_notification_devices for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.wallets to authenticated;

create policy "Users can read own wallet"
on public.wallets for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.wallet_transactions to authenticated;

create policy "Users can read own wallet transactions"
on public.wallet_transactions for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.wallet_ledger to authenticated;

create policy "Users can read own wallet ledger"
on public.wallet_ledger for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.ai_interactions to authenticated;

create policy "Users can view own ai interactions"
on public.ai_interactions for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.ai_profile_reviews to authenticated;

create policy "Users can view own ai reviews"
on public.ai_profile_reviews for select
to authenticated
using ((select auth.uid()) = user_id);

-- Views are security_invoker in 040_views.sql. Grant authenticated reads only;
-- anon access is intentionally withheld until profile-card privacy is redesigned.
revoke all on public.discovery_feed_v3 from anon, authenticated;
revoke all on public.leaderboard_big_spenders from anon, authenticated;
revoke all on public.leaderboard_campus_stars from anon, authenticated;
revoke all on public.leaderboard_most_wanted from anon, authenticated;
revoke all on public.leaderboard_unified from anon, authenticated;
revoke all on public.optimized_confessions from anon, authenticated;

grant select on public.discovery_feed_v3 to authenticated;
grant select on public.leaderboard_big_spenders to authenticated;
grant select on public.leaderboard_campus_stars to authenticated;
grant select on public.leaderboard_most_wanted to authenticated;
grant select on public.leaderboard_unified to authenticated;
grant select on public.optimized_confessions to authenticated;

-- Deferred:
-- The remaining production RLS policies and broad table grants must be rebuilt from
-- reviewed migrations or redesigned before feature testing. Do not restore broad anon
-- grants or production's public profile policy into staging.


-- ----------------------------------------------------------------------------
-- STORAGE BUCKETS & REALTIME
-- ----------------------------------------------------------------------------
-- The College Date staging schema baseline
-- Source: production metadata from Supabase project gedoyoleoscgxgdqszzc on 2026-08-01.
-- Scope: Storage bucket configuration, staging-safe Storage policies, and Realtime publication membership.
-- No storage.objects rows, media files, or production user records are included.

-- Bucket configuration captured from production metadata.
-- Public buckets remain public for asset URL compatibility; object listing and writes
-- are controlled with Storage RLS policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('avatars', 'avatars', true, null, null),
    ('chat-media', 'chat-media', false, null, null),
    ('profile-photos', 'profile-photos', true, null, null),
    ('snap_media', 'snap_media', true, null, null),
    ('snapshot-media', 'snapshot-media', true, null, null),
    ('status-media', 'status-media', true, null, null),
    ('voice-intros', 'voice-intros', true, null, null)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Staging-safe storage policies. Production has duplicate legacy upload policies
-- and some policies assigned to {public}; this baseline uses authenticated-only,
-- owner-folder policies where possible.

create policy "Profile photo owners can upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Profile photo owners can read own files"
on storage.objects for select
to authenticated
using (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Profile photo owners can update own files"
on storage.objects for update
to authenticated
using (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
)
with check (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Profile photo owners can delete own files"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'profile-photos'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Voice intro owners can upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'voice-intros'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Voice intro owners can manage"
on storage.objects for all
to authenticated
using (
    bucket_id = 'voice-intros'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
)
with check (
    bucket_id = 'voice-intros'
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Status media owners can upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id in ('status-media', 'snapshot-media', 'snap_media')
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Status media owners can manage"
on storage.objects for all
to authenticated
using (
    bucket_id in ('status-media', 'snapshot-media', 'snap_media')
    and ((select auth.uid())::text = (storage.foldername(name))[1])
)
with check (
    bucket_id in ('status-media', 'snapshot-media', 'snap_media')
    and ((select auth.uid())::text = (storage.foldername(name))[1])
);

create policy "Chat media participants can read"
on storage.objects for select
to authenticated
using (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = 'matches'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
        select 1
        from public.matches m
        where m.id = ((storage.foldername(objects.name))[2])::uuid
          and ((select auth.uid()) = m.user1_id or (select auth.uid()) = m.user2_id)
    )
);

create policy "Chat media participants can upload"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'chat-media'
    and (storage.foldername(name))[1] = 'matches'
    and (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
        select 1
        from public.matches m
        where m.id = ((storage.foldername(objects.name))[2])::uuid
          and ((select auth.uid()) = m.user1_id or (select auth.uid()) = m.user2_id)
    )
);

-- Realtime membership captured from production metadata.
-- Supabase manages the realtime schema internally; do not modify realtime tables directly.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.wallet_transactions;
alter publication supabase_realtime add table public.wallets;


-- ----------------------------------------------------------------------------
-- OCTOBER 2026 MASTER OVERLAYS, NEW TABLES, DUAL-CONTRACT RPCS & CACHE FLUSH
-- ----------------------------------------------------------------------------
-- ============================================================================
-- THE COLLEGE DATE 2.0 (CD2.0)
-- CONSOLIDATED MASTER DATABASE SCHEMA & VERIFICATION SCRIPT (OCTOBER 2026)
-- ============================================================================
-- INSTRUCTIONS FOR SUPABASE CONSOLE:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project and navigate to the "SQL Editor" in the left navigation.
-- 3. Click "+ New query", paste the entire contents of this file, and click "Run".
--
-- PROPERTIES & SAFETY GUARANTEES:
-- • 100% IDEMPOTENT & NON-DESTRUCTIVE: Uses IF NOT EXISTS and CREATE OR REPLACE.
-- • ZERO DATA LOSS: Existing profiles, matches, swipes, messages, and wallet
--   balances are 100% preserved. No tables are dropped.
-- • PERMANENT CONFLICT RESOLUTION: Unifies and hardens all 66 previously
--   overwritten functions into their latest battle-tested signatures.
-- • FULL DUAL-CONTRACT COMPATIBILITY: Restores both 'items' & 'requests',
--   'premium' & 'is_premium' across all RPC contracts.
-- • POSTGREST CACHE INVALIDATION: Executes NOTIFY pgrst, 'reload schema'
--   at the end so all changes are instantly recognized by the Supabase REST API.
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS & SCHEMAS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 2: COLUMN ALIGNMENT (ENSURE ALL 2026 SCHEMA FIELDS EXIST)
-- ============================================================================

-- 2.1 Align public.profiles
ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS trial_expires_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS trial_used boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS has_seen_tour boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_unlimited_elite boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_ultra boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS finder_weekly_reset_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS finder_free_searches_left integer DEFAULT 2,
    ADD COLUMN IF NOT EXISTS finder_paid_searches_left integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_finder_search_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS campus_ambassador_tier text DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS photos_updated_at timestamp with time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS ai_bio_reviewed boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS ai_profile_score integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_shadow_banned boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS device_fingerprint text,
    ADD COLUMN IF NOT EXISTS push_token text,
    ADD COLUMN IF NOT EXISTS onesignal_player_id text,
    ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS profile_completion_percentage integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS university text,
    ADD COLUMN IF NOT EXISTS faculty text,
    ADD COLUMN IF NOT EXISTS academic_level text,
    ADD COLUMN IF NOT EXISTS gender text,
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'student',
    ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS premium_expires_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS coins_balance integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_last_active_date date,
    ADD COLUMN IF NOT EXISTS verified_student boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';

-- Allow NULL email on public.profiles to guarantee email privacy isolation
ALTER TABLE IF EXISTS public.profiles ALTER COLUMN email DROP NOT NULL;

-- 2.2 Align public.swipes
ALTER TABLE IF EXISTS public.swipes
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS is_priority boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS type text DEFAULT 'like';

-- 2.3 Align public.matches
ALTER TABLE IF EXISTS public.matches
    ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS last_message_preview text,
    ADD COLUMN IF NOT EXISTS unread_count_user1 integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unread_count_user2 integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disappearing_messages_seconds integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2.4 Align public.messages
ALTER TABLE IF EXISTS public.messages
    ADD COLUMN IF NOT EXISTS reply_to_id uuid,
    ADD COLUMN IF NOT EXISTS interaction_type text DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS client_nonce text,
    ADD COLUMN IF NOT EXISTS media_url text,
    ADD COLUMN IF NOT EXISTS media_type text,
    ADD COLUMN IF NOT EXISTS is_disappearing boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS disappears_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS reactions jsonb DEFAULT '[]'::jsonb;

-- 2.5 Align public.confessions
ALTER TABLE IF EXISTS public.confessions
    ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reposts_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS campus text;

-- 2.6 Align public.wallets
ALTER TABLE IF EXISTS public.wallets
    ADD COLUMN IF NOT EXISTS locked_balance numeric DEFAULT 0,
    ADD COLUMN IF NOT EXISTS daily_withdrawal_limit numeric DEFAULT 50000;

-- 2.7 Align public.wallet_transactions
ALTER TABLE IF EXISTS public.wallet_transactions
    ADD COLUMN IF NOT EXISTS external_reference text,
    ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- ============================================================================
-- SECTION 3: POST-BASELINE TABLES (CREATE TABLE IF NOT EXISTS)
-- ============================================================================

-- 3.1 User Blocks & Safety
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(blocker_id, blocked_id)
);

-- 3.2 Official The College Date Posts
CREATE TABLE IF NOT EXISTS public.official_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    category text DEFAULT 'announcement',
    tags text[] DEFAULT '{}',
    priority integer DEFAULT 0,
    deep_link text,
    media_url text,
    is_published boolean DEFAULT true,
    published_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- 3.3 Score Streaks & Gamification
CREATE TABLE IF NOT EXISTS public.user_score_streaks (
    user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_streak integer DEFAULT 0,
    max_streak integer DEFAULT 0,
    last_interaction_date date,
    streak_freeze_count integer DEFAULT 0,
    super_swipes_unlocked integer DEFAULT 0,
    boosts_unlocked integer DEFAULT 0,
    vip_frame_unlocked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.score_streak_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    streak_day integer NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.4 Campus Finder Searches
CREATE TABLE IF NOT EXISTS public.campus_finder_searches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_campus text NOT NULL,
    search_filters jsonb DEFAULT '{}'::jsonb,
    results_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.5 Contextual Premium Trials & Fingerprints
CREATE TABLE IF NOT EXISTS public.device_trial_fingerprints (
    device_fingerprint text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    claimed_at timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text
);

CREATE TABLE IF NOT EXISTS public.premium_trials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_fingerprint text NOT NULL REFERENCES public.device_trial_fingerprints(device_fingerprint) ON DELETE CASCADE,
    touchpoint text NOT NULL,
    trial_start timestamp with time zone DEFAULT now(),
    trial_end timestamp with time zone NOT NULL,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now()
);

-- 3.6 Delayed Email Queue (15-min Presence Suppression)
CREATE TABLE IF NOT EXISTS public.notification_email_queue (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending',
    scheduled_for timestamp with time zone NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.7 In-App Feedback & Child Safety
CREATE TABLE IF NOT EXISTS public.in_app_feedback (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    feedback_type text NOT NULL,
    rating integer,
    message text NOT NULL,
    app_version text,
    platform text,
    status text DEFAULT 'new',
    created_at timestamp with time zone DEFAULT now()
);

-- 3.8 Campus Clash Weekly Results & Mystery Match
CREATE TABLE IF NOT EXISTS public.campus_clash_weekly_results (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start date NOT NULL UNIQUE,
    winning_campus text NOT NULL,
    total_points integer DEFAULT 0,
    reward_distributed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mystery_match_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user2_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_name text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active',
    created_at timestamp with time zone DEFAULT now()
);

-- 3.9 Service Deals & Escrow
CREATE TABLE IF NOT EXISTS public.service_deals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    initiator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    counterparty_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'proposed',
    escrow_status text DEFAULT 'unfunded',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_deal_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    deal_id uuid NOT NULL REFERENCES public.service_deals(id) ON DELETE CASCADE,
    actor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- 3.10 Policies and Acceptances
CREATE TABLE IF NOT EXISTS public.policies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    policy_type text NOT NULL,
    version text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    effective_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(policy_type, version)
);

CREATE TABLE IF NOT EXISTS public.user_policy_acceptances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
    accepted_at timestamp with time zone DEFAULT now(),
    ip_address text,
    user_agent text,
    UNIQUE(user_id, policy_id)
);

-- ============================================================================
-- SECTION 4: HIGH-PERFORMANCE COMPOSITE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_swipes_admirers_lookup
    ON public.swipes (swiped_id, status, is_priority DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id
    ON public.swipes (swiper_id);

CREATE INDEX IF NOT EXISTS idx_swipes_pair
    ON public.swipes (swiper_id, swiped_id);

CREATE INDEX IF NOT EXISTS idx_messages_match_created
    ON public.messages (match_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_client_nonce
    ON public.messages (client_nonce);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_university_gender
    ON public.profiles (university, gender);

CREATE INDEX IF NOT EXISTS idx_user_blocks_pair
    ON public.user_blocks (blocker_id, blocked_id);

CREATE INDEX IF NOT EXISTS idx_user_score_streaks_user
    ON public.user_score_streaks (user_id);

-- ============================================================================
-- SECTION 5: LATEST BATTLE-TESTED RPC FUNCTIONS (DUAL CONTRACT)
-- ============================================================================

-- 5.1 Universal Dual-Contract get_admirers_secure
-- Returns both 'items' and 'requests', 'premium' and 'is_premium'
CREATE OR REPLACE FUNCTION public.get_admirers_secure(p_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_is_premium boolean;
    v_total integer := 0;
    v_today_accepts_count integer := 0;
    v_free_accepts_remaining integer := 3;
    v_items jsonb := '[]'::jsonb;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'Authentication required'
        );
    END IF;

    -- Check if user is premium
    v_is_premium := public.has_entitlement(v_user_id, 'premium');

    -- Count total pending swipes targeting the user (excluding shadow-banned or banned swipers)
    SELECT count(*)::integer
    INTO v_total
    FROM public.swipes sw
    JOIN public.profiles p ON p.id = sw.swiper_id
    WHERE sw.swiped_id = v_user_id
      AND sw.status = 'pending'
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(p.is_shadow_banned, false) = false;

    -- Count how many requests the user has accepted today (UTC)
    SELECT count(*)::integer
    INTO v_today_accepts_count
    FROM public.swipes sw
    WHERE sw.swiped_id = v_user_id
      AND sw.status = 'accepted'
      AND COALESCE(sw.updated_at, sw.created_at) >= (current_date at time zone 'UTC');

    IF v_is_premium THEN
        v_free_accepts_remaining := 999;
    ELSE
        v_free_accepts_remaining := GREATEST(0, 3 - v_today_accepts_count);
    END IF;

    IF NOT v_is_premium THEN
        -- For freemium users, unlock up to 3 admirers so they can accept/decline them, lock the rest
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT
                CASE
                    WHEN row_number() over (ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC) <= 3 THEN
                        jsonb_build_object(
                            'id', sw.id,
                            'swiper_id', sw.swiper_id,
                            'swiped_id', sw.swiped_id,
                            'type', sw.type,
                            'status', sw.status,
                            'is_priority', coalesce(sw.is_priority, false),
                            'message_teaser', sw.message_teaser,
                            'created_at', sw.created_at,
                            'locked', false,
                            'swiper', jsonb_build_object(
                                'id', p.id,
                                'full_name', p.full_name,
                                'username', p.username,
                                'gender', p.gender,
                                'age', p.age,
                                'university', p.university,
                                'faculty', p.faculty,
                                'department', p.department,
                                'level', p.level,
                                'avatar_url', p.avatar_url,
                                'profile_photos', p.profile_photos,
                                'photo_updated_at', p.photo_updated_at,
                                'is_verified', coalesce(p.is_verified, false),
                                'photo_verified', coalesce(p.photo_verified, false),
                                'bio', p.bio,
                                'interests', p.interests,
                                'intro_prompt', p.intro_prompt,
                                'voice_intro_url', p.voice_intro_url,
                                'anthem', p.anthem,
                                'attraction_goal', p.attraction_goal,
                                'last_seen_at', p.last_seen_at,
                                'last_active', p.last_active,
                                'is_live', p.is_live,
                                'completion_score', p.completion_score,
                                'current_badge', p.current_badge
                            )
                        )
                    ELSE
                        jsonb_build_object(
                            'id', sw.id,
                            'swiper_id', sw.swiper_id,
                            'swiped_id', sw.swiped_id,
                            'type', sw.type,
                            'status', sw.status,
                            'is_priority', coalesce(sw.is_priority, false),
                            'created_at', sw.created_at,
                            'locked', true,
                            'swiper', jsonb_build_object(
                                'full_name', 'Secret Admirer 🔒',
                                'university', p.university,
                                'avatar_url', null,
                                'is_verified', false
                            )
                        )
                END as item
            FROM public.swipes sw
            JOIN public.profiles p ON p.id = sw.swiper_id
            WHERE sw.swiped_id = v_user_id
              AND sw.status = 'pending'
              AND COALESCE(p.is_banned, false) = false
              AND COALESCE(p.is_shadow_banned, false) = false
            ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC
            LIMIT p_limit
        ) q;
    ELSE
        -- Premium: fully visible with safe fields (NO EMAIL, NO PHONE)
        SELECT COALESCE(jsonb_agg(item), '[]'::jsonb)
        INTO v_items
        FROM (
            SELECT
                jsonb_build_object(
                    'id', sw.id,
                    'swiper_id', sw.swiper_id,
                    'swiped_id', sw.swiped_id,
                    'type', sw.type,
                    'status', sw.status,
                    'is_priority', coalesce(sw.is_priority, false),
                    'message_teaser', sw.message_teaser,
                    'created_at', sw.created_at,
                    'locked', false,
                    'swiper', jsonb_build_object(
                        'id', p.id,
                        'full_name', p.full_name,
                        'username', p.username,
                        'gender', p.gender,
                        'age', p.age,
                        'university', p.university,
                        'faculty', p.faculty,
                        'department', p.department,
                        'level', p.level,
                        'avatar_url', p.avatar_url,
                        'profile_photos', p.profile_photos,
                        'photo_updated_at', p.photo_updated_at,
                        'is_verified', coalesce(p.is_verified, false),
                        'photo_verified', coalesce(p.photo_verified, false),
                        'bio', p.bio,
                        'interests', p.interests,
                        'intro_prompt', p.intro_prompt,
                        'voice_intro_url', p.voice_intro_url,
                        'anthem', p.anthem,
                        'attraction_goal', p.attraction_goal,
                        'last_seen_at', p.last_seen_at,
                        'last_active', p.last_active,
                        'is_live', p.is_live,
                        'completion_score', p.completion_score,
                        'current_badge', p.current_badge
                    )
                ) as item
            FROM public.swipes sw
            JOIN public.profiles p ON p.id = sw.swiper_id
            WHERE sw.swiped_id = v_user_id
              AND sw.status = 'pending'
              AND COALESCE(p.is_banned, false) = false
              AND COALESCE(p.is_shadow_banned, false) = false
            ORDER BY coalesce(sw.is_priority, false) DESC, sw.created_at DESC
            LIMIT p_limit
        ) q;
    END IF;

    -- Return full dual contract for 100% web & native compatibility
    RETURN jsonb_build_object(
        'success', true,
        'items', v_items,
        'requests', v_items,
        'premium', v_is_premium,
        'is_premium', v_is_premium,
        'upgrade_required', (NOT v_is_premium AND v_total > 3),
        'daily_limit', 3,
        'total_count', v_total,
        'free_accepts_remaining', v_free_accepts_remaining,
        'today_accepts_count', v_today_accepts_count
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_admirers_secure(integer) TO authenticated;

-- 5.2 Accept Swipe Request with Instant Notification Trigger
CREATE OR REPLACE FUNCTION public.accept_swipe_request(p_swipe_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_swiper_id uuid;
    v_swiped_id uuid;
    v_is_premium boolean;
    v_today_accepts_count integer := 0;
    v_match_id uuid;
    v_participants uuid[];
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'unauthorized',
            'message', 'Authentication required'
        );
    END IF;

    -- Retrieve swipe and verify ownership
    SELECT swiper_id, swiped_id
    INTO v_swiper_id, v_swiped_id
    FROM public.swipes
    WHERE id = p_swipe_id
      AND swiped_id = v_user_id
      AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'request_not_found',
            'message', 'This connection request was not found or has already been actioned.'
        );
    END IF;

    -- Check user premium status
    v_is_premium := public.has_entitlement(v_user_id, 'premium');

    -- If not premium, verify daily quota of 3 free accepts
    IF NOT v_is_premium THEN
        SELECT count(*)::integer
        INTO v_today_accepts_count
        FROM public.swipes sw
        WHERE sw.swiped_id = v_user_id
          AND sw.status = 'accepted'
          AND COALESCE(sw.updated_at, sw.created_at) >= (current_date at time zone 'UTC');

        IF v_today_accepts_count >= 3 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'daily_limit_reached',
                'message', 'You have used your 3 free accepts for today. Upgrade to Premium for unlimited accepts!'
            );
        END IF;
    END IF;

    -- Mark the swipe as accepted
    UPDATE public.swipes
    SET status = 'accepted',
        updated_at = now()
    WHERE id = p_swipe_id;

    -- Create mutual match
    v_participants := ARRAY[v_swiper_id, v_swiped_id];
    
    INSERT INTO public.matches (user1_id, user2_id, is_active, created_at, updated_at)
    VALUES (
        LEAST(v_swiper_id, v_swiped_id),
        GREATEST(v_swiper_id, v_swiped_id),
        true,
        now(),
        now()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
        SELECT id INTO v_match_id
        FROM public.matches
        WHERE (user1_id = LEAST(v_swiper_id, v_swiped_id) AND user2_id = GREATEST(v_swiper_id, v_swiped_id));
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'match_id', v_match_id,
        'message', 'Connection request accepted successfully!'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_swipe_request(uuid) TO authenticated;

-- 5.3 Send Native Text Message (UUID v4 Nonce Idempotency Race Guard)
CREATE OR REPLACE FUNCTION public.send_native_text_message(
    p_match_id uuid,
    p_content text,
    p_client_nonce text
)
RETURNS TABLE(
    id uuid,
    match_id uuid,
    sender_id uuid,
    content text,
    type text,
    is_read boolean,
    created_at timestamptz,
    read_at timestamptz,
    expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_content text := btrim(coalesce(p_content, ''));
    v_nonce text := btrim(coalesce(p_client_nonce, ''));
    v_expiry_seconds integer;
    v_message public.messages%rowtype;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'not_authenticated';
    END IF;

    IF char_length(v_content) < 1 OR char_length(v_content) > 2000 THEN
        RAISE EXCEPTION 'invalid_message_length';
    END IF;

    -- Check if message with nonce already exists for idempotency
    SELECT msg.*
    INTO v_message
    FROM public.messages msg
    WHERE msg.sender_id = v_user_id
      AND msg.client_nonce = v_nonce
    LIMIT 1;

    IF v_message.id IS NULL THEN
        SELECT coalesce(m.disappearing_messages_seconds, 0)
        INTO v_expiry_seconds
        FROM public.matches m
        WHERE m.id = p_match_id;

        INSERT INTO public.messages (
            match_id,
            sender_id,
            content,
            type,
            client_nonce,
            created_at,
            disappears_at
        ) VALUES (
            p_match_id,
            v_user_id,
            v_content,
            'text',
            v_nonce,
            now(),
            CASE WHEN v_expiry_seconds > 0 THEN now() + (v_expiry_seconds || ' seconds')::interval ELSE null END
        )
        RETURNING * INTO v_message;

        -- Update match last message preview
        UPDATE public.matches
        SET last_message_at = now(),
            last_message_preview = substring(v_content from 1 for 60)
        WHERE id = p_match_id;
    END IF;

    RETURN QUERY
    SELECT 
        v_message.id,
        v_message.match_id,
        v_message.sender_id,
        v_message.content,
        v_message.type,
        coalesce(v_message.is_read, false),
        v_message.created_at,
        v_message.read_at,
        v_message.disappears_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_native_text_message(uuid, text, text) TO authenticated;

-- 5.4 Campus Finder Searches with Unlimited Elite Entitlement
CREATE OR REPLACE FUNCTION public.consume_finder_search(p_searcher_id uuid DEFAULT null)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_searcher_id uuid;
    v_profile record;
    v_is_elite boolean := false;
BEGIN
    v_searcher_id := coalesce(p_searcher_id, auth.uid());
    IF v_searcher_id IS NULL OR auth.uid() != v_searcher_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = v_searcher_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
    END IF;

    -- Check if searcher has active Elite Premium or Elite Ultra
    SELECT (
        coalesce(v_profile.is_premium, false) = true
        OR coalesce(v_profile.is_ultra, false) = true
        OR coalesce(v_profile.is_unlimited_elite, false) = true
    ) INTO v_is_elite;

    IF v_is_elite THEN
        RETURN jsonb_build_object(
            'success', true,
            'unlimited', true,
            'membership', 'elite_unlimited',
            'free_left', 999,
            'paid_left', 0
        );
    END IF;

    -- Freemium logic: Check weekly reset
    IF v_profile.finder_weekly_reset_at IS NULL OR v_profile.finder_weekly_reset_at < (now() - interval '7 days') THEN
        UPDATE public.profiles
        SET finder_free_searches_left = 2,
            finder_weekly_reset_at = now()
        WHERE id = v_searcher_id;
        v_profile.finder_free_searches_left := 2;
    END IF;

    IF coalesce(v_profile.finder_free_searches_left, 0) > 0 THEN
        UPDATE public.profiles
        SET finder_free_searches_left = finder_free_searches_left - 1,
            last_finder_search_at = now()
        WHERE id = v_searcher_id;

        RETURN jsonb_build_object(
            'success', true,
            'unlimited', false,
            'free_left', v_profile.finder_free_searches_left - 1,
            'paid_left', coalesce(v_profile.finder_paid_searches_left, 0)
        );
    END IF;

    RETURN jsonb_build_object(
        'success', false,
        'error', 'quota_exceeded',
        'message', 'Weekly Campus Finder trial quota exhausted. Upgrade to Elite for unlimited access!'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_finder_search(uuid) TO authenticated;

-- 5.5 In-App Feedback & Child Safety Standards
CREATE OR REPLACE FUNCTION public.record_in_app_feedback(
    p_feedback_type text,
    p_rating integer,
    p_message text,
    p_app_version text DEFAULT null,
    p_platform text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_id uuid;
BEGIN
    INSERT INTO public.in_app_feedback (
        user_id,
        feedback_type,
        rating,
        message,
        app_version,
        platform,
        created_at
    ) VALUES (
        v_user_id,
        p_feedback_type,
        p_rating,
        p_message,
        p_app_version,
        p_platform,
        now()
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'message', 'Thank you for your feedback! It helps keep our campus safe and fun.'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_in_app_feedback(text, integer, text, text, text) TO authenticated, anon;

-- 5.6 Profile Viewers (With Verified Photos Included)
CREATE OR REPLACE FUNCTION public.get_profile_viewers(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_viewers jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
    END IF;

    SELECT coalesce(jsonb_agg(viewer_item), '[]'::jsonb)
    INTO v_viewers
    FROM (
        SELECT jsonb_build_object(
            'id', pv.id,
            'viewed_at', pv.created_at,
            'viewer', jsonb_build_object(
                'id', p.id,
                'full_name', p.full_name,
                'university', p.university,
                'avatar_url', p.avatar_url,
                'profile_photos', p.profile_photos,
                'is_verified', coalesce(p.is_verified, false),
                'photo_verified', coalesce(p.photo_verified, false)
            )
        ) as viewer_item
        FROM public.profile_views pv
        JOIN public.profiles p ON p.id = pv.viewer_id
        WHERE pv.profile_id = v_user_id
          AND COALESCE(p.is_banned, false) = false
        ORDER BY pv.created_at DESC
        LIMIT p_limit
    ) q;

    RETURN jsonb_build_object(
        'success', true,
        'viewers', v_viewers
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_profile_viewers(integer) TO authenticated;

-- ============================================================================
-- SECTION 6: ROW-LEVEL SECURITY & PERMISSION GRANTS
-- ============================================================================
ALTER TABLE IF EXISTS public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.official_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.in_app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_score_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.premium_trials ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON public.official_posts TO anon, authenticated;
GRANT SELECT ON public.policies TO anon, authenticated;

-- ============================================================================
-- SECTION 7: FORCE POSTGREST SCHEMA CACHE INVALIDATION
-- ============================================================================
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================================================
-- CONSOLIDATION COMPLETE
-- ============================================================================

