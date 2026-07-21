import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { getDiscoverProfiles } from '../services/swipeService';
import { getConfessions } from '../services/confessionService';
import { getLeaderboards } from '../services/leaderboardService';
import { getConversations } from '../services/chatService';
import { persistentSWR } from '../lib/persistentCache';
import { CACHE_TTL } from '../lib/cachePolicy';

/**
 * useDiscoveryProfiles
 * SWR Hook for the Match/Discovery feed
 */
export function getDiscoveryCacheKey(userId, filters, userProfile) {
    return userId ? ['discovery', userId, JSON.stringify(filters), userProfile?.university || '', userProfile?.interest_gender || ''] : null;
}

export function useDiscoveryProfiles(userId, filters, userProfile) {
    const key = getDiscoveryCacheKey(userId, filters, userProfile);

    return useSWR(key, async () => {
        const { data, error } = await getDiscoverProfiles(userId, filters, userProfile);
        if (error) throw new Error(error);
        return data;
    }, persistentSWR(key, {
        revalidateOnFocus: false,
        dedupingInterval: 10000, // 10s dedupe
        ttlMs: CACHE_TTL.discovery
    }));
}

/**
 * useConfessions
 * SWR Hook for the Confessions feed
 */
export function useConfessions(university, userId) {
    // Prevent double-fetching by waiting until user profile data (university) is resolved
    const key = (university !== undefined && userId) ? ['confessions', university, userId] : null;

    return useSWR(key, async () => {
        const { data, error } = await getConfessions(university, userId);
        if (error) throw new Error(error);
        return data;
    }, persistentSWR(key, {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
        ttlMs: CACHE_TTL.confessions
    }));
}

/**
 * useLeaderboards
 * SWR Hook for the Leaderboard data
 */
export function useLeaderboards() {
    const key = 'leaderboards';

    return useSWR(key, async () => {
        const response = await getLeaderboards();
        if (response.error) throw new Error(response.error);
        return { mostWanted: response.mostWanted, bigSpenders: response.bigSpenders };
    }, persistentSWR(key, {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // 1 minute dedupe for leaderboards
        ttlMs: 15 * 60 * 1000
    }));
}

/**
 * useConversations
 * SWR Hook for the Chat list
 */
export function useConversations(userId) {
    const key = userId ? ['conversations', userId] : null;

    const { data, error, isLoading, mutate } = useSWR(key, async () => {
        const { data, error } = await getConversations(userId);
        if (error) throw new Error(error);
        return data;
    }, persistentSWR(key, {
        revalidateOnFocus: true,
        dedupingInterval: 3000,
        ttlMs: CACHE_TTL.conversations
    }));

    return { data, error, isLoading, mutate };
}

/**
 * useUserProfile (Optional but helpful for consistency)
 */
export function useSWRProfile(userId) {
    const key = userId ? ['profile', userId] : null;

    return useSWR(key, async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    }, persistentSWR(key, {
        revalidateOnFocus: false,
        ttlMs: CACHE_TTL.authProfile
    }));
}
