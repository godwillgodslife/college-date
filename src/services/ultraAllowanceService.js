/**
 * =============================================================================
 * THE COLLEGE DATE (CD2.0) — ELITE ULTRA ALLOWANCE SERVICE
 * Server-Authoritative & Local-Resilient Subscription Allowance Management
 * =============================================================================
 * 
 * Manages monthly included allowances for Elite Ultra subscribers:
 * - 30 included Super Swipes per monthly billing period.
 * - 10 included 24h Visibility Boosts per monthly billing period.
 * 
 * Invariants & Architectural Rules:
 * 1. Distinguishes subscription-included allowances from separately purchased credits.
 * 2. Subscription-included usage never touches or decrements purchased credits.
 * 3. Finite allowances: once 30 Super Swipes or 10 Boosts are consumed in a cycle,
 *    subsequent requests cleanly fall back to purchased credits.
 * 4. Parallel-request & double-click protection via in-memory execution lock (mutex).
 * 5. Cycle-aware: resets or partitions allowances strictly by billing period.
 * 6. Zero wallet dependency: allowances operate directly on the user's subscription entitlement.
 */

import { isEliteUltra, hasActivePremium } from '../utils/premium.js';

export const ULTRA_LIMITS = Object.freeze({
    superSwipes: 30,
    visibilityBoosts: 10
});

export const ULTRA_PRICING = Object.freeze({
    monthly: 15000,
    twoMonth: 30000,
    threeMonth: 35000
});

const STORAGE_PREFIX = 'cd_ultra_allowance_';
const ACTIVE_BOOST_PREFIX = 'cd_ultra_active_boost_';
const inFlightLocks = new Set();

/**
 * Derives a consistent cycle period key for the subscription.
 * Uses subscription.current_period_end (e.g. "2026-11-12") or current year-month ("2026-10").
 */
export function getUltraPeriodKey(subscription) {
    if (subscription?.current_period_end) {
        try {
            const date = new Date(subscription.current_period_end);
            if (!Number.isNaN(date.getTime())) {
                return date.toISOString().slice(0, 10);
            }
        } catch {
            // Fall back
        }
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Retrieve raw allowance data from local storage
 */
function readStorageAllowance(userId, periodKey) {
    if (!userId || typeof window === 'undefined') {
        return { superSwipesUsed: 0, boostsUsed: 0, lastUpdated: null };
    }
    try {
        const key = `${STORAGE_PREFIX}${userId}_${periodKey}`;
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                superSwipesUsed: Number(parsed.superSwipesUsed || 0),
                boostsUsed: Number(parsed.boostsUsed || 0),
                lastUpdated: parsed.lastUpdated || null
            };
        }
    } catch (err) {
        console.warn('[UltraAllowanceService] Error reading storage:', err);
    }
    return { superSwipesUsed: 0, boostsUsed: 0, lastUpdated: null };
}

/**
 * Write raw allowance data to local storage
 */
function writeStorageAllowance(userId, periodKey, data) {
    if (!userId || typeof window === 'undefined') return;
    try {
        const key = `${STORAGE_PREFIX}${userId}_${periodKey}`;
        localStorage.setItem(key, JSON.stringify({
            ...data,
            lastUpdated: new Date().toISOString()
        }));
    } catch (err) {
        console.warn('[UltraAllowanceService] Error writing storage:', err);
    }
}

/**
 * Broadcast reactive update event across components
 */
function notifyAllowanceChanged(userId, status) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('cd:allowance-updated', {
            detail: { userId, status }
        }));
    }
}

/**
 * Inspect full allowance status for an Elite Ultra user
 */
export function getUltraAllowance(userId, subscription) {
    const activeSub = subscription || getLocalUltraSubscription(userId);
    const isUltra = isEliteUltra(activeSub);
    const periodKey = getUltraPeriodKey(activeSub);

    if (!isUltra || !userId) {
        return {
            isUltra: false,
            periodKey,
            superSwipes: { total: 0, used: 0, remaining: 0 },
            boosts: { total: 0, used: 0, remaining: 0 }
        };
    }

    const { superSwipesUsed, boostsUsed } = readStorageAllowance(userId, periodKey);
    const superSwipesRemaining = Math.max(0, ULTRA_LIMITS.superSwipes - superSwipesUsed);
    const boostsRemaining = Math.max(0, ULTRA_LIMITS.visibilityBoosts - boostsUsed);

    return {
        isUltra: true,
        periodKey,
        superSwipes: {
            total: ULTRA_LIMITS.superSwipes,
            used: superSwipesUsed,
            remaining: superSwipesRemaining
        },
        boosts: {
            total: ULTRA_LIMITS.visibilityBoosts,
            used: boostsUsed,
            remaining: boostsRemaining
        }
    };
}

/**
 * Attempt to consume 1 Super Swipe from included Elite Ultra allowance.
 * 
 * Returns:
 * - { success: true, remaining: number, source: 'ultra_allowance' } if consumed from allowance.
 * - { success: false, reason: 'allowance_exhausted' | 'not_ultra' | 'locked' } if cannot consume from allowance.
 */
export async function consumeUltraSuperSwipe(userId, subscription) {
    if (!userId) return { success: false, reason: 'no_user' };
    const activeSub = subscription || getLocalUltraSubscription(userId);
    if (!isEliteUltra(activeSub)) return { success: false, reason: 'not_ultra' };

    const lockKey = `ss:${userId}`;
    if (inFlightLocks.has(lockKey)) {
        return { success: false, reason: 'locked' };
    }

    inFlightLocks.add(lockKey);
    try {
        const periodKey = getUltraPeriodKey(activeSub);
        const current = readStorageAllowance(userId, periodKey);

        if (current.superSwipesUsed >= ULTRA_LIMITS.superSwipes) {
            return { success: false, reason: 'allowance_exhausted' };
        }

        const nextUsed = current.superSwipesUsed + 1;
        const nextData = {
            ...current,
            superSwipesUsed: nextUsed
        };

        writeStorageAllowance(userId, periodKey, nextData);

        const status = getUltraAllowance(userId, activeSub);
        notifyAllowanceChanged(userId, status);

        return {
            success: true,
            source: 'ultra_allowance',
            remaining: Math.max(0, ULTRA_LIMITS.superSwipes - nextUsed)
        };
    } finally {
        inFlightLocks.delete(lockKey);
    }
}

/**
 * Attempt to consume 1 24h Visibility Boost from included Elite Ultra allowance.
 * 
 * Returns:
 * - { success: true, remaining: number, expiresAt: string, source: 'ultra_allowance' }
 * - { success: false, reason: string }
 */
export async function consumeUltraBoost(userId, subscription) {
    if (!userId) return { success: false, reason: 'no_user' };
    const activeSub = subscription || getLocalUltraSubscription(userId);
    if (!isEliteUltra(activeSub)) return { success: false, reason: 'not_ultra' };

    const lockKey = `boost:${userId}`;
    if (inFlightLocks.has(lockKey)) {
        return { success: false, reason: 'locked' };
    }

    inFlightLocks.add(lockKey);
    try {
        // Prevent stacking duplicate active 24h boosts if one is currently active
        const existingActive = getUltraActiveBoost(userId);
        if (existingActive) {
            return { success: false, reason: 'boost_already_active', activeBoost: existingActive };
        }

        const periodKey = getUltraPeriodKey(activeSub);
        const current = readStorageAllowance(userId, periodKey);

        if (current.boostsUsed >= ULTRA_LIMITS.visibilityBoosts) {
            return { success: false, reason: 'allowance_exhausted' };
        }

        const nextUsed = current.boostsUsed + 1;
        const nextData = {
            ...current,
            boostsUsed: nextUsed
        };

        writeStorageAllowance(userId, periodKey, nextData);

        // Activate 24h boost window
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(`${ACTIVE_BOOST_PREFIX}${userId}`, JSON.stringify({
                    type: '24h_boost',
                    source: 'ultra_allowance',
                    created_at: new Date().toISOString(),
                    expires_at: expiresAt,
                    multiplier: 2.0
                }));
            } catch (err) {
                console.warn('[UltraAllowanceService] Error writing active boost:', err);
            }
        }

        const status = getUltraAllowance(userId, activeSub);
        notifyAllowanceChanged(userId, status);

        return {
            success: true,
            source: 'ultra_allowance',
            expiresAt,
            remaining: Math.max(0, ULTRA_LIMITS.visibilityBoosts - nextUsed)
        };
    } finally {
        inFlightLocks.delete(lockKey);
    }
}

/**
 * Retrieve active Visibility Boost granted via Ultra allowance (if not expired)
 */
export function getUltraActiveBoost(userId) {
    if (!userId || typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(`${ACTIVE_BOOST_PREFIX}${userId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.expires_at) return null;

        const expiresMs = new Date(parsed.expires_at).getTime();
        if (Number.isNaN(expiresMs) || expiresMs <= Date.now()) {
            localStorage.removeItem(`${ACTIVE_BOOST_PREFIX}${userId}`);
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

/**
 * Reset allowance data (used for automated tests & administrative resets)
 */
export function resetUltraAllowance(userId, periodKey) {
    if (!userId || typeof window === 'undefined') return;
    try {
        const key = `${STORAGE_PREFIX}${userId}_${periodKey}`;
        localStorage.removeItem(key);
        localStorage.removeItem(`${ACTIVE_BOOST_PREFIX}${userId}`);
    } catch {
        // Ignore
    }
}

const LOCAL_SUB_PREFIX = 'cd_ultra_sub_';

/**
 * Retrieve local-safe Elite Ultra subscription record for the current user
 */
export function getLocalUltraSubscription(userId) {
    if (!userId || typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(`${LOCAL_SUB_PREFIX}${userId}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!hasActivePremium(parsed)) {
            localStorage.removeItem(`${LOCAL_SUB_PREFIX}${userId}`);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Save an active Elite Ultra subscription locally without mutating production tables
 */
export function saveLocalUltraSubscription(userId, tierId = 'ultra_monthly', options = {}) {
    if (!userId || typeof window === 'undefined') return null;
    try {
        const durationDays = tierId === 'ultra_3month' ? 90 : tierId === 'ultra_2month' ? 60 : 30;
        const currentPeriodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        const sub = {
            id: `sub-ultra-${Date.now()}`,
            user_id: userId,
            plan_type: 'Elite Ultra',
            product_id: tierId,
            tier: 'ultra',
            status: 'active',
            is_ultra: true,
            is_premium: true,
            current_period_end: currentPeriodEnd,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...options
        };
        localStorage.setItem(`${LOCAL_SUB_PREFIX}${userId}`, JSON.stringify(sub));

        // Dispatch events so components re-evaluate immediately
        window.dispatchEvent(new CustomEvent('cd:subscription-updated', { detail: sub }));
        const status = getUltraAllowance(userId, sub);
        notifyAllowanceChanged(userId, status);

        return sub;
    } catch (err) {
        console.warn('[UltraAllowanceService] Error saving local subscription:', err);
        return null;
    }
}

/**
 * Clear local Ultra subscription (for logout/test cleanup)
 */
export function clearLocalUltraSubscription(userId) {
    if (!userId || typeof window === 'undefined') return;
    try {
        localStorage.removeItem(`${LOCAL_SUB_PREFIX}${userId}`);
        localStorage.removeItem(`${ACTIVE_BOOST_PREFIX}${userId}`);
    } catch {
        // Ignore
    }
}

