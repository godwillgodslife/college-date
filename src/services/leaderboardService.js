import { supabase } from '../lib/supabase';

// Fetch key gamification stats
export async function getLeaderboards() {
    try {
        // Fetch both in parallel
        const [mostWanted, bigSpenders] = await Promise.all([
            supabase.from('leaderboard_most_wanted').select('*'),
            supabase.from('leaderboard_big_spenders').select('*')
        ]);

        if (mostWanted.error) throw mostWanted.error;
        if (bigSpenders.error) throw bigSpenders.error;

        return {
            mostWanted: mostWanted.data || [],
            bigSpenders: bigSpenders.data || [],
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
