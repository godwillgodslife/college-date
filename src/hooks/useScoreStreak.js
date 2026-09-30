import useSWR from 'swr';
import { useCallback } from 'react';
import { fetchUserStreak, getStreakCacheKey, recordStreakActivity } from '../services/scoreStreakService';
import { persistentSWR } from '../lib/persistentCache';

export function useScoreStreak(userId) {
    const cacheKey = userId ? getStreakCacheKey(userId) : null;

    const { data: streakData, error, mutate } = useSWR(
        cacheKey,
        async () => {
            const { data } = await fetchUserStreak(userId);
            return data;
        },
        persistentSWR(cacheKey, {
            ttlMs: 10 * 60 * 1000,
            revalidateOnFocus: false
        })
    );

    const recordActivity = useCallback(async (activityType = 'general') => {
        if (!userId) return null;
        const result = await recordStreakActivity(userId, activityType);
        if (result.data) {
            mutate(result.data, false);
        }
        return result;
    }, [userId, mutate]);

    return {
        streak: streakData?.current_streak || 0,
        longestStreak: streakData?.longest_streak || 0,
        activeToday: Boolean(streakData?.active_today),
        lastActivityType: streakData?.last_activity_type || null,
        nextMilestone: streakData?.next_milestone || 7,
        progressToMilestone: streakData?.progress_to_milestone || 0,
        streakData,
        recordActivity,
        refreshStreak: mutate,
        isLoading: !streakData && !error
    };
}
