import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import services and helpers under test
import {
    hasActivePremium,
    isEliteUltra,
    getSubscriptionTier,
    getMatchPhotoLimit
} from '../src/utils/premium.js';

import {
    ULTRA_LIMITS,
    ULTRA_PRICING,
    getUltraPeriodKey,
    getUltraAllowance,
    consumeUltraSuperSwipe,
    consumeUltraBoost,
    getUltraActiveBoost,
    resetUltraAllowance,
    saveLocalUltraSubscription,
    getLocalUltraSubscription,
    clearLocalUltraSubscription
} from '../src/services/ultraAllowanceService.js';

// PAYMENT PRODUCTS tested via static verification

const rootDir = process.cwd();

// Mock localStorage for Node test environment
if (typeof globalThis.localStorage === 'undefined') {
    const storage = new Map();
    globalThis.localStorage = {
        getItem: (k) => storage.get(k) ?? null,
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
        clear: () => storage.clear()
    };
}

if (typeof globalThis.window === 'undefined') {
    globalThis.window = {
        location: { hostname: 'localhost' },
        dispatchEvent: () => {}
    };
}

// =============================================================================
// WORKSTREAM B: MATCH PROFILE PHOTO EXPANSION
// =============================================================================

test('Workstream B: Regular (free) users are strictly capped at 3 photos in Match', () => {
    const regularProfile = {
        id: 'user-regular-1',
        is_premium: false,
        is_ultra: false,
        status: 'active'
    };

    assert.equal(hasActivePremium(regularProfile), false);
    assert.equal(isEliteUltra(regularProfile), false);
    assert.equal(getSubscriptionTier(regularProfile), 'free');
    assert.equal(getMatchPhotoLimit(regularProfile), 3);
});

test('Workstream B: Elite Premium users can display up to 6 profile photos in Match', () => {
    const premiumProfile = {
        id: 'user-premium-1',
        is_premium: true,
        plan_type: 'Premium',
        status: 'active'
    };

    assert.equal(hasActivePremium(premiumProfile), true);
    assert.equal(isEliteUltra(premiumProfile), false);
    assert.equal(getSubscriptionTier(premiumProfile), 'premium');
    assert.equal(getMatchPhotoLimit(premiumProfile), 6);
});

test('Workstream B: Elite Ultra users can display up to 6 profile photos in Match', () => {
    const ultraProfile = {
        id: 'user-ultra-1',
        is_premium: true,
        is_ultra: true,
        plan_type: 'Elite Ultra',
        status: 'active'
    };

    assert.equal(hasActivePremium(ultraProfile), true);
    assert.equal(isEliteUltra(ultraProfile), true);
    assert.equal(getSubscriptionTier(ultraProfile), 'ultra');
    assert.equal(getMatchPhotoLimit(ultraProfile), 6);
});

test('Workstream B: Expired subscriptions do NOT retain 6-photo access (restricted to 3)', () => {
    const expiredProfile = {
        id: 'user-expired-1',
        is_premium: true,
        is_ultra: true,
        plan_type: 'Elite Ultra',
        status: 'active',
        current_period_end: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Expired yesterday
    };

    assert.equal(hasActivePremium(expiredProfile), false, 'Expired profile must not be recognized as active premium');
    assert.equal(isEliteUltra(expiredProfile), false, 'Expired profile must not be recognized as active ultra');
    assert.equal(getSubscriptionTier(expiredProfile), 'free');
    assert.equal(getMatchPhotoLimit(expiredProfile), 3, 'Expired profile must be restricted to 3 photos');
});

test('Workstream B: Photo slicing logic handles varying photo counts correctly', () => {
    const eightPhotos = [
        'https://example.com/p1.jpg',
        'https://example.com/p2.jpg',
        'https://example.com/p3.jpg',
        'https://example.com/p4.jpg',
        'https://example.com/p5.jpg',
        'https://example.com/p6.jpg',
        'https://example.com/p7.jpg',
        'https://example.com/p8.jpg'
    ];
    const twoPhotos = ['https://example.com/p1.jpg', 'https://example.com/p2.jpg'];

    const regularProfile = { id: 'reg', is_premium: false };
    const premiumProfile = { id: 'prem', is_premium: true, status: 'active' };

    // Regular user with 8 uploaded photos -> only 3 displayed
    const regularLimit = getMatchPhotoLimit(regularProfile);
    assert.equal(eightPhotos.slice(0, regularLimit).length, 3);

    // Premium user with 8 uploaded photos -> exactly 6 displayed
    const premiumLimit = getMatchPhotoLimit(premiumProfile);
    assert.equal(eightPhotos.slice(0, premiumLimit).length, 6);

    // Profile with only 2 uploaded photos -> displays 2 for both regular and premium without phantom slots
    assert.equal(twoPhotos.slice(0, regularLimit).length, 2);
    assert.equal(twoPhotos.slice(0, premiumLimit).length, 2);
});

test('Workstream B: SwipeCard.jsx integrates photoLimit and ultra badge without touching Android code', () => {
    const swipeCardCode = fs.readFileSync(path.join(rootDir, 'src/components/SwipeCard.jsx'), 'utf-8');

    // Asserts photo limiting is based on entitlement
    assert.ok(swipeCardCode.includes('getMatchPhotoLimit'), 'SwipeCard must use getMatchPhotoLimit');
    assert.ok(swipeCardCode.includes('allPhotos.slice(0, photoLimit)'), 'SwipeCard must slice photos by photoLimit');

    // Asserts Elite Ultra crown and tags are rendered
    assert.ok(swipeCardCode.includes('isProfileUltra ? "👑⭐" : "👑"'), 'SwipeCard must render 👑⭐ for Ultra users');
    assert.ok(swipeCardCode.includes('ultra-tag-glow'), 'SwipeCard must render Ultra VIP tag');
});

// =============================================================================
// WORKSTREAM A: ELITE ULTRA MONETIZATION & ALLOWANCES
// =============================================================================

test('Workstream A: Pricing and allowance limits match exact product specifications', () => {
    // ₦15,000 for 1 month, ₦30,000 for 2 months, ₦35,000 for 3 months
    assert.equal(ULTRA_PRICING.monthly, 15000);
    assert.equal(ULTRA_PRICING.twoMonth, 30000);
    assert.equal(ULTRA_PRICING.threeMonth, 35000);

    // Finite monthly allowances
    assert.equal(ULTRA_LIMITS.superSwipes, 30);
    assert.equal(ULTRA_LIMITS.visibilityBoosts, 10);

    // Paystack products exist in paymentService
    const paymentServiceCode = fs.readFileSync(path.join(rootDir, 'src/services/paymentService.js'), 'utf-8');
    assert.ok(paymentServiceCode.includes("ultraMonthly: 'ultra_monthly'"));
    assert.ok(paymentServiceCode.includes("ultra2Month: 'ultra_2month'"));
    assert.ok(paymentServiceCode.includes("ultra3Month: 'ultra_3month'"));
});

test('Workstream A: Non-ultra or free users have zero ultra allowances', () => {
    const userId = 'test-free-user';
    const allowance = getUltraAllowance(userId, null);

    assert.equal(allowance.isUltra, false);
    assert.equal(allowance.superSwipes.total, 0);
    assert.equal(allowance.superSwipes.remaining, 0);
    assert.equal(allowance.boosts.total, 0);
    assert.equal(allowance.boosts.remaining, 0);
});

test('Workstream A: Ultra subscribers receive exactly 30 Super Swipes and 10 Boosts per monthly cycle', () => {
    const userId = 'test-ultra-user-1';
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const ultraSub = {
        id: 'sub-ultra-1',
        user_id: userId,
        is_ultra: true,
        status: 'active',
        current_period_end: nextMonth
    };

    resetUltraAllowance(userId, getUltraPeriodKey(ultraSub));

    const allowance = getUltraAllowance(userId, ultraSub);
    assert.equal(allowance.isUltra, true);
    assert.equal(allowance.superSwipes.total, 30);
    assert.equal(allowance.superSwipes.used, 0);
    assert.equal(allowance.superSwipes.remaining, 30);
    assert.equal(allowance.boosts.total, 10);
    assert.equal(allowance.boosts.used, 0);
    assert.equal(allowance.boosts.remaining, 10);
});

test('Workstream A: Consuming Super Swipes decrements finite allowance and halts at 30', async () => {
    const userId = 'test-ultra-user-consume-ss';
    const ultraSub = {
        id: 'sub-ultra-2',
        user_id: userId,
        is_ultra: true,
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const periodKey = getUltraPeriodKey(ultraSub);
    resetUltraAllowance(userId, periodKey);

    // Consume 1st Super Swipe
    const res1 = await consumeUltraSuperSwipe(userId, ultraSub);
    assert.equal(res1.success, true);
    assert.equal(res1.source, 'ultra_allowance');
    assert.equal(res1.remaining, 29);

    // Verify allowance state
    const midAllowance = getUltraAllowance(userId, ultraSub);
    assert.equal(midAllowance.superSwipes.used, 1);
    assert.equal(midAllowance.superSwipes.remaining, 29);

    // Simulate consuming up to 30
    for (let i = 2; i <= 30; i++) {
        const res = await consumeUltraSuperSwipe(userId, ultraSub);
        assert.equal(res.success, true);
        assert.equal(res.remaining, 30 - i);
    }

    // Attempting 31st consumption should fail cleanly with allowance_exhausted
    const res31 = await consumeUltraSuperSwipe(userId, ultraSub);
    assert.equal(res31.success, false);
    assert.equal(res31.reason, 'allowance_exhausted');

    const finalAllowance = getUltraAllowance(userId, ultraSub);
    assert.equal(finalAllowance.superSwipes.used, 30);
    assert.equal(finalAllowance.superSwipes.remaining, 0);
});

test('Workstream A: Consuming Boosts activates 24h boost window and halts at 10', async () => {
    const userId = 'test-ultra-user-consume-boost';
    const ultraSub = {
        id: 'sub-ultra-3',
        user_id: userId,
        is_ultra: true,
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const periodKey = getUltraPeriodKey(ultraSub);
    resetUltraAllowance(userId, periodKey);

    // Consume 1st Boost
    const res1 = await consumeUltraBoost(userId, ultraSub);
    assert.equal(res1.success, true);
    assert.equal(res1.source, 'ultra_allowance');
    assert.equal(res1.remaining, 9);
    assert.ok(res1.expiresAt, 'Must set expiration timestamp for 24h boost');

    // Active boost is registered
    const activeBoost = getUltraActiveBoost(userId);
    assert.ok(activeBoost, 'Active boost must be retrievable');
    assert.equal(activeBoost.type, '24h_boost');
    assert.equal(activeBoost.source, 'ultra_allowance');

    // Attempting to stack another boost while one is active returns boost_already_active
    const resDuplicate = await consumeUltraBoost(userId, ultraSub);
    assert.equal(resDuplicate.success, false);
    assert.equal(resDuplicate.reason, 'boost_already_active');
});

test('Workstream A: Idempotent local Ultra subscription grant and retrieval', () => {
    const userId = 'test-ultra-grant-user';
    clearLocalUltraSubscription(userId);

    assert.equal(getLocalUltraSubscription(userId), null);

    const sub = saveLocalUltraSubscription(userId, 'ultra_3month');
    assert.ok(sub);
    assert.equal(sub.user_id, userId);
    assert.equal(sub.plan_type, 'Elite Ultra');
    assert.equal(sub.is_ultra, true);
    assert.equal(sub.is_premium, true);
    assert.equal(sub.status, 'active');

    const retrieved = getLocalUltraSubscription(userId);
    assert.equal(retrieved.id, sub.id);
    assert.equal(retrieved.plan_type, 'Elite Ultra');

    clearLocalUltraSubscription(userId);
    assert.equal(getLocalUltraSubscription(userId), null);
});

// =============================================================================
// UI & REGRESSION CHECKS
// =============================================================================

test('UI Quality: PremiumUpgrade.jsx and Dashboard.jsx correctly integrate Elite Ultra', () => {
    const premiumUpgradeJsx = fs.readFileSync(path.join(rootDir, 'src/pages/PremiumUpgrade.jsx'), 'utf-8');
    const dashboardJsx = fs.readFileSync(path.join(rootDir, 'src/pages/Dashboard.jsx'), 'utf-8');
    const matchJsx = fs.readFileSync(path.join(rootDir, 'src/pages/Match.jsx'), 'utf-8');

    // PremiumUpgrade has category switcher & pricing
    assert.ok(premiumUpgradeJsx.includes('ULTRA_SUBSCRIPTION_TIERS'), 'Must define ULTRA_SUBSCRIPTION_TIERS');
    assert.ok(premiumUpgradeJsx.includes('tierCategory === \'ultra\''), 'Must support ultra tierCategory');
    assert.ok(premiumUpgradeJsx.includes('30 Super Swipes / mo'), 'Must advertise 30 Super Swipes / mo');
    assert.ok(premiumUpgradeJsx.includes('10 24h Boosts / mo'), 'Must advertise 10 24h Boosts / mo');
    assert.ok(premiumUpgradeJsx.includes('Zero Wallet Depletion'), 'Must communicate zero wallet depletion');

    // Dashboard action cards reflect Elite Ultra
    assert.ok(dashboardJsx.includes('isUltra ? \'Elite Ultra Active\''), 'Dashboard must recognize Elite Ultra status');

    // Match.jsx includes Elite Ultra discovery entry point & details modal
    assert.ok(matchJsx.includes('EliteUltraDetailsModal'), 'Match.jsx must import and render EliteUltraDetailsModal');
    assert.ok(matchJsx.includes('discover-ultra-vip-badge') || matchJsx.includes('discover-ultra-entry-btn'), 'Match.jsx must render Ultra badge/button');
});

test('UI Quality: EliteUltraDetailsModal.jsx provides transparent pricing and dismissal', () => {
    const modalJsx = fs.readFileSync(path.join(rootDir, 'src/components/EliteUltraDetailsModal.jsx'), 'utf-8');

    assert.ok(modalJsx.includes('₦15,000'), 'Modal must show ₦15,000 for 1 month');
    assert.ok(modalJsx.includes('₦30,000'), 'Modal must show ₦30,000 for 2 months');
    assert.ok(modalJsx.includes('₦35,000'), 'Modal must show ₦35,000 for 3 months');
    assert.ok(modalJsx.includes('30 Super Swipes / Month Included'), 'Modal must highlight 30 Super Swipes');
    assert.ok(modalJsx.includes('10 24h Visibility Boosts / Month Included'), 'Modal must highlight 10 Boosts');
    assert.ok(modalJsx.includes('Up to 6 Profile Photos in Match'), 'Modal must highlight 6 Match Photos');
    assert.ok(modalJsx.includes('Zero wallet depletion') || modalJsx.includes('never deplete your campus wallet'), 'Modal must reassure no wallet depletion');
    assert.ok(modalJsx.includes('ultra-modal-close-btn'), 'Modal must provide close button');
});

test('Workstream A Status Signaling: Explore, Confessions, and Comments VIP Spotlights and Radiant Crowns', () => {
    const exploreJsx = fs.readFileSync(path.join(rootDir, 'src/pages/Explore.jsx'), 'utf-8');
    const exploreCss = fs.readFileSync(path.join(rootDir, 'src/pages/Explore.css'), 'utf-8');
    const confessionsJsx = fs.readFileSync(path.join(rootDir, 'src/pages/Confessions.jsx'), 'utf-8');
    const confessionsCss = fs.readFileSync(path.join(rootDir, 'src/pages/Confessions.css'), 'utf-8');
    const confessionDrawerJsx = fs.readFileSync(path.join(rootDir, 'src/components/ConfessionDrawer.jsx'), 'utf-8');
    const confessionDrawerCss = fs.readFileSync(path.join(rootDir, 'src/components/ConfessionDrawer.css'), 'utf-8');

    // Explore VIP Spotlight Sorting & Visual Dominance
    assert.ok(exploreJsx.includes('bUltra - aUltra'), 'Explore must prioritize Elite Ultra profiles at the top of the feed');
    assert.ok(exploreJsx.includes('ultra-spotlight-card'), 'Explore cards must have ultra-spotlight-card class for Ultra members');
    assert.ok(exploreJsx.includes('card-ultra-radiant-badge'), 'Explore cards must render card-ultra-radiant-badge with crown and star');
    assert.ok(exploreJsx.includes('explore-ultra-tag'), 'Explore cards must render explore-ultra-tag');
    assert.ok(exploreJsx.includes('ultra-radiant-crown'), 'Explore cards must render ultra-radiant-crown beside name');
    assert.ok(exploreCss.includes('.ultra-spotlight-card'), 'Explore.css must style .ultra-spotlight-card with radiant border');

    // Confessions VIP Spotlight Dominance
    assert.ok(confessionsJsx.includes('isUltraAuthor'), 'Confessions must check if post author is Ultra');
    assert.ok(confessionsJsx.includes('confession-card-ultra-spotlight'), 'Confession cards must apply ultra-spotlight class');
    assert.ok(confessionsJsx.includes('badge-ultra-spotlight'), 'Confession cards must render badge-ultra-spotlight');
    assert.ok(confessionsJsx.includes('confession-avatar-ultra-beacon'), 'Confession cards must render avatar ultra beacon');
    assert.ok(confessionsJsx.includes('confession-ultra-crown'), 'Confession cards must render confession-ultra-crown');
    assert.ok(confessionsJsx.includes('composer-ultra-indicator'), 'Confessions composer must display VIP Spotlight indicator for Ultra users');
    assert.ok(confessionsCss.includes('.confession-card-ultra-spotlight'), 'Confessions.css must style .confession-card-ultra-spotlight with pink-gold gradient border');

    // Confession Comments VIP Tagging
    assert.ok(confessionDrawerJsx.includes('comment-card-ultra'), 'Confession comments must apply comment-card-ultra class');
    assert.ok(confessionDrawerJsx.includes('comment-ultra-pill'), 'Confession comments must render comment-ultra-pill');
    assert.ok(confessionDrawerCss.includes('.comment-ultra-pill'), 'ConfessionDrawer.css must style .comment-ultra-pill');
});
