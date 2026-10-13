import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import services and helpers under test
import {
    hasActivePremium,
    isEliteUltra,
    getSubscriptionTier,
    getMatchPhotoLimit,
    getProfilePhotoLimit,
    getProfileVideoDurationLimit,
    canUploadProfileVideo
} from '../src/utils/premium.js';

import {
    getProfilePhotoLimit as getEntitledPhotoLimit,
    getProfileVideoDurationLimit as getEntitledVideoLimit,
    canUploadProfileVideo as canEntitledUploadVideo
} from '../src/services/entitlementService.js';

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
// SUITE 1: PHOTO LIMITS BY SUBSCRIPTION TIER
// =============================================================================

test('Suite 1: Freemium (Free) users have exactly 4 profile photo slots', () => {
    const freeProfile = {
        id: 'user-free-01',
        is_premium: false,
        is_ultra: false,
        status: 'active'
    };

    assert.equal(getSubscriptionTier(freeProfile), 'free');
    assert.equal(getProfilePhotoLimit(freeProfile), 4);
    assert.equal(getEntitledPhotoLimit(freeProfile), 4);
});

test('Suite 1: Premium users have exactly 6 profile photo slots unlocked', () => {
    const premiumProfile = {
        id: 'user-prem-01',
        is_premium: true,
        plan_type: 'Premium',
        status: 'active'
    };

    assert.equal(getSubscriptionTier(premiumProfile), 'premium');
    assert.equal(getProfilePhotoLimit(premiumProfile), 6);
    assert.equal(getEntitledPhotoLimit(premiumProfile), 6);
});

test('Suite 1: Ultra Elite users have exactly 6 profile photo slots unlocked', () => {
    const ultraProfile = {
        id: 'user-ultra-01',
        is_premium: true,
        is_ultra: true,
        plan_type: 'Elite Ultra',
        status: 'active'
    };

    assert.equal(getSubscriptionTier(ultraProfile), 'ultra');
    assert.equal(getProfilePhotoLimit(ultraProfile), 6);
    assert.equal(getEntitledPhotoLimit(ultraProfile), 6);
});

test('Suite 1: Expired subscriptions fall back to 4 profile photos', () => {
    const expiredProfile = {
        id: 'user-expired-01',
        is_premium: true,
        plan_type: 'Premium',
        status: 'active',
        current_period_end: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // Expired yesterday
    };

    assert.equal(hasActivePremium(expiredProfile), false);
    assert.equal(getSubscriptionTier(expiredProfile), 'free');
    assert.equal(getProfilePhotoLimit(expiredProfile), 4);
});

// =============================================================================
// SUITE 2: VIDEO PROFILE DURATION & ENTITLEMENTS BY TIER
// =============================================================================

test('Suite 2: Freemium users cannot upload profile videos (duration limit 0)', () => {
    const freeProfile = {
        id: 'user-free-02',
        is_premium: false
    };

    assert.equal(canUploadProfileVideo(freeProfile), false);
    assert.equal(canEntitledUploadVideo(freeProfile), false);
    assert.equal(getProfileVideoDurationLimit(freeProfile), 0);
    assert.equal(getEntitledVideoLimit(freeProfile), 0);
});

test('Suite 2: Premium users can upload 10-second profile videos', () => {
    const premiumProfile = {
        id: 'user-prem-02',
        is_premium: true,
        plan_type: 'Premium',
        status: 'active'
    };

    assert.equal(canUploadProfileVideo(premiumProfile), true);
    assert.equal(canEntitledUploadVideo(premiumProfile), true);
    assert.equal(getProfileVideoDurationLimit(premiumProfile), 10);
    assert.equal(getEntitledVideoLimit(premiumProfile), 10);
});

test('Suite 2: Ultra Elite users can upload 30-second extended profile videos', () => {
    const ultraProfile = {
        id: 'user-ultra-02',
        is_premium: true,
        is_ultra: true,
        plan_type: 'Elite Ultra',
        status: 'active'
    };

    assert.equal(canUploadProfileVideo(ultraProfile), true);
    assert.equal(canEntitledUploadVideo(ultraProfile), true);
    assert.equal(getProfileVideoDurationLimit(ultraProfile), 30);
    assert.equal(getEntitledVideoLimit(ultraProfile), 30);
});

// =============================================================================
// SUITE 3: STATIC CONTRACTS IN EditProfile.jsx & EditProfile.css
// =============================================================================

test('Suite 3: EditProfile.jsx renders 6 photo slots and tier-specific gallery badges', () => {
    const code = fs.readFileSync(path.join(rootDir, 'src/pages/EditProfile.jsx'), 'utf-8');

    // Asserts 6 slots array is mapped
    assert.ok(code.includes('[0, 1, 2, 3, 4, 5].map((idx) =>'), 'Must map over 6 photo slots');

    // Asserts photo limit check gates unlocked vs locked slots
    assert.ok(code.includes('const isSlotUnlocked = idx < photoLimit;'), 'Must check idx < photoLimit');
    assert.ok(code.includes('photo-sq-slot locked'), 'Must render locked class for restricted slots');

    // Asserts tier gallery badges exist
    assert.ok(code.includes('gallery-tier-badge ultra'), 'Must render ultra badge');
    assert.ok(code.includes('gallery-tier-badge premium'), 'Must render premium badge');
    assert.ok(code.includes('gallery-tier-badge free'), 'Must render free badge');

    // Asserts paywall trigger on locked slot click
    assert.ok(code.includes("setPaywallTrigger('photo_slots')"), 'Must trigger photo_slots paywall');
});

test('Suite 3: EditProfile.jsx enforces 10s for Premium and 30s for Ultra Elite videos', () => {
    const code = fs.readFileSync(path.join(rootDir, 'src/pages/EditProfile.jsx'), 'utf-8');

    // Asserts dynamic duration limit check
    assert.ok(code.includes('const maxDuration = videoDurationLimit > 0 ? videoDurationLimit : 10;'), 'Must calculate maxDuration');
    assert.ok(code.includes('Maximum duration for Elite Ultra is ${maxDuration} seconds'), 'Must report 30s error for Ultra');
    assert.ok(code.includes('Maximum duration for Elite Premium is ${maxDuration} seconds'), 'Must report 10s error for Premium');

    // Asserts video section titles
    assert.ok(code.includes("30s Extended Video Profile"), 'Must display 30s video header for Ultra');
    assert.ok(code.includes("10s Video Profile"), 'Must display 10s video header for Premium');

    // Asserts upsell to Ultra for Premium subscribers
    assert.ok(code.includes("ultra-video-upsell"), 'Must render Ultra upsell for Premium users');
});

test('Suite 3: ContextualPaywallSheet.jsx contains photo_slots and updated video_upload triggers', () => {
    const code = fs.readFileSync(path.join(rootDir, 'src/components/ContextualPaywallSheet.jsx'), 'utf-8');

    assert.ok(code.includes('photo_slots: {'), 'Must include photo_slots trigger');
    assert.ok(code.includes('UNLOCK 6 PROFILE PHOTOS'), 'Must include photo slots pill');
    assert.ok(code.includes('Free accounts are capped at 4 photos. Upgrade to Elite to unlock all 6 photo slots'), 'Must explain 4 to 6 expansion');
    assert.ok(code.includes('10S-30S LIVE VIDEO'), 'Must mention 10s-30s in video upload pill');
});

test('Suite 3: Profile.jsx showcases 30s Extended Video Profile for Ultra Elite users', () => {
    const code = fs.readFileSync(path.join(rootDir, 'src/pages/Profile.jsx'), 'utf-8');

    assert.ok(code.includes("isUltra ? '30s Extended Video Profile' : '10s Video Profile'"), 'ProfileVideoShowcase must dynamically adapt title');
    assert.ok(code.includes("isUltra ? '👑✨ Ultra VIP Moment' : '👑 Verified Moment'"), 'ProfileVideoShowcase must adapt pill');
    assert.ok(code.includes('isUltra={isEliteUltra(userProfile)}'), 'Must pass isUltra prop to showcase');
});
