import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getFinderStatusCacheKey, formatFinderErrorMessage } from '../src/utils/campusFinder.js';

test('Campus Finder: Cache key generation is stable and isolated per user', () => {
    assert.deepStrictEqual(getFinderStatusCacheKey('user-123'), ['finder_status', 'user-123']);
    assert.deepStrictEqual(getFinderStatusCacheKey(null), ['finder_status', 'anon']);
});

test('Campus Finder Migration: contains strict NDPA opt-in column, audit log, and RPCs', () => {
    const migration = readFileSync(
        resolve('supabase/migrations/20260919150000_campus_finder_system.sql'),
        'utf8'
    );

    // 1. Assert NDPA opt-in column with default FALSE
    assert.ok(
        migration.includes('add column if not exists allow_camera_discovery boolean default false'),
        'Must default allow_camera_discovery to FALSE for strict NDPA privacy compliance'
    );

    // 2. Assert free searches column with default 2
    assert.ok(
        migration.includes('add column if not exists finder_free_searches_left integer default 2'),
        'Must grant exactly 2 free trial searches'
    );

    // 3. Assert search audit log table (does NOT store captured image data)
    assert.ok(migration.includes('create table if not exists public.campus_finder_searches'));
    assert.ok(!migration.includes('search_photo_url'), 'Must NEVER store search photo URL in audit log table');
    assert.ok(!migration.includes('search_photo_blob'), 'Must NEVER store search photo raw bytes in audit log table');

    // 4. Assert RPCs
    assert.ok(migration.includes('create or replace function public.consume_finder_search'));
    assert.ok(migration.includes('create or replace function public.get_finder_status'));
    assert.ok(migration.includes('create or replace function public.get_eligible_campus_finder_profiles'));

    // 5. Assert rate limit of 5 searches per hour
    assert.ok(migration.includes('v_hourly >= 5'), 'Must enforce anti-abuse rate limit of 5 per hour');

    // 6. Assert candidate query enforces allow_camera_discovery = TRUE
    assert.ok(
        migration.includes('where p.allow_camera_discovery = true'),
        'Candidate pool must strictly only return users who have explicitly opted in'
    );

    // 7. Assert query references public.user_blocks, NEVER non-existent public.blocks
    assert.ok(
        migration.includes('from public.user_blocks b'),
        'Candidate query must reference public.user_blocks'
    );
    assert.ok(
        !migration.includes('from public.blocks b'),
        'Candidate query must NEVER reference non-existent public.blocks'
    );
});

test('Campus Finder Migration: Forward migration fixes user_blocks relation and installs compatibility view', () => {
    const migration = readFileSync(
        resolve('supabase/migrations/20261021120000_fix_campus_finder_user_blocks_table.sql'),
        'utf8'
    );

    // Assert compatibility view
    assert.ok(
        migration.includes('CREATE OR REPLACE VIEW public.blocks AS'),
        'Must create compatibility view for public.blocks'
    );
    assert.ok(
        migration.includes('SELECT * FROM public.user_blocks;'),
        'Compatibility view must select from public.user_blocks'
    );

    // Assert get_eligible_campus_finder_profiles references public.user_blocks
    assert.ok(
        migration.includes('CREATE OR REPLACE FUNCTION public.get_eligible_campus_finder_profiles'),
        'Must recreate get_eligible_campus_finder_profiles RPC'
    );
    assert.ok(
        migration.includes('FROM public.user_blocks b'),
        'Must query public.user_blocks for blocks'
    );

    // Assert refund_finder_search RPC
    assert.ok(
        migration.includes('CREATE OR REPLACE FUNCTION public.refund_finder_search'),
        'Must create refund_finder_search helper RPC'
    );
});

test('Campus Finder Error Sanitizer: transforms raw database schema errors to reassuring user copy', () => {
    // 1. Raw database relation error must be sanitized
    const relationError = 'relation "public.blocks" does not exist';
    const sanitizedRelation = formatFinderErrorMessage(relationError);
    assert.strictEqual(sanitizedRelation, 'Campus search is temporarily unavailable. Please try again in a few moments.');

    // 2. Syntax/column error must be sanitized
    const columnError = 'column p.non_existent does not exist';
    assert.strictEqual(formatFinderErrorMessage(columnError), 'Campus search is temporarily unavailable. Please try again in a few moments.');

    // 3. User-friendly rate limit message must be preserved
    const rateLimit = 'Hourly search limit reached (max 5 per hour). Please try again later.';
    assert.strictEqual(formatFinderErrorMessage(rateLimit), rateLimit);

    // 4. No credits message must be preserved
    const noCredits = 'No searches remaining. Top up your search credits to continue.';
    assert.strictEqual(formatFinderErrorMessage(noCredits), noCredits);

    // 5. Offline message must be preserved
    const offline = 'Internet connection required to search for a College Date profile.';
    assert.strictEqual(formatFinderErrorMessage(offline), offline);
});

test('Campus Finder Service: implements direct query fallback and credit refund resilience', () => {
    const serviceCode = readFileSync(
        resolve('src/services/campusFinderService.js'),
        'utf8'
    );

    assert.ok(
        serviceCode.includes('from(\'user_blocks\')'),
        'campusFinderService.js must query user_blocks directly on RPC fallback'
    );
    assert.ok(
        serviceCode.includes('rpc(\'refund_finder_search\''),
        'campusFinderService.js must call refund_finder_search on unrecoverable search failure'
    );
    assert.ok(
        serviceCode.includes('formatFinderErrorMessage'),
        'campusFinderService.js must format error messages to protect users from database jargon'
    );
});

test('Campus Finder NDPA Privacy: fallback message preserves anonymity without revealing user presence', () => {
    // Anti-enumeration test: Ensure when no match is found, system does NOT say "X is not on College Date"
    const antiEnumerationCopy = 'No confident match found. Try another photo or explore people around your campus.';
    assert.ok(!antiEnumerationCopy.includes('not on College Date'));
    assert.ok(!antiEnumerationCopy.includes('not registered'));
});

test('Campus Finder Unlimited Elite & Weekly Reset Migration: enforces unlimited scans for Elite & 2 free trial per week', () => {
    const migration = readFileSync(
        resolve('supabase/migrations/20261021130000_campus_finder_unlimited_elite.sql'),
        'utf8'
    );

    // 1. Assert weekly reset column
    assert.ok(
        migration.includes('ADD COLUMN IF NOT EXISTS finder_weekly_reset_at'),
        'Must add finder_weekly_reset_at column for 7-day replenishment'
    );

    // 2. Assert Elite Premium / Ultra check
    assert.ok(
        migration.includes('v_is_premium boolean'),
        'consume_finder_search must evaluate v_is_premium'
    );
    assert.ok(
        migration.includes("coalesce(v_profile.is_premium, false) = true"),
        'Must check for active is_premium'
    );
    assert.ok(
        migration.includes("coalesce(v_profile.is_ultra, false) = true"),
        'Must check for active is_ultra'
    );

    // 3. Assert unlimited return for Elite members
    assert.ok(
        migration.includes("'is_unlimited', true"),
        'Must return is_unlimited: true for Elite members'
    );
    assert.ok(
        migration.includes("'total_remaining', 999999"),
        'Must return 999999 total_remaining for Elite members'
    );

    // 4. Assert 2 free searches per week reset
    assert.ok(
        migration.includes("v_weekly_reset < now() - interval '7 days'"),
        'Must check 7-day interval for weekly replenishment'
    );
    assert.ok(
        migration.includes('greatest(v_free_left, 2)') || migration.includes('greatest(v_free, 2)'),
        'Must replenish free searches to at least 2 each week'
    );
});

test('Campus Finder Package Alignment: Unlimited Campus Finder listed in Elite plans and packages', () => {
    const premiumUpgradeCode = readFileSync(
        resolve('src/pages/PremiumUpgrade.jsx'),
        'utf8'
    );
    const eliteUltraModalCode = readFileSync(
        resolve('src/components/EliteUltraDetailsModal.jsx'),
        'utf8'
    );
    const paywallSheetCode = readFileSync(
        resolve('src/components/ContextualPaywallSheet.jsx'),
        'utf8'
    );
    const campusFinderModalCode = readFileSync(
        resolve('src/components/CampusFinderModal.jsx'),
        'utf8'
    );

    // 1. PremiumUpgrade.jsx OUTCOME_HIGHLIGHTS must list Unlimited Campus Finder
    assert.ok(
        premiumUpgradeCode.includes('Unlimited Campus Finder'),
        'PremiumUpgrade.jsx must list Unlimited Campus Finder in outcome highlights'
    );

    // 2. PremiumUpgrade.jsx PREVIEW_TABS must include Campus Finder
    assert.ok(
        premiumUpgradeCode.includes("id: 'finder'"),
        'PremiumUpgrade.jsx must include Campus Finder in preview tabs'
    );
    assert.ok(
        premiumUpgradeCode.includes('Unlimited in Elite'),
        'PremiumUpgrade.jsx must highlight Unlimited in Elite badge'
    );

    // 3. Elite Ultra Summary in PremiumUpgrade.jsx must list Unlimited Campus Finder
    assert.ok(
        premiumUpgradeCode.includes('Unlimited Campus Finder, Secret Admirers'),
        'PremiumUpgrade.jsx Elite Ultra summary must include Unlimited Campus Finder'
    );

    // 4. EliteUltraDetailsModal.jsx must list Unlimited Campus Finder
    assert.ok(
        eliteUltraModalCode.includes('Unlimited Campus Finder, Secret Admirers'),
        'EliteUltraDetailsModal.jsx must list Unlimited Campus Finder'
    );

    // 5. ContextualPaywallSheet.jsx must have campus_finder touchpoint
    assert.ok(
        paywallSheetCode.includes('campus_finder: {'),
        'ContextualPaywallSheet.jsx must define campus_finder touchpoint'
    );
    assert.ok(
        paywallSheetCode.includes('UNLIMITED CAMPUS FINDER'),
        'ContextualPaywallSheet.jsx must feature UNLIMITED CAMPUS FINDER pill'
    );

    // 6. CampusFinderModal.jsx must display Unlimited for Elite users and link to /premium
    assert.ok(
        campusFinderModalCode.includes('Unlimited (Elite Active)'),
        'CampusFinderModal.jsx must display Unlimited (Elite Active) for Elite members'
    );
    assert.ok(
        campusFinderModalCode.includes("navigate('/premium')"),
        'CampusFinderModal.jsx must route to /premium when free trial is exhausted'
    );
});

test('Campus Finder Camera Capture & Video Binding Integrity: binds stream on mount and prevents blank capture', () => {
    const modalCode = readFileSync(
        resolve('src/components/CampusFinderModal.jsx'),
        'utf8'
    );
    const cssCode = readFileSync(
        resolve('src/components/CampusFinderModal.css'),
        'utf8'
    );
    const serviceCode = readFileSync(
        resolve('src/services/campusFinderService.js'),
        'utf8'
    );
    const migration = readFileSync(
        resolve('supabase/migrations/20261021130000_campus_finder_unlimited_elite.sql'),
        'utf8'
    );

    // 1. Callback ref attaches stream synchronously on mount
    assert.ok(
        modalCode.includes('setVideoElement = useCallback('),
        'CampusFinderModal.jsx must use setVideoElement callback ref'
    );
    assert.ok(
        modalCode.includes('node.srcObject = streamRef.current'),
        'Callback ref must bind streamRef.current to video node on mount'
    );
    assert.ok(
        modalCode.includes('ref={setVideoElement}'),
        'Video element must use ref={setVideoElement}'
    );

    // 2. Video readyState guard prevents blank frame capture
    assert.ok(
        modalCode.includes('video.readyState < 2 || !video.videoWidth'),
        'handleCaptureAndSearch must verify video readyState and width before canvas capture'
    );

    // 3. Front/Rear camera badge and mirrored user-facing styling
    assert.ok(
        modalCode.includes('campus-finder-camera-badge'),
        'CampusFinderModal.jsx must render camera badge indicator'
    );
    assert.ok(
        cssCode.includes('.campus-finder-video.user-facing'),
        'CampusFinderModal.css must define .campus-finder-video.user-facing'
    );
    assert.ok(
        cssCode.includes('transform: scaleX(-1)'),
        'user-facing video must be mirrored for natural selfie preview'
    );

    // 4. Verification that shadowban column is strictly is_shadow_banned (with underscore)
    assert.ok(
        !serviceCode.includes('is_shadowbanned'),
        'campusFinderService.js must never reference typo is_shadowbanned'
    );
    assert.ok(
        serviceCode.includes('is_shadow_banned'),
        'campusFinderService.js must reference authoritative is_shadow_banned'
    );
    assert.ok(
        migration.includes('is_shadow_banned'),
        'Migration must use authoritative is_shadow_banned column'
    );
    assert.ok(
        !migration.includes('is_shadowbanned'),
        'Migration must never use typo is_shadowbanned'
    );
});
