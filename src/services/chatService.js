import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';
import { getMessageInfo, isValidMessageId, isMessageDeletedForUser } from '../utils/messageInfo.js';

export { getMessageInfo, isValidMessageId, isMessageDeletedForUser };

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
                    expires_at,
                    metadata
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
            const isDeletedForMe = Array.isArray(rawLastMsg?.metadata?.deleted_for) && rawLastMsg.metadata.deleted_for.includes(userId);
            const lastMsg = (rawLastMsg?.expires_at && new Date(rawLastMsg.expires_at) <= new Date()) || isDeletedForMe
                ? null
                : rawLastMsg;

            const previewByType = {
                image: '📷 Photo',
                video: '🎥 Video',
                document: '📄 Document',
                voice: '🎤 Voice note',
                gift: '🎁 Gift',
                sticker: '✨ Sticker',
                call_log: '📞 Call',
                location: '📍 Live location',
                service_deal: '🤝 Service deal',
                view_once: '① View once'
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
 * Automatically filters out messages deleted for the current user and enriches Message Info timestamps.
 */
export async function getMessages(matchId, page = 0, currentUserId = null) {
    if (!matchId || matchId === 'null') {
        return { data: [], error: 'Invalid match ID', total: 0 };
    }
    try {
        let activeUserId = currentUserId;
        if (!activeUserId) {
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                activeUserId = sessionData?.session?.user?.id || null;
            } catch (authErr) {
                console.warn('Could not resolve current user session in getMessages:', authErr);
            }
        }

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

        // Filter out messages that have been deleted for the current user
        const visibleMessages = (data || []).filter(msg => {
            const deletedFor = msg.metadata?.deleted_for;
            if (activeUserId && Array.isArray(deletedFor) && deletedFor.includes(activeUserId)) {
                return false;
            }
            return true;
        });

        // Enrich messages with sent_at, delivered_at, and seen_at/read_at for Message Info
        const enriched = visibleMessages.map(msg => ({
            ...msg,
            sent_at: msg.created_at,
            delivered_at: msg.delivered_at || msg.created_at,
            seen_at: msg.seen_at || msg.read_at || null,
            read_at: msg.read_at || msg.seen_at || null,
            is_read: Boolean(msg.is_read || msg.read_at || msg.seen_at)
        }));

        // Reverse so newest is at the bottom
        return { data: enriched.reverse(), error: null, total: count };
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
        const clientNonce = metadata?.client_nonce;
        if (clientNonce) {
            const { data: existingMessage, error: existingError } = await supabase
                .from('messages')
                .select('*')
                .eq('match_id', matchId)
                .eq('sender_id', senderId)
                .eq('metadata->>client_nonce', clientNonce)
                .maybeSingle();

            if (existingError) {
                console.warn('sendMessage client_nonce lookup failed:', existingError.message);
            } else if (existingMessage) {
                return { data: existingMessage, error: null };
            }
        }

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
                const callId = metadata?.callId || matchId;

                // Resolve sender profile for rich notification delivery
                let senderName = metadata?.senderName || metadata?.callerName;
                let senderAvatar = metadata?.senderAvatar || metadata?.callerAvatar;

                if (!senderName) {
                    try {
                        const { data: senderProf } = await supabase
                            .from('profiles')
                            .select('full_name, avatar_url')
                            .eq('id', senderId)
                            .maybeSingle();
                        if (senderProf) {
                            senderName = senderProf.full_name;
                            senderAvatar = senderProf.avatar_url;
                        }
                    } catch (profErr) {
                        console.warn('Failed to load sender profile for chat notification:', profErr);
                    }
                }

                const displayName = senderName || 'Someone';
                let messageSnippet = 'Sent a message';
                if (type === 'text') {
                    messageSnippet = content;
                } else if (type === 'voice') {
                    messageSnippet = '🎤 Voice note';
                } else if (type === 'image') {
                    messageSnippet = '📷 Photo';
                } else if (type === 'video') {
                    messageSnippet = '🎥 Video';
                } else if (type === 'document') {
                    messageSnippet = `📄 Document: ${content || 'File'}`;
                } else if (type === 'location') {
                    messageSnippet = '📍 Live Location';
                } else if (type === 'deal') {
                    messageSnippet = '💼 Service Deal';
                } else if (isCall) {
                    messageSnippet = `${displayName} is calling you...`;
                }

                const callDeepLink = `/call/${callId}?matchId=${matchId}&type=${callType}&name=${encodeURIComponent(displayName)}${senderAvatar ? `&avatar=${encodeURIComponent(senderAvatar)}` : ''}`;
                const chatDeepLink = `/chat?chatId=${matchId}`;
                const suppressPush = Boolean(metadata?.recipientIsActive || metadata?.suppressPush);

                // Fire and forget (don't block the chat return on notification success)
                createNotification({
                    userId: recipientId,
                    actorId: senderId,
                    type: isCall ? 'call' : 'message',
                    title: isCall ? `Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call 📞` : displayName,
                    content: messageSnippet,
                    category: 'messages',
                    entityType: 'message',
                    entityId: data.id,
                    conversationId: matchId,
                    matchId,
                    deepLink: isCall ? callDeepLink : chatDeepLink,
                    priority: isCall ? 'critical' : 'high',
                    groupKey: `chat:${matchId}`,
                    dedupeKey: `message:${data.id}`,
                    suppressPush,
                    metadata: {
                        message_id: data.id,
                        match_id: matchId,
                        url: isCall ? callDeepLink : chatDeepLink,
                        call_type: isCall ? callType : undefined,
                        call_id: isCall ? callId : undefined,
                        caller_name: isCall ? displayName : undefined,
                        caller_avatar: isCall ? senderAvatar : undefined,
                        actor_name: displayName,
                        actor_avatar_url: senderAvatar,
                        sender_name: displayName,
                        sender_avatar: senderAvatar
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
        const nowIso = new Date().toISOString();
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true, read_at: nowIso, seen_at: nowIso })
            .eq('id', messageId);

        if (error) throw error;
        return { error: null };
    } catch (err) {
        console.error('markMessageAsRead error:', err.message);
        return { error: err.message };
    }
}

/**
 * Bulk-mark all messages in a conversation as read and cancel pending delayed notification emails.
 */
export async function markConversationRead(matchId, userId) {
    if (!matchId || matchId === 'null') return { error: 'Invalid match ID' };
    try {
        // 1. Attempt atomic server-authoritative RPC (marks messages & notifs read, cancels delayed emails)
        try {
            const { error: rpcError } = await supabase.rpc('mark_conversation_read_and_cancel_emails', {
                p_match_id: matchId,
                p_user_id: userId
            });
            if (!rpcError) return { error: null };
        } catch (_rpcErr) {
            // Graceful fallback to direct update if RPC is missing in offline/mock environment
        }

        // 2. Fallback direct update to messages table
        const nowIso = new Date().toISOString();
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true, read_at: nowIso, seen_at: nowIso })
            .eq('match_id', matchId)
            .neq('sender_id', userId)
            .eq('is_read', false);

        if (error) throw error;

        // 3. Sync notifications for this conversation
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true, read_at: nowIso })
                .eq('user_id', userId)
                .eq('is_read', false)
                .or(`conversation_id.eq.${matchId},match_id.eq.${matchId}`);
        } catch (_) {
            // Notification sync failure is non-blocking
        }

        return { error: null };
    } catch (err) {
        console.error('markConversationRead error:', err.message);
        return { error: err.message };
    }
}

/**
 * Add or toggle an emoji reaction on a message.
 * Uses the security definer RPC toggle_message_reaction.
 */
export async function addReaction(messageId, emoji, userId) {
    try {
        const { data, error } = await supabase.rpc('toggle_message_reaction', {
            p_message_id: messageId,
            p_emoji: emoji
        });

        if (error) {
            console.warn('[chatService] toggle_message_reaction RPC error, trying fallback:', error.message);
            // Fallback for offline or direct update if allowed
            const { data: msg, error: fetchErr } = await supabase
                .from('messages')
                .select('metadata')
                .eq('id', messageId)
                .single();

            if (fetchErr) throw fetchErr;

            const reactions = msg.metadata?.reactions || {};
            const existing = reactions[emoji] || [];

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
            return { data: { reactions }, error: null };
        }

        return { data, error: null };
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

/**
 * Upload a document/file to Supabase Storage (PDF, DOC, XLS, PPT, TXT, ZIP).
 * Max limit: 20MB.
 */
export async function uploadChatDocument(matchId, senderId, file) {
    try {
        const MAX_DOC_SIZE = 20 * 1024 * 1024;
        if (file.size > MAX_DOC_SIZE) {
            throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 20MB limit.`);
        }

        const nameParts = (file.name || 'document').split('.');
        const rawExt = nameParts.length > 1 ? nameParts.pop().toLowerCase() : 'pdf';
        const allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'];
        const fileExt = allowedExts.includes(rawExt) ? rawExt : 'bin';
        const safeBaseName = nameParts.join('_').replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 40);

        const fileName = `matches/${matchId}/documents/${senderId}_${Date.now()}_${safeBaseName}.${fileExt}`;
        const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file, { contentType: file.type || 'application/octet-stream' });

        if (error) throw error;

        const { data: signedData, error: signedError } = await supabase.storage
            .from('chat-media')
            .createSignedUrl(data.path, 60 * 60);

        if (signedError) throw signedError;

        return {
            path: data.path,
            url: signedData?.signedUrl || null,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            error: null
        };
    } catch (err) {
        console.error('uploadChatDocument error:', err.message);
        return { path: null, url: null, error: err.message };
    }
}

/**
 * Upload a video message to Supabase Storage.
 * Max limit: 30MB.
 */
export async function uploadChatVideo(matchId, senderId, file) {
    try {
        const MAX_VIDEO_SIZE = 30 * 1024 * 1024;
        if (file.size > MAX_VIDEO_SIZE) {
            throw new Error(`Video size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds 30MB limit.`);
        }

        const fileExt = file.type === 'video/webm' ? 'webm' : 'mp4';
        const fileName = `matches/${matchId}/videos/${senderId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data, error } = await supabase.storage
            .from('chat-media')
            .upload(fileName, file, { contentType: file.type || 'video/mp4' });

        if (error) throw error;

        const { data: signedData, error: signedError } = await supabase.storage
            .from('chat-media')
            .createSignedUrl(data.path, 60 * 60);

        if (signedError) throw signedError;

        return {
            path: data.path,
            url: signedData?.signedUrl || null,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            error: null
        };
    } catch (err) {
        console.error('uploadChatVideo error:', err.message);
        return { path: null, url: null, error: err.message };
    }
}

/**
 * Open a View Once media message.
 * Authoritative single-view validation on backend.
 */
export async function openViewOnceMedia(messageId) {
    try {
        const { data, error } = await supabase.rpc('open_view_once_media', {
            p_message_id: messageId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Could not open view-once media');

        const { url, error: signedErr } = await getSignedChatMediaUrl(data.storage_path, 60);
        if (signedErr || !url) throw new Error(signedErr || 'Failed to sign media URL');

        return {
            url,
            mediaType: data.media_type || 'image',
            error: null
        };
    } catch (err) {
        console.error('openViewOnceMedia error:', err);
        return { url: null, error: err.message };
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
 * Subscribe to real-time message updates and match updates for a conversation.
 * Handles deleted_for metadata filtering and enriches Message Info timestamps.
 */
export function subscribeToMessages(matchId, onNewMessage, onMessageUpdate, onMessageDelete, onMatchUpdate, currentUserId = null) {
    let resolvedUserId = currentUserId;
    if (!resolvedUserId) {
        supabase.auth.getSession().then(({ data }) => {
            if (data?.session?.user?.id) {
                resolvedUserId = data.session.user.id;
            }
        }).catch(() => {});
    }

    const enrichPayload = (rawMsg) => {
        if (!rawMsg) return rawMsg;
        return {
            ...rawMsg,
            sent_at: rawMsg.created_at,
            delivered_at: rawMsg.delivered_at || rawMsg.created_at,
            seen_at: rawMsg.seen_at || rawMsg.read_at || null,
            read_at: rawMsg.read_at || rawMsg.seen_at || null,
            is_read: Boolean(rawMsg.is_read || rawMsg.read_at || rawMsg.seen_at)
        };
    };

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
                    const deletedFor = payload.new?.metadata?.deleted_for;
                    if (resolvedUserId && Array.isArray(deletedFor) && deletedFor.includes(resolvedUserId)) {
                        return;
                    }
                    onNewMessage(enrichPayload(payload.new));
                }
                else if (payload.eventType === 'UPDATE') {
                    const deletedFor = payload.new?.metadata?.deleted_for;
                    if (resolvedUserId && Array.isArray(deletedFor) && deletedFor.includes(resolvedUserId)) {
                        if (typeof onMessageDelete === 'function') {
                            onMessageDelete(payload.new);
                        }
                        return;
                    }
                    onMessageUpdate(enrichPayload(payload.new));
                }
                else if (payload.eventType === 'DELETE' && typeof onMessageDelete === 'function') {
                    onMessageDelete(payload.old);
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'matches',
                filter: `id=eq.${matchId}`
            },
            (payload) => {
                if (typeof onMatchUpdate === 'function') onMatchUpdate(payload.new);
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

/**
 * Edit a sent message via secure database RPC edit_chat_message.
 * Sender can ONLY edit if the recipient has NOT seen/read the message (is_read = false and read_at/seen_at IS NULL).
 * Only text messages can be edited (media messages are rejected).
 * Enforces 15-minute edit window.
 */
export async function editMessage(messageId, newContentOrSender, maybeContent) {
    const newContent = maybeContent !== undefined ? maybeContent : newContentOrSender;
    if (!isValidMessageId(messageId)) {
        return { data: null, error: 'Message is still syncing. Please wait a moment.' };
    }
    try {
        const { data, error } = await supabase.rpc('edit_chat_message', {
            p_message_id: messageId,
            p_new_content: newContent
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to edit message');

        return { data, error: null };
    } catch (err) {
        console.error('editMessage RPC error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Delete a message for everyone via secure database RPC delete_chat_message_for_everyone / delete_chat_message.
 * Sender can ONLY delete for everyone if the recipient has NOT seen/read the message.
 * Replaces content with "This message was deleted" and sets type to 'deleted'.
 */
export async function deleteMessageForEveryone(messageId) {
    if (!isValidMessageId(messageId)) {
        return { data: null, error: 'Message is still syncing. Please wait a moment.' };
    }
    try {
        // Attempt delete_chat_message_for_everyone first, fall back to delete_chat_message
        let { data, error } = await supabase.rpc('delete_chat_message_for_everyone', {
            p_message_id: messageId
        });

        if (error && (error.code === 'PGRST202' || error.message?.includes('not found'))) {
            const fallback = await supabase.rpc('delete_chat_message', {
                p_message_id: messageId
            });
            data = fallback.data;
            error = fallback.error;
        }

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to delete message for everyone');

        return { data, error: null };
    } catch (err) {
        console.error('deleteMessageForEveryone RPC error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Delete a message for the current user only via secure database RPC delete_chat_message_for_me.
 * Appends the calling user ID to metadata.deleted_for without impacting other participants.
 */
export async function deleteMessageForMe(messageId) {
    if (!isValidMessageId(messageId)) {
        return { data: null, error: 'Message is still syncing. Please wait a moment.' };
    }
    try {
        const { data, error } = await supabase.rpc('delete_chat_message_for_me', {
            p_message_id: messageId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to delete message for me');

        return { data, error: null };
    } catch (err) {
        console.error('deleteMessageForMe RPC error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Backward-compatible alias for deleteMessageForEveryone.
 */
export async function deleteMessage(messageId) {
    return deleteMessageForEveryone(messageId);
}

/**
 * Initiate a call session (voice or video) with authoritative state machine.
 */
export async function initiateCallSignal(matchId, callType = 'voice') {
    try {
        const { data, error } = await supabase.rpc('initiate_call_session', {
            p_match_id: matchId,
            p_call_type: callType
        });

        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('initiateCallSignal error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Respond to an incoming call signal ('accepted', 'rejected', 'ended', 'cancelled', 'timeout').
 */
export async function respondCallSignal(callIdOrMatchId, action, reason = null) {
    try {
        let { data, error } = await supabase.rpc('respond_call_session', {
            p_call_id: callIdOrMatchId,
            p_action: action,
            p_reason: reason
        });

        if (error && (error.message?.includes('not found') || error.code === 'PGRST202')) {
            // Fallback for matchId
            const fallback = await supabase.rpc('respond_call_signal', {
                p_match_id: callIdOrMatchId,
                p_action: action
            });
            if (fallback.error) throw fallback.error;
            data = fallback.data;
        } else if (error) {
            throw error;
        }

        return { data, error: null };
    } catch (err) {
        console.error('respondCallSignal error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Submit SDP Offer or Answer for WebRTC peer connection.
 */
export async function submitCallSdp(callId, sdpType, sdp) {
    try {
        const { data, error } = await supabase.rpc('submit_call_sdp', {
            p_call_id: callId,
            p_sdp_type: sdpType,
            p_sdp: sdp
        });
        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('submitCallSdp error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Add ICE Candidate for WebRTC peer connection.
 */
export async function addCallIceCandidate(callId, candidate) {
    try {
        const { data, error } = await supabase.rpc('add_call_ice_candidate', {
            p_call_id: callId,
            p_candidate: candidate
        });
        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('addCallIceCandidate error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Toggle Camera Off state for active call session.
 */
export async function toggleCallCamera(callId, cameraOff) {
    try {
        const { data, error } = await supabase.rpc('toggle_call_camera', {
            p_call_id: callId,
            p_camera_off: cameraOff
        });
        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('toggleCallCamera error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Fetch a call session by ID.
 */
export async function getCallSession(callId) {
    try {
        const { data, error } = await supabase
            .from('call_sessions')
            .select('*')
            .eq('id', callId)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        return { data: null, error: err.message };
    }
}

/**
 * Subscribe to realtime updates for a call session and its ICE candidates.
 */
export function subscribeToCallSession(callId, onSessionChange, onNewIceCandidate) {
    const channel = supabase
        .channel(`call_channel:${callId}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'call_sessions',
                filter: `id=eq.${callId}`
            },
            (payload) => {
                if (typeof onSessionChange === 'function') onSessionChange(payload.new, payload.old);
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'call_ice_candidates',
                filter: `call_id=eq.${callId}`
            },
            (payload) => {
                if (typeof onNewIceCandidate === 'function') onNewIceCandidate(payload.new);
            }
        )
        .subscribe();

    return channel;
}

