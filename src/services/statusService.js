import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/imageCompressor';
import { getAvatarUrl } from '../utils/profileData';
import { createNotification, sendEmailNotification } from './notificationService';

// Upload media for status
export async function uploadStatusMedia(file, userId) {
    try {
        let uploadFile = file;
        let fileExt = file.name?.split('.')?.pop() || 'tmp';

        // Compress if image (status media is usually photos)
        if (file.type?.startsWith('image/')) {
            uploadFile = await compressImage(file, { maxWidth: 1080, targetSizeKB: 120 });
            fileExt = uploadFile.type === 'image/webp' ? 'webp' : fileExt;
        }

        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('status-media')
            .upload(filePath, uploadFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('status-media')
            .getPublicUrl(filePath);

        return { url: data.publicUrl, error: null };
    } catch (error) {
        console.error('Error uploading status media:', error);
        return { url: null, error: error.message };
    }
}

// ...
// Create a new status
export async function createStatus(userId, mediaUrl, caption, mediaType = null) {
    try {
        const detectedType = mediaType || (mediaUrl?.match(/\.(mp4|webm|mov|m4v)/i) ? 'video' : 'image');
        const { data, error } = await supabase
            .from('status_updates') // Updated table name
            .insert({
                user_id: userId,
                media_url: mediaUrl,
                caption: caption,
                media_type: detectedType
                // expires_at is default 24h from db
            })
            .select()
            .single();

        if (error) {
            console.error('Supabase CREATE STATUS Error:', JSON.stringify(error, null, 2));
            throw error;
        }
        return { data, error: null };
    } catch (error) {
        console.error('Error creating status:', error);
        return { data: null, error: error };
    }
}

// Get recent statuses (active ones)
export async function getRecentStatuses() {
    try {
        const { data, error } = await supabase
            .from('status_updates') // Updated table name
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    avatar_url,
                    profile_photos,
                    photo_updated_at,
                    updated_at,
                    is_shadow_banned,
                    is_banned
                )
            `)
            .gt('expires_at', new Date().toISOString()) // Use expires_at
            .order('created_at', { ascending: false });

        if (error) throw error;
        const filteredData = (data || []).map(item => {
            const user = item.profiles;
            if (user?.is_banned) return null;
            const avatarUrl = user ? (getAvatarUrl(user) || user.avatar_url) : null;
            return {
                ...item,
                user_profile: {
                    id: user?.id || item.user_id,
                    full_name: user?.full_name || 'Campus Student',
                    avatar_url: avatarUrl,
                    university: user?.university || null
                },
                media_type: item.media_type || (item.media_url?.match(/\.(mp4|webm|mov|m4v)/i) ? 'video' : 'image')
            };
        }).filter(Boolean);
        return { data: filteredData, error: null };
    } catch (error) {
        console.error('Error fetching statuses:', error);
        return { data: [], error: error.message };
    }
}

// Get active statuses for a specific user
export async function getUserStatuses(userId) {
    if (!userId) return { data: [], error: null };
    try {
        const { data, error } = await supabase
            .from('status_updates')
            .select(`
                *,
                profiles:user_id (
                    id,
                    full_name,
                    avatar_url,
                    profile_photos,
                    photo_updated_at,
                    updated_at,
                    is_shadow_banned,
                    is_banned
                )
            `)
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: true });

        if (error) {
            // Fallback without relation join if foreign key error
            const fallback = await supabase
                .from('status_updates')
                .select('*')
                .eq('user_id', userId)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: true });
            if (fallback.error) throw fallback.error;
            const mappedFallback = (fallback.data || []).map(item => ({
                ...item,
                media_type: item.media_type || (item.media_url?.match(/\.(mp4|webm|mov|m4v)/i) ? 'video' : 'image')
            }));
            return { data: mappedFallback, error: null };
        }

        const mapped = (data || []).map(item => {
            const user = item.profiles;
            const profileSnippet = user ? {
                id: user.id,
                full_name: user.full_name || 'Campus Student',
                avatar_url: getAvatarUrl(user) || user.avatar_url,
                university: user.university || null
            } : null;
            return {
                ...item,
                user_profile: item.user_profile || profileSnippet,
                media_type: item.media_type || (item.media_url?.match(/\.(mp4|webm|mov|m4v)/i) ? 'video' : 'image')
            };
        });

        return { data: mapped, error: null };
    } catch (error) {
        console.error('Error fetching user statuses:', error);
        return { data: [], error: error.message };
    }
}

/**
 * Get all active statuses for a user, combining Supabase and local cache
 */
export async function getActiveUserStatuses(userId) {
    if (!userId) return [];
    try {
        let localList = [];
        try {
            const { getLocalUserStatuses } = await import('./localStatusService');
            localList = await getLocalUserStatuses(userId);
        } catch (e) {
            // localStatusService not available or SSR
        }

        const remoteRes = await getUserStatuses(userId).catch(() => ({ data: [] }));
        const remoteList = remoteRes?.data || [];
        const combined = [...(localList || []), ...(remoteList || [])];

        const seen = new Set();
        const deduplicated = [];
        const nowIso = new Date().toISOString();

        for (const s of combined) {
            if (!s || (s.expires_at && s.expires_at <= nowIso)) continue;
            const key = s.id || s.media_url;
            if (!seen.has(key)) {
                seen.add(key);
                deduplicated.push(s);
            }
        }

        return deduplicated.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } catch (err) {
        console.warn('Error in getActiveUserStatuses:', err);
        return [];
    }
}
// ...

// Get counts of hidden content for connectivity FOMO
export async function getHiddenContentCounts(userId) {
    try {
        const { data, error } = await supabase.rpc('get_hidden_content_counts', { v_user_id: userId });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching hidden counts:', error);
        return { data: { hidden_statuses: 0, hidden_snapshots: 0 }, error: error.message };
    }
}

const VIEWED_STATUSES_KEY_PREFIX = 'cd_viewed_status_ids_';

/**
 * Get all status IDs marked as viewed by a specific viewer
 * @param {string} viewerId 
 * @returns {Set<string>}
 */
export function getViewedStatusIds(viewerId) {
    if (!viewerId || typeof window === 'undefined') return new Set();
    try {
        const raw = window.localStorage.getItem(`${VIEWED_STATUSES_KEY_PREFIX}${viewerId}`);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        return new Set(Array.isArray(parsed) ? parsed : Object.keys(parsed));
    } catch {
        return new Set();
    }
}

/**
 * Mark a status as viewed locally for this viewer (WhatsApp style)
 */
export function markStatusAsViewedLocally(statusId, viewerId, authorId = null) {
    if (!statusId || !viewerId || typeof window === 'undefined') return;
    try {
        const key = `${VIEWED_STATUSES_KEY_PREFIX}${viewerId}`;
        const existing = getViewedStatusIds(viewerId);
        existing.add(statusId);
        window.localStorage.setItem(key, JSON.stringify([...existing]));
        window.dispatchEvent(new CustomEvent('cd:status-viewed', {
            detail: { statusId, viewerId, authorId }
        }));
    } catch (err) {
        console.warn('[statusService] Failed to record local status view:', err);
    }
}

// Record a view for a status
export async function recordStatusView(statusId, viewerId) {
    if (!statusId || !viewerId) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(statusId);
    if (!isUuid) return;

    try {
        // Prevent self-views from being recorded
        const { data: status } = await supabase
            .from('status_updates')
            .select('user_id')
            .eq('id', statusId)
            .maybeSingle();

        if (status && status.user_id === viewerId) return;

        const { error } = await supabase
            .from('status_views')
            .insert({ status_id: statusId, viewer_id: viewerId })
            .select()
            .maybeSingle();

        // Ignore unique constraint violations (already viewed)
        if (error && error.code !== '23505' && error.code !== '409') {
            console.warn('Supabase RECORD VIEW Error:', error.message);
        }
    } catch (error) {
        if (error?.message?.includes('409') || error?.code === '409') return;
        console.warn('Error recording status view:', error);
    }
}

/**
 * Mark status as viewed both locally and remotely
 */
export async function markStatusAsViewed(statusId, viewerId, authorId = null) {
    markStatusAsViewedLocally(statusId, viewerId, authorId);
    if (authorId && authorId === viewerId) return;
    recordStatusView(statusId, viewerId).catch(() => {});
}

/**
 * Notify all mutual friends/matches when a user adds a new status
 */
export async function notifyFriendsOfNewStatus({ authorId, authorProfile, statusId, mediaType, caption }) {
    if (!authorId) return { count: 0 };
    try {
        const { data: matches, error } = await supabase
            .from('matches')
            .select('user1_id, user2_id')
            .or(`user1_id.eq.${authorId},user2_id.eq.${authorId}`);

        if (error) {
            console.warn('[statusService] Error querying friends for status notification:', error);
            return { count: 0 };
        }

        const friendIds = [...new Set(
            (matches || []).map(m => m.user1_id === authorId ? m.user2_id : m.user1_id).filter(Boolean)
        )];

        if (friendIds.length === 0) return { count: 0 };

        const authorName = authorProfile?.full_name || authorProfile?.username || 'Your campus match';
        const isVid = mediaType === 'video';
        const notificationTitle = `${authorName} added a new campus story ${isVid ? '🎥' : '📸'}`;
        const notificationContent = caption?.trim()
            ? `"${caption.trim()}"`
            : `Watch ${authorName}'s new 24h story moment before it expires!`;

        await Promise.allSettled(friendIds.map(async (friendId) => {
            await createNotification({
                userId: friendId,
                actorId: authorId,
                type: 'status_update',
                title: notificationTitle,
                content: notificationContent,
                category: 'social',
                priority: 'normal',
                deepLink: `/profile/${authorId}`,
                metadata: {
                    status_id: statusId,
                    author_id: authorId,
                    author_name: authorName,
                    media_type: mediaType || 'image',
                    caption: caption || ''
                }
            });

            sendEmailNotification(
                friendId,
                `New Campus Story from ${authorName}`,
                notificationContent,
                {
                    title: notificationTitle,
                    type: 'status_update',
                    actionUrl: `https://www.thecollegedate.com/profile/${authorId}`,
                    metadata: {
                        status_id: statusId,
                        author_id: authorId
                    }
                }
            ).catch(() => {});
        }));

        return { count: friendIds.length };
    } catch (err) {
        console.error('[statusService] Failed to notify friends of status:', err);
        return { count: 0, error: err.message };
    }
}

// Get viewers for a specific status
export async function getStatusViewers(statusId) {
    try {
        const { data, error } = await supabase
            .from('status_views')
            .select(`
                viewed_at,
                viewer:viewer_id (
                    id,
                    full_name,
                    avatar_url,
                    profile_photos,
                    photo_updated_at,
                    updated_at
                )
            `)
            .eq('status_id', statusId)
            .order('viewed_at', { ascending: false });

        if (error) throw error;
        const mapped = (data || []).map(item => {
            if (item.viewer) {
                item.viewer.avatar_url = getAvatarUrl(item.viewer) || item.viewer.avatar_url;
            }
            return item;
        });
        return { data: mapped, error: null };
    } catch (error) {
        console.error('Error fetching status viewers:', error);
        return { data: [], error: error.message };
    }
}
