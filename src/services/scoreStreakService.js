import { supabase } from '../lib/supabase';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import { enqueueOfflineOperation } from '../lib/offlineQueue';
import { STREAK_MILESTONES, STREAK_BADGES, getNextMilestone, getStreakCacheKey } from '../utils/scoreStreak';
import { createNotification } from './notificationService';

export { STREAK_MILESTONES, STREAK_BADGES, getNextMilestone, getStreakCacheKey };

const STREAK_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch current user score streak with cache-first hydration.
 */
export async function fetchUserStreak(userId) {
    if (!userId) return { data: null, error: 'User ID required' };

    const cacheKey = getStreakCacheKey(userId);
    const cached = getCachedData(cacheKey, { ttlMs: STREAK_CACHE_TTL_MS, allowStale: true });

    try {
        const { data, error } = await supabase.rpc('get_user_streak', { p_user_id: userId });
        if (error) throw error;

        if (data?.success) {
            setCachedData(cacheKey, data);
            return { data, error: null };
        }
        return { data: cached || null, error: null };
    } catch (err) {
        console.warn('[ScoreStreak] Fetch skipped/offline, using cached:', err.message || err);
        return { data: cached || null, error: cached ? null : (err.message || 'Offline') };
    }
}

/**
 * Record a qualifying streak activity (swipe, chat, request, confession).
 * Server-authoritative and idempotent.
 */
export async function recordStreakActivity(userId, activityType = 'general', customNonce = null) {
    if (!userId) return { data: null, error: 'User ID required' };

    const todayKey = new Date().toISOString().split('T')[0];
    const idempotencyKey = customNonce || `streak:${userId}:${todayKey}:${activityType}`;
    const cacheKey = getStreakCacheKey(userId);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        enqueueOfflineOperation(userId, {
            id: `streak_activity:${idempotencyKey}`,
            type: 'record_streak_activity',
            payload: { userId, activityType, idempotencyKey }
        });

        // Optimistically set active_today in cache
        const cached = getCachedData(cacheKey, { allowStale: true });
        if (cached) {
            setCachedData(cacheKey, { ...cached, active_today: true });
        }

        return {
            data: {
                success: true,
                current_streak: cached?.current_streak || 1,
                longest_streak: Math.max(cached?.longest_streak || 1, cached?.current_streak || 1),
                is_new_day: !cached?.active_today,
                active_today: true,
                offline_queued: true
            },
            error: null
        };
    }

    try {
        const { data, error } = await supabase.rpc('record_streak_activity', {
            p_activity_type: activityType,
            p_idempotency_key: idempotencyKey
        });

        if (error) throw error;

        if (data?.success) {
            const cached = getCachedData(cacheKey, { allowStale: true });
            const updated = {
                ...(cached || {}),
                ...data,
                active_today: true
            };
            setCachedData(cacheKey, updated);

            // Dispatch celebratory milestone notification
            const reachedDays = data.milestone_reached || (STREAK_MILESTONES.includes(data.current_streak) && data.is_new_day ? data.current_streak : null);
            if (reachedDays && userId) {
                const badge = STREAK_BADGES.find(b => b.days === reachedDays);
                const perkText = badge?.perk || 'Special Campus Superpower';
                createNotification({
                    userId,
                    type: 'streak_milestone',
                    category: 'account',
                    title: `🔥 ${reachedDays}-Day Streak Milestone Reached!`,
                    content: `Incredible dedication! You unlocked ${badge?.label || 'Milestone Champion'} (${perkText})! Keep your campus streak going!`,
                    deepLink: '/dashboard',
                    priority: 'high',
                    dedupeKey: `streak_milestone:${userId}:${reachedDays}`,
                    metadata: {
                        event: 'streak_milestone',
                        streak_days: reachedDays,
                        badge_label: badge?.label || null,
                        perk: perkText,
                        url: '/dashboard'
                    }
                }).catch(err => console.warn('[ScoreStreak] Milestone notification error:', err));
            }

            return { data: updated, error: null };
        }

        return { data: null, error: data?.error || 'Failed to record streak' };
    } catch (err) {
        console.warn('[ScoreStreak] RPC error, queuing offline:', err.message || err);
        enqueueOfflineOperation(userId, {
            id: `streak_activity:${idempotencyKey}`,
            type: 'record_streak_activity',
            payload: { userId, activityType, idempotencyKey },
            lastError: err.message || String(err)
        });

        return { data: null, error: err.message || 'Queued' };
    }
}
