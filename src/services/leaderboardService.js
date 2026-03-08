import { supabase } from '../lib/supabase';

// Fetch key gamification stats
export async function getLeaderboards() {
    try {
        // Fetch from the unified view which handles both types of rankings
        const { data, error } = await supabase
            .from('leaderboard_unified')
            .select('*');

        if (error) throw error;

        // Separate most wanted and big spenders in JS (cheap)
        const sortedBySwipes = [...data].sort((a, b) => (b.premium_swipes_received || 0) - (a.premium_swipes_received || 0));
        const sortedBySpent = [...data].sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));

        return {
            mostWanted: sortedBySwipes.slice(0, 50),
            bigSpenders: sortedBySpent.slice(0, 50),
            error: null
        };
    } catch (error) {
        console.error('Error fetching leaderboards:', error);
        return {
            mostWanted: [],
            bigSpenders: [],
            error: error.message
        };
    }
}
