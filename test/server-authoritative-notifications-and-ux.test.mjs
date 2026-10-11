import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    groupNotificationsChronologically,
    groupNotificationsByDate
} from '../src/utils/notificationRouting.js';
import {
    triggerLightHaptic,
    triggerMediumHaptic,
    triggerSuccessHaptic,
    triggerWarningHaptic,
    haptics
} from '../src/services/haptics.js';

test('Notification Center: groupNotificationsChronologically partitions into Today, Yesterday, Earlier', () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayDate = new Date(startOfToday + 1000 * 60 * 10).toISOString(); // Today
    const yesterdayDate = new Date(startOfToday - 1000 * 60 * 60 * 2).toISOString(); // Yesterday (2 hrs before start of today)
    const earlierDate = new Date(startOfToday - 1000 * 60 * 60 * 72).toISOString(); // 3 days ago (Earlier)

    const sampleNotifications = [
        { id: '1', title: 'New Like', created_at: todayDate },
        { id: '2', title: 'New Match', created_at: todayDate },
        { id: '3', title: 'Message from Sarah', created_at: yesterdayDate },
        { id: '4', title: 'Welcome to CD', created_at: earlierDate },
        { id: '5', title: 'Corrupt Date', created_at: 'invalid-date' }
    ];

    const groups = groupNotificationsChronologically(sampleNotifications);
    assert.ok(Array.isArray(groups), 'Should return an array of groups');
    assert.ok(groups.length >= 2, 'Should create at least Today and Earlier groups');

    const todayGroup = groups.find(g => g.id === 'today');
    assert.ok(todayGroup, 'Today group must exist');
    assert.equal(todayGroup.title, 'Today');
    assert.equal(todayGroup.items.length, 2, 'Today group should contain exactly 2 items');

    const earlierGroup = groups.find(g => g.id === 'earlier');
    assert.ok(earlierGroup, 'Earlier group must exist');
    assert.ok(earlierGroup.items.some(item => item.id === '4'), 'Earlier group should contain the 4-day old item');
    assert.ok(earlierGroup.items.some(item => item.id === '5'), 'Invalid dates should fall into Earlier group');
});

test('Notification Center: groupNotificationsChronologically handles empty and edge cases', () => {
    assert.deepEqual(groupNotificationsChronologically([]), []);
    assert.deepEqual(groupNotificationsChronologically(null), []);
    assert.deepEqual(groupNotificationsChronologically(undefined), []);
});

test('Notification Center: groupNotificationsByDate helper matches partitioning contracts', () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayDate = new Date(startOfToday + 1000 * 60 * 10).toISOString();
    const yesterdayDate = new Date(startOfToday - 1000 * 60 * 60 * 2).toISOString();

    const sample = [
        { id: 't1', title: 'Today 1', created_at: todayDate, is_read: false },
        { id: 'y1', title: 'Yesterday 1', created_at: yesterdayDate, is_read: true }
    ];

    const dateGroups = groupNotificationsByDate(sample);
    assert.ok(Array.isArray(dateGroups), 'groupNotificationsByDate must return an array');
    assert.ok(dateGroups.length >= 1, 'Should partition into populated groups');
    const today = dateGroups.find(g => g.id === 'today');
    assert.ok(today, 'Must contain today section');
    assert.equal(today.items.length, 1);
    assert.equal(today.unreadCount, 1);
});

test('Haptics Service: exports light, medium, success, and warning feedback with safe web fallbacks', async () => {
    assert.equal(typeof triggerLightHaptic, 'function');
    assert.equal(typeof triggerMediumHaptic, 'function');
    assert.equal(typeof triggerSuccessHaptic, 'function');
    assert.equal(typeof triggerWarningHaptic, 'function');

    assert.equal(typeof haptics.light, 'function');
    assert.equal(typeof haptics.medium, 'function');
    assert.equal(typeof haptics.success, 'function');
    assert.equal(typeof haptics.warning, 'function');

    // Executing in Node.js environment must resolve safely without throwing
    await assert.doesNotReject(async () => {
        await triggerLightHaptic();
        await triggerMediumHaptic();
        await triggerSuccessHaptic();
        await triggerWarningHaptic();
    });
});

test('Notification Center UI: wires haptic feedback across interaction touchpoints', () => {
    const ncSrc = fs.readFileSync(path.resolve('src/pages/NotificationCenter.jsx'), 'utf8');

    assert.ok(ncSrc.includes('triggerLightHaptic'), 'NotificationCenter.jsx must import and use triggerLightHaptic');
    assert.ok(ncSrc.includes('triggerMediumHaptic'), 'NotificationCenter.jsx must import and use triggerMediumHaptic');
    assert.ok(ncSrc.includes('triggerSuccessHaptic'), 'NotificationCenter.jsx must import and use triggerSuccessHaptic');
    assert.ok(ncSrc.includes('handleFilterSelect'), 'Must trigger haptic on filter tab selection');
    assert.ok(ncSrc.includes('handleOpenNotification'), 'Must trigger haptic on notification open');
});

test('Notification Center CSS: defines skeleton animations and light theme tokens', () => {
    const cssSrc = fs.readFileSync(path.resolve('src/pages/NotificationCenter.css'), 'utf8');

    assert.ok(cssSrc.includes('.notification-center-skeleton'), 'Must define .notification-center-skeleton');
    assert.ok(cssSrc.includes('@keyframes notificationPulse'), 'Must define notificationPulse keyframes');
    assert.ok(cssSrc.includes("html[data-theme='light'] .notification-center-dot"), 'Must style unread dot for light theme');
    assert.ok(cssSrc.includes("html[data-theme='light'] .notification-center-item"), 'Must elevate items for light theme');
});

test('Notification Service: createNotification enforces suppress_push and suppress_email when recipientIsActive is true', () => {
    const notifServiceSrc = fs.readFileSync(path.resolve('src/services/notificationService.js'), 'utf8');

    assert.ok(
        notifServiceSrc.includes('suppress_push: Boolean(suppressPush || metadata.suppress_push || metadata.suppressPush || metadata.recipientIsActive)'),
        'createNotification must set suppress_push when recipientIsActive is true'
    );
    assert.ok(
        notifServiceSrc.includes('suppress_email: Boolean(metadata.suppress_email || metadata.suppressEmail || metadata.recipientIsActive)'),
        'createNotification must set suppress_email when recipientIsActive is true'
    );
    assert.ok(
        notifServiceSrc.includes('recipientIsActive: Boolean(metadata.recipientIsActive)'),
        'createNotification must forward recipientIsActive in enrichedMetadata'
    );
});

test('Chat Page: In-Chat presence suppression, voice note forwarding, and URL synchronization', () => {
    const chatSrc = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf8');

    // 1. In-chat audio ding is suppressed when document is focused and visible
    assert.ok(
        chatSrc.includes('isTabFocusedAndVisible') || chatSrc.includes('document.hasFocus'),
        'Chat.jsx must check document focus/visibility before playing audible notification ding'
    );

    // 2. Chat selects conversation and synchronizes chatId in URL query param
    assert.ok(
        chatSrc.includes("navigate(`/chat?chatId=${conv.id}`, { replace: true })"),
        'Chat.jsx must synchronize URL search param on selecting conversation to suppress external alerts'
    );

    // 3. Chat forwards recipientIsActive and suppress_push into text message sends
    assert.ok(
        chatSrc.includes('recipientIsActive: Boolean(isOtherOnline)') && chatSrc.includes('suppress_push: Boolean(isOtherOnline)'),
        'Chat.jsx must pass recipientIsActive and suppress_push to metadata when sending messages'
    );
});

test('Database Migrations: Server push trigger and delayed email queue integrity', () => {
    const pushMigration = fs.readFileSync(path.resolve('supabase/migrations/20261008180000_server_authoritative_push_trigger.sql'), 'utf8');
    const emailMigration = fs.readFileSync(path.resolve('supabase/migrations/20261008190000_delayed_email_queue_and_presence_suppression.sql'), 'utf8');

    // Push migration checks
    assert.ok(pushMigration.includes('trg_fn_notifications_push_dispatch'), 'Must define trg_fn_notifications_push_dispatch function');
    assert.ok(pushMigration.includes("NEW.metadata->>'suppress_push' = 'true'"), 'Must guard against suppress_push');
    assert.ok(pushMigration.includes("NEW.metadata->>'recipientIsActive' = 'true'"), 'Must guard against recipientIsActive');
    assert.ok(pushMigration.includes('pg_net'), 'Must leverage pg_net for asynchronous non-blocking delivery');

    // Email queue migration checks
    assert.ok(emailMigration.includes('public.notification_email_queue'), 'Must create public.notification_email_queue table');
    assert.ok(emailMigration.includes("scheduled_for timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')"), 'Must configure 15-minute scheduled grace period');
    assert.ok(emailMigration.includes("NEW.metadata->>'recipientIsActive' = 'true'"), 'Email queue trigger must skip enqueuing when recipientIsActive');
    assert.ok(emailMigration.includes('cancelled_read'), 'Must support cancelled_read status upon user reading notification');
});

test('Edge Function: send-notification-email supports process-queue worker action', () => {
    const emailEdgeSrc = fs.readFileSync(path.resolve('supabase/functions/send-notification-email/index.ts'), 'utf8');

    assert.ok(
        emailEdgeSrc.includes('process-queue') || emailEdgeSrc.includes('process_queue') || emailEdgeSrc.includes('notification_email_queue'),
        'send-notification-email must support batch processing the notification_email_queue'
    );
});
