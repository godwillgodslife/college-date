import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    formatNotificationTime,
    groupNotificationsChronologically,
    countUnreadByCategory,
    getNotificationCategory,
    getNotificationDeepLink,
    getNotificationIcon,
    NOTIFICATION_CATEGORIES
} from '../src/utils/notificationRouting.js';

test('Notification Time Formatting: accurately computes relative human-readable times', () => {
    const now = Date.now();

    // Falsy and invalid inputs
    assert.strictEqual(formatNotificationTime(null), '');
    assert.strictEqual(formatNotificationTime(undefined), '');
    assert.strictEqual(formatNotificationTime(''), '');
    assert.strictEqual(formatNotificationTime('not-a-date'), '');

    // Under 1 minute
    assert.strictEqual(formatNotificationTime(new Date(now - 1000 * 20).toISOString()), 'Just now');

    // Minutes
    assert.strictEqual(formatNotificationTime(new Date(now - 1000 * 60 * 5).toISOString()), '5m ago');
    assert.strictEqual(formatNotificationTime(new Date(now - 1000 * 60 * 45).toISOString()), '45m ago');

    // Hours
    assert.strictEqual(formatNotificationTime(new Date(now - 1000 * 60 * 60 * 3).toISOString()), '3h ago');
    assert.strictEqual(formatNotificationTime(new Date(now - 1000 * 60 * 60 * 22).toISOString()), '22h ago');

    // Days
    assert.strictEqual(formatNotificationTime(new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString()), '2d ago');
    assert.strictEqual(formatNotificationTime(new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString()), '6d ago');

    // Over a week: formatted calendar date
    const oldDate = new Date(now - 1000 * 60 * 60 * 24 * 30);
    const expectedOldDate = oldDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    assert.strictEqual(formatNotificationTime(oldDate.toISOString()), expectedOldDate);
});

test('Notification Chronological Grouping: accurately partitions notifications for tray and center', () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayDate = new Date(startOfToday + 1000 * 60 * 15).toISOString();
    const yesterdayDate = new Date(startOfToday - 1000 * 60 * 60 * 4).toISOString();
    const earlierDate = new Date(startOfToday - 1000 * 60 * 60 * 72).toISOString();

    const sample = [
        { id: 'n1', type: 'message', created_at: todayDate, is_read: false },
        { id: 'n2', type: 'match', created_at: todayDate, is_read: true },
        { id: 'n3', type: 'like', created_at: yesterdayDate, is_read: false },
        { id: 'n4', type: 'view', created_at: earlierDate, is_read: true }
    ];

    const groups = groupNotificationsChronologically(sample);
    assert.strictEqual(groups.length, 3);
    assert.strictEqual(groups[0].id, 'today');
    assert.strictEqual(groups[0].items.length, 2);
    assert.strictEqual(groups[1].id, 'yesterday');
    assert.strictEqual(groups[1].items.length, 1);
    assert.strictEqual(groups[2].id, 'earlier');
    assert.strictEqual(groups[2].items.length, 1);
});

test('Notification Category Counting: unread counts match across categories', () => {
    const sample = [
        { id: '1', type: 'message', is_read: false },
        { id: '2', type: 'new_message', is_read: false },
        { id: '3', type: 'match', is_read: false },
        { id: '4', type: 'like', is_read: true },
        { id: '5', type: 'view', is_read: false }
    ];

    const counts = countUnreadByCategory(sample);
    assert.strictEqual(counts.total, 4);
    assert.strictEqual(counts[NOTIFICATION_CATEGORIES.MESSAGES], 2);
    assert.strictEqual(counts[NOTIFICATION_CATEGORIES.MATCHES], 1);
    assert.strictEqual(counts[NOTIFICATION_CATEGORIES.PROFILE_ACTIVITY], 1);
    assert.strictEqual(counts[NOTIFICATION_CATEGORIES.REQUESTS] || 0, 0);
});

test('Notification Tray Component Contract: reuses routing, grouping, relative time, and haptics', () => {
    const traySource = fs.readFileSync(path.resolve('src/components/NotificationTray.jsx'), 'utf-8');

    // Context & Routing Integration
    assert.ok(traySource.includes('useNotifications'), 'Must consume useNotifications');
    assert.ok(traySource.includes('groupNotificationsChronologically'), 'Must reuse groupNotificationsChronologically');
    assert.ok(traySource.includes('formatNotificationTime'), 'Must reuse formatNotificationTime');
    assert.ok(traySource.includes('countUnreadByCategory'), 'Must reuse countUnreadByCategory');
    assert.ok(traySource.includes('getNotificationDeepLink'), 'Must reuse getNotificationDeepLink');
    assert.ok(traySource.includes('getNotificationCategory'), 'Must reuse getNotificationCategory');
    assert.ok(traySource.includes('getNotificationIcon'), 'Must reuse getNotificationIcon');

    // Haptics Integration
    assert.ok(traySource.includes('triggerLightHaptic'), 'Must trigger light haptic on interactions');
    assert.ok(traySource.includes('triggerSuccessHaptic'), 'Must trigger success haptic on mark all read');

    // Accessibility & Interaction Guards
    assert.ok(traySource.includes('role="dialog"') || traySource.includes('role="button"'), 'Must define accessibility roles');
    assert.ok(traySource.includes('onKeyDown'), 'Must support keyboard navigation');
    assert.ok(traySource.includes('disabled={!unreadCounts.total}'), 'Mark all read button must disable when 0 unread');
    assert.ok(traySource.includes("event.key === 'Escape'"), 'Must handle ESC key dismissal');
    assert.ok(traySource.includes('.nav-icon-btn'), 'Must avoid toggle race condition on bell button clicks');
});

test('Notification Tray Styling Contract: design tokens, dual theme, and mobile clearance', () => {
    const trayCss = fs.readFileSync(path.resolve('src/components/NotificationTray.css'), 'utf-8');

    // Semantic tokens
    assert.ok(trayCss.includes('var(--bg-card'), 'Must use --bg-card');
    assert.ok(trayCss.includes('var(--border-subtle'), 'Must use --border-subtle');
    assert.ok(trayCss.includes('var(--text-primary'), 'Must use --text-primary');

    // Dual theme support
    assert.ok(trayCss.includes("html[data-theme='light']"), 'Must define light theme rules');
    assert.ok(trayCss.includes('.theme-light'), 'Must support .theme-light class');

    // Mobile layout alignment
    assert.ok(trayCss.includes('--navbar-height-mobile'), 'Must align with mobile navbar height');
    assert.ok(trayCss.includes('safe-area-inset-top'), 'Must respect safe-area-inset-top');

    // Brand pink accent badge & unread indicator
    assert.ok(trayCss.includes('#ff2d55'), 'Must use #ff2d55 for brand notification accent');
});

test('Navbar Integration Contract: bell accessibility, badge formatting, and haptics', () => {
    const navbarSource = fs.readFileSync(path.resolve('src/components/Navbar.jsx'), 'utf-8');

    assert.ok(navbarSource.includes('triggerLightHaptic'), 'Navbar must trigger haptic on bell click');
    assert.ok(navbarSource.includes('aria-label='), 'Navbar must define aria-label for bell button');
    assert.ok(navbarSource.includes('aria-expanded='), 'Navbar must communicate aria-expanded state');
    assert.ok(navbarSource.includes('formatBadgeCount(unreadCount)'), 'Navbar must format badge count cleanly');
});

test('Match Integration Contract: discover-notif-btn haptics and brand aligned pink badge', () => {
    const matchSource = fs.readFileSync(path.resolve('src/pages/Match.jsx'), 'utf-8');
    const matchCss = fs.readFileSync(path.resolve('src/pages/Match.css'), 'utf-8');

    // Haptics on match notif button
    assert.ok(matchSource.includes('triggerLightHaptic'), 'Match.jsx must import and call triggerLightHaptic');

    // Badge styling aligned to Option 1 Vibrant Pink-Red
    assert.ok(matchCss.includes('.discover-notif-badge'), 'Match.css must define discover-notif-badge');
    assert.ok(matchCss.includes('#ff2d55'), 'discover-notif-badge must use #ff2d55');
    assert.ok(!matchCss.includes('.discover-notif-badge {\n    position: absolute;\n    top: -4px;\n    right: -4px;\n    background: #25d366;'), 'Must not use WhatsApp green for discover-notif-badge');
});
