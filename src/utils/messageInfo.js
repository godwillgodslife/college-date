/**
 * Utility for formatting and inspecting chat message delivery, seen, and lifecycle metadata.
 */

export const MESSAGE_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidMessageId(messageId) {
    if (!messageId || typeof messageId !== 'string') return false;
    if (messageId.startsWith('temp-')) return false;
    return MESSAGE_UUID_REGEX.test(messageId);
}

export function isMessageDeletedForUser(message, userId) {
    if (!message || !userId) return false;
    const deletedFor = message.metadata?.deleted_for;
    return Array.isArray(deletedFor) && deletedFor.includes(userId);
}

export function getMessageInfo(message) {
    if (!message) return null;
    const sentAt = message.created_at || null;
    const deliveredAt = message.delivered_at || message.created_at || null;
    const seenAt = message.seen_at || message.read_at || null;
    return {
        id: message.id,
        sent_at: sentAt,
        delivered_at: deliveredAt,
        seen_at: seenAt,
        read_at: seenAt,
        is_seen: Boolean(message.is_read || seenAt),
        is_edited: Boolean(message.metadata?.is_edited),
        edited_at: message.metadata?.edited_at || null,
        is_deleted: message.type === 'deleted' || Boolean(message.metadata?.is_deleted),
        deleted_at: message.metadata?.deleted_at || null,
        deleted_for: Array.isArray(message.metadata?.deleted_for) ? message.metadata.deleted_for : []
    };
}
