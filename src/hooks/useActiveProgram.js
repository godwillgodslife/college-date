import useSWR from 'swr';
import { useCallback, useEffect } from 'react';
import { getActiveProgramStatus, enrollInActiveProgram, evaluateDailyQualification } from '../services/activeProgramService';
import { persistentSWR } from '../lib/persistentCache';
import { supabase } from '../lib/supabase';

export function useActiveProgram(userId) {
    const cacheKey = userId ? `active_program_status:${userId}` : null;

    const { data: statusData, error, mutate } = useSWR(
        cacheKey,
        async () => {
            if (!userId) return null;
            const { data } = await getActiveProgramStatus(userId);
            return data;
        },
        persistentSWR(cacheKey, {
            ttlMs: 5 * 60 * 1000,
            revalidateOnFocus: true
        })
    );

    // Subscribe to realtime updates for active_program_daily_logs and active_program_participants
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel(`active_program_user_${userId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'active_program_participants',
                filter: `user_id=eq.${userId}`
            }, () => {
                mutate();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'active_program_daily_logs',
                filter: `user_id=eq.${userId}`
            }, () => {
                mutate();
            })
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [userId, mutate]);

    const enroll = useCallback(async () => {
        if (!userId) return { success: false, error: 'User not authenticated' };
        const res = await enrollInActiveProgram(userId);
        if (res.success) {
            await mutate();
        }
        return res;
    }, [userId, mutate]);

    const evaluateToday = useCallback(async () => {
        if (!userId) return null;
        const res = await evaluateDailyQualification(userId);
        if (res.data) {
            await mutate();
        }
        return res;
    }, [userId, mutate]);

    return {
        status: statusData,
        enrolled: Boolean(statusData?.enrolled),
        isActive: Boolean(statusData?.is_active),
        isEligible: Boolean(statusData?.is_eligible),
        accruedEarnings: statusData?.accrued_earnings || 0,
        monthlyTarget: statusData?.monthly_target || 15000,
        dailyReward: statusData?.daily_reward || 625,
        qualifyingDaysCount: statusData?.qualifying_days_count || 0,
        minQualifyingDays: statusData?.min_qualifying_days || 24,
        remainingDaysNeeded: statusData?.remaining_days_needed || 0,
        progressPercentage: statusData?.progress_percentage || 0,
        todayQualified: Boolean(statusData?.today_qualified),
        todayProgress: statusData?.today_progress || {
            swipes_count: 0,
            required_swipes: 15,
            swipes_done: false,
            chats_count: 0,
            required_chats: 3,
            chats_done: false,
            streak_done: false,
            required_streak: true
        },
        giftsReceivedNgn: statusData?.gifts_received_ngn || 0,
        payoutDate: statusData?.payout_date || '',
        enroll,
        evaluateToday,
        refreshStatus: mutate,
        isLoading: !statusData && !error
    };
}
