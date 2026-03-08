import { supabase } from '../lib/supabase';

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
                user1:profiles!user1_id(id, full_name, avatar_url, last_seen_at),
                user2:profiles!user2_id(id, full_name, avatar_url, last_seen_at),
                messages(
                    id,
                    content,
                    type,
                    sender_id,
                    is_read,
                    created_at
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
            const lastMsg = match.messages?.[0] || null;

            return {
                id: match.id,
                created_at: match.created_at,
                last_message_at: lastMsg?.created_at || match.created_at,
                last_message: lastMsg?.content || null,
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
    try {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error, count } = await supabase
            .from('messages')
            .select('*', { count: 'exact' })
            .eq('match_id', matchId)
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
        return { data, error: null };
    } catch (err) {
        console.error('sendMessage error:', JSON.stringify(err, null, 2));
        return { data: null, error: err };
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
export async function uploadChatImage(file) {
    try {
        const fileName = `images/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file, { contentType: 'image/jpeg' });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('chat-media')
            .getPublicUrl(data.path);

        return { url: publicUrl, error: null };
    } catch (err) {
        console.error('uploadChatImage error:', err.message);
        return { url: null, error: err.message };
    }
}

/**
 * Upload a voice note to Supabase Storage.
 */
export async function uploadVoiceNote(file) {
    try {
        const fileName = `voice/${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file, { contentType: 'audio/webm' });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('chat-media')
            .getPublicUrl(data.path);

        return { url: publicUrl, error: null };
    } catch (err) {
        console.error('uploadVoiceNote error:', err.message);
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
