import { supabase } from '../lib/supabase';

// Fetch key gamification stats
export async function getLeaderboards() {
    try {
        // Fetch from the unified view which handles both types of rankings
        const { data, error } = await supabase
            .from('leaderboard_unified')
            .select('*');

        if (error) throw error;

        // Filter out individuals with 0, restrict by gender (case-insensitive), and sort
        const sortedBySwipes = data
            .filter(u => u.premium_swipes_received > 0 && u.gender?.toLowerCase() === 'female')
            .sort((a, b) => (b.premium_swipes_received || 0) - (a.premium_swipes_received || 0));

        const sortedBySpent = data
            .filter(u => u.total_spent > 0 && u.gender?.toLowerCase() === 'male')
            .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0));

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
