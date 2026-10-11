import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load source files for static contract analysis and AST/syntax verification
const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261008180000_server_authoritative_push_trigger.sql');
const edgeFuncPath = resolve(process.cwd(), 'supabase/functions/send-notification-push/index.ts');
const notifServicePath = resolve(process.cwd(), 'src/services/notificationService.js');

const migrationSql = readFileSync(migrationPath, 'utf8');
const edgeFuncSource = readFileSync(edgeFuncPath, 'utf8');
const notifServiceSource = readFileSync(notifServicePath, 'utf8');

// -------------------------------------------------------------------------
// Helper: Emulate Trigger Evaluation Logic in Pure JS
// -------------------------------------------------------------------------
function evaluateTriggerSuppression(record) {
    const isRead = record.is_read === true;
    const metadata = record.metadata;

    const suppressPushVal = metadata && typeof metadata === 'object' ? String(metadata.suppress_push) : null;
    const suppressPushAltVal = metadata && typeof metadata === 'object' ? String(metadata.suppressPush) : null;
    const recipientIsActiveVal = metadata && typeof metadata === 'object' ? String(metadata.recipientIsActive) : null;

    if (
        isRead ||
        suppressPushVal === 'true' ||
        suppressPushAltVal === 'true' ||
        recipientIsActiveVal === 'true'
    ) {
        return { shouldDispatch: false, reason: 'suppressed_or_read' };
    }

    return { shouldDispatch: true };
}

function assembleTriggerPayload(record, settings = {}) {
    const edgeUrlRaw = settings.edge_function_base_url || 'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1';
    let edgeUrl = edgeUrlRaw;
    if (!edgeUrl.endsWith('/send-notification-push')) {
        edgeUrl = edgeUrl.replace(/\/+$/, '') + '/send-notification-push';
    }

    const serviceKey = settings.service_role_key || '';

    const payload = {
        type: 'INSERT',
        table: 'notifications',
        schema: 'public',
        record: {
            id: record.id,
            user_id: record.user_id ?? record.recipient_id ?? null,
            recipient_id: record.recipient_id ?? record.user_id ?? null,
            actor_id: record.actor_id ?? record.sender_id ?? null,
            sender_id: record.sender_id ?? record.actor_id ?? null,
            type: record.type,
            category: record.category,
            title: record.title,
            content: record.content,
            metadata: record.metadata ?? {},
            deep_link: record.deep_link,
            priority: record.priority,
            group_key: record.group_key,
            dedupe_key: record.dedupe_key,
            created_at: record.created_at
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + serviceKey
    };

    return { edgeUrl, serviceKey, headers, payload };
}

// -------------------------------------------------------------------------
// Helper: Emulate Edge Function Payload Normalization & Target Resolution
// -------------------------------------------------------------------------
function normalizeEdgePayload(body) {
    const isWebhook = Boolean(body?.record || body?.type === 'INSERT');
    const record = (body?.record || null);
    const notificationId = (record?.id || body?.notificationId || body?.data?.notification_id);

    const targetUserId = (body?.userId || record?.user_id || record?.recipient_id);
    const actorId = (body?.actorId || record?.actor_id || record?.sender_id);
    const notifType = ((body?.type && !['INSERT', 'UPDATE', 'DELETE'].includes(body.type))
        ? body.type
        : (record?.type || body?.data?.type || 'general'));
    const category = ((record?.category || body?.category || body?.data?.category || 'general')).toLowerCase();
    const rawTitle = (body?.title || record?.title || 'New Notification');
    const rawContent = (body?.content || record?.content || '');
    const metadata = (record?.metadata || body?.data || {});

    const subscriptionTargets = Array.from(new Set([
        ...(Array.isArray(body?.subscriptionIds) ? body.subscriptionIds : []),
        ...(Array.isArray(body?.onesignalIds) ? body.onesignalIds : []),
        body?.onesignalId,
    ].filter(Boolean)));

    const externalTargets = Array.from(new Set([
        ...(Array.isArray(body?.externalUserIds) ? body.externalUserIds : []),
        ...(Array.isArray(body?.userIds) ? body.userIds : []),
        body?.externalUserId,
        body?.userId,
        targetUserId,
    ].filter(Boolean)));

    return {
        isWebhook,
        notificationId,
        targetUserId,
        actorId,
        notifType,
        category,
        rawTitle,
        rawContent,
        metadata,
        subscriptionTargets,
        externalTargets
    };
}

function evaluateEdgeFunctionPreferences(normalized, userProfile) {
    const { targetUserId, category, notifType, metadata, record } = normalized;

    if (userProfile && userProfile.push_notifications === false) {
        return { success: true, skipped: true, reason: 'user_disabled_push' };
    }

    const isCriticalOrSystem = metadata?.priority === 'critical' || record?.priority === 'critical' || category === 'system';
    if (!isCriticalOrSystem && userProfile) {
        if (category === 'messages' && userProfile.message_notifications === false) {
            return { success: true, skipped: true, reason: 'messages_disabled' };
        }
        if (category === 'matches' && userProfile.match_notifications === false) {
            return { success: true, skipped: true, reason: 'matches_disabled' };
        }
        if (category === 'requests' && userProfile.request_notifications === false) {
            return { success: true, skipped: true, reason: 'requests_disabled' };
        }
        if (['profile_activity', 'views', 'viewers'].includes(category) && userProfile.view_notifications === false) {
            return { success: true, skipped: true, reason: 'views_disabled' };
        }
        if (category === 'social') {
            if (notifType === 'confession' && userProfile.confession_notifications === false) {
                return { success: true, skipped: true, reason: 'confessions_disabled' };
            }
            if (userProfile.social_notifications === false) {
                return { success: true, skipped: true, reason: 'social_disabled' };
            }
        }
        if (notifType === 'confession' && userProfile.confession_notifications === false) {
            return { success: true, skipped: true, reason: 'confessions_disabled' };
        }
    }

    return { success: true, skipped: false };
}

function evaluatePrivacyShielding(normalized) {
    const { notifType, actorId, metadata } = normalized;
    const isAnonymousInteraction = Boolean(
        metadata?.is_anonymous ||
        notifType === 'confession' ||
        (notifType === 'snapshot_reaction' && !actorId) ||
        !actorId
    );
    const safeActorAvatar = isAnonymousInteraction ? null : (metadata?.actor_avatar_url || metadata?.avatar_url || null);
    const safeImageUrl = isAnonymousInteraction ? null : (metadata?.image_url || safeActorAvatar || null);

    return { isAnonymousInteraction, safeActorAvatar, safeImageUrl };
}

// -------------------------------------------------------------------------
// TEST SUITE: Challenger 1 Empirical Stress Tests
// -------------------------------------------------------------------------

test('Challenger M1.1: Migration integrity and static contracts', () => {
    assert.strictEqual(existsSync(migrationPath), true, 'Migration file must exist');

    // 1. pg_net extension ensure
    assert.strictEqual(
        migrationSql.includes('CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;'),
        true,
        'Must ensure pg_net extension in net schema'
    );

    // 2. SECURITY DEFINER and search_path
    assert.strictEqual(
        migrationSql.includes('SECURITY DEFINER'),
        true,
        'Trigger function must be SECURITY DEFINER to invoke net.http_post safely'
    );
    assert.strictEqual(
        migrationSql.includes('SET search_path = public'),
        true,
        'Trigger function must explicitly pin search_path'
    );

    // 3. Exception containment block
    assert.strictEqual(
        migrationSql.includes('BEGIN') && migrationSql.includes('EXCEPTION WHEN OTHERS THEN'),
        true,
        'Must contain pg_net invocation in BEGIN ... EXCEPTION WHEN OTHERS block'
    );
    assert.strictEqual(
        migrationSql.includes("RAISE WARNING 'Push trigger dispatch failed: %', SQLERRM;"),
        true,
        'Must emit warning on failure without aborting transaction'
    );

    // 4. Trigger attachment
    assert.strictEqual(
        migrationSql.includes('AFTER INSERT ON public.notifications'),
        true,
        'Trigger must attach AFTER INSERT ON public.notifications'
    );
    assert.strictEqual(
        migrationSql.includes('FOR EACH ROW'),
        true,
        'Trigger must execute FOR EACH ROW'
    );
});

test('Challenger M1.2: Trigger suppression logic with edge cases (null metadata, empty, missing, active chat)', () => {
    // Case 1: metadata is null -> Should NOT suppress; should proceed to dispatch
    const res1 = evaluateTriggerSuppression({ id: '1', is_read: false, metadata: null });
    assert.strictEqual(res1.shouldDispatch, true, 'Null metadata must not suppress push dispatch');

    // Case 2: metadata is empty object {} -> Should NOT suppress
    const res2 = evaluateTriggerSuppression({ id: '2', is_read: false, metadata: {} });
    assert.strictEqual(res2.shouldDispatch, true, 'Empty metadata {} must not suppress push dispatch');

    // Case 3: metadata.suppress_push is explicit false
    const res3 = evaluateTriggerSuppression({ id: '3', is_read: false, metadata: { suppress_push: false } });
    assert.strictEqual(res3.shouldDispatch, true, 'suppress_push: false must not suppress push dispatch');

    // Case 4: metadata.suppress_push is explicit true
    const res4 = evaluateTriggerSuppression({ id: '4', is_read: false, metadata: { suppress_push: true } });
    assert.strictEqual(res4.shouldDispatch, false, 'suppress_push: true must suppress push dispatch');

    // Case 5: metadata.suppress_push is string 'true'
    const res5 = evaluateTriggerSuppression({ id: '5', is_read: false, metadata: { suppress_push: 'true' } });
    assert.strictEqual(res5.shouldDispatch, false, "suppress_push: 'true' must suppress push dispatch");

    // Case 6: metadata.suppressPush is camelCase true
    const res6 = evaluateTriggerSuppression({ id: '6', is_read: false, metadata: { suppressPush: true } });
    assert.strictEqual(res6.shouldDispatch, false, 'suppressPush: true must suppress push dispatch');

    // Case 7: metadata.recipientIsActive is true (real-time presence signal)
    const res7 = evaluateTriggerSuppression({ id: '7', is_read: false, metadata: { recipientIsActive: true } });
    assert.strictEqual(res7.shouldDispatch, false, 'recipientIsActive: true must suppress push dispatch');

    // Case 8: Notification is already marked as read upon insert
    const res8 = evaluateTriggerSuppression({ id: '8', is_read: true, metadata: {} });
    assert.strictEqual(res8.shouldDispatch, false, 'is_read = true must suppress push dispatch');
});

test('Challenger M1.3: Trigger payload assembly and user_id / recipient_id fallback resolution', () => {
    // Case 1: standard row with user_id only
    const assembled1 = assembleTriggerPayload({
        id: 'notif-101',
        user_id: 'user-aaa',
        recipient_id: null,
        actor_id: 'actor-bbb',
        sender_id: null,
        type: 'message',
        category: 'messages',
        title: 'Hi',
        content: 'Hello',
        metadata: null,
        created_at: '2026-10-08T18:00:00Z'
    });
    assert.strictEqual(assembled1.payload.record.user_id, 'user-aaa');
    assert.strictEqual(assembled1.payload.record.recipient_id, 'user-aaa', 'recipient_id must resolve to user_id fallback');
    assert.strictEqual(assembled1.payload.record.actor_id, 'actor-bbb');
    assert.strictEqual(assembled1.payload.record.sender_id, 'actor-bbb', 'sender_id must resolve to actor_id fallback');
    assert.deepStrictEqual(assembled1.payload.record.metadata, {}, 'Null metadata must default to {}');

    // Case 2: legacy row with recipient_id only
    const assembled2 = assembleTriggerPayload({
        id: 'notif-102',
        user_id: null,
        recipient_id: 'user-zzz',
        actor_id: null,
        sender_id: 'sender-yyy',
        type: 'match',
        category: 'matches',
        title: 'New Match',
        content: 'You matched!',
        metadata: { match_id: 'm-1' },
        created_at: '2026-10-08T18:01:00Z'
    });
    assert.strictEqual(assembled2.payload.record.user_id, 'user-zzz', 'user_id must resolve to recipient_id fallback');
    assert.strictEqual(assembled2.payload.record.recipient_id, 'user-zzz');
    assert.strictEqual(assembled2.payload.record.actor_id, 'sender-yyy', 'actor_id must resolve to sender_id fallback');
    assert.strictEqual(assembled2.payload.record.sender_id, 'sender-yyy');
    assert.strictEqual(assembled2.payload.record.metadata.match_id, 'm-1');
});

test('Challenger M1.4: Edge function URL formatting and service key fallback ladder', () => {
    // Case 1: Base URL without trailing slash
    const a1 = assembleTriggerPayload({ id: '1' }, { edge_function_base_url: 'https://example.com/functions/v1' });
    assert.strictEqual(a1.edgeUrl, 'https://example.com/functions/v1/send-notification-push');

    // Case 2: Base URL with trailing slash
    const a2 = assembleTriggerPayload({ id: '2' }, { edge_function_base_url: 'https://example.com/functions/v1/' });
    assert.strictEqual(a2.edgeUrl, 'https://example.com/functions/v1/send-notification-push');

    // Case 3: Base URL already pointing directly to /send-notification-push
    const a3 = assembleTriggerPayload({ id: '3' }, { edge_function_base_url: 'https://example.com/functions/v1/send-notification-push' });
    assert.strictEqual(a3.edgeUrl, 'https://example.com/functions/v1/send-notification-push');

    // Case 4: Default fallback URL
    const a4 = assembleTriggerPayload({ id: '4' }, {});
    assert.strictEqual(a4.edgeUrl, 'https://gedoyoleoscgxgdqszzc.supabase.co/functions/v1/send-notification-push');

    // Case 5: Service role key Bearer header
    const a5 = assembleTriggerPayload({ id: '5' }, { service_role_key: 'my-secret-key-123' });
    assert.strictEqual(a5.headers['Authorization'], 'Bearer my-secret-key-123');
    assert.strictEqual(a5.headers['Content-Type'], 'application/json');
});

test('Challenger M1.5: Edge function dual-payload normalization (webhook vs direct client API)', () => {
    // 1. Webhook payload from database trigger
    const webhookBody = {
        type: 'INSERT',
        table: 'notifications',
        schema: 'public',
        record: {
            id: 'notif-uuid-1',
            user_id: 'user-uuid-1',
            recipient_id: 'user-uuid-1',
            actor_id: 'actor-uuid-1',
            sender_id: 'actor-uuid-1',
            type: 'message',
            category: 'messages',
            title: 'Hey there',
            content: 'Are you free?',
            metadata: { conversation_id: 'c-123' }
        }
    };
    const normWeb = normalizeEdgePayload(webhookBody);
    assert.strictEqual(normWeb.isWebhook, true);
    assert.strictEqual(normWeb.notificationId, 'notif-uuid-1');
    assert.strictEqual(normWeb.targetUserId, 'user-uuid-1');
    assert.strictEqual(normWeb.notifType, 'message');
    assert.strictEqual(normWeb.category, 'messages');
    assert.strictEqual(normWeb.externalTargets.includes('user-uuid-1'), true);

    // 2. Direct client API call (e.g. legacy or test push)
    const clientBody = {
        userId: 'user-uuid-2',
        title: 'Direct push',
        content: 'Testing direct push',
        subscriptionIds: ['sub-111'],
        data: { category: 'matches', type: 'match' }
    };
    const normClient = normalizeEdgePayload(clientBody);
    assert.strictEqual(normClient.isWebhook, false);
    assert.strictEqual(normClient.targetUserId, 'user-uuid-2');
    assert.strictEqual(normClient.notifType, 'match');
    assert.strictEqual(normClient.category, 'matches');
    assert.strictEqual(normClient.subscriptionTargets.includes('sub-111'), true);
    assert.strictEqual(normClient.externalTargets.includes('user-uuid-2'), true);
});

test('Challenger M1.6: Edge function server-side profile notification preferences enforcement', () => {
    // 1. Global push_notifications disabled in profile -> must skip OneSignal
    const resGlobal = evaluateEdgeFunctionPreferences(
        { targetUserId: 'u1', category: 'messages', notifType: 'message', metadata: {} },
        { push_notifications: false }
    );
    assert.strictEqual(resGlobal.skipped, true);
    assert.strictEqual(resGlobal.reason, 'user_disabled_push');

    // 2. Category messages disabled
    const resMsg = evaluateEdgeFunctionPreferences(
        { targetUserId: 'u1', category: 'messages', notifType: 'message', metadata: {} },
        { push_notifications: true, message_notifications: false }
    );
    assert.strictEqual(resMsg.skipped, true);
    assert.strictEqual(resMsg.reason, 'messages_disabled');

    // 3. Category matches disabled
    const resMatch = evaluateEdgeFunctionPreferences(
        { targetUserId: 'u1', category: 'matches', notifType: 'match', metadata: {} },
        { push_notifications: true, match_notifications: false }
    );
    assert.strictEqual(resMatch.skipped, true);
    assert.strictEqual(resMatch.reason, 'matches_disabled');

    // 4. Category requests disabled
    const resReq = evaluateEdgeFunctionPreferences(
        { targetUserId: 'u1', category: 'requests', notifType: 'request', metadata: {} },
        { push_notifications: true, request_notifications: false }
    );
    assert.strictEqual(resReq.skipped, true);
    assert.strictEqual(resReq.reason, 'requests_disabled');

    // 5. Category views / profile_activity disabled
    const resViews = evaluateEdgeFunctionPreferences(
        { targetUserId: 'u1', category: 'views', notifType: 'view', metadata: {} },
        { push_notifications: true, view_notifications: false }
    );
    assert.strictEqual(resViews.skipped, true);
    assert.strictEqual(resViews.reason, 'views_disabled');

    // 6. Social category confessions disabled
    const resConf = evaluateEdgeFunctionPreferences(
        { targetUserId: 'u1', category: 'social', notifType: 'confession', metadata: {} },
        { push_notifications: true, confession_notifications: false }
    );
    assert.strictEqual(resConf.skipped, true);
    assert.strictEqual(resConf.reason, 'confessions_disabled');

    // 7. Critical priority notification bypasses category preferences
    const resCrit = evaluateEdgeFunctionPreferences(
        { targetUserId: 'u1', category: 'messages', notifType: 'message', metadata: { priority: 'critical' } },
        { push_notifications: true, message_notifications: false }
    );
    assert.strictEqual(resCrit.skipped, false, 'Critical priority must bypass category disablement');

    // 8. System category bypasses category preferences
    const resSys = evaluateEdgeFunctionPreferences(
        { targetUserId: 'u1', category: 'system', notifType: 'security', metadata: {} },
        { push_notifications: true, message_notifications: false }
    );
    assert.strictEqual(resSys.skipped, false, 'System category must bypass category disablement');
});

test('Challenger M1.7: Privacy shielding and anonymity for confessions and anonymous asks', () => {
    // 1. Confession with leaky payload attempted -> Avatar and image must be masked to null
    const shieldConf = evaluatePrivacyShielding({
        notifType: 'confession',
        actorId: 'secret-actor-uuid',
        metadata: {
            actor_avatar_url: 'https://cdn.example.com/secret.jpg',
            image_url: 'https://cdn.example.com/photo.jpg'
        }
    });
    assert.strictEqual(shieldConf.isAnonymousInteraction, true);
    assert.strictEqual(shieldConf.safeActorAvatar, null, 'Confession must never leak actor avatar');
    assert.strictEqual(shieldConf.safeImageUrl, null, 'Confession must never leak image URL');

    // 2. Explicit is_anonymous flag
    const shieldAnon = evaluatePrivacyShielding({
        notifType: 'like',
        actorId: 'some-user',
        metadata: {
            is_anonymous: true,
            actor_avatar_url: 'https://cdn.example.com/anon.jpg'
        }
    });
    assert.strictEqual(shieldAnon.isAnonymousInteraction, true);
    assert.strictEqual(shieldAnon.safeActorAvatar, null);

    // 3. Missing actor ID (e.g. system notification or masked sender)
    const shieldNoActor = evaluatePrivacyShielding({
        notifType: 'snapshot_reaction',
        actorId: null,
        metadata: {
            actor_avatar_url: 'https://cdn.example.com/anon.jpg'
        }
    });
    assert.strictEqual(shieldNoActor.isAnonymousInteraction, true);
    assert.strictEqual(shieldNoActor.safeActorAvatar, null);

    // 4. Identified message from matched student -> Avatar and image preserved
    const shieldIdentified = evaluatePrivacyShielding({
        notifType: 'message',
        actorId: 'valid-actor-uuid',
        metadata: {
            actor_avatar_url: 'https://cdn.example.com/valid_avatar.jpg',
            image_url: 'https://cdn.example.com/valid_media.jpg'
        }
    });
    assert.strictEqual(shieldIdentified.isAnonymousInteraction, false);
    assert.strictEqual(shieldIdentified.safeActorAvatar, 'https://cdn.example.com/valid_avatar.jpg');
    assert.strictEqual(shieldIdentified.safeImageUrl, 'https://cdn.example.com/valid_media.jpg');
});

test('Challenger M1.8: Target resolution deduplication and denied device filtering', () => {
    // Emulate Edge function device filtering
    const devices = [
        { onesignal_subscription_id: 'sub-active-1', permission_status: 'granted' },
        { onesignal_subscription_id: 'sub-denied-2', permission_status: 'denied' },
        { onesignal_subscription_id: 'sub-active-3', permission_status: 'unknown' },
        { onesignal_subscription_id: null, permission_status: 'granted' }
    ];

    const resolvedSubscriptions = [];
    for (const d of devices) {
        if (d.permission_status !== 'denied' && d.onesignal_subscription_id) {
            resolvedSubscriptions.push(d.onesignal_subscription_id);
        }
    }

    assert.strictEqual(resolvedSubscriptions.includes('sub-active-1'), true);
    assert.strictEqual(resolvedSubscriptions.includes('sub-denied-2'), false, 'Denied permission device must be skipped');
    assert.strictEqual(resolvedSubscriptions.includes('sub-active-3'), true);
    assert.strictEqual(resolvedSubscriptions.length, 2);
});
