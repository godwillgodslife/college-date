import { supabase } from '../lib/supabase';

const REACTION_EMOJIS = ['🔥', '🙊', '👀', '🙏'];

export async function getConfessions(university = null, userId = null) {
    try {
        let query = supabase
            .from('optimized_confessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (university) {
            // Use case-insensitive matching and trim spaces to prevent "Uni " !== "Uni" bugs
            query = query.ilike('university', university.trim());
        }

        const { data, error } = await query;
        if (error) throw error;

        // Map the pre-aggregated data from the view to the expected JS format
        const enriched = (data || []).map(c => {
            const reactionCounts = {};
            const userReactions = new Set();

            REACTION_EMOJIS.forEach(e => { reactionCounts[e] = 0; });

            (c.reaction_data || []).forEach(r => {
                reactionCounts[r.e] = (reactionCounts[r.e] || 0) + 1;
                if (r.u === userId) userReactions.add(r.e);
            });

            const hasClaimed = (c.claimer_ids || []).includes(userId);

            return {
                ...c,
                reactionCounts,
                userReactions: [...userReactions],
                hasClaimed,
                // These are already in the view!
                totalReactions: c.total_reactions,
                commentCount: c.comment_count,
                isViral: c.is_viral
            };
        });

        return { data: enriched, error: null };
    } catch (error) {
        console.error('Error fetching confessions:', error);
        return { data: [], error: error.message };
    }
}

export async function postConfession(content, university, userId) {
    try {
        const cleanUni = university ? university.trim() : 'Unknown University';
        const { data, error } = await supabase
            .from('confessions')
            .insert({ content, university: cleanUni, user_id: userId })
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error posting confession:', error);
        return { data: null, error: error.message };
    }
}

/**
 * Add or toggle an emoji reaction on a confession.
 * One reaction per emoji per user (UNIQUE constraint in DB).
 */
export async function addEmojiReaction(confessionId, userId, emoji) {
    if (!REACTION_EMOJIS.includes(emoji)) return { error: 'Invalid emoji' };
    try {
        // Try to insert — if already exists, delete it (toggle)
        const { data: existing } = await supabase
            .from('confession_reactions')
            .select('id')
            .eq('confession_id', confessionId)
            .eq('user_id', userId)
            .eq('emoji', emoji)
            .maybeSingle();

        if (existing) {
            // Un-react
            await supabase.from('confession_reactions').delete().eq('id', existing.id);
            return { toggled: false, error: null };
        } else {
            // React
            const { error } = await supabase.from('confession_reactions').insert({
                confession_id: confessionId,
                user_id: userId,
                emoji
            });
            if (error) throw error;
            return { toggled: true, error: null };
        }
    } catch (err) {
        console.error('addEmojiReaction error:', err.message);
        return { error: err.message };
    }
}

/**
 * Claim a confession — sends an anonymous signal to the poster.
 * One claim per user per confession.
 */
export async function claimConfession(confessionId, claimerId) {
    try {
        const { error } = await supabase
            .from('confession_claims')
            .insert({ confession_id: confessionId, claimer_id: claimerId });

        if (error) {
            if (error.code === '23505') return { alreadyClaimed: true, error: null }; // duplicate
            throw error;
        }
        return { alreadyClaimed: false, error: null };
    } catch (err) {
        console.error('claimConfession error:', err.message);
        return { error: err.message };
    }
}

// Legacy — keep for compatibility
export async function toggleLikeConfession(confessionId, userId) {
    return addEmojiReaction(confessionId, userId, '🔥');
}
