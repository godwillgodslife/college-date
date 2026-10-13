import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

test('Notification Push Reliability: Database Migration & Trigger Contracts', () => {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261012110000_notification_push_reliability_and_campus_confessions.sql');
    assert.strictEqual(existsSync(migrationPath), true, 'Migration file must exist');

    const sql = readFileSync(migrationPath, 'utf8');

    // 1. app_config registration
    assert.ok(sql.includes('supabase_anon_key'), 'Must register supabase_anon_key in app_config');
    assert.ok(sql.includes('ON CONFLICT (key) DO UPDATE'), 'Must handle conflict gracefully');

    // 2. Trigger function authentication
    assert.ok(sql.includes('trg_fn_notifications_push_dispatch'), 'Must define trg_fn_notifications_push_dispatch');
    assert.ok(sql.includes("'apikey', v_service_key"), 'Must pass apikey header for Supabase gateway authorization');
    assert.ok(sql.includes("'Authorization', 'Bearer ' || v_service_key"), 'Must pass Authorization header');

    // 3. Unread message delivery guarantee (never dropped on noisy presence)
    assert.ok(sql.includes("NEW.type NOT IN ('message', 'new_message', 'call')"), 'Must never drop unread chat messages due to presence flags');

    // 4. Dual payload assembly
    assert.ok(sql.includes("'externalUserIds', jsonb_build_array"), 'Must assemble top-level externalUserIds');
    assert.ok(sql.includes("'headings', jsonb_build_object('en', NEW.title)"), 'Must assemble top-level headings');
    assert.ok(sql.includes("'contents', jsonb_build_object('en', NEW.content)"), 'Must assemble top-level contents');
    assert.ok(sql.includes("'record', jsonb_build_object("), 'Must assemble record object for webhook compatibility');

    // 5. Campus Confessions broadcast
    assert.ok(sql.includes('trg_fn_broadcast_campus_confession'), 'Must define campus confession broadcast trigger function');
    assert.ok(sql.includes('trg_confessions_broadcast_campus'), 'Must define trg_confessions_broadcast_campus trigger');
    assert.ok(sql.includes('AFTER INSERT ON public.confessions'), 'Must trigger AFTER INSERT on confessions');
    assert.ok(sql.includes('p.university = v_campus'), 'Must broadcast to peers on the same campus');

    // 6. Profile Visibility & Match Retention Reminders
    assert.ok(sql.includes('dispatch_campus_retention_reminders'), 'Must define dispatch_campus_retention_reminders RPC');
    assert.ok(sql.includes('profile_reminder'), 'Must enqueue profile completion reminders');
});

test('OneSignal Edge Function: Launcher Badge Calculation & Alias Targeting', () => {
    const edgePath = resolve(process.cwd(), 'supabase/functions/send-notification-push/index.ts');
    assert.strictEqual(existsSync(edgePath), true, 'send-notification-push index.ts must exist');

    const code = readFileSync(edgePath, 'utf8');

    // 1. WhatsApp-style launcher desktop app icon badge
    assert.ok(code.includes('android_badge_type'), 'Must configure android_badge_type');
    assert.ok(code.includes('badge_count'), 'Must populate badge_count in notification payload');
    assert.ok(code.includes('unreadCount'), 'Must query unread count from notifications table');

    // 2. Safe URL formatting (no app_url/web_url collisions)
    assert.ok(code.includes('delete notificationPayload.web_url'), 'Must delete web_url to prevent OneSignal conflict');
    assert.ok(code.includes('delete notificationPayload.app_url'), 'Must delete app_url to prevent OneSignal conflict');

    // 3. Targets
    assert.ok(code.includes('external_id: externalTargets'), 'Must target external_id aliases');
});

test('Client Messaging Contracts: Direct Messages Never Drop Push Notifications', () => {
    const chatServicePath = resolve(process.cwd(), 'src/services/chatService.js');
    const notifServicePath = resolve(process.cwd(), 'src/services/notificationService.js');

    const chatCode = readFileSync(chatServicePath, 'utf8');
    const notifCode = readFileSync(notifServicePath, 'utf8');

    // 1. chatService sets suppressPush = false for text messages
    assert.ok(
        chatCode.includes("const suppressPush = isCall ? Boolean(metadata?.recipientIsActive || metadata?.suppressPush) : false;"),
        'chatService must ensure suppressPush is false for direct messages'
    );

    // 2. notificationService maintains suppress_push evaluation
    assert.ok(
        notifCode.includes("suppress_push: Boolean(suppressPush || metadata.suppress_push || metadata.suppressPush || metadata.recipientIsActive)"),
        'notificationService must correctly evaluate suppress_push'
    );
});

