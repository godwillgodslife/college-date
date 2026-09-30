// Lazy Supabase client and cache resolver to maintain unit-test portability, SSR safety, and offline resilience
let _supabaseClient = null;
async function getSupabase() {
    if (_supabaseClient) return _supabaseClient;
    if (typeof window !== 'undefined' && window.__supabase) {
        _supabaseClient = window.__supabase;
        return _supabaseClient;
    }
    try {
        const mod = await import('../lib/supabase.js');
        _supabaseClient = mod.supabase;
        return _supabaseClient;
    } catch {
        return null;
    }
}

let _cacheModule = null;
async function getCache() {
    if (_cacheModule) return _cacheModule;
    try {
        _cacheModule = await import('../lib/persistentCache.js');
        return _cacheModule;
    } catch {
        return null;
    }
}

export const ACTIVE_PROGRAM_CONFIG = {
    DAILY_PAYOUT_AMOUNT: 625,
    MIN_DAYS_FOR_SETTLEMENT: 24,
    MAX_DAYS_PER_MONTH: 30,
    REQUIRED_SWIPES_PER_DAY: 15,
    REQUIRED_CHATS_PER_DAY: 3,
    MAX_MONTHLY_EARNINGS: 15000,
    MIN_WITHDRAWAL_THRESHOLD: 15000,
};

export function calculateProjectedEarnings(qualifyingDays) {
    const days = Math.min(Math.max(0, Number(qualifyingDays) || 0), ACTIVE_PROGRAM_CONFIG.MAX_DAYS_PER_MONTH);
    return Math.min(ACTIVE_PROGRAM_CONFIG.MAX_MONTHLY_EARNINGS, days * ACTIVE_PROGRAM_CONFIG.DAILY_PAYOUT_AMOUNT);
}

export function isQualifiedForSettlement(qualifyingDays) {
    return (Number(qualifyingDays) || 0) >= ACTIVE_PROGRAM_CONFIG.MIN_DAYS_FOR_SETTLEMENT;
}

export function formatCurrencyNgn(amount) {
    return `₦${Number(amount || 0).toLocaleString()}`;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh cache

/**
 * Fetch current Active Program status for a user.
 * Combines server evaluation with resilient offline-first caching.
 */
export async function getActiveProgramStatus(userId) {
    if (!userId) {
        return { data: null, error: 'User ID is required' };
    }

    const cacheKey = ['active_program_status', userId];
    const cache = await getCache();
    const cached = cache?.getCachedData ? cache.getCachedData(cacheKey, { ttlMs: CACHE_TTL_MS, allowStale: true }) : null;

    try {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase client unavailable');

        const { data, error } = await sb.rpc('get_active_program_status', {
            p_user_id: userId
        });

        if (error) throw error;

        if (data && data.success) {
            if (cache?.setCachedData) {
                cache.setCachedData(cacheKey, data, { userId, type: 'active_program' });
            }
            return { data, error: null };
        }

        if (cached) {
            return { data: cached, error: null, isFallback: true };
        }

        return { data, error: data?.error || 'Failed to fetch status' };
    } catch (err) {
        console.warn('[ActiveProgramService] getActiveProgramStatus network fallback:', err.message);
        if (cached) {
            return { data: cached, error: null, isFallback: true };
        }
        return {
            data: {
                success: true,
                is_active: true,
                enrolled: false,
                status: 'not_enrolled',
                is_eligible: true,
                current_month_key: new Date().toISOString().slice(0, 7),
                accrued_earnings: 0,
                monthly_target: 15000,
                daily_reward: 625,
                qualifying_days_count: 0,
                min_qualifying_days: 24,
                max_qualifying_days: 30,
                remaining_days_needed: 24,
                progress_percentage: 0,
                today_qualified: false,
                today_progress: {
                    swipes_count: 0,
                    required_swipes: 15,
                    swipes_done: false,
                    chats_count: 0,
                    required_chats: 3,
                    chats_done: false,
                    streak_done: false,
                    required_streak: true
                },
                gifts_received_ngn: 0,
                payout_date: `${new Date().toISOString().slice(0, 7)}-28`,
                min_withdrawal_threshold: 15000
            },
            error: null,
            isFallback: true
        };
    }
}

/**
 * Enroll user in College Date Active for the current month.
 */
export async function enrollInActiveProgram(userId) {
    if (!userId) {
        return { success: false, error: 'User ID is required' };
    }

    try {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase client unavailable');

        const { data, error } = await sb.rpc('enroll_in_active_program', {
            p_user_id: userId
        });

        if (error) throw error;
        if (!data?.success) {
            return { success: false, error: data?.error || 'Enrollment rejected' };
        }

        // Re-fetch and cache updated status
        await getActiveProgramStatus(userId);
        return { success: true, participantId: data.participant_id, error: null };
    } catch (err) {
        console.error('[ActiveProgramService] enrollInActiveProgram error:', err);
        return { success: false, error: err.message || 'Enrollment failed' };
    }
}

/**
 * Server-authoritatively evaluate daily qualification criteria.
 */
export async function evaluateDailyQualification(userId) {
    if (!userId) {
        return { success: false, error: 'User ID is required' };
    }

    try {
        const sb = await getSupabase();
        if (!sb) throw new Error('Supabase client unavailable');

        const { data, error } = await sb.rpc('evaluate_active_daily_qualification', {
            p_user_id: userId
        });

        if (error) throw error;

        // Invalidate status cache to reflect new earnings
        await getActiveProgramStatus(userId);
        return { data, error: null };
    } catch (err) {
        console.warn('[ActiveProgramService] evaluateDailyQualification non-critical error:', err.message);
        return { data: null, error: err.message };
    }
}
