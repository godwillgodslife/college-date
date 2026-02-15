import { supabase } from '../lib/supabase';

/**
 * Fetch all conversations (matches) for the current user.
 * Each conversation includes the profiles of the matched user.
 */
export async function getConversations(userId) {
    try {
        // Fetch matches where user is either user1 or user2
        const { data, error } = await supabase
            .from('matches')
            .select(`
                id,
                created_at,
                user1_id,
                user2_id,
                user1:profiles!user1_id(*),
                user2:profiles!user2_id(*)
            `)
            .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform data to return the "other" user's profile for each match
        const conversations = data.map(match => {
            const isUser1 = match.user1_id === userId;
            const otherUser = isUser1 ? match.user2 : match.user1;
            return {
                id: match.id,
                last_message_at: match.created_at, // Placeholder for actual last message time
                other_user: otherUser
            };
        });

        return { data: conversations, error: null };
    } catch (err) {
        console.error('getConversations error:', err.message);
        return { data: [], error: err.message };
    }
}

/**
 * Fetch messages for a specific match ID.
 */
export async function getMessages(matchId) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('match_id', matchId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (err) {
        console.error('getMessages error:', err.message);
        return { data: [], error: err.message };
    }
}

/**
 * Send a message to a specific match.
 * Supports different types: 'text', 'voice', 'sticker', 'gift'
 */
export async function sendMessage(matchId, senderId, content, type = 'text', metadata = {}) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                match_id: matchId,
                sender_id: senderId,
                content: content,
                type: type,
                metadata: metadata
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
 * Mark a message as read.
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
 * Upload a voice note to Supabase Storage.
 */
export async function uploadVoiceNote(file) {
    try {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.webm`;
        const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file);

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
 * Subscribe to real-time message updates for a specific match.
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
                if (payload.eventType === 'INSERT') {
                    onNewMessage(payload.new);
                } else if (payload.eventType === 'UPDATE') {
                    onMessageUpdate(payload.new);
                }
            }
        )
        .subscribe();
}

/**
 * Handle Presence (Online/Typing) for a specific match.
 */
export function setupPresence(matchId, userId, userData, onSync) {
    const channel = supabase.channel(`presence:${matchId}`, {
        config: {
            presence: {
                key: userId,
            },
        },
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            onSync(state);
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
