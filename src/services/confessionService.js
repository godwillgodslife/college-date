import { supabase } from '../lib/supabase';
import { createNotification, sendEmailNotification } from './notificationService';
import { getFeedImpressionMap, recordFeedImpression } from './feedImpressionService';
import { compressImage } from '../utils/imageCompressor';

// Emoji set used in Confessions.jsx and DB constraint
export const REACTION_EMOJIS = ['❤️', '🔥', '😂', '🙊', '🙏', '😢', '😡', '🙈'];

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

        // Parallelize database queries for instant 1-tap feed loading
        const [confessionsRes, confessionImpressions, userRepostsRes] = await Promise.all([
            query,
            getFeedImpressionMap(userId, 'confession', 14),
            userId
                ? supabase.from('confession_reposts').select('confession_id').eq('user_id', userId)
                : Promise.resolve({ data: [] })
        ]);

        if (confessionsRes.error) throw confessionsRes.error;
        const data = confessionsRes.data;

        // Fetch user reposts set
        const userRepostSet = new Set((userRepostsRes.data || []).map(r => r.confession_id));

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
            const hasReposted = userRepostSet.has(c.id);

            return {
                ...c,
                reactionCounts,
                userReactions: [...userReactions],
                hasClaimed,
                hasReposted,
                // These are already in the view!
                totalReactions: c.total_reactions,
                commentCount: c.comment_count,
                isViral: c.is_viral,
                repostCount: c.repost_count || 0,
                viewCount: c.view_count || 0
            };
        });

        return { data: rankConfessions(enriched, confessionImpressions, userId), error: null };
    } catch (error) {
        console.error('Error fetching confessions:', error);
        return { data: [], error: error.message };
    }
}

/**
 * Notify all mutual friends/matches when a user shares a PUBLIC campus post/confession
 * (High-priority push notification and email)
 */
export async function notifyFriendsOfPublicConfession({ authorId, confessionId, content, authorName, university }) {
    if (!authorId) return { count: 0 };
    try {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('user1_id, user2_id')
            .or(`user1_id.eq.${authorId},user2_id.eq.${authorId}`);

        if (error) {
            console.warn('[confessionService] Error finding friends for public confession alert:', error);
            return { count: 0 };
        }

        const friendIds = [...new Set(
            (matches || []).map(m => m.user1_id === authorId ? m.user2_id : m.user1_id).filter(Boolean)
        )];

        if (friendIds.length === 0) return { count: 0 };

        const name = authorName || 'Your campus match';
        const title = `${name} shared a public post on Campus 🎭`;
        const snippet = content?.trim()
            ? (content.trim().length > 90 ? `${content.trim().slice(0, 87)}...` : content.trim())
            : 'Check out what they posted on campus confessions!';

        await Promise.allSettled(friendIds.map(async (friendId) => {
            // 1. High priority in-app + server-authoritative push
            await createNotification({
                userId: friendId,
                actorId: authorId,
                type: 'confession',
                title,
                content: snippet,
                category: 'social',
                priority: 'high',
                deepLink: '/confessions',
                metadata: {
                    confession_id: confessionId,
                    author_id: authorId,
                    is_public: true,
                    high_priority: true
                }
            });

            // 2. High priority immediate email notification
            sendEmailNotification(
                friendId,
                `${name} shared a public post on The College Date`,
                snippet,
                {
                    title,
                    type: 'confession',
                    actionUrl: 'https://www.thecollegedate.com/confessions',
                    metadata: { confession_id: confessionId, author_id: authorId }
                }
            ).catch(() => {});
        }));

        return { count: friendIds.length };
    } catch (err) {
        console.error('[confessionService] Failed to notify friends of public confession:', err);
        return { count: 0, error: err.message };
    }
}

export async function postConfession(content, university, userId, options = {}) {
    try {
        const cleanUni = university ? university.trim() : 'Unknown University';
        const {
            postType = 'anonymous_confession',
            isAnonymous = true,
            authorName = null,
            authorAvatar = null,
            authorUsername = null,
            imageUrl = null
        } = options;

        const payload = {
            content,
            university: cleanUni,
            user_id: userId,
            post_type: postType,
            is_anonymous: isAnonymous,
            author_name: isAnonymous ? null : authorName,
            author_avatar: isAnonymous ? null : authorAvatar,
            author_username: isAnonymous ? null : authorUsername,
            image_url: imageUrl
        };

        const { data, error } = await supabase
            .from('confessions')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        // If this is a public post (not anonymous), trigger high-priority notification to friends
        if (!isAnonymous && userId && data?.id) {
            notifyFriendsOfPublicConfession({
                authorId: userId,
                confessionId: data.id,
                content,
                authorName,
                university: cleanUni
            }).catch((err) => console.warn('[confessionService] friend alert error:', err));
        }

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

/**
 * Toggle repost on a confession
 */
export async function repostConfession(confessionId, userId) {
    if (!confessionId || !userId) return { error: 'Confession ID and User ID required' };
    try {
        const { data: existing } = await supabase
            .from('confession_reposts')
            .select('id')
            .eq('confession_id', confessionId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('confession_reposts')
                .delete()
                .eq('id', existing.id);
            if (error) throw error;
            return { reposted: false, error: null };
        } else {
            const { error } = await supabase
                .from('confession_reposts')
                .insert({
                    confession_id: confessionId,
                    user_id: userId
                });
            if (error) throw error;
            return { reposted: true, error: null };
        }
    } catch (err) {
        console.error('repostConfession error:', err);
        return { error: err.message };
    }
}

/**
 * Get posts and reposts for a specific user (for their profile page)
 */
export async function getUserPostsAndReposts(userId) {
    if (!userId) return { data: [], error: 'User ID required' };
    try {
        // 1. Fetch posts created by this user
        const { data: authored, error: authError } = await supabase
            .from('optimized_confessions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (authError) throw authError;

        // 2. Fetch reposts by this user
        const { data: repostRecords, error: repError } = await supabase
            .from('confession_reposts')
            .select('confession_id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (repError) throw repError;

        let repostedPosts = [];
        if (repostRecords && repostRecords.length > 0) {
            const repIds = repostRecords.map(r => r.confession_id);
            const { data: repData } = await supabase
                .from('optimized_confessions')
                .select('*')
                .in('id', repIds);

            if (repData) {
                const repDateMap = new Map(repostRecords.map(r => [r.confession_id, r.created_at]));
                repostedPosts = repData.map(p => ({
                    ...p,
                    isRepost: true,
                    repostedAt: repDateMap.get(p.id)
                }));
            }
        }

        const combined = [
            ...(authored || []).map(p => ({ ...p, isRepost: false })),
            ...repostedPosts
        ].sort((a, b) => new Date(b.repostedAt || b.created_at) - new Date(a.repostedAt || a.created_at));

        return { data: combined, error: null };
    } catch (err) {
        console.error('getUserPostsAndReposts error:', err);
        return { data: [], error: err.message };
    }
}

/**
 * Toggle like on a confession comment
 */
export async function toggleCommentLike(commentId, userId) {
    if (!commentId || !userId) return { error: 'Comment ID and User ID required' };
    try {
        const { data: existing } = await supabase
            .from('confession_comment_likes')
            .select('id')
            .eq('comment_id', commentId)
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('confession_comment_likes')
                .delete()
                .eq('id', existing.id);
            if (error) throw error;
            return { liked: false, error: null };
        } else {
            const { error } = await supabase
                .from('confession_comment_likes')
                .insert({
                    comment_id: commentId,
                    user_id: userId
                });
            if (error) throw error;
            return { liked: true, error: null };
        }
    } catch (err) {
        console.error('toggleCommentLike error:', err);
        return { error: err.message };
    }
}

/**
 * Get the set of comment IDs liked by a user
 */
export async function getUserCommentLikes(commentIds, userId) {
    if (!userId || !commentIds || !commentIds.length) return new Set();
    try {
        const { data, error } = await supabase
            .from('confession_comment_likes')
            .select('comment_id')
            .in('comment_id', commentIds)
            .eq('user_id', userId);

        if (error) throw error;
        return new Set((data || []).map(r => r.comment_id));
    } catch (err) {
        console.error('getUserCommentLikes error:', err);
        return new Set();
    }
}

/**
 * Send an anonymous NGL-style message to a student
 */
export async function sendAnonymousMessage(recipientUsernameOrId, content) {
    try {
        if (!recipientUsernameOrId || !content?.trim()) {
            return { error: 'Recipient and message content are required' };
        }

        let recipientId = null;
        let recipientUsername = recipientUsernameOrId;

        // 1. Resolve recipient via public ask RPC (works for unauthenticated visitors)
        try {
            const { data: publicProfile } = await supabase
                .rpc('get_public_ask_profile', { p_username_or_id: String(recipientUsernameOrId).replace(/^@/, '').trim() });
            if (publicProfile?.id) {
                recipientId = publicProfile.id;
                recipientUsername = publicProfile.username || recipientUsernameOrId;
            }
        } catch (_) {}

        // Fallback resolution via profiles table if authenticated
        if (!recipientId) {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipientUsernameOrId);
            if (isUuid) {
                recipientId = recipientUsernameOrId;
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .eq('id', recipientId)
                    .maybeSingle();
                if (prof?.username) recipientUsername = prof.username;
            } else {
                const cleanUser = recipientUsernameOrId.replace(/^@/, '').trim();
                const { data: prof } = await supabase
                    .from('profiles')
                    .select('id, username')
                    .ilike('username', cleanUser)
                    .maybeSingle();
                if (prof) {
                    recipientId = prof.id;
                    recipientUsername = prof.username;
                }
            }
        }

        if (!recipientId) {
            return { error: 'Student profile not found. Please verify the link or username.' };
        }

        // 2. Submit via security definer RPC first (handles insert + notification safely)
        try {
            const { data: rpcRes, error: rpcErr } = await supabase
                .rpc('submit_anonymous_ask_message', {
                    p_recipient_id: recipientId,
                    p_content: content.trim()
                });
            if (!rpcErr && rpcRes) {
                return { data: rpcRes, error: null };
            }
            if (rpcErr) {
                console.warn('[confessionService] submit_anonymous_ask_message RPC failed, attempting direct insert:', rpcErr.message);
            }
        } catch (rpcEx) {
            console.warn('[confessionService] RPC call exception, attempting direct insert:', rpcEx);
        }

        // 3. Fallback to direct insert without .select().single() to avoid RLS check violation for anon
        const { error: insertError } = await supabase
            .from('user_anonymous_messages')
            .insert({
                recipient_id: recipientId,
                recipient_username: recipientUsername,
                content: content.trim()
            });

        if (insertError) throw insertError;

        // Send notification to recipient
        createNotification({
            userId: recipientId,
            actorId: null,
            type: 'snapshot_reaction',
            title: 'New Anonymous Message 💌',
            content: `Someone sent you an anonymous message: "${content.trim().substring(0, 35)}..."`,
            metadata: { url: '/confessions?tab=inbox' }
        }).catch(() => {});

        return { data: { recipient_id: recipientId, success: true }, error: null };
    } catch (err) {
        console.error('sendAnonymousMessage error:', err);
        return { data: null, error: err.message };
    }
}

/**
 * Fetch received anonymous messages for the current user
 */
export async function getAnonymousMessages(recipientId) {
    if (!recipientId) return { data: [], error: 'User ID required' };
    try {
        const { data, error } = await supabase
            .from('user_anonymous_messages')
            .select('*')
            .eq('recipient_id', recipientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (err) {
        console.error('getAnonymousMessages error:', err);
        return { data: [], error: err.message };
    }
}

/**
 * Delete an anonymous message
 */
export async function deleteAnonymousMessage(messageId) {
    try {
        const { error } = await supabase
            .from('user_anonymous_messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
        return { error: null };
    } catch (err) {
        console.error('deleteAnonymousMessage error:', err);
        return { error: err.message };
    }
}

/**
 * Mark anonymous message as read
 */
export async function markAnonymousMessageRead(messageId) {
    try {
        const { error } = await supabase
            .from('user_anonymous_messages')
            .update({ is_read: true })
            .eq('id', messageId);

        if (error) throw error;
        return { error: null };
    } catch (err) {
        console.error('markAnonymousMessageRead error:', err);
        return { error: err.message };
    }
}

/**
 * Upload confession image to Supabase Storage confessions-media bucket
 */
export async function uploadConfessionMedia(file, userId) {
    try {
        let uploadFile = file;
        if (file && file.type && file.type.startsWith('image/')) {
            uploadFile = await compressImage(file, { maxWidth: 1080, targetSizeKB: 120 });
        }
        const fileExt = uploadFile.type === 'image/webp' ? 'webp' : (file.name ? file.name.split('.').pop() : 'jpg');
        const fileName = `${userId || 'anon'}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('confessions-media')
            .upload(filePath, uploadFile, {
                cacheControl: '3600',
                contentType: uploadFile.type || 'image/jpeg',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('confessions-media')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, error: null };
    } catch (err) {
        console.error('uploadConfessionMedia error:', err);
        return { url: null, error: err.message };
    }
}

/**
 * Fetch a single confession by ID (for deep linking)
 */
export async function getConfessionById(confessionId, userId = null) {
    if (!confessionId) return { data: null, error: 'No confession ID provided' };
    try {
        const { data, error } = await supabase
            .from('optimized_confessions')
            .select('*')
            .eq('id', confessionId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return { data: null, error: 'Confession not found' };

        const reactionCounts = {};
        const userReactions = new Set();
        REACTION_EMOJIS.forEach(e => { reactionCounts[e] = 0; });

        (data.reaction_data || []).forEach(r => {
            reactionCounts[r.e] = (reactionCounts[r.e] || 0) + 1;
            if (r.u === userId) userReactions.add(r.e);
        });

        let hasReposted = false;
        if (userId) {
            const { data: repData } = await supabase
                .from('confession_reposts')
                .select('id')
                .eq('confession_id', confessionId)
                .eq('user_id', userId)
                .maybeSingle();
            hasReposted = Boolean(repData);
        }

        const enriched = {
            ...data,
            reactionCounts,
            userReactions: [...userReactions],
            hasClaimed: (data.claimer_ids || []).includes(userId),
            hasReposted,
            totalReactions: data.total_reactions || 0,
            commentCount: data.comment_count || 0,
            isViral: data.is_viral || false,
            repostCount: data.repost_count || 0,
            viewCount: data.view_count || 0
        };

        return { data: enriched, error: null };
    } catch (err) {
        console.warn('getConfessionById error:', err);
        return { data: null, error: err.message };
    }
}

const recordedConfessionViews = new Set();

function getStoredViewedConfessions(userId) {
    try {
        const key = `tcd_viewed_confessions_${userId || 'guest'}`;
        const raw = localStorage.getItem(key);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed : Object.keys(parsed));
    } catch {
        return new Set();
    }
}

function markConfessionViewedInStorage(confessionId, userId) {
    try {
        const key = `tcd_viewed_confessions_${userId || 'guest'}`;
        const set = getStoredViewedConfessions(userId);
        set.add(confessionId);
        const arr = Array.from(set).slice(-500);
        localStorage.setItem(key, JSON.stringify(arr));
    } catch {
        // Ignore quota
    }
}

/**
 * Record a unique view count for a confession.
 * Enforces per-user uniqueness across sessions: 1 user viewing 5 times = 1 view.
 * Returns true if this view was newly recorded and incremented, false if already viewed.
 */
export async function recordConfessionView(confessionId, userId = null) {
    if (!confessionId) return false;
    const sessionKey = `${userId || 'guest'}:${confessionId}`;
    if (recordedConfessionViews.has(sessionKey)) return false;

    const storedSet = getStoredViewedConfessions(userId);
    if (storedSet.has(confessionId)) {
        recordedConfessionViews.add(sessionKey);
        return false;
    }

    recordedConfessionViews.add(sessionKey);
    markConfessionViewedInStorage(confessionId, userId);

    try {
        const { error } = await supabase.rpc('increment_confession_view', {
            p_confession_id: confessionId
        });
        if (error) {
            recordFeedImpression('confession', confessionId, 'confessions_feed').catch(() => {});
        }
        return true;
    } catch (err) {
        console.warn('recordConfessionView non-blocking error:', err);
        return false;
    }
}

// ─── CAMPUS DAILY PROMPT ENGINE ─────────────────────────────────────────────

export { CAMPUS_DAILY_PROMPTS, getCampusDailyPrompt } from '../utils/campusCommonGround.js';

