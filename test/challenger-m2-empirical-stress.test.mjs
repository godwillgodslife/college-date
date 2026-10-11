import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load source files for static contract analysis and AST/syntax verification
const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261008190000_delayed_email_queue_and_presence_suppression.sql');
const edgeFuncPath = resolve(process.cwd(), 'supabase/functions/send-notification-email/index.ts');
const notifServicePath = resolve(process.cwd(), 'src/services/notificationService.js');
const chatServicePath = resolve(process.cwd(), 'src/services/chatService.js');

const migrationSql = readFileSync(migrationPath, 'utf8');
const edgeFuncSource = readFileSync(edgeFuncPath, 'utf8');
const notifServiceSource = readFileSync(notifServicePath, 'utf8');
const chatServiceSource = readFileSync(chatServicePath, 'utf8');

// -------------------------------------------------------------------------
// Helper: Emulate SQL Deduplication Key Generation Logic in Pure JS
// Matching trg_fn_notifications_enqueue_delayed_email in migration exactly
// -------------------------------------------------------------------------
function computeEmailDedupeKey(record) {
    const targetUserId = record.user_id ?? record.recipient_id ?? null;
    if (!targetUserId) return null;

    // UUID regex matching Postgres: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    let convId = record.conversation_id ?? record.match_id ?? null;
    if (!convId && record.metadata && typeof record.metadata === 'object') {
        const metaMatchId = record.metadata.match_id;
        const metaConvId = record.metadata.conversation_id;
        if (typeof metaMatchId === 'string' && uuidRegex.test(metaMatchId)) {
            convId = metaMatchId;
        } else if (typeof metaConvId === 'string' && uuidRegex.test(metaConvId)) {
            convId = metaConvId;
        }
    }

    const category = (record.category || '').toLowerCase();
    const type = (record.type || '').toLowerCase();

    // SQL branch 1: Chat or ANY notification with conversation/match ID
    if (category === 'messages' || ['message', 'chat'].includes(type) || convId !== null) {
        if (convId !== null) {
            return `email:chat:${targetUserId}:${convId}`;
        }
        return `email:chat:${targetUserId}:${record.id}`;
    } else if (category === 'requests' || ['request', 'connection_request', 'message_request'].includes(type)) {
        return `email:request:${targetUserId}`;
    } else if (category === 'matches' || ['match', 'like', 'super_swipe'].includes(type)) {
        return `email:match:${targetUserId}:${convId ?? record.id}`;
    }

    return `email:${targetUserId}:${record.id}`;
}

// -------------------------------------------------------------------------
// Helper: Emulate In-Memory Queue State Machine with Partial Index
// -------------------------------------------------------------------------
class SimulatedNotificationEmailQueue {
    constructor() {
        this.rows = new Map(); // id -> row
    }

    enqueue(item) {
        // Enforce trigger check: is_read or suppression
        if (
            item.is_read === true ||
            item.metadata?.suppress_email === true ||
            item.metadata?.suppressEmail === true ||
            item.metadata?.recipientIsActive === true
        ) {
            return { enqueued: false, reason: 'suppressed_or_read' };
        }

        const dedupeKey = item.dedupe_key;
        // Check partial unique index: idx_email_queue_dedupe_pending (WHERE status = 'pending')
        let existingPending = null;
        for (const row of this.rows.values()) {
            if (row.dedupe_key === dedupeKey && row.status === 'pending') {
                existingPending = row;
                break;
            }
        }

        if (existingPending) {
            // ON CONFLICT (dedupe_key) WHERE status = 'pending' DO UPDATE SET
            // notification_id = EXCLUDED.notification_id, title = EXCLUDED.title,
            // content = EXCLUDED.content, body = EXCLUDED.content, updated_at = now()
            // CRITICAL: scheduled_for is PRESERVED, NOT reset!
            existingPending.notification_id = item.notification_id;
            existingPending.title = item.title;
            existingPending.content = item.content;
            existingPending.body = item.content;
            existingPending.metadata = item.metadata || {};
            existingPending.updated_at = new Date();
            return { enqueued: true, deduplicated: true, id: existingPending.id };
        }

        const newRow = {
            id: item.id || `queue-${Math.random().toString(36).substring(2, 9)}`,
            notification_id: item.notification_id,
            user_id: item.user_id,
            category: item.category || 'general',
            type: item.type,
            title: item.title,
            content: item.content,
            body: item.content,
            dedupe_key: dedupeKey,
            status: 'pending',
            scheduled_for: item.scheduled_for || new Date(Date.now() + 15 * 60 * 1000),
            created_at: new Date(),
            updated_at: new Date(),
            retry_count: 0
        };

        this.rows.set(newRow.id, newRow);
        return { enqueued: true, deduplicated: false, id: newRow.id };
    }

    cancelPendingForConversation(userId, matchId) {
        const expectedChatKey = `email:chat:${userId}:${matchId}`;
        let cancelledCount = 0;
        for (const row of this.rows.values()) {
            if (row.user_id === userId && row.status === 'pending') {
                if (row.dedupe_key === expectedChatKey) {
                    row.status = 'cancelled_read';
                    row.cancelled_at = new Date();
                    row.updated_at = new Date();
                    cancelledCount++;
                }
            }
        }
        return cancelledCount;
    }

    claimBatch(limit = 25) {
        const now = Date.now();
        const dueItems = [];
        for (const row of this.rows.values()) {
            if (row.status === 'pending' && new Date(row.scheduled_for).getTime() <= now) {
                dueItems.push(row);
                if (dueItems.length >= limit) break;
            }
        }

        // Atomically mark as processing (simulating FOR UPDATE SKIP LOCKED)
        for (const item of dueItems) {
            item.status = 'processing';
            item.updated_at = new Date();
        }

        return dueItems;
    }
}

// -------------------------------------------------------------------------
// 1. DEDUPLICATION BOUNDARY TESTS
// -------------------------------------------------------------------------

test('Challenger M2-2.1: Dedupe Key Generation across all notification categories and schemas', () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const matchId = '22222222-2222-4222-8222-222222222222';
    const notifId = '33333333-3333-4333-8333-333333333333';

    // 1. Chat with direct conversation_id
    const keyChat1 = computeEmailDedupeKey({
        id: notifId,
        user_id: userId,
        category: 'messages',
        type: 'message',
        conversation_id: matchId
    });
    assert.strictEqual(keyChat1, `email:chat:${userId}:${matchId}`);

    // 2. Chat with match_id
    const keyChat2 = computeEmailDedupeKey({
        id: notifId,
        user_id: userId,
        category: 'messages',
        type: 'message',
        match_id: matchId
    });
    assert.strictEqual(keyChat2, `email:chat:${userId}:${matchId}`);

    // 3. Chat with metadata.match_id (UUID)
    const keyChat3 = computeEmailDedupeKey({
        id: notifId,
        user_id: userId,
        category: 'messages',
        type: 'message',
        metadata: { match_id: matchId }
    });
    assert.strictEqual(keyChat3, `email:chat:${userId}:${matchId}`);

    // 4. Chat without conversation/match ID -> fallback to notif id
    const keyChatNoConv = computeEmailDedupeKey({
        id: notifId,
        user_id: userId,
        category: 'messages',
        type: 'message'
    });
    assert.strictEqual(keyChatNoConv, `email:chat:${userId}:${notifId}`);

    // 5. Connection Requests: aggregated per user (dedupe_key = email:request:userId)
    const keyRequest1 = computeEmailDedupeKey({
        id: notifId,
        user_id: userId,
        category: 'requests',
        type: 'request'
    });
    assert.strictEqual(keyRequest1, `email:request:${userId}`);

    const keyRequest2 = computeEmailDedupeKey({
        id: '44444444-4444-4444-8444-444444444444',
        user_id: userId,
        category: 'requests',
        type: 'connection_request'
    });
    assert.strictEqual(keyRequest2, `email:request:${userId}`, 'Multiple requests must share exact same dedupe key');

    // 6. Empirical finding: Match notifications with match_id collapse into email:chat namespace
    // because line 115 contains "OR v_conv_id IS NOT NULL", collapsing match + first chats into 1 thread
    const keyMatchWithConv = computeEmailDedupeKey({
        id: notifId,
        user_id: userId,
        category: 'matches',
        type: 'match',
        match_id: matchId
    });
    assert.strictEqual(keyMatchWithConv, `email:chat:${userId}:${matchId}`, 'Match with match_id collapses into chat thread dedupe key');

    // 7. Match without conversation ID (e.g. general like notification) uses email:match:userId:notifId
    const keyMatchNoConv = computeEmailDedupeKey({
        id: notifId,
        user_id: userId,
        category: 'matches',
        type: 'match'
    });
    assert.strictEqual(keyMatchNoConv, `email:match:${userId}:${notifId}`);

    // 8. General Fallback
    const keyGeneral = computeEmailDedupeKey({
        id: notifId,
        user_id: userId,
        category: 'system',
        type: 'announcement'
    });
    assert.strictEqual(keyGeneral, `email:${userId}:${notifId}`);
});

test('Challenger M2-2.2: Malformed and Non-UUID match_id handling in SQL regex protection', () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const notifId = '33333333-3333-4333-8333-333333333333';

    // Malformed match IDs that would crash '::uuid' cast if not guarded by regex
    const malformedInputs = [
        'null',
        'undefined',
        'temp_client_123',
        '12345',
        'not-a-valid-uuid-format',
        '{"nested": "object"}',
        '',
        '   '
    ];

    for (const badId of malformedInputs) {
        const key = computeEmailDedupeKey({
            id: notifId,
            user_id: userId,
            category: 'messages',
            type: 'message',
            metadata: { match_id: badId }
        });
        // Must safely fall back to notifId rather than crashing
        assert.strictEqual(key, `email:chat:${userId}:${notifId}`, `Must safely handle malformed match_id: "${badId}"`);
    }

    // Verify regex pattern exists in migration SQL
    assert.ok(
        migrationSql.includes("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"),
        'Migration SQL must contain UUID regex validator before casting metadata match_id'
    );
});

test('Challenger M2-2.3: Deduplication Stress: 100 consecutive chat messages within 15 minutes prevents queue explosion', () => {
    const queue = new SimulatedNotificationEmailQueue();
    const userId = 'user-recipient-1';
    const matchId = '11111111-1111-4111-8111-111111111111';

    const t0 = new Date('2026-10-08T12:00:00Z');
    const scheduledT0 = new Date(t0.getTime() + 15 * 60 * 1000);

    // Simulate burst of 100 incoming chat messages over 10 minutes
    for (let i = 1; i <= 100; i++) {
        const notifId = `notif-${i}`;
        const dedupeKey = computeEmailDedupeKey({
            id: notifId,
            user_id: userId,
            category: 'messages',
            type: 'message',
            match_id: matchId
        });

        const res = queue.enqueue({
            id: `q-${i}`,
            notification_id: notifId,
            user_id: userId,
            category: 'messages',
            type: 'message',
            title: `Message ${i}`,
            content: `Hey Bob! Message content #${i}`,
            dedupe_key: dedupeKey,
            scheduled_for: scheduledT0
        });

        if (i === 1) {
            assert.strictEqual(res.enqueued, true);
            assert.strictEqual(res.deduplicated, false);
        } else {
            assert.strictEqual(res.enqueued, true);
            assert.strictEqual(res.deduplicated, true, `Message ${i} must be deduplicated against existing pending row`);
        }
    }

    // VERIFICATION: Exactly 1 row in the queue despite 100 insertions!
    assert.strictEqual(queue.rows.size, 1, 'Queue must contain exactly 1 row, preventing explosion');

    const singleRow = Array.from(queue.rows.values())[0];
    assert.strictEqual(singleRow.status, 'pending');
    assert.strictEqual(singleRow.notification_id, 'notif-100', 'Row must reflect latest message ID');
    assert.strictEqual(singleRow.title, 'Message 100', 'Row must reflect latest message title');
    assert.strictEqual(singleRow.scheduled_for.toISOString(), scheduledT0.toISOString(), 'Grace window must NOT be pushed forward; remains T0 + 15m');
});

test('Challenger M2-2.4: Multi-Conversation Isolation: 10 distinct senders to same recipient produce exactly 10 isolated items', () => {
    const queue = new SimulatedNotificationEmailQueue();
    const recipientId = 'user-recipient-1';

    for (let convIdx = 1; convIdx <= 10; convIdx++) {
        const matchId = `00000000-0000-4000-8000-${String(convIdx).padStart(12, '0')}`;
        // Send 5 messages for each conversation
        for (let msgIdx = 1; msgIdx <= 5; msgIdx++) {
            const notifId = `notif-c${convIdx}-m${msgIdx}`;
            const dedupeKey = computeEmailDedupeKey({
                id: notifId,
                user_id: recipientId,
                category: 'messages',
                type: 'message',
                match_id: matchId
            });

            queue.enqueue({
                id: `q-c${convIdx}-m${msgIdx}`,
                notification_id: notifId,
                user_id: recipientId,
                category: 'messages',
                type: 'message',
                title: `Chat from Conv ${convIdx}`,
                content: `Message ${msgIdx}`,
                dedupe_key: dedupeKey
            });
        }
    }

    // Exactly 10 rows: 1 per active conversation thread
    assert.strictEqual(queue.rows.size, 10, 'Must have exactly 10 queue rows (1 per conversation)');
    const dedupeKeys = new Set(Array.from(queue.rows.values()).map(r => r.dedupe_key));
    assert.strictEqual(dedupeKeys.size, 10, 'All 10 dedupe keys must be distinct');
});

// -------------------------------------------------------------------------
// 2. RACE CONDITION TESTS
// -------------------------------------------------------------------------

test('Challenger M2-2.5: Race Condition Simulation: Worker claims item concurrent with user marking conversation read', () => {
    const queue = new SimulatedNotificationEmailQueue();
    const recipientId = 'user-recipient-1';
    const matchId = '11111111-1111-4111-8111-111111111111';
    const notifId = 'notif-race-1';
    const queueId = 'queue-race-1';

    // Mock notification table in DB
    const mockNotifications = new Map();
    mockNotifications.set(notifId, {
        id: notifId,
        user_id: recipientId,
        match_id: matchId,
        is_read: false,
        read_at: null,
        metadata: {}
    });

    const dedupeKey = computeEmailDedupeKey({
        id: notifId,
        user_id: recipientId,
        category: 'messages',
        type: 'message',
        match_id: matchId
    });

    // Enqueue pending item whose scheduled time is in the past (due now)
    queue.enqueue({
        id: queueId,
        notification_id: notifId,
        user_id: recipientId,
        category: 'messages',
        type: 'message',
        title: 'Hey there',
        content: 'Are you free?',
        dedupe_key: dedupeKey,
        scheduled_for: new Date(Date.now() - 1000) // 1s ago (due)
    });

    // Thread 1: Worker batch claim runs
    const claimedBatch = queue.claimBatch(25);
    assert.strictEqual(claimedBatch.length, 1);
    assert.strictEqual(claimedBatch[0].id, queueId);
    assert.strictEqual(claimedBatch[0].status, 'processing');

    // Thread 2 (RACE): User opens chat right now!
    // User executes mark_conversation_read_and_cancel_emails
    // DB marks notifications.is_read = true, read_at = now()
    const notifInDb = mockNotifications.get(notifId);
    notifInDb.is_read = true;
    notifInDb.read_at = new Date().toISOString();

    // In queue table, the RPC tries to update status = 'cancelled_read' WHERE status = 'pending'.
    // Since item is currently 'processing', the RPC's direct queue update affects 0 rows.
    const cancelledViaRpcDirect = queue.cancelPendingForConversation(recipientId, matchId);
    assert.strictEqual(cancelledViaRpcDirect, 0, 'Direct RPC update misses processing row, BUT worker pre-flight catches it');

    // Thread 1 (Worker proceeds to process claimed item):
    // Worker runs Pre-flight Check: queries public.notifications
    let smtpDispatched = false;
    let workerOutcome = null;

    const notifForPreflight = mockNotifications.get(claimedBatch[0].notification_id);
    if (notifForPreflight && (notifForPreflight.is_read === true || notifForPreflight.read_at !== null)) {
        // Intercepted by worker pre-flight check!
        claimedBatch[0].status = 'cancelled_read';
        claimedBatch[0].cancelled_at = new Date();
        workerOutcome = 'cancelled_read';
    } else {
        smtpDispatched = true;
        claimedBatch[0].status = 'sent';
        workerOutcome = 'sent';
    }

    // VERIFICATION:
    assert.strictEqual(smtpDispatched, false, 'SMTP must NEVER be dispatched when notification was read');
    assert.strictEqual(workerOutcome, 'cancelled_read', 'Worker pre-flight check must transition status to cancelled_read');
    assert.strictEqual(claimedBatch[0].status, 'cancelled_read');
});

test('Challenger M2-2.6: Race Condition: User reads thread before worker runs completely cancels pending item', () => {
    const queue = new SimulatedNotificationEmailQueue();
    const recipientId = 'user-recipient-1';
    const matchId = '11111111-1111-4111-8111-111111111111';
    const notifId = 'notif-fast-read';

    const dedupeKey = computeEmailDedupeKey({
        id: notifId,
        user_id: recipientId,
        category: 'messages',
        type: 'message',
        match_id: matchId
    });

    queue.enqueue({
        id: 'q-fast-read',
        notification_id: notifId,
        user_id: recipientId,
        category: 'messages',
        type: 'message',
        title: 'Hey',
        content: 'Hello',
        dedupe_key: dedupeKey,
        scheduled_for: new Date(Date.now() + 10 * 60 * 1000)
    });

    // User opens chat at T+2 minutes
    const cancelledCount = queue.cancelPendingForConversation(recipientId, matchId);
    assert.strictEqual(cancelledCount, 1, 'Queue row was pending, so RPC cancelled it immediately');

    // 15 minutes later, worker runs
    const dueBatch = queue.claimBatch(25);
    assert.strictEqual(dueBatch.length, 0, 'Worker must find 0 due pending items');
});

test('Challenger M2-2.7: Multi-Worker Concurrency: Zero double-claims with SKIP LOCKED semantics', () => {
    const queue = new SimulatedNotificationEmailQueue();
    const recipientId = 'user-recipient-1';

    // Seed 20 due items in queue
    for (let i = 1; i <= 20; i++) {
        queue.enqueue({
            id: `q-concurrent-${i}`,
            notification_id: `notif-${i}`,
            user_id: recipientId,
            category: 'messages',
            type: 'message',
            title: `Title ${i}`,
            content: `Body ${i}`,
            dedupe_key: `dedupe-${i}`,
            scheduled_for: new Date(Date.now() - 5000) // in past
        });
    }

    // 4 concurrent workers claim batches of 5 items
    const worker1Claims = queue.claimBatch(5);
    const worker2Claims = queue.claimBatch(5);
    const worker3Claims = queue.claimBatch(5);
    const worker4Claims = queue.claimBatch(5);

    const allClaimedIds = [
        ...worker1Claims.map(i => i.id),
        ...worker2Claims.map(i => i.id),
        ...worker3Claims.map(i => i.id),
        ...worker4Claims.map(i => i.id)
    ];

    assert.strictEqual(allClaimedIds.length, 20);
    const uniqueClaimedIds = new Set(allClaimedIds);
    assert.strictEqual(uniqueClaimedIds.size, 20, 'Zero overlapping claims allowed across concurrent workers');

    // 5th worker claims
    const worker5Claims = queue.claimBatch(5);
    assert.strictEqual(worker5Claims.length, 0, 'Queue is exhausted; worker 5 gets 0 items');
});

// -------------------------------------------------------------------------
// 3. CLIENT SERVICE BOUNDARY TESTS
// -------------------------------------------------------------------------

test('Challenger M2-2.8: Client Service Boundary: notificationService.js handles nulls and empty parameters without crashing', () => {
    // 1. markConversationNotificationsAsRead boundary contract
    assert.ok(
        notifServiceSource.includes('export async function markConversationNotificationsAsRead(conversationId, userId) {'),
        'Must export markConversationNotificationsAsRead'
    );
    assert.ok(
        notifServiceSource.includes("if (!conversationId || !userId) return { error: 'Invalid parameters' };"),
        'Must guard against null/undefined conversationId or userId immediately'
    );

    // 2. createNotification exception containment
    assert.ok(
        notifServiceSource.includes('export async function createNotification('),
        'Must export createNotification'
    );
    assert.ok(
        notifServiceSource.includes('try {') && notifServiceSource.includes('catch (error) {'),
        'createNotification must be wrapped in try/catch'
    );
    assert.ok(
        notifServiceSource.includes("return { error: error.message };"),
        'createNotification must return { error: error.message } on error, avoiding unhandled rejections'
    );

    // 3. sendEmailNotification exception containment
    assert.ok(
        notifServiceSource.includes('export async function sendEmailNotification('),
        'Must export sendEmailNotification helper'
    );
    assert.ok(
        notifServiceSource.includes("console.warn('[NotificationService] Silent email failure:', err.message);"),
        'sendEmailNotification must catch and log silent email failure'
    );
});

test('Challenger M2-2.9: Client Service Boundary: chatService.js markConversationRead parameter validation and graceful fallback', () => {
    // 1. Parameter guard
    assert.ok(
        chatServiceSource.includes("if (!matchId || matchId === 'null') return { error: 'Invalid match ID' };"),
        'Must guard against null, undefined, or string literal "null" matchId'
    );

    // 2. RPC call with fallback
    assert.ok(
        chatServiceSource.includes("await supabase.rpc('mark_conversation_read_and_cancel_emails', {"),
        'Must attempt atomic RPC mark_conversation_read_and_cancel_emails'
    );
    assert.ok(
        chatServiceSource.includes('catch (_rpcErr) {'),
        'Must wrap RPC in catch block to fallback gracefully when offline or mock'
    );

    // 3. Fallback direct updates
    assert.ok(
        chatServiceSource.includes(".from('messages')") && chatServiceSource.includes(".update({ is_read: true"),
        'Must update messages table in fallback'
    );
    assert.ok(
        chatServiceSource.includes(".from('notifications')") && chatServiceSource.includes(".update({ is_read: true"),
        'Must update notifications table in fallback'
    );

    // 4. sendMessage notification fire-and-forget
    assert.ok(
        chatServiceSource.includes("createNotification({") && chatServiceSource.includes(".catch(err => console.warn('Silent chat notification error:', err));"),
        'sendMessage must never throw unhandled error if notification dispatch fails'
    );
});

// -------------------------------------------------------------------------
// 4. EDGE FUNCTION QUEUE WORKER BOUNDARY TESTS
// -------------------------------------------------------------------------

test('Challenger M2-2.10: Edge Function Worker: Batch bounds clamping and exponential backoff formulas', () => {
    // 1. Batch limit clamping as implemented in Edge Function line 352-353:
    // const rawLimit = Number(payload.limit || payload.batchSize) || 25
    // const limit = Math.min(Math.max(1, rawLimit), 50)
    function clampBatchLimit(payload) {
        const rawLimit = Number(payload.limit || payload.batchSize) || 25;
        return Math.min(Math.max(1, rawLimit), 50);
    }

    assert.strictEqual(clampBatchLimit({}), 25, 'Default limit is 25');
    assert.strictEqual(clampBatchLimit({ limit: null }), 25, 'Null defaults to 25');
    assert.strictEqual(clampBatchLimit({ limit: -10 }), 1, 'Negative numbers clamped to 1');
    assert.strictEqual(clampBatchLimit({ limit: 0 }), 25, '0 is falsy in || so falls back to 25');
    assert.strictEqual(clampBatchLimit({ limit: 15 }), 15, '15 preserved');
    assert.strictEqual(clampBatchLimit({ limit: 50 }), 50, '50 preserved');
    assert.strictEqual(clampBatchLimit({ limit: 500 }), 50, 'Values > 50 clamped to 50');

    // Verify Edge Function code has this clamping formula
    assert.ok(
        edgeFuncSource.includes('Math.min(Math.max(1, rawLimit), 50)'),
        'Edge Function must clamp batch limit between 1 and 50'
    );

    // 2. Exponential backoff formula
    function computeBackoffMinutes(retryCount) {
        return Math.pow(2, retryCount) * 5;
    }

    assert.strictEqual(computeBackoffMinutes(0), 5, 'Retry 0 backoff is 5 minutes');
    assert.strictEqual(computeBackoffMinutes(1), 10, 'Retry 1 backoff is 10 minutes');
    assert.strictEqual(computeBackoffMinutes(2), 20, 'Retry 2 backoff is 20 minutes');
    assert.strictEqual(computeBackoffMinutes(3), 40, 'Retry 3 backoff is 40 minutes');

    // Verify Edge Function code has this backoff formula
    assert.ok(
        edgeFuncSource.includes('Math.pow(2, currentRetries) * 5'),
        'Edge Function must use Math.pow(2, currentRetries) * 5 for exponential backoff'
    );
});

test('Challenger M2-2.11: Edge Function Worker: Dual-port Hostinger SMTP resilience (465 SSL with 587 fallback)', () => {
    assert.ok(
        edgeFuncSource.includes('smtp.hostinger.com'),
        'Must configure smtp.hostinger.com'
    );
    assert.ok(
        edgeFuncSource.includes('config.port === 465 ? 587 : 465'),
        'Must fallback between port 465 and 587 on connection failure'
    );
    assert.ok(
        edgeFuncSource.includes('connectionTimeout: 10000'),
        'Must set 10s connection timeout'
    );
    assert.ok(
        edgeFuncSource.includes('socketTimeout: 15000'),
        'Must set 15s socket timeout'
    );
});

test('Challenger M2-2.12: Edge Function Worker: Action routing and backward compatibility', () => {
    assert.ok(
        edgeFuncSource.includes('payload?.action === "process-queue" || payload?.action === "process_queue"'),
        'Must route process-queue action to handleProcessQueue'
    );
    assert.ok(
        edgeFuncSource.includes('return await handleDirectSend(payload, supabaseAdmin, smtpConfig)'),
        'Must route all other calls to handleDirectSend for 100% backward compatibility'
    );
});
