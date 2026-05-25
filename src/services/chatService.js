import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';

const PAGE_SIZE = 20;

/**
 * Fetch all conversations with last message preview data.
 * Uses a nested select to get the last message per match in ONE query.
 */
export async function getConversations(userId) {
    try {
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id,
                created_at,
                user1_id,
                user2_id,
                disappearing_messages_seconds,
                user1:profiles!user1_id(id, full_name, avatar_url, last_seen_at),
                user2:profiles!user2_id(id, full_name, avatar_url, last_seen_at),
                messages(
                    id,
                    content,
                    type,
                    sender_id,
                    is_read,
                    created_at,
                    expires_at
                )
            `)
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .order('created_at', { ascending: false, foreignTable: 'messages' })
            .limit(1, { foreignTable: 'messages' });

        if (error) throw error;

        const conversations = data.map(match => {
            const isUser1 = match.user1_id === userId;
            const otherUser = isUser1 ? match.user2 : match.user1;
            const rawLastMsg = match.messages?.[0] || null;
            const lastMsg = rawLastMsg?.expires_at && new Date(rawLastMsg.expires_at) <= new Date()
                ? null
                : rawLastMsg;

            const previewByType = {
                image: 'Photo',
                voice: 'Voice note',
                gift: 'Gift',
                sticker: 'Sticker',
                call_log: 'Call'
            };

            return {
                id: match.id,
                created_at: match.created_at,
                disappearing_messages_seconds: match.disappearing_messages_seconds || 0,
                last_message_at: lastMsg?.created_at || match.created_at,
                last_message: lastMsg ? (previewByType[lastMsg.type] || lastMsg.content) : null,
                last_message_type: lastMsg?.type || null,
                last_message_sender_id: lastMsg?.sender_id || null,
                last_message_is_read: lastMsg?.is_read ?? true,
                has_unread: lastMsg
                    ? (lastMsg.sender_id !== userId && !lastMsg.is_read)
                    : false,
                other_user: otherUser
            };
        });

        // Sort by last message time descending
        conversations.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

        return { data: conversations, error: null };
    } catch (err) {
        console.error('getConversations error:', err.message);
        return { data: [], error: err.message };
    }
}

/**
 * Fetch the latest PAGE_SIZE messages for a match.
 * Returns messages in ascending chronological order for display.
 */
export async function getMessages(matchId, page = 0) {
    if (!matchId || matchId === 'null') {
        return { data: [], error: 'Invalid match ID', total: 0 };
    }
    try {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error, count } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('match_id', matchId)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Reverse so newest is at the bottom
        return { data: (data || []).reverse(), error: null, total: count };
    } catch (err) {
        console.error('getMessages error:', err.message);
        return { data: [], error: err.message, total: 0 };
    }
}

/**
 * Send a message.
 */
export async function sendMessage(matchId, senderId, content, type = 'text', metadata = {}) {
    console.log(`[CHAT-TRACE] sendMessage fired! matchId: ${matchId}, senderId: ${senderId}`);
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                match_id: matchId,
                sender_id: senderId,
                content,
                type,
                metadata
            })
            .select()
            .single();

        if (error) throw error;

        // AGGRESSIVE NOTIFICATION: Fetch the recipient ID and immediately ping their device/UI
        try {
            const { data: matchObj } = await supabase
                .from('matches')
                .select('user1_id, user2_id')
                .eq('id', matchId)
                .single();
            
            if (matchObj) {
                const recipientId = matchObj.user1_id === senderId ? matchObj.user2_id : matchObj.user1_id;
                const isCall = type === 'call_log';
                const callType = metadata?.callType === 'video' ? 'video' : 'voice';
                
                // Fire and forget (don't block the chat return on notification success)
                createNotification({
                    userId: recipientId,
                    actorId: senderId,
                    type: isCall ? 'call' : 'message',
                    title: isCall ? `Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call` : 'New Message',
                    content: isCall ? 'Tap to join the call.' : type === 'text' ? content : `Sent a ${type}`,
                    metadata: {
                        match_id: matchId,
                        url: isCall ? `/call/${matchId}?type=${callType}` : `/chat?chatId=${matchId}`,
                        call_type: isCall ? callType : undefined
                    }
                }).catch(err => console.warn('Silent chat notification error:', err));
            }
        } catch (notifErr) {
            console.error('Failed to trigger aggressive push for message:', notifErr);
        }

        return { data, error: null };
    } catch (err) {
        console.error('sendMessage error:', JSON.stringify(err, null, 2));
        return { data: null, error: err };
    }
}

export async function updateDisappearingMessages(matchId, seconds) {
    try {
        const { data, error } = await supabase.rpc('update_match_disappearing_messages', {
            p_match_id: matchId,
            p_seconds: seconds || 0
        });

        if (error) throw error;
        return { data: Array.isArray(data) ? data[0] : data, error: null };
    } catch (err) {
        console.error('updateDisappearingMessages error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Mark a single message as read.
 */
export async function markMessageAsRead(messageId) {
    try {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', messageId);

        if (error) throw error;
        return { error: null };
    } catch (err) {
        console.error('markMessageAsRead error:', err.message);
        return { error: err.message };
    }
}

/**
 * Bulk-mark all messages in a conversation as read.
 */
export async function markConversationRead(matchId, userId) {
    if (!matchId || matchId === 'null') return { error: 'Invalid match ID' };
    try {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('match_id', matchId)
            .neq('sender_id', userId)
            .eq('is_read', false);

        if (error) throw error;
        return { error: null };
    } catch (err) {
        console.error('markConversationRead error:', err.message);
        return { error: err.message };
    }
}

/**
 * Add or toggle an emoji reaction on a message.
 * Stores reactions in message metadata.
 */
export async function addReaction(messageId, emoji, userId) {
    try {
        // Fetch current reactions from metadata
        const { data: msg, error: fetchErr } = await supabase
            .from('messages')
            .select('metadata')
            .eq('id', messageId)
            .single();

        if (fetchErr) throw fetchErr;

        const reactions = msg.metadata?.reactions || {};
        const existing = reactions[emoji] || [];

        // Toggle: remove if already reacted, add if not
        if (existing.includes(userId)) {
            reactions[emoji] = existing.filter(id => id !== userId);
            if (reactions[emoji].length === 0) delete reactions[emoji];
        } else {
            reactions[emoji] = [...existing, userId];
        }

        const { error: updateErr } = await supabase
            .from('messages')
            .update({ metadata: { ...msg.metadata, reactions } })
            .eq('id', messageId);

        if (updateErr) throw updateErr;
        return { error: null };
    } catch (err) {
        console.error('addReaction error:', err.message);
        return { error: err.message };
    }
}

/**
 * Upload an image to Supabase Storage.
 */
export async function uploadChatImage(matchId, senderId, file) {
    try {
        const fileExt = file.type === 'image/webp' ? 'webp' : 'jpg';
        const fileName = `matches/${matchId}/images/${senderId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file, { contentType: file.type || 'image/jpeg' });

        if (error) throw error;

        const { data: signedData, error: signedError } = await supabase.storage
            .from('chat-media')
            .createSignedUrl(data.path, 60 * 60);

        if (signedError) throw signedError;

        return { path: data.path, url: signedData?.signedUrl || null, error: null };
    } catch (err) {
        console.error('uploadChatImage error:', err.message);
        return { path: null, url: null, error: err.message };
    }
}

/**
 * Upload a voice note to Supabase Storage.
 */
export async function uploadVoiceNote(matchId, senderId, file) {
    try {
        const fileName = `matches/${matchId}/voice/${senderId}_${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file, { contentType: 'audio/webm' });

        if (error) throw error;

        const { data: signedData, error: signedError } = await supabase.storage
            .from('chat-media')
            .createSignedUrl(data.path, 60 * 60);

        if (signedError) throw signedError;

        return { path: data.path, url: signedData?.signedUrl || null, error: null };
    } catch (err) {
        console.error('uploadVoiceNote error:', err.message);
        return { path: null, url: null, error: err.message };
    }
}

export async function getSignedChatMediaUrl(pathOrUrl, expiresIn = 60 * 60) {
    if (!pathOrUrl) return { url: null, error: 'Missing media path' };
    if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith('blob:')) {
        return { url: pathOrUrl, error: null };
    }

    try {
        const { data, error } = await supabase.storage
            .from('chat-media')
            .createSignedUrl(pathOrUrl, expiresIn);

        if (error) throw error;
        return { url: data?.signedUrl || null, error: null };
    } catch (err) {
        console.error('getSignedChatMediaUrl error:', err.message);
        return { url: null, error: err.message };
    }
}

/**
 * Subscribe to real-time message updates for a match.
 */
export function subscribeToMessages(matchId, onNewMessage, onMessageUpdate) {
    return supabase
        .channel(`match:${matchId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `match_id=eq.${matchId}`
            },
            (payload) => {
                if (payload.eventType === 'INSERT') onNewMessage(payload.new);
                else if (payload.eventType === 'UPDATE') onMessageUpdate(payload.new);
            }
        )
        .subscribe();
}

/**
 * Handle Presence (Online/Typing) for a specific match.
 */
export function setupPresence(matchId, userId, userData, onSync) {
    const channel = supabase.channel(`presence:${matchId}`, {
        config: { presence: { key: userId } },
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            onSync(channel.presenceState());
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    online_at: new Date().toISOString(),
                    user_id: userId,
                    full_name: userData.full_name,
                    is_typing: false,
                    avatar_url: userData.avatar_url
                });
            }
        });

    return channel;
}

/**
 * Broadcast typing status via Presence. Throttle calls externally.
 */
export async function updateTypingStatus(channel, userId, userData, isTyping) {
    if (!channel) return;
    await channel.track({
        online_at: new Date().toISOString(),
        user_id: userId,
        full_name: userData.full_name,
        is_typing: isTyping,
        avatar_url: userData.avatar_url
    });
}
