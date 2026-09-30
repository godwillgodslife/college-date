import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    ACTIVE_PROGRAM_CONFIG,
    calculateProjectedEarnings,
    isQualifiedForSettlement,
    formatCurrencyNgn
} from '../src/services/activeProgramService.js';

test('Active Program Config: defaults match campus ambassador retention specifications', () => {
    assert.strictEqual(ACTIVE_PROGRAM_CONFIG.DAILY_PAYOUT_AMOUNT, 625, 'Daily payout must be ₦625');
    assert.strictEqual(ACTIVE_PROGRAM_CONFIG.MIN_DAYS_FOR_SETTLEMENT, 24, 'Minimum active days must be 24');
    assert.strictEqual(ACTIVE_PROGRAM_CONFIG.REQUIRED_SWIPES_PER_DAY, 15, 'Required daily swipes must be 15');
    assert.strictEqual(ACTIVE_PROGRAM_CONFIG.REQUIRED_CHATS_PER_DAY, 3, 'Required daily chats must be 3');
    assert.strictEqual(ACTIVE_PROGRAM_CONFIG.MAX_MONTHLY_EARNINGS, 15000, 'Max monthly cap must be ₦15,000');
});

test('Active Program Logic: monthly earnings calculation and settlement threshold', () => {
    // Under 24 days
    assert.strictEqual(isQualifiedForSettlement(0), false);
    assert.strictEqual(isQualifiedForSettlement(23), false);
    assert.strictEqual(calculateProjectedEarnings(23), 23 * 625);

    // Meets 24 days threshold
    assert.strictEqual(isQualifiedForSettlement(24), true);
    assert.strictEqual(calculateProjectedEarnings(24), 15000);

    // Standard 25+ days capped at 15,000
    assert.strictEqual(isQualifiedForSettlement(25), true);
    assert.strictEqual(calculateProjectedEarnings(25), 15000);

    // Max cap (30 days)
    assert.strictEqual(isQualifiedForSettlement(30), true);
    assert.strictEqual(calculateProjectedEarnings(30), 15000);

    // Beyond 30 days is capped at 15,000
    assert.strictEqual(calculateProjectedEarnings(31), 15000);
    assert.strictEqual(calculateProjectedEarnings(50), 15000);

    // Formatting helper
    assert.strictEqual(formatCurrencyNgn(15000), '₦15,000');
    assert.strictEqual(formatCurrencyNgn(625), '₦625');
});

test('Active Program Migration: schema definitions, security constraints, and RPCs', () => {
    const migration = readFileSync(
        resolve('supabase/migrations/20260920150000_college_date_active_system.sql'),
        'utf8'
    ).toLowerCase();

    // Tables
    assert.ok(migration.includes('create table if not exists public.active_program_config'), 'config table must exist');
    assert.ok(migration.includes('create table if not exists public.active_program_participants'), 'participants table must exist');
    assert.ok(migration.includes('create table if not exists public.active_program_daily_logs'), 'daily logs table must exist');
    assert.ok(migration.includes('create table if not exists public.active_program_settlements'), 'settlements table must exist');

    // Security & RLS
    assert.ok(migration.includes('alter table public.active_program_participants enable row level security'));
    assert.ok(migration.includes('alter table public.active_program_daily_logs enable row level security'));
    assert.ok(migration.includes('alter table public.active_program_settlements enable row level security'));

    // Server-authoritative RPCs
    assert.ok(migration.includes('function public.get_active_program_status'), 'get_active_program_status RPC must exist');
    assert.ok(migration.includes('function public.enroll_in_active_program'), 'enroll_in_active_program RPC must exist');
    assert.ok(migration.includes('function public.evaluate_active_daily_qualification'), 'evaluate_active_daily_qualification RPC must exist');
    assert.ok(migration.includes('function public.settle_monthly_active_earnings'), 'settle_monthly_active_earnings RPC must exist');

    // Security definer with search_path protection
    assert.ok(migration.includes('security definer'), 'RPCs must be security definer');
    assert.ok(migration.includes('search_path = public'), 'RPCs must restrict search_path');

    // Wallet settlement integration: available_balance credit and ambassador_payout category
    assert.ok(migration.includes('ambassador_payout'), 'Settlement must record ambassador_payout category');
    assert.ok(migration.includes('available_balance = available_balance + v_participant.accrued_earnings'), 'Settlement must credit available balance');
});

test('Match Celebration Flow: Match, Explore, and Requests pass match_id and open popup correctly', () => {
    const matchCode = readFileSync(resolve('src/pages/Match.jsx'), 'utf8');
    const exploreCode = readFileSync(resolve('src/pages/Explore.jsx'), 'utf8');
    const requestsCode = readFileSync(resolve('src/pages/Requests.jsx'), 'utf8');

    // Match.jsx
    assert.ok(matchCode.includes('import MatchCelebration from'), 'Match.jsx must import MatchCelebration');
    assert.ok(matchCode.includes('<MatchCelebration'), 'Match.jsx must mount MatchCelebration at root level');
    assert.ok(matchCode.includes('setMatchData({ ...swipedProfile, match_id: result.match_id })'), 'Match.jsx must set matchData with profile and match_id');

    // Explore.jsx
    assert.ok(exploreCode.includes('import MatchCelebration from'), 'Explore.jsx must import MatchCelebration');
    assert.ok(exploreCode.includes('if (result.isMatch)'), 'Explore.jsx must check result.isMatch instead of buggy data.is_match');
    assert.ok(exploreCode.includes('setMatchData({'), 'Explore.jsx must set matchData for popup');
    assert.ok(exploreCode.includes('<MatchCelebration'), 'Explore.jsx must mount MatchCelebration');

    // Requests.jsx
    assert.ok(requestsCode.includes('import MatchCelebration from'), 'Requests.jsx must import MatchCelebration');
    assert.ok(requestsCode.includes('setMatchData({'), 'Requests.jsx must set matchData on accept');
    assert.ok(requestsCode.includes('<MatchCelebration'), 'Requests.jsx must mount MatchCelebration before navigation');
});

test('Active Program Dashboard & Wallet: UI components hooked properly', () => {
    const dashboardCode = readFileSync(resolve('src/pages/Dashboard.jsx'), 'utf8');
    const walletCode = readFileSync(resolve('src/pages/Wallet.jsx'), 'utf8');

    assert.ok(dashboardCode.includes('CollegeDateActiveModal'), 'Dashboard must import CollegeDateActiveModal');
    assert.ok(dashboardCode.includes('useActiveProgram'), 'Dashboard must use useActiveProgram hook');
    assert.ok(dashboardCode.includes('dashboard-active-program-card'), 'Dashboard must render active program card');
    assert.ok(dashboardCode.includes('isFemale'), 'Dashboard must restrict card visibility to female cohort');

    assert.ok(walletCode.includes('CollegeDateActiveModal'), 'Wallet must import CollegeDateActiveModal');
    assert.ok(walletCode.includes('useActiveProgram'), 'Wallet must use useActiveProgram hook');
    assert.ok(walletCode.includes('College Date Active'), 'Wallet must render active program section');
    assert.ok(walletCode.includes('isFemale'), 'Wallet must restrict card visibility to female cohort');
});
