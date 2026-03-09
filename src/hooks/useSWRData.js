import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import { getDiscoverProfiles } from '../services/swipeService';
import { getConfessions } from '../services/confessionService';
import { getLeaderboards } from '../services/leaderboardService';
import { getConversations } from '../services/chatService';

/**
 * useDiscoveryProfiles
 * SWR Hook for the Match/Discovery feed
 */
export function useDiscoveryProfiles(userId, filters, userProfile) {
    const key = userId ? ['discovery', userId, JSON.stringify(filters)] : null;

    return useSWR(key, async () => {
        const { data, error } = await getDiscoverProfiles(userId, filters, userProfile);
        if (error) throw new Error(error);
        return data;
    }, {
        revalidateOnFocus: false,
        dedupingInterval: 10000, // 10s dedupe
    });
}

/**
 * useConfessions
 * SWR Hook for the Confessions feed
 */
export function useConfessions(university, userId) {
    const key = ['confessions', university, userId];

    return useSWR(key, async () => {
        const { data, error } = await getConfessions(university, userId);
        if (error) throw new Error(error);
        return data;
    }, {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });
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
    }, {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // 1 minute dedupe for leaderboards
    });
}

/**
 * useConversations
 * SWR Hook for the Chat list
 */
export function useConversations(userId) {
    const key = userId ? ['conversations', userId] : null;

    return useSWR(key, async () => {
        const { data, error } = await getConversations(userId);
        if (error) throw new Error(error);
        return data;
    }, {
        revalidateOnFocus: true,
        dedupingInterval: 3000,
    });
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
    });
}
