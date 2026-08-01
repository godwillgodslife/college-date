-- The College Date staging schema baseline
-- Scope: optional synthetic/static seed structure only.
--
-- No production data is included. Do not copy production users, profiles, messages,
-- matches, wallets, payment records, referrals, media records, push tokens, or
-- moderation records into staging.

-- This file is intentionally empty until product-owned synthetic fixtures are
-- approved. Suitable future contents:
-- - Static university/polytechnic lookup catalog, if converted into a non-user table.
-- - Synthetic product/catalog rows with test provider identifiers only.
-- - Non-sensitive app_config defaults reviewed for staging.

-- Required before functional staging tests:
-- 1. Configure Supabase Auth providers separately in the staging dashboard.
-- 2. Configure Edge Function secrets separately in staging.
-- 3. Create synthetic test users through the staging Auth API or dashboard.
-- 4. Create matching synthetic profiles tied to those staging auth.users rows.
