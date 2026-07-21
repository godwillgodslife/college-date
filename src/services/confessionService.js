import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';
import { getFeedImpressionMap, recordFeedImpression } from './feedImpressionService';

// Emoji set must match the UI (Confessions.jsx) AND the DB CHECK constraint
// Migration: 20260706120000_update_confession_emoji_constraint.sql
const REACTION_EMOJIS = ['🔥', '😂', '🙊', '🙏', '😢'];

function hoursSince(value) {
    if (!value) return Infinity;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return Infinity;
    return (Date.now() - timestamp) / (1000 * 60 * 60);
}

function stableJitter(seed) {
    const text = String(seed || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
}

function scoreConfession(confession, impression, userId) {
    const ageHours = hoursSince(confession.created_at);
    let score = 0;

    if (ageHours <= 1) score += 90;
    else if (ageHours <= 24) score += 75;
    else if (ageHours <= 72) score += 50;
    else if (ageHours <= 24 * 7) score += 25;
    else score += 5;

    score += Math.min(80, Number(confession.totalReactions || 0) * 5);
    score += Math.min(50, Number(confession.commentCount || 0) * 8);
    if (confession.isViral) score += 35;

    if (confession.userReactions?.length) score -= 20;
    if (confession.hasClaimed) score -= 35;

    if (impression) {
        const impressionHours = hoursSince(impression.last_seen_at);
        if (impressionHours <= 1) score -= 400;
        else if (impressionHours <= 6) score -= 280;
        else if (impressionHours <= 24) score -= 180;
        else if (impressionHours <= 72) score -= 90;
        else if (impressionHours <= 24 * 7) score -= 45;
        else score -= 15;

        score -= Math.min(80, Number(impression.seen_count || 0) * 10);
    }

    score += stableJitter(`${userId}:${confession.id}`) * 35;
    return score;
}

function rankConfessions(confessions, impressionMap, userId) {
    return [...confessions].sort((a, b) => (
        scoreConfession(b, impressionMap.get(b.id), userId)
        - scoreConfession(a, impressionMap.get(a.id), userId)
    ));
}

export async function getConfessions(university = null, userId = null) {
    try {
        let query = supabase
            .from('optimized_confessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (university) {
            // Use case-insensitive matching and trim spaces to prevent "Uni " !== "Uni" bugs
            query = query.ilike('university', university.trim());
        }

        const { data, error } = await query;
        if (error) throw error;

        const confessionImpressions = await getFeedImpressionMap(userId, 'confession', 14);

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

        return { data: rankConfessions(enriched, confessionImpressions, userId), error: null };
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

            recordFeedImpression('confession', confessionId, 'confession_reaction', { engaged: true }).catch(() => {});

            // Notify the poster
            const { data: confession } = await supabase
                .from('confessions')
                .select('user_id, content')
                .eq('id', confessionId)
                .single();

            if (confession && confession.user_id) {
                const { data: poster } = await supabase
                    .from('profiles')
                    .select('confession_notifications')
                    .eq('id', confession.user_id)
                    .single();

                if (poster?.confession_notifications !== false) {
                    createNotification({
                        userId: confession.user_id,
                        actorId: userId,
                        type: 'snapshot_reaction',
                        title: `${emoji} New Reaction!`,
                        content: `Someone reacted with ${emoji} to your confession: "${confession.content.substring(0, 30)}..."`,
                        metadata: { confession_id: confessionId, url: '/confessions' }
                    }).catch(e => console.warn('Silent confession notification fail:', e));
                }
            }

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

        recordFeedImpression('confession', confessionId, 'confession_claim', { engaged: true }).catch(() => {});

        // Notify the poster about the claim
        const { data: confession } = await supabase
            .from('confessions')
            .select('user_id, content')
            .eq('id', confessionId)
            .single();

        if (confession && confession.user_id) {
            const { data: poster } = await supabase
                .from('profiles')
                .select('confession_notifications')
                .eq('id', confession.user_id)
                .single();

            if (poster?.confession_notifications !== false) {
                createNotification({
                    userId: confession.user_id,
                    actorId: claimerId,
                    type: 'snapshot_reaction',
                    title: 'Someone Claimed It! 🫢',
                    content: `Someone says this confession is about them: "${confession.content.substring(0, 30)}..."`,
                    metadata: { confession_id: confessionId, url: '/confessions' }
                }).catch(e => console.warn('Silent claim notification fail:', e));
            }
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
