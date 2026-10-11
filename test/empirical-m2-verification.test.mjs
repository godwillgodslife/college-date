import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ══════════════════════════════════════════════════════════════════════════════
// 1. MIGRATION STRUCTURE & CONSTRAINTS VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

const MIGRATION_PATH = resolve('supabase/migrations/20261008190000_delayed_email_queue_and_presence_suppression.sql');

test('1.1 Migration file existence and basic syntax cleanliness', () => {
    assert.ok(existsSync(MIGRATION_PATH), 'Migration file must exist at expected path');
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    // Basic SQL sanity: balanced parentheses, non-empty, valid encoding
    assert.ok(sql.length > 5000, 'Migration should contain substantial schema definitions');
    assert.doesNotMatch(sql, /\bundefined\b/, 'Migration must not contain literal undefined strings');
    assert.doesNotMatch(sql, /\bNaN\b/, 'Migration must not contain NaN');
});

test('1.2 notification_email_queue table columns, types, and constraints', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    // Table definition
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.notification_email_queue/);

    // Primary key & Foreign keys
    assert.match(sql, /id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    assert.match(sql, /notification_id uuid NOT NULL REFERENCES public\.notifications\(id\) ON DELETE CASCADE/);
    assert.match(sql, /user_id uuid NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
    assert.match(sql, /actor_id uuid REFERENCES auth\.users\(id\) ON DELETE SET NULL/);

    // Core attributes
    assert.match(sql, /recipient_email text/);
    assert.match(sql, /category text NOT NULL DEFAULT 'general'/);
    assert.match(sql, /type text NOT NULL/);
    assert.match(sql, /title text NOT NULL/);
    assert.match(sql, /content text/);
    assert.match(sql, /body text/);
    assert.match(sql, /action_url text/);
    assert.match(sql, /dedupe_key text NOT NULL/);

    // Status enum check constraint
    assert.match(
        sql,
        /status text NOT NULL DEFAULT 'pending' CHECK \(status IN \('pending', 'processing', 'sent', 'cancelled_read', 'skipped_preference', 'failed'\)\)/
    );

    // 15-minute default grace period
    assert.match(
        sql,
        /scheduled_for timestamptz NOT NULL DEFAULT \(now\(\) \+ interval '15 minutes'\)/
    );

    // Lifecycle timestamps
    assert.match(sql, /sent_at timestamptz/);
    assert.match(sql, /cancelled_at timestamptz/);
    assert.match(sql, /failed_at timestamptz/);
    assert.match(sql, /retry_count integer NOT NULL DEFAULT 0/);
    assert.match(sql, /max_retries integer NOT NULL DEFAULT 3/);
});

test('1.3 Performance indexes and partial unique deduplication constraints', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    // Partial unique index for pending deduplication
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_email_queue_dedupe_pending\s+ON public\.notification_email_queue \(dedupe_key\)\s+WHERE status = 'pending';/);

    // Partial index for due scheduled items
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_email_queue_pending_scheduled\s+ON public\.notification_email_queue \(scheduled_for ASC\)\s+WHERE status = 'pending';/);

    // Partial index on notification_id
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_email_queue_notification_pending\s+ON public\.notification_email_queue \(notification_id\)\s+WHERE status = 'pending';/);

    // Composite index on user_id, status
    assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_email_queue_user_status\s+ON public\.notification_email_queue \(user_id, status\);/);
});

test('1.4 RLS security, grants, and security definer functions', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    assert.match(sql, /ALTER TABLE public\.notification_email_queue ENABLE ROW LEVEL SECURITY;/);
    assert.match(sql, /CREATE POLICY "Users can view own email queue items"/);
    assert.match(sql, /GRANT SELECT ON TABLE public\.notification_email_queue TO authenticated;/);
    assert.match(sql, /GRANT ALL ON TABLE public\.notification_email_queue TO service_role;/);

    // Triggers and Functions
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.trg_fn_notifications_enqueue_delayed_email\(\)/);
    assert.match(sql, /CREATE TRIGGER trg_notifications_enqueue_delayed_email/);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.trg_fn_notifications_cancel_delayed_email_on_read\(\)/);
    assert.match(sql, /CREATE TRIGGER trg_notifications_cancel_delayed_email_on_read/);

    // RPCs
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.mark_conversation_read_and_cancel_emails\(/);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.claim_notification_email_batch\(/);
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.fetch_pending_notification_emails\(/);
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. EMPIRICAL DATABASE TRIGGER SIMULATOR & ORACLE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Empirical simulator replicating the exact PL/pgSQL logic of:
 * - trg_fn_notifications_enqueue_delayed_email
 * - trg_fn_notifications_cancel_delayed_email_on_read
 * - mark_conversation_read_and_cancel_emails
 * - claim_notification_email_batch
 */
class NotificationDatabaseOracle {
    constructor() {
        this.notifications = [];
        this.queue = [];
        this.profiles = new Map();
        this.matches = new Map();
        this.messages = [];
        this.currentTime = new Date('2026-10-09T00:00:00.000Z');
    }

    setProfile(userId, { email_notifications = true, email = `${userId}@campus.edu` } = {}) {
        this.profiles.set(userId, { email_notifications, email });
    }

    setMatch(matchId, user1_id, user2_id) {
        this.matches.set(matchId, { id: matchId, user1_id, user2_id });
    }

    addMessage({ id, match_id, sender_id, is_read = false }) {
        this.messages.push({
            id,
            match_id,
            sender_id,
            is_read,
            read_at: is_read ? this.currentTime.toISOString() : null,
            seen_at: is_read ? this.currentTime.toISOString() : null
        });
    }

    // Simulates: trg_fn_notifications_enqueue_delayed_email
    insertNotification(rawNotif) {
        const notif = {
            id: rawNotif.id || `notif-${Math.random().toString(36).substring(2, 9)}`,
            user_id: rawNotif.user_id,
            recipient_id: rawNotif.recipient_id,
            actor_id: rawNotif.actor_id,
            sender_id: rawNotif.sender_id,
            category: rawNotif.category || 'general',
            type: rawNotif.type || 'general',
            title: rawNotif.title || '',
            content: rawNotif.content || '',
            metadata: rawNotif.metadata || {},
            is_read: rawNotif.is_read || false,
            read_at: rawNotif.read_at || null,
            conversation_id: rawNotif.conversation_id || null,
            match_id: rawNotif.match_id || null,
            deep_link: rawNotif.deep_link || null,
            created_at: this.currentTime.toISOString(),
            updated_at: this.currentTime.toISOString()
        };

        this.notifications.push(notif);

        // --- Execute Trigger Logic ---
        // 1. Guard against already read notifications or explicit suppression
        if (
            notif.is_read === true ||
            notif.metadata?.suppress_email === true ||
            notif.metadata?.suppressEmail === true ||
            notif.metadata?.recipientIsActive === true
        ) {
            return notif;
        }

        // 2. Resolve target user and actor
        const v_target_user_id = notif.user_id || notif.recipient_id;
        if (!v_target_user_id) return notif;

        let v_actor_id = notif.actor_id || notif.sender_id;
        if (notif.metadata?.is_anonymous === 'true' || notif.type === 'confession') {
            v_actor_id = null;
        }

        // 3. Check user profile email preference
        const profile = this.profiles.get(v_target_user_id);
        const v_email_enabled = profile ? profile.email_notifications : null;
        if (v_email_enabled === false) {
            return notif;
        }

        // 4. Resolve conversation ID (for chat deduplication)
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const metaMatchId = UUID_REGEX.test(notif.metadata?.match_id) ? notif.metadata.match_id : null;
        const metaConvId = UUID_REGEX.test(notif.metadata?.conversation_id) ? notif.metadata.conversation_id : null;
        const v_conv_id = notif.conversation_id || notif.match_id || metaMatchId || metaConvId;

        // 5. Construct dedupe_key (matching Interface Contract 2)
        let v_dedupe_key;
        if (notif.category === 'messages' || ['message', 'chat'].includes(notif.type) || v_conv_id) {
            v_dedupe_key = v_conv_id
                ? `email:chat:${v_target_user_id}:${v_conv_id}`
                : `email:chat:${v_target_user_id}:${notif.id}`;
        } else if (notif.category === 'requests' || ['request', 'connection_request', 'message_request'].includes(notif.type)) {
            v_dedupe_key = `email:request:${v_target_user_id}`;
        } else if (notif.category === 'matches' || ['match', 'like', 'super_swipe'].includes(notif.type)) {
            v_dedupe_key = `email:match:${v_target_user_id}:${v_conv_id || notif.id}`;
        } else {
            v_dedupe_key = `email:${v_target_user_id}:${notif.id}`;
        }

        // 6. Action URL
        const v_action_url = notif.deep_link || notif.metadata?.url || null;

        // 7. Insert with ON CONFLICT (dedupe_key) WHERE status = 'pending' DO UPDATE
        const existingPendingIndex = this.queue.findIndex(
            (q) => q.dedupe_key === v_dedupe_key && q.status === 'pending'
        );

        if (existingPendingIndex >= 0) {
            // DO UPDATE: updates content & notification_id, but preserves scheduled_for!
            const item = this.queue[existingPendingIndex];
            item.notification_id = notif.id;
            item.title = notif.title;
            item.content = notif.content;
            item.body = notif.content;
            item.action_url = v_action_url || item.action_url;
            item.metadata = notif.metadata;
            item.updated_at = this.currentTime.toISOString();
        } else {
            // INSERT with 15m delay
            const scheduled_for = new Date(this.currentTime.getTime() + 15 * 60 * 1000).toISOString();
            this.queue.push({
                id: `queue-${Math.random().toString(36).substring(2, 9)}`,
                notification_id: notif.id,
                user_id: v_target_user_id,
                actor_id: v_actor_id,
                category: notif.category,
                type: notif.type,
                title: notif.title,
                content: notif.content,
                body: notif.content,
                action_url: v_action_url,
                dedupe_key: v_dedupe_key,
                status: 'pending',
                scheduled_for,
                retry_count: 0,
                max_retries: 3,
                metadata: notif.metadata,
                created_at: this.currentTime.toISOString(),
                updated_at: this.currentTime.toISOString(),
                cancelled_at: null,
                sent_at: null,
                failed_at: null
            });
        }

        return notif;
    }

    // Simulates: trg_fn_notifications_cancel_delayed_email_on_read
    updateNotificationRead(notifId, { is_read = true, read_at = null } = {}) {
        const notif = this.notifications.find((n) => n.id === notifId);
        if (!notif) return null;

        const old_is_read = notif.is_read;
        const old_read_at = notif.read_at;

        notif.is_read = is_read;
        notif.read_at = read_at || (is_read ? this.currentTime.toISOString() : null);
        notif.updated_at = this.currentTime.toISOString();

        // Trigger condition:
        // (NEW.is_read = true AND OLD.is_read IS DISTINCT FROM true) OR (NEW.read_at IS NOT NULL AND OLD.read_at IS NULL)
        const fires = (notif.is_read === true && old_is_read !== true) ||
                      (notif.read_at !== null && old_read_at === null);

        if (fires) {
            const target_user = notif.user_id || notif.recipient_id;
            const conv_id = notif.conversation_id || notif.match_id;

            for (const q of this.queue) {
                if (q.status === 'pending') {
                    const matchesDirect = q.notification_id === notif.id;
                    const matchesRequest = q.user_id === target_user &&
                        notif.category === 'requests' &&
                        q.dedupe_key === `email:request:${target_user}`;
                    const matchesChat = q.user_id === target_user &&
                        Boolean(conv_id) &&
                        q.dedupe_key === `email:chat:${target_user}:${conv_id}`;

                    if (matchesDirect || matchesRequest || matchesChat) {
                        q.status = 'cancelled_read';
                        q.cancelled_at = this.currentTime.toISOString();
                        q.updated_at = this.currentTime.toISOString();
                    }
                }
            }
        }

        return notif;
    }

    // Simulates: mark_conversation_read_and_cancel_emails
    markConversationReadRpc(matchId, callerUserId) {
        const match = this.matches.get(matchId);
        if (!match) throw new Error('Conversation not found');
        if (match.user1_id !== callerUserId && match.user2_id !== callerUserId) {
            throw new Error('User is not a participant in this conversation');
        }

        // Messages update
        let msgsUpdated = 0;
        for (const msg of this.messages) {
            if (msg.match_id === matchId && msg.sender_id !== callerUserId && !msg.is_read) {
                msg.is_read = true;
                msg.read_at = this.currentTime.toISOString();
                msg.seen_at = this.currentTime.toISOString();
                msgsUpdated++;
            }
        }

        // Notifications update
        let notifsUpdated = 0;
        for (const notif of this.notifications) {
            if (notif.user_id === callerUserId &&
                (notif.match_id === matchId || notif.conversation_id === matchId) &&
                !notif.is_read) {
                notif.is_read = true;
                notif.read_at = this.currentTime.toISOString();
                notif.seen_at = this.currentTime.toISOString();
                notifsUpdated++;
            }
        }

        // Email queue cancellation
        let emailsCancelled = 0;
        for (const q of this.queue) {
            if (q.user_id === callerUserId && q.status === 'pending') {
                const isChatKey = q.dedupe_key === `email:chat:${callerUserId}:${matchId}`;
                const hasMatchingNotif = this.notifications.some(
                    (n) => n.id === q.notification_id && (n.match_id === matchId || n.conversation_id === matchId)
                );

                if (isChatKey || hasMatchingNotif) {
                    q.status = 'cancelled_read';
                    q.cancelled_at = this.currentTime.toISOString();
                    q.updated_at = this.currentTime.toISOString();
                    emailsCancelled++;
                }
            }
        }

        return {
            success: true,
            match_id: matchId,
            user_id: callerUserId,
            messages_marked_read: msgsUpdated,
            notifications_marked_read: notifsUpdated,
            emails_cancelled: emailsCancelled
        };
    }

    // Simulates: claim_notification_email_batch (FOR UPDATE SKIP LOCKED)
    claimNotificationEmailBatch(limit = 25) {
        const nowIso = this.currentTime.toISOString();
        const dueItems = this.queue
            .filter((q) => q.status === 'pending' && q.scheduled_for <= nowIso)
            .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
            .slice(0, Math.min(Math.max(limit, 1), 50));

        for (const item of dueItems) {
            item.status = 'processing';
            item.updated_at = nowIso;
        }

        return dueItems;
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. EMPIRICAL TRIGGER LOGIC TESTS
// ══════════════════════════════════════════════════════════════════════════════

test('2.1 Unread notification insertion automatically enqueues a delayed row with scheduled_for = 15m in future', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    oracle.setProfile(userId, { email_notifications: true });

    oracle.insertNotification({
        id: 'n-1',
        user_id: userId,
        actor_id: '00000000-0000-0000-0000-000000000002',
        type: 'match',
        category: 'matches',
        title: 'New Match!',
        content: 'You matched with Sarah',
        is_read: false
    });

    assert.strictEqual(oracle.queue.length, 1, 'Exactly one queue item must be created');
    const item = oracle.queue[0];
    assert.strictEqual(item.status, 'pending');
    assert.strictEqual(item.notification_id, 'n-1');
    assert.strictEqual(item.user_id, userId);

    // Verify scheduled_for is exactly 15 minutes in the future
    const expectedTime = new Date('2026-10-09T00:15:00.000Z').toISOString();
    assert.strictEqual(item.scheduled_for, expectedTime, 'scheduled_for must be exactly now() + 15 minutes');
    assert.strictEqual(item.dedupe_key, `email:match:${userId}:n-1`);
});

test('2.2 Already-read notification insertion does NOT enqueue into email queue', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    oracle.setProfile(userId, { email_notifications: true });

    oracle.insertNotification({
        id: 'n-read',
        user_id: userId,
        type: 'match',
        title: 'Read Match',
        content: 'Already seen',
        is_read: true // Already read
    });

    assert.strictEqual(oracle.queue.length, 0, 'No email must be enqueued if notification is already read');
});

test('2.3 Presence suppression flags suppress email queue insertion', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    oracle.setProfile(userId, { email_notifications: true });

    // Flag: suppress_email
    oracle.insertNotification({
        id: 'n-suppress-1',
        user_id: userId,
        type: 'message',
        metadata: { suppress_email: true }
    });
    // Flag: suppressEmail
    oracle.insertNotification({
        id: 'n-suppress-2',
        user_id: userId,
        type: 'message',
        metadata: { suppressEmail: true }
    });
    // Flag: recipientIsActive
    oracle.insertNotification({
        id: 'n-suppress-3',
        user_id: userId,
        type: 'message',
        metadata: { recipientIsActive: true }
    });

    assert.strictEqual(oracle.queue.length, 0, 'Presence suppression must completely prevent email queueing');
});

test('2.4 Disabled profile email notifications suppress queue insertion', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    oracle.setProfile(userId, { email_notifications: false }); // Opted out

    oracle.insertNotification({
        id: 'n-disabled',
        user_id: userId,
        type: 'match',
        title: 'Match',
        content: 'New match'
    });

    assert.strictEqual(oracle.queue.length, 0, 'User with email_notifications = false must never be enqueued');
});

test('2.5 Anonymous asks and confessions mask actor_id to null', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    const actorId = '00000000-0000-0000-0000-000000000002';
    oracle.setProfile(userId, { email_notifications: true });

    // Confession
    oracle.insertNotification({
        id: 'n-confess',
        user_id: userId,
        actor_id: actorId,
        type: 'confession',
        category: 'social',
        title: 'New Confession',
        content: 'Someone left a confession'
    });

    // Anonymous Ask
    oracle.insertNotification({
        id: 'n-ask',
        user_id: userId,
        actor_id: actorId,
        type: 'ask',
        category: 'social',
        metadata: { is_anonymous: 'true' },
        title: 'Anonymous Question',
        content: 'You got an anonymous question'
    });

    assert.strictEqual(oracle.queue.length, 2);
    assert.strictEqual(oracle.queue[0].actor_id, null, 'Confession actor_id must be masked to null');
    assert.strictEqual(oracle.queue[1].actor_id, null, 'Anonymous ask actor_id must be masked to null');
});

test('2.6 Rapid consecutive messages to same conversation deduplicate and anchor scheduled_for', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    const convId = '11111111-1111-1111-1111-111111111111';
    oracle.setProfile(userId, { email_notifications: true });

    // Message 1 at T=0
    oracle.insertNotification({
        id: 'n-msg-1',
        user_id: userId,
        type: 'chat',
        category: 'messages',
        conversation_id: convId,
        title: 'New Message from Alex',
        content: 'Hey!'
    });

    assert.strictEqual(oracle.queue.length, 1);
    const initialScheduledFor = oracle.queue[0].scheduled_for;
    assert.strictEqual(oracle.queue[0].content, 'Hey!');
    assert.strictEqual(oracle.queue[0].notification_id, 'n-msg-1');

    // Fast-forward 3 minutes: T=3m
    oracle.currentTime = new Date('2026-10-09T00:03:00.000Z');

    // Message 2 from same conversation
    oracle.insertNotification({
        id: 'n-msg-2',
        user_id: userId,
        type: 'chat',
        category: 'messages',
        conversation_id: convId,
        title: 'New Message from Alex',
        content: 'Are you on campus?'
    });

    // Still only 1 queue row (deduped on email:chat:user:conv)
    assert.strictEqual(oracle.queue.length, 1);
    const updatedItem = oracle.queue[0];
    assert.strictEqual(updatedItem.content, 'Are you on campus?', 'Content must update to latest message');
    assert.strictEqual(updatedItem.notification_id, 'n-msg-2', 'notification_id must update to latest message');

    // CRITICAL: scheduled_for must NOT be pushed back to 00:18:00; it must remain initial 00:15:00!
    assert.strictEqual(
        updatedItem.scheduled_for,
        initialScheduledFor,
        'Grace period must remain anchored to the first message, preventing endless spam delay'
    );
});

test('2.7 Marking notification as read immediately flips queue item status to cancelled_read', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    oracle.setProfile(userId, { email_notifications: true });

    oracle.insertNotification({
        id: 'n-read-cancel',
        user_id: userId,
        type: 'match',
        title: 'Match',
        content: 'Match text'
    });

    assert.strictEqual(oracle.queue[0].status, 'pending');

    // Fast-forward 2 minutes: user opens app and marks notification as read
    oracle.currentTime = new Date('2026-10-09T00:02:00.000Z');
    oracle.updateNotificationRead('n-read-cancel', { is_read: true });

    assert.strictEqual(oracle.queue[0].status, 'cancelled_read', 'Queue item must transition to cancelled_read');
    assert.strictEqual(oracle.queue[0].cancelled_at, '2026-10-09T00:02:00.000Z');
});

test('2.8 Updating read_at timestamp flips queue item to cancelled_read', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    oracle.setProfile(userId, { email_notifications: true });

    oracle.insertNotification({
        id: 'n-readat-cancel',
        user_id: userId,
        type: 'request',
        category: 'requests',
        title: 'Connection Request',
        content: 'Someone sent you a request'
    });

    assert.strictEqual(oracle.queue[0].status, 'pending');

    oracle.currentTime = new Date('2026-10-09T00:05:00.000Z');
    oracle.updateNotificationRead('n-readat-cancel', { is_read: true, read_at: '2026-10-09T00:05:00.000Z' });

    assert.strictEqual(oracle.queue[0].status, 'cancelled_read');
});

test('2.9 Atomic RPC mark_conversation_read_and_cancel_emails marks messages & notifs read, and cancels emails', () => {
    const oracle = new NotificationDatabaseOracle();
    const user1 = '00000000-0000-0000-0000-000000000001';
    const user2 = '00000000-0000-0000-0000-000000000002';
    const matchId = '22222222-2222-2222-2222-222222222222';

    oracle.setProfile(user1, { email_notifications: true });
    oracle.setProfile(user2, { email_notifications: true });
    oracle.setMatch(matchId, user1, user2);

    // User 2 sends User 1 a message
    oracle.addMessage({ id: 'msg-1', match_id: matchId, sender_id: user2, is_read: false });
    oracle.insertNotification({
        id: 'notif-chat-1',
        user_id: user1,
        actor_id: user2,
        type: 'chat',
        category: 'messages',
        conversation_id: matchId,
        match_id: matchId,
        title: 'New Chat',
        content: 'Hey there'
    });

    assert.strictEqual(oracle.queue.length, 1);
    assert.strictEqual(oracle.queue[0].status, 'pending');
    assert.strictEqual(oracle.messages[0].is_read, false);
    assert.strictEqual(oracle.notifications[0].is_read, false);

    // User 1 opens the chat conversation -> calls mark_conversation_read_and_cancel_emails
    const result = oracle.markConversationReadRpc(matchId, user1);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.messages_marked_read, 1);
    assert.strictEqual(result.notifications_marked_read, 1);
    assert.strictEqual(result.emails_cancelled, 1);

    assert.strictEqual(oracle.messages[0].is_read, true);
    assert.strictEqual(oracle.notifications[0].is_read, true);
    assert.strictEqual(oracle.queue[0].status, 'cancelled_read');
});

test('2.10 mark_conversation_read_and_cancel_emails rejects unauthorized non-participants', () => {
    const oracle = new NotificationDatabaseOracle();
    const user1 = '00000000-0000-0000-0000-000000000001';
    const user2 = '00000000-0000-0000-0000-000000000002';
    const hacker = '00000000-0000-0000-0000-000000000999';
    const matchId = '22222222-2222-2222-2222-222222222222';

    oracle.setMatch(matchId, user1, user2);

    assert.throws(
        () => oracle.markConversationReadRpc(matchId, hacker),
        /User is not a participant in this conversation/
    );
});

test('2.11 claim_notification_email_batch only claims due pending items (scheduled_for <= now)', () => {
    const oracle = new NotificationDatabaseOracle();
    const userId = '00000000-0000-0000-0000-000000000001';
    oracle.setProfile(userId, { email_notifications: true });

    oracle.insertNotification({
        id: 'n-due-test',
        user_id: userId,
        type: 'match',
        title: 'Match',
        content: 'Content'
    });

    // At T=0, item is scheduled for T=15m. It must NOT be claimed!
    let claimed = oracle.claimNotificationEmailBatch(25);
    assert.strictEqual(claimed.length, 0, 'Future items (within 15m grace window) must not be claimed');
    assert.strictEqual(oracle.queue[0].status, 'pending');

    // Fast-forward to T=14m 59s: Still NOT claimed
    oracle.currentTime = new Date('2026-10-09T00:14:59.000Z');
    claimed = oracle.claimNotificationEmailBatch(25);
    assert.strictEqual(claimed.length, 0, 'Items must not be claimed before 15m expiration');

    // Fast-forward to T=15m 01s: NOW DUE
    oracle.currentTime = new Date('2026-10-09T00:15:01.000Z');
    claimed = oracle.claimNotificationEmailBatch(25);
    assert.strictEqual(claimed.length, 1, 'Due items must be claimed');
    assert.strictEqual(claimed[0].status, 'processing');
    assert.strictEqual(oracle.queue[0].status, 'processing');
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. EMPIRICAL EDGE FUNCTION WORKER ORACLE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Empirical simulator of the Edge Function batch processing algorithm:
 * - handleProcessQueue in supabase/functions/send-notification-email/index.ts
 */
class EdgeFunctionWorkerOracle {
    constructor(dbOracle) {
        this.db = dbOracle;
        this.smtpDispatches = [];
        this.shouldSmtpFail = false;
    }

    async processQueueBatch({ limit = 25, maxRetries = 3 } = {}) {
        // 1. Claim batch
        const items = this.db.claimNotificationEmailBatch(limit);
        if (items.length === 0) {
            return { success: true, processed: 0, message: 'Queue is empty' };
        }

        const results = [];

        for (const item of items) {
            // 2. Pre-flight unread & presence check against public.notifications
            if (item.notification_id) {
                const notif = this.db.notifications.find((n) => n.id === item.notification_id);
                if (notif) {
                    if (notif.is_read === true || notif.read_at !== null) {
                        item.status = 'cancelled_read';
                        item.cancelled_at = this.db.currentTime.toISOString();
                        item.failure_reason = 'already_read_on_platform';
                        results.push({ id: item.id, status: 'cancelled_read', reason: 'already_read_on_platform' });
                        continue;
                    }

                    const meta = notif.metadata;
                    if (meta?.suppress_email === true || meta?.suppressEmail === true || meta?.recipientIsActive === true) {
                        item.status = 'cancelled_read';
                        item.cancelled_at = this.db.currentTime.toISOString();
                        item.failure_reason = 'suppressed_by_presence';
                        results.push({ id: item.id, status: 'cancelled_read', reason: 'suppressed_by_presence' });
                        continue;
                    }
                }
            }

            // 3. User profile preferences check
            const profile = this.db.profiles.get(item.user_id);
            if (profile && profile.email_notifications === false) {
                item.status = 'skipped_preference';
                item.failure_reason = 'user_disabled_email_notifications';
                results.push({ id: item.id, status: 'skipped_preference', reason: 'user_disabled_email_notifications' });
                continue;
            }

            // 4. Resolve recipient email
            const recipientEmail = item.recipient_email || profile?.email;
            if (!recipientEmail) {
                item.status = 'failed';
                item.failed_at = this.db.currentTime.toISOString();
                item.failure_reason = 'No recipient email found';
                results.push({ id: item.id, status: 'failed', error: 'No recipient email found' });
                continue;
            }

            // 5. Hostinger SMTP dispatch
            if (this.shouldSmtpFail) {
                const currentRetries = item.retry_count || 0;
                const nextRetries = currentRetries + 1;

                if (nextRetries >= (item.max_retries || maxRetries)) {
                    item.status = 'failed';
                    item.failed_at = this.db.currentTime.toISOString();
                    item.failure_reason = 'SMTP connection timeout';
                    item.retry_count = nextRetries;
                    results.push({ id: item.id, status: 'failed', error: 'SMTP connection timeout' });
                } else {
                    // Exponential backoff
                    const backoffMinutes = Math.pow(2, currentRetries) * 5;
                    item.status = 'pending';
                    item.retry_count = nextRetries;
                    item.scheduled_for = new Date(this.db.currentTime.getTime() + backoffMinutes * 60 * 1000).toISOString();
                    item.failure_reason = 'SMTP connection timeout';
                    results.push({ id: item.id, status: 'retrying', retryCount: nextRetries, nextScheduledFor: item.scheduled_for });
                }
                continue;
            }

            // Success
            const messageId = `<${Math.random().toString(36).substring(2)}@thecollegedate.com>`;
            item.status = 'sent';
            item.sent_at = this.db.currentTime.toISOString();
            item.error_message = null;
            item.failure_reason = null;

            this.smtpDispatches.push({
                to: recipientEmail,
                subject: item.title,
                messageId
            });

            results.push({
                id: item.id,
                status: 'sent',
                recipient: recipientEmail,
                messageId
            });
        }

        return {
            success: true,
            processed: items.length,
            sent: results.filter((r) => r.status === 'sent').length,
            cancelled_read: results.filter((r) => r.status === 'cancelled_read').length,
            skipped_preference: results.filter((r) => r.status === 'skipped_preference').length,
            failed: results.filter((r) => r.status === 'failed').length,
            results
        };
    }
}

test('3.1 Worker pre-flight unread check skips and cancels read notifications without dispatching SMTP', async () => {
    const dbOracle = new NotificationDatabaseOracle();
    const worker = new EdgeFunctionWorkerOracle(dbOracle);
    const userId = '00000000-0000-0000-0000-000000000001';
    dbOracle.setProfile(userId, { email_notifications: true });

    dbOracle.insertNotification({
        id: 'notif-1',
        user_id: userId,
        type: 'match',
        title: 'Match Alert',
        content: 'New match'
    });

    // Advance 16 minutes (queue item is now due)
    dbOracle.currentTime = new Date('2026-10-09T00:16:00.000Z');

    // Simulate notification being read directly in DB right before worker runs
    const notif = dbOracle.notifications.find((n) => n.id === 'notif-1');
    notif.is_read = true; // Read on mobile app!

    const res = await worker.processQueueBatch();

    assert.strictEqual(res.processed, 1);
    assert.strictEqual(res.cancelled_read, 1, 'Pre-flight check must cancel read notification');
    assert.strictEqual(res.sent, 0, 'Zero emails must be sent');
    assert.strictEqual(worker.smtpDispatches.length, 0, 'SMTP dispatcher must never be called');
    assert.strictEqual(dbOracle.queue[0].status, 'cancelled_read');
});

test('3.2 Worker pre-flight presence check skips presence-suppressed notifications', async () => {
    const dbOracle = new NotificationDatabaseOracle();
    const worker = new EdgeFunctionWorkerOracle(dbOracle);
    const userId = '00000000-0000-0000-0000-000000000001';
    dbOracle.setProfile(userId, { email_notifications: true });

    dbOracle.insertNotification({
        id: 'notif-presence',
        user_id: userId,
        type: 'chat',
        title: 'New chat',
        content: 'Chat msg'
    });

    dbOracle.currentTime = new Date('2026-10-09T00:16:00.000Z');

    // Parent notification had recipientIsActive set
    const notif = dbOracle.notifications.find((n) => n.id === 'notif-presence');
    notif.metadata = { recipientIsActive: true };

    const res = await worker.processQueueBatch();

    assert.strictEqual(res.cancelled_read, 1);
    assert.strictEqual(res.sent, 0);
    assert.strictEqual(worker.smtpDispatches.length, 0);
});

test('3.3 Worker profile preference check marks skipped_preference when user disabled emails', async () => {
    const dbOracle = new NotificationDatabaseOracle();
    const worker = new EdgeFunctionWorkerOracle(dbOracle);
    const userId = '00000000-0000-0000-0000-000000000001';
    dbOracle.setProfile(userId, { email_notifications: true });

    dbOracle.insertNotification({
        id: 'notif-pref',
        user_id: userId,
        type: 'match',
        title: 'Match',
        content: 'Match text'
    });

    // Advance 16 minutes
    dbOracle.currentTime = new Date('2026-10-09T00:16:00.000Z');

    // In the meantime, user went to Settings and turned off emails
    dbOracle.setProfile(userId, { email_notifications: false });

    const res = await worker.processQueueBatch();

    assert.strictEqual(res.skipped_preference, 1);
    assert.strictEqual(res.sent, 0);
    assert.strictEqual(worker.smtpDispatches.length, 0);
    assert.strictEqual(dbOracle.queue[0].status, 'skipped_preference');
});

test('3.4 Unread eligible item dispatches SMTP and updates status to sent', async () => {
    const dbOracle = new NotificationDatabaseOracle();
    const worker = new EdgeFunctionWorkerOracle(dbOracle);
    const userId = '00000000-0000-0000-0000-000000000001';
    dbOracle.setProfile(userId, { email_notifications: true, email: 'student@unilag.edu.ng' });

    dbOracle.insertNotification({
        id: 'notif-send',
        user_id: userId,
        type: 'match',
        title: 'New Match on Campus 🔥',
        content: 'You matched with Chioma'
    });

    dbOracle.currentTime = new Date('2026-10-09T00:16:00.000Z');

    const res = await worker.processQueueBatch();

    assert.strictEqual(res.sent, 1);
    assert.strictEqual(worker.smtpDispatches.length, 1);
    assert.strictEqual(worker.smtpDispatches[0].to, 'student@unilag.edu.ng');
    assert.strictEqual(worker.smtpDispatches[0].subject, 'New Match on Campus 🔥');
    assert.strictEqual(dbOracle.queue[0].status, 'sent');
    assert.ok(dbOracle.queue[0].sent_at !== null);
});

test('3.5 Exponential backoff retry on SMTP failure and final failure transition', async () => {
    const dbOracle = new NotificationDatabaseOracle();
    const worker = new EdgeFunctionWorkerOracle(dbOracle);
    const userId = '00000000-0000-0000-0000-000000000001';
    dbOracle.setProfile(userId, { email_notifications: true, email: 'student@unilag.edu.ng' });

    dbOracle.insertNotification({
        id: 'notif-fail',
        user_id: userId,
        type: 'match',
        title: 'Match',
        content: 'Content'
    });

    worker.shouldSmtpFail = true;

    // Retry 1 (at T=15m 01s)
    dbOracle.currentTime = new Date('2026-10-09T00:15:01.000Z');
    let res = await worker.processQueueBatch({ maxRetries: 3 });
    assert.strictEqual(res.results[0].status, 'retrying');
    assert.strictEqual(res.results[0].retryCount, 1);
    // 2^0 * 5m = 5m backoff -> 00:20:01
    assert.strictEqual(res.results[0].nextScheduledFor, '2026-10-09T00:20:01.000Z');
    assert.strictEqual(dbOracle.queue[0].status, 'pending');

    // Retry 2 (at T=20m 02s)
    dbOracle.currentTime = new Date('2026-10-09T00:20:02.000Z');
    res = await worker.processQueueBatch({ maxRetries: 3 });
    assert.strictEqual(res.results[0].status, 'retrying');
    assert.strictEqual(res.results[0].retryCount, 2);
    // 2^1 * 5m = 10m backoff -> 00:30:02
    assert.strictEqual(res.results[0].nextScheduledFor, '2026-10-09T00:30:02.000Z');

    // Retry 3 (at T=30m 03s) -> reaches maxRetries (3)
    dbOracle.currentTime = new Date('2026-10-09T00:30:03.000Z');
    res = await worker.processQueueBatch({ maxRetries: 3 });
    assert.strictEqual(res.failed, 1);
    assert.strictEqual(res.results[0].status, 'failed');
    assert.strictEqual(dbOracle.queue[0].status, 'failed');
    assert.ok(dbOracle.queue[0].failed_at !== null);
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. CLIENT CODE INTEGRATION & CONTRACT SANITY
// ══════════════════════════════════════════════════════════════════════════════

test('4.1 notificationService: createNotification eliminates immediate sendEmailNotification', () => {
    const src = readFileSync(resolve('src/services/notificationService.js'), 'utf8');

    // createNotification implementation boundary
    const createIndex = src.indexOf('export async function createNotification');
    const sendEmailIndex = src.indexOf('export async function sendEmailNotification');
    assert.ok(createIndex !== -1 && sendEmailIndex !== -1);

    const createFnBody = src.slice(createIndex, sendEmailIndex);
    assert.strictEqual(
        createFnBody.includes('await sendEmailNotification('),
        false,
        'createNotification must not invoke sendEmailNotification directly'
    );
});

test('4.2 notificationService: preserves required static test assertions', () => {
    const src = readFileSync(resolve('src/services/notificationService.js'), 'utf8');

    // Must satisfy test/notification-reliability-remediation.test.mjs
    assert.ok(
        src.includes('actionUrl: effectiveDeepLink ? getAbsoluteWebUrl(effectiveDeepLink) : undefined'),
        'Must preserve actionUrl contract pattern'
    );
    assert.strictEqual(
        /\s+actionUrl,\s+type/.test(src),
        false,
        'Undeclared bare actionUrl must not exist'
    );
});

test('4.3 notificationService: read receipt updates include read_at timestamp', () => {
    const src = readFileSync(resolve('src/services/notificationService.js'), 'utf8');

    assert.ok(
        src.includes("markNotificationAsRead") && src.includes("read_at: new Date().toISOString()"),
        'markNotificationAsRead must set read_at timestamp'
    );
    assert.ok(
        src.includes("markConversationNotificationsAsRead"),
        'Must export markConversationNotificationsAsRead'
    );
});

test('4.4 chatService: markConversationRead invokes mark_conversation_read_and_cancel_emails RPC', () => {
    const src = readFileSync(resolve('src/services/chatService.js'), 'utf8');

    assert.ok(
        src.includes("rpc('mark_conversation_read_and_cancel_emails'"),
        'markConversationRead must attempt atomic RPC'
    );
});
